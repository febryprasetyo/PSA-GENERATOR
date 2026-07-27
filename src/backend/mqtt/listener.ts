import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import mqtt from "mqtt";
import { db } from "../db";
import { machines, machineReadings, machineLatestReadings } from "../db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../redis";

let MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || (process.env.MQTT_HOST ? `mqtt://${process.env.MQTT_HOST}:1883` : "mqtt://localhost:1883");
if (MQTT_BROKER_URL && !MQTT_BROKER_URL.startsWith("mqtt://") && !MQTT_BROKER_URL.startsWith("mqtts://") && !MQTT_BROKER_URL.startsWith("ws://") && !MQTT_BROKER_URL.startsWith("wss://")) {
  MQTT_BROKER_URL = `mqtt://${MQTT_BROKER_URL}:1883`;
}
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";

// Standard topic: data/psa/#
const TOPIC_PATTERN = "data/psa/#";

async function startListener() {
  console.log(`[MQTT] Connecting to broker at ${MQTT_BROKER_URL}...`);
  
  const options: mqtt.IClientOptions = {
    clientId: `psa_dashboard_${Math.random().toString(16).slice(2, 10)}`,
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

      // 1. Check if machine exists, if not, auto-register
      let machineId = null;
      let clientId = null;
      
      const existingMachines = await db.select().from(machines).where(eq(machines.serialNumber, serialNumber)).limit(1);
      
      if (existingMachines.length === 0) {
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

      const terminalTime = payload._terminalTime ? new Date(payload._terminalTime as string | number) : new Date();

      const readingData = {
        machineId,
        clientId,
        serialNumber,
        terminalTime: terminalTime,
        groupName: (payload._groupName as string) || null,
        oxygenPurity: getVal(['Schneider_PLC_OXYGEN_PURITY', 'Siemens_S7_200CN_SMART_1_O2Purity']),
        tankPressure: getVal(['Schneider_PLC_MF350_RESULT_O2_TANK', 'Siemens_S7_200CN_SMART_1_O2Tank']),
        flowSentral: getVal(['Schneider_PLC_FLOW_METER', 'Siemens_S7_200CN_SMART_1_Flow1']),
        flowBooster: getVal(['Schneider_PLC_FLOWMETER2', 'Siemens_S7_200CN_SMART_1_Flow2']),
        totalFlow: getVal(['Schneider_PLC_TOTAL_FLOW', 'TOTAL_TOTAL', 'Siemens_S7_200CN_SMART_1_AccuF1']),
        runningTimeHours: getVal(['Schneider_PLC_MF510_RUNING_TIME', 'Siemens_S7_200CN_SMART_1_RH']),
        mqttTopic: topic,
        rawPayload: payload,
      };

      // 2b. Determine start of day total flow
      const todayDateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
      let startOfDayTotalFlow = readingData.totalFlow;
      const startOfDayDate = todayDateStr;

      try {
        const latestDbRecord = await db.select().from(machineLatestReadings).where(eq(machineLatestReadings.machineId, machineId as string)).limit(1);
        if (latestDbRecord.length > 0) {
          const prevDateStr = latestDbRecord[0].startOfDayDate;
          if (prevDateStr === todayDateStr) {
            // Same day, keep the old startOfDayTotalFlow
            startOfDayTotalFlow = latestDbRecord[0].startOfDayTotalFlow ? String(latestDbRecord[0].startOfDayTotalFlow) : readingData.totalFlow;
          }
        }
      } catch (err) {
        console.error("[MQTT] Error fetching latest reading for startOfDay logic:", err);
      }

      // 2c. Buffer reading into Redis for hourly averaging (machineReadings inserted once every 1 hour)
      const sampleData = {
        machineId,
        clientId,
        serialNumber,
        terminalTime: terminalTime.toISOString(),
        groupName: (payload._groupName as string) || null,
        oxygenPurity: readingData.oxygenPurity,
        tankPressure: readingData.tankPressure,
        flowSentral: readingData.flowSentral,
        flowBooster: readingData.flowBooster,
        totalFlow: readingData.totalFlow,
        runningTimeHours: readingData.runningTimeHours,
        mqttTopic: topic,
        rawPayload: payload,
      };

      await redis.rpush(`psa:machine:hourly_samples:${serialNumber}`, JSON.stringify(sampleData));
      await redis.sadd("psa:machine:hourly_active_serials", serialNumber);

      const latestDataForUpsert = {
        ...readingData,
        startOfDayTotalFlow,
        startOfDayDate,
      };

      // 3. Update Redis with latest reading (Fast layer - Realtime monitoring)
      const redisKey = `psa:machine:latest:${serialNumber}`;
      await redis.set(redisKey, JSON.stringify({
        ...latestDataForUpsert,
        receivedAt: new Date(),
        updatedAt: new Date(),
      }));

      // 4. Upsert into machineLatestReadings (Fallback/Backup layer - Realtime monitoring)
      await db.insert(machineLatestReadings)
        .values(latestDataForUpsert)
        .onConflictDoUpdate({
          target: machineLatestReadings.machineId,
          set: {
            ...latestDataForUpsert,
            receivedAt: new Date(),
            updatedAt: new Date(),
          },
        });

    } catch (err) {
      console.error("[MQTT] Error processing message:", err);
    }
  });

  // Schedule hourly flush every 1 hour (3600000 ms)
  const HOURLY_INTERVAL_MS = 60 * 60 * 1000;
  const intervalId = setInterval(async () => {
    await flushHourlyReadings();
  }, HOURLY_INTERVAL_MS);

  // Handle graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`[MQTT] ${signal} received. Flushing buffer and disconnecting...`);
    clearInterval(intervalId);
    client.end();
    await flushHourlyReadings();
    process.exit(0);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

export async function flushHourlyReadings() {
  console.log("[MQTT Aggregator] Flushing hourly readings to PostgreSQL...");
  try {
    const activeSerials = await redis.smembers("psa:machine:hourly_active_serials");
    if (!activeSerials || activeSerials.length === 0) {
      console.log("[MQTT Aggregator] No active machine samples to flush.");
      return;
    }

    for (const serialNumber of activeSerials) {
      const listKey = `psa:machine:hourly_samples:${serialNumber}`;
      
      const pipeline = redis.pipeline();
      pipeline.lrange(listKey, 0, -1);
      pipeline.del(listKey);
      pipeline.srem("psa:machine:hourly_active_serials", serialNumber);

      const results = await pipeline.exec();
      if (!results) continue;

      const rawSamples = (results[0]?.[1] as string[]) || [];
      if (rawSamples.length === 0) continue;

      const samples = rawSamples
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (samples.length === 0) continue;

      const calcAvg = (key: string): string | null => {
        let sum = 0;
        let count = 0;
        for (const sample of samples) {
          const val = sample[key];
          if (val !== null && val !== undefined && val !== "") {
            const num = Number(val);
            if (!isNaN(num)) {
              sum += num;
              count++;
            }
          }
        }
        return count > 0 ? (sum / count).toFixed(2) : null;
      };

      const lastSample = samples[samples.length - 1];

      const averageReading = {
        machineId: lastSample.machineId,
        clientId: lastSample.clientId,
        serialNumber: lastSample.serialNumber,
        terminalTime: new Date(lastSample.terminalTime || Date.now()),
        receivedAt: new Date(),
        groupName: lastSample.groupName || null,
        oxygenPurity: calcAvg("oxygenPurity"),
        tankPressure: calcAvg("tankPressure"),
        flowSentral: calcAvg("flowSentral"),
        flowBooster: calcAvg("flowBooster"),
        totalFlow: calcAvg("totalFlow"),
        runningTimeHours: calcAvg("runningTimeHours"),
        mqttTopic: lastSample.mqttTopic,
        rawPayload: lastSample.rawPayload,
      };

      if (averageReading.clientId) {
        await db.insert(machineReadings).values(averageReading);
        console.log(`[MQTT Aggregator] Saved hourly average for ${serialNumber} (${samples.length} samples aggregated).`);
      }
    }
  } catch (err) {
    console.error("[MQTT Aggregator] Error flushing hourly readings:", err);
  }
}

startListener().catch(console.error);
