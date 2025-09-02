const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/support.db');

function initializeDatabase() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('📦 Connected to SQLite database');
    }
  });

  // Create tickets table (Phase 1)
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create AB tests table (Phase 4)
  db.run(`
    CREATE TABLE IF NOT EXISTS ab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      control_variant TEXT NOT NULL,
      test_variant TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create AB test assignments table (Phase 4)
  db.run(`
    CREATE TABLE IF NOT EXISTS ab_test_assignments (
      id TEXT PRIMARY KEY,
      test_id TEXT,
      user_id TEXT,
      variant TEXT,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES ab_tests (id)
    )
  `);

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('✅ Database initialized successfully');
    }
  });
}

module.exports = { initializeDatabase, DB_PATH };