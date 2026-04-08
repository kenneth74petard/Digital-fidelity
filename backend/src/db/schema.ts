import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './fidelity.db';
const dbPath = path.resolve(DB_PATH);

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color_primary TEXT NOT NULL DEFAULT '#c9a84c',
      color_secondary TEXT NOT NULL DEFAULT '#1a1a24',
      logo_emoji TEXT NOT NULL DEFAULT '🍽️',
      loyalty_type TEXT NOT NULL DEFAULT 'stamps',
      stamp_goal INTEGER NOT NULL DEFAULT 10,
      points_per_visit INTEGER NOT NULL DEFAULT 100,
      vapid_public_key TEXT,
      vapid_private_key TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      stamps INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      discount_pct INTEGER NOT NULL DEFAULT 0,
      total_visits INTEGER NOT NULL DEFAULT 0,
      push_subscription TEXT,
      gdpr_consent INTEGER NOT NULL DEFAULT 0,
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      gdpr_consent_at DATETIME,
      marketing_consent_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS passes (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      serial_number TEXT NOT NULL UNIQUE,
      auth_token TEXT NOT NULL,
      pass_type_id TEXT NOT NULL DEFAULT 'pass.com.votrerestaurant.fidelite',
      last_updated DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'general',
      scheduled_at DATETIME,
      sent_at DATETIME,
      recipients_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stamps_history (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      action TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gdpr_log (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL DEFAULT 'system',
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    -- Migration: add loyalty_type if missing (existing databases)
  `);
  try { db.exec(`ALTER TABLE restaurants ADD COLUMN loyalty_type TEXT NOT NULL DEFAULT 'stamps'`); } catch {}
  db.exec(`
    -- Indexes for frequent queries
    CREATE INDEX IF NOT EXISTS idx_customers_restaurant_id ON customers(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
    CREATE INDEX IF NOT EXISTS idx_passes_customer_id ON passes(customer_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_stamps_history_customer_id ON stamps_history(customer_id);
    CREATE INDEX IF NOT EXISTS idx_stamps_history_created_at ON stamps_history(created_at);

    -- Unique constraint: one email per restaurant
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_restaurant ON customers(email, restaurant_id);
  `);
}

export default getDb;
