import { pgTable, text, timestamp, varchar, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// --- ENUMS ---
export const roleEnum = ['admin', 'operator', 'client', 'viewer'] as const;
export const userStatusEnum = ['active', 'inactive'] as const;
export const machineStatusEnum = ['online', 'offline', 'warning'] as const;

// --- TABLES ---

export const masterHospitals = pgTable('master_hospitals', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  hospitalName: varchar('hospital_name', { length: 255 }).notNull(),
  province: varchar('province', { length: 100 }),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  owner: varchar('owner', { length: 100 }),
  kelas: varchar('kelas', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  clientId: text('client_id').references(() => masterHospitals.id),
  name: varchar('name', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).$type<typeof roleEnum[number]>().notNull(),
  status: varchar('status', { length: 20 }).$type<typeof userStatusEnum[number]>().default('active').notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const machines = pgTable('machines', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  clientId: text('client_id').references(() => masterHospitals.id),
  serialNumber: varchar('serial_number', { length: 100 }).notNull().unique(),
  machineName: varchar('machine_name', { length: 255 }).notNull(),
  model: varchar('model', { length: 100 }),
  capacityMcDay: decimal('capacity_mc_day', { precision: 10, scale: 2 }),
  capacityMcMonth: decimal('capacity_mc_month', { precision: 15, scale: 2 }),
  installedAt: timestamp('installed_at'),
  status: varchar('status', { length: 20 }).$type<typeof machineStatusEnum[number]>().default('offline').notNull(),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  pendingDelete: boolean('pending_delete').default(false).notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

export const machineThresholds = pgTable('machine_thresholds', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  machineId: text('machine_id').references(() => machines.id), // null = global default
  oxygenPurityWarningMin: decimal('oxygen_purity_warning_min', { precision: 5, scale: 2 }).default('93.00').notNull(),
  oxygenPurityCriticalMin: decimal('oxygen_purity_critical_min', { precision: 5, scale: 2 }).default('90.00').notNull(),
  tankPressureWarningMin: decimal('tank_pressure_warning_min', { precision: 5, scale: 2 }).default('4.00').notNull(),
  tankPressureWarningMax: decimal('tank_pressure_warning_max', { precision: 5, scale: 2 }).default('8.00').notNull(),
  offlineAfterMinutes: integer('offline_after_minutes').default(5).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TimescaleDB Hypertable Target
export const machineReadings = pgTable('machine_readings', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  machineId: text('machine_id').references(() => machines.id).notNull(),
  clientId: text('client_id').references(() => masterHospitals.id),
  serialNumber: varchar('serial_number', { length: 255 }).notNull(),
  terminalTime: timestamp('terminal_time', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  groupName: varchar('group_name', { length: 100 }),
  oxygenPurity: decimal('oxygen_purity', { precision: 10, scale: 2 }),
  tankPressure: decimal('tank_pressure', { precision: 10, scale: 2 }),
  flowSentral: decimal('flow_sentral', { precision: 10, scale: 2 }),
  flowBooster: decimal('flow_booster', { precision: 10, scale: 2 }),
  totalFlow: decimal('total_flow', { precision: 15, scale: 2 }),
  runningTimeHours: decimal('running_time_hours', { precision: 15, scale: 2 }),
  mqttTopic: text('mqtt_topic'),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const machineLatestReadings = pgTable('machine_latest_readings', {
  machineId: text('machine_id').primaryKey().references(() => machines.id),
  clientId: text('client_id').references(() => masterHospitals.id),
  serialNumber: varchar('serial_number', { length: 255 }).notNull(),
  terminalTime: timestamp('terminal_time', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  groupName: varchar('group_name', { length: 100 }),
  oxygenPurity: decimal('oxygen_purity', { precision: 10, scale: 2 }),
  tankPressure: decimal('tank_pressure', { precision: 10, scale: 2 }),
  flowSentral: decimal('flow_sentral', { precision: 10, scale: 2 }),
  flowBooster: decimal('flow_booster', { precision: 10, scale: 2 }),
  totalFlow: decimal('total_flow', { precision: 15, scale: 2 }),
  runningTimeHours: decimal('running_time_hours', { precision: 15, scale: 2 }),
  mqttTopic: text('mqtt_topic'),
  rawPayload: jsonb('raw_payload'),
  startOfDayTotalFlow: decimal('start_of_day_total_flow', { precision: 15, scale: 2 }),
  startOfDayDate: timestamp('start_of_day_date', { mode: 'string' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
