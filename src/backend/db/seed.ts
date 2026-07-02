import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting seed...");

  try {
    const { db } = await import("./index");
    const { users: usersTable, masterHospitals } = await import("./schema");
    const rsData = require("./rs_data.json");
    
    const saltRounds = 10;
    const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || "password";
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    const usersToInsert = [
      {
        id: "U-ADMIN",
        name: "Admin Utama",
        username: "admin",
        role: "admin" as const,
        status: "active" as const,
        passwordHash,
      },
      {
        id: "U-OPERATOR",
        name: "Operator Gas",
        username: "operator",
        role: "operator" as const,
        status: "active" as const,
        passwordHash,
      },
      {
        id: "U-CLIENT1",
        name: "Client RS Harapan",
        username: "client",
        role: "client" as const,
        status: "active" as const,
        clientId: "RS-001",
        passwordHash,
      },
      {
        id: "U-VIEWER1",
        name: "TV Monitor",
        username: "viewer",
        role: "viewer" as const,
        status: "active" as const,
        passwordHash,
      },
    ];

    console.log("Inserting users...");
    for (const mockUser of usersToInsert) {
      await db.insert(usersTable).values(mockUser).onConflictDoNothing({ target: usersTable.username });
    }

    console.log(`Inserting ${rsData.length} hospitals...`);
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rsData.length; i += CHUNK_SIZE) {
      const chunk = rsData.slice(i, i + CHUNK_SIZE);
      await db.insert(masterHospitals).values(chunk).onConflictDoNothing();
      console.log(`Inserted chunk ${i} to ${Math.min(i + chunk.length, rsData.length)}`);
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
  } finally {
    process.exit(0);
  }
}

main();
