import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting seed...");

  try {
    const { db } = await import("./index");
    const { users: usersTable, masterHospitals } = await import("./schema");
    const rsDataModule = await import("./rs_data.json", { assert: { type: "json" } });
    const rsData = rsDataModule.default;

    const saltRounds = 10;
    const defaultPassword = process.env.DEMO_PASSWORD || process.env.SEED_DEFAULT_PASSWORD || "123456";
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);


    const usersToInsert = [
      {
        id: "U-ADMIN",
        name: "Admin Utama",
        username: process.env.DEMO_ADMIN || "admin",
        role: "admin" as const,
        status: "active" as const,
        passwordHash,
      },
      {
        id: "U-OPERATOR",
        name: "Operator",
        username: process.env.DEMO_OPERATOR || "operator",
        role: "operator" as const,
        status: "active" as const,
        passwordHash,
      },
      {
        id: "U-CLIENT1",
        name: "Client RS Demo",
        username: process.env.DEMO_CLIENT || "client",
        role: "client" as const,
        status: "active" as const,
        clientId: "RS-001",
        passwordHash,
      },
      {
        id: "U-VIEWER1",
        name: "TV Monitor",
        username: process.env.DEMO_VIEWER || "viewer",
        role: "viewer" as const,
        status: "active" as const,
        passwordHash,
      },
    ];

    const existingHospitals = await db.select().from(masterHospitals).limit(1);
    if (existingHospitals.length > 0) {
      console.log("Hospitals already exist, skipping insertion to avoid duplicates.");
    } else {
      console.log(`Inserting ${rsData.length} hospitals...`);
      const CHUNK_SIZE = 500;
      for (let i = 0; i < rsData.length; i += CHUNK_SIZE) {
        const chunk = rsData.slice(i, i + CHUNK_SIZE);
        await db.insert(masterHospitals).values(chunk).onConflictDoNothing();
        console.log(`Inserted chunk ${i} to ${Math.min(i + chunk.length, rsData.length)}`);
      }
    }

    console.log("Inserting dummy hospital for mock client...");
    await db.insert(masterHospitals).values({
      id: "RS-001",
      hospitalName: "Dummy Client RS Harapan",
      province: "DKI Jakarta",
      city: "Jakarta Selatan"
    }).onConflictDoNothing();

    console.log("Inserting users...");
    for (const mockUser of usersToInsert) {
      await db.insert(usersTable).values(mockUser).onConflictDoNothing({ target: usersTable.username });
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    process.exit(0);
  }
}

main();
