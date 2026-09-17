import * as dotenv from "dotenv";
dotenv.config();

import mqtt from "mqtt";
import { db } from "../db";
import { machines, machineReadings, machineLatestReadings, masterHospitals } from "../db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../redis";
import { isAutoRegisterSn, getRedisKey, getBrandName } from "../../shared/config";
import { averageSamples, getTenMinuteBucketStart, type BufferedSample } from "./intervalAggregation";
import { parseNullableMetricString } from "../telemetry/vessel";
import { resolveDailyBaseline } from "../telemetry/state";
import { parseMachineTimestamp, resolveHospitalTimeZone } from "../telemetry/timezone";
import { getCmcRegisteredSerials, isUnassignedAutomaticMachine } from "../machines/cmcRegistration";

let MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || (process.env.MQTT_HOST ? `mqtt://${process.env.MQTT_HOST}:1883` : "mqtt://localhost:1883");
if (MQTT_BROKER_URL && !MQTT_BROKER_URL.startsWith("mqtt://") && !MQTT_BROKER_URL.startsWith("mqtts://") && !MQTT_BROKER_URL.startsWith("ws://") && !MQTT_BROKER_URL.startsWith("wss://")) {
  MQTT_BROKER_URL = `mqtt://${MQTT_BROKER_URL}:1883`;
}
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";

// Standard topic: data/psa/#
const TOPIC_PATTERN = "data/psa/#";

async function startListener() {
  let databaseName = "unknown";
  try {
    databaseName = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : "unknown";
  } catch {
    databaseName = "invalid-url";
  }
  console.log(`[MQTT] Connecting to broker at ${MQTT_BROKER_URL}... (Brand: ${getBrandName()}, Auto-Register SN: ${isAutoRegisterSn()}, DB: ${databaseName})`);

  const options: mqtt.IClientOptions = {
    clientId: `psa_${getBrandName().toLowerCase()}_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
  };

  if (MQTT_USERNAME && MQTT_PASSWORD) {
    options.username = MQTT_USERNAME;
    options.password = MQTT_PASSWORD;
  }

  const client = mqtt.connect(MQTT_BROKER_URL, options);

  client.on("connect", () => {
    console.log("[MQTT] Connected successfully!");
    client.subscribe(TOPIC_PATTERN, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to ${TOPIC_PATTERN}:`, err);
      } else {
        console.log(`[MQTT] Subscribed to topic pattern: ${TOPIC_PATTERN}`);
      }
    });
  });

  client.on("error", (err) => {
    console.error("[MQTT] Connection Error:", err);
  });

  client.on("message", async (topic, message) => {
    try {
      // topic = data/psa/O2generatorMGM/7021059043010141111 or data/psa//7092449043030108101
      const parts = topic.split("/");
      if (parts.length < 3) return;
      
      const serialNumber = parts[parts.length - 1]; // always take the last part
      if (!serialNumber) return; // ignore empty

      const payloadStr = message.toString();
      let payload: Record<string, unknown> = {};
      
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        console.warn(`[MQTT] Invalid JSON payload from ${serialNumber}:`, payloadStr);
        return;
      }

      console.log(`[MQTT] Received data from ${serialNumber}:`, payload);

      // 1. Check if machine exists, if not, check auto-register policy
      let machineId = null;
      let clientId = null;
      let hospitalProvince: string | null = null;
      
      const existingMachines = await db.select({
        id: machines.id,
        clientId: machines.clientId,
        serialNumber: machines.serialNumber,
        machineName: machines.machineName,
        province: masterHospitals.province,
      }).from(machines)
        .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
        .where(eq(machines.serialNumber, serialNumber))
        .limit(1);

      const existingMachine = existingMachines[0];
      if (!existingMachine || isUnassignedAutomaticMachine(existingMachine)) {
        const cmcSerials = await getCmcRegisteredSerials([serialNumber]);
        if (cmcSerials.has(serialNumber)) return;
      }
      
      if (existingMachines.length === 0) {
        if (!isAutoRegisterSn()) {
          console.log(`[MQTT] SN ${serialNumber} is not registered in ${getBrandName()} DB. Skipping (AUTO_REGISTER_SN is false).`);
          return;
        }

        console.log(`[MQTT] Auto-registering new machine: ${serialNumber}`);
        const [newMachine] = await db.insert(machines).values({
          serialNumber,
          machineName: `Auto-Registered (${serialNumber})`,
          status: "online",
          lastSeenAt: new Date(),
        }).returning({ id: machines.id });
        machineId = newMachine.id;
      } else {
        machineId = existingMachines[0].id;
        clientId = existingMachines[0].clientId;
        hospitalProvince = existingMachines[0].province;
        // Update status and lastSeenAt
        await db.update(machines)
          .set({ 
            status: "online", 
            lastSeenAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(machines.id, machineId));
      }


      // Ignore machine readings if machine is not linked to any hospital (clientId is null)
      if (!clientId) {
        console.log(`[MQTT] Machine ${serialNumber} has no hospital relation (clientId is null). Ignoring readings.`);
        return;
      }

      // Helper to find first matching key
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
            return String(payload[k]);
          }
        }
        return null;
      };

      const receivedAt = new Date();
      const resolvedTimeZone = resolveHospitalTimeZone(hospitalProvince);
      const parsedTimestamp = parseMachineTimestamp(payload._terminalTime, resolvedTimeZone.timeZone, receivedAt);
      const terminalTime = parsedTimestamp.date;
      if (resolvedTimeZone.usedFallback) {
        console.warn(`[MQTT] Unknown hospital province for ${serialNumber}; using Asia/Jakarta.`);
      }
      if (parsedTimestamp.source === "received" && payload._terminalTime !== undefined && payload._terminalTime !== null && payload._terminalTime !== "") {
        console.warn(`[MQTT] Invalid _terminalTime for ${serialNumber}; using receipt time.`);
      }
      if (parsedTimestamp.driftMs !== null && parsedTimestamp.driftMs > 15 * 60 * 1000) {
        console.warn(`[MQTT] Machine time drift exceeds 15 minutes for ${serialNumber}; preserving machine time.`);
      }
      const vessel1 = parseNullableMetricString(getVal(['Schneider_PLC_VESSEL1']));
      const vessel2 = parseNullableMetricString(getVal(['Schneider_PLC_VESSEL2']));
      if (vessel1.invalid) console.warn(`[MQTT] Invalid Schneider_PLC_VESSEL1 for ${serialNumber}; storing NULL.`);
      if (vessel2.invalid) console.warn(`[MQTT] Invalid Schneider_PLC_VESSEL2 for ${serialNumber}; storing NULL.`);

      const readingData = {
        machineId,
        clientId,
        serialNumber,
        terminalTime: terminalTime,
        receivedAt,
        groupName: (payload._groupName as string) || null,
        oxygenPurity: getVal(['Schneider_PLC_OXYGEN_PURITY', 'Siemens_S7_200CN_SMART_1_O2Purity']),
        tankPressure: getVal(['Schneider_PLC_MF350_RESULT_O2_TANK', 'Siemens_S7_200CN_SMART_1_O2Tank']),
        vessel1: vessel1.value,
        vessel2: vessel2.value,
        flowSentral: getVal(['Schneider_PLC_FLOW_METER', 'Siemens_S7_200CN_SMART_1_Flow1']),
        flowBooster: getVal(['Schneider_PLC_FLOWMETER2', 'Siemens_S7_200CN_SMART_1_Flow2']),
        totalFlow: getVal(['Schneider_PLC_TOTAL_FLOW', 'TOTAL_TOTAL', 'Siemens_S7_200CN_SMART_1_AccuF1']),
        runningTimeHours: getVal(['Schneider_PLC_MF510_RUNING_TIME', 'Siemens_S7_200CN_SMART_1_RH']),
        mqttTopic: topic,
        rawPayload: payload,
      };

      // 2b. Determine start of day total flow
      let dailyBaseline = resolveDailyBaseline(null, null, Number(readingData.totalFlow || 0));

      try {
        const latestDbRecord = await db.select().from(machineLatestReadings).where(eq(machineLatestReadings.machineId, machineId as string)).limit(1);
        if (latestDbRecord.length > 0) {
          dailyBaseline = resolveDailyBaseline(
            latestDbRecord[0].startOfDayTotalFlow,
            latestDbRecord[0].startOfDayDate,
            Number(readingData.totalFlow || 0),
          );
        }
      } catch (err) {
        console.error("[MQTT] Error fetching latest reading for startOfDay logic:", err);
      }

      // 2c. Buffer reading for aligned ten-minute historical averages.
      const sampleData = {
        machineId,
        clientId,
        serialNumber,
        terminalTime: terminalTime.toISOString(),
        groupName: (payload._groupName as string) || null,
        oxygenPurity: readingData.oxygenPurity,
        tankPressure: readingData.tankPressure,
        vessel1: readingData.vessel1,
        vessel2: readingData.vessel2,
        flowSentral: readingData.flowSentral,
        flowBooster: readingData.flowBooster,
        totalFlow: readingData.totalFlow,
        runningTimeHours: readingData.runningTimeHours,
        mqttTopic: topic,
        rawPayload: payload,
      };

      await redis.rpush(getRedisKey(`machine:ten_minute_samples:${serialNumber}`), JSON.stringify(sampleData));
      await redis.sadd(getRedisKey("machine:ten_minute_active_serials"), serialNumber);

      const latestDataForUpsert = {
        ...readingData,
        startOfDayTotalFlow: String(dailyBaseline.value),
        startOfDayDate: dailyBaseline.date,
      };

      // 3. Update Redis with latest reading (Fast layer - Realtime monitoring)
      const redisKey = getRedisKey(`machine:latest:${serialNumber}`);
      await redis.set(redisKey, JSON.stringify({
        ...latestDataForUpsert,
        receivedAt,
        updatedAt: new Date(),
      }));

      // 4. Upsert into machineLatestReadings (Fallback/Backup layer - Realtime monitoring)
      await db.insert(machineLatestReadings)
        .values(latestDataForUpsert)
        .onConflictDoUpdate({
          target: machineLatestReadings.machineId,
          set: {
            ...latestDataForUpsert,
            receivedAt,
            updatedAt: new Date(),
          },
        });

    } catch (err) {
      console.error("[MQTT] Error processing message:", err);
    }
  });

  const TEN_MINUTES_MS = 10 * 60 * 1000;
  let intervalId: NodeJS.Timeout | undefined;
  const firstDelay = TEN_MINUTES_MS - (Date.now() % TEN_MINUTES_MS);
  const boundaryTimeout = setTimeout(async () => {
    await flushTenMinuteReadings(new Date(Date.now() - TEN_MINUTES_MS));
    intervalId = setInterval(() => void flushTenMinuteReadings(new Date(Date.now() - TEN_MINUTES_MS)), TEN_MINUTES_MS);
  }, firstDelay);

  // Handle graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`[MQTT] ${signal} received. Flushing buffer and disconnecting...`);
    clearTimeout(boundaryTimeout);
    if (intervalId) clearInterval(intervalId);
    client.end();
    await flushTenMinuteReadings(new Date());
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

export async function flushTenMinuteReadings(intervalDate = new Date()) {
  const bucketStart = getTenMinuteBucketStart(intervalDate);
  console.log(`[MQTT Aggregator] Flushing ten-minute readings for ${bucketStart.toISOString()}...`);
  try {
    const activeSetKey = getRedisKey("machine:ten_minute_active_serials");
    const activeSerials = await redis.smembers(activeSetKey);
    if (!activeSerials || activeSerials.length === 0) {
      console.log("[MQTT Aggregator] No active machine samples to flush.");
      return;
    }

    for (const serialNumber of activeSerials) {
      const listKey = getRedisKey(`machine:ten_minute_samples:${serialNumber}`);
      const processingKey = getRedisKey(`machine:ten_minute_processing:${serialNumber}`);
      if (!(await redis.exists(processingKey))) {
        if (!(await redis.exists(listKey))) continue;
        await redis.rename(listKey, processingKey);
      }
      const rawSamples = await redis.lrange(processingKey, 0, -1);
      if (rawSamples.length === 0) continue;

      const samples = rawSamples
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return null;
          }
        })
        .filter((sample): sample is BufferedSample => Boolean(sample));

      if (samples.length === 0) continue;

      const persistedBucketStart = getTenMinuteBucketStart(new Date(samples[0].terminalTime));
      const averageReading = averageSamples(samples, persistedBucketStart);

      if (averageReading.clientId) {
        await db.insert(machineReadings).values(averageReading).onConflictDoNothing({
          target: [machineReadings.machineId, machineReadings.terminalTime],
        });
        console.log(`[MQTT Aggregator] Saved ten-minute average for ${serialNumber} (${samples.length} samples).`);
      }
      await redis.del(processingKey);
      if (!(await redis.exists(listKey))) await redis.srem(activeSetKey, serialNumber);
    }
  } catch (err) {
    console.error("[MQTT Aggregator] Error flushing ten-minute readings:", err);
  }
}

/** @deprecated Compatibility export for older callers during rollout. */
export const flushHourlyReadings = flushTenMinuteReadings;

startListener().catch(console.error);
