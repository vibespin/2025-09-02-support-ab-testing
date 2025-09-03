const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/support.db');

// Create a shared connection for all operations
let sharedDb = null;

function getDatabase() {
  if (!sharedDb) {
    sharedDb = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        sharedDb = null;
      } else {
        console.log('📦 Connected to SQLite database');
        // Enable WAL mode and foreign keys
        sharedDb.run("PRAGMA journal_mode = WAL");
        sharedDb.run("PRAGMA foreign_keys = ON");
      }
    });
  }
  return sharedDb;
}

function initializeDatabase() {
  const database = getDatabase();

  // Create tickets table (Phase 1)
  database.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'new',
      contact_email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create FAQs table (Phase 2)
  database.run(`
    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create AB tests table (Phase 4)
  database.run(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      hypothesis TEXT,
      control_variant TEXT NOT NULL,
      test_variant TEXT NOT NULL,
      target_metric TEXT NOT NULL,
      minimum_sample_size INTEGER DEFAULT 100,
      confidence_level REAL DEFAULT 0.95,
      status TEXT DEFAULT 'draft',
      start_date DATETIME,
      end_date DATETIME,
      created_by TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create AB test assignments table (Phase 4)
  database.run(`
    CREATE TABLE IF NOT EXISTS ab_test_assignments (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      user_identifier TEXT NOT NULL,
      variant TEXT NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES ab_tests (id)
    )
  `);

  // Create AB test events table (Phase 4)
  database.run(`
    CREATE TABLE IF NOT EXISTS ab_test_events (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      user_identifier TEXT NOT NULL,
      variant TEXT NOT NULL,
      event_name TEXT NOT NULL,
      event_value REAL,
      event_data TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES ab_tests (id)
    )
  `);

  // Create AB test results table (Phase 4)
  database.run(`
    CREATE TABLE IF NOT EXISTS ab_test_results (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      variant TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      sample_size INTEGER DEFAULT 0,
      conversion_count INTEGER DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      confidence_interval_lower REAL,
      confidence_interval_upper REAL,
      p_value REAL,
      is_statistically_significant BOOLEAN DEFAULT 0,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES ab_tests (id)
    )
  `);

  // Create ticket status history table (Phase 3)
  database.run(`
    CREATE TABLE IF NOT EXISTS ticket_status_history (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT DEFAULT 'system',
      notes TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    )
  `);

  // Create user preferences table (Phase 3)
  database.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      email_notifications BOOLEAN DEFAULT 1,
      sms_notifications BOOLEAN DEFAULT 0,
      notification_frequency TEXT DEFAULT 'immediate',
      preferred_language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create notification log table (Phase 3)
  database.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      ticket_id TEXT,
      recipient_email TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    )
  `);

  console.log('✅ Database initialized successfully');
  return database;
}

module.exports = { initializeDatabase, getDatabase, DB_PATH };