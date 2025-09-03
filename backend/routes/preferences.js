const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

const router = express.Router();

// GET /api/preferences/:email - Get user preferences
router.get('/:email', (req, res) => {
  const { email } = req.params;
  const db = getDatabase();
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format' 
    });
  }
  
  db.get(
    'SELECT * FROM user_preferences WHERE email = ?',
    [email],
    (err, row) => {
      if (err) {
        console.error('Error fetching user preferences:', err);
        res.status(500).json({ error: 'Failed to fetch user preferences' });
      } else if (!row) {
        // Return default preferences if none exist
        res.json({
          email,
          email_notifications: 1,
          sms_notifications: 0,
          notification_frequency: 'immediate',
          preferred_language: 'en',
          is_new: true
        });
      } else {
        res.json({
          ...row,
          email_notifications: Boolean(row.email_notifications),
          sms_notifications: Boolean(row.sms_notifications),
          is_new: false
        });
      }
      }
  );
});

// POST /api/preferences - Create or update user preferences
router.post('/', (req, res) => {
  const { 
    email, 
    email_notifications = true, 
    sms_notifications = false, 
    notification_frequency = 'immediate',
    preferred_language = 'en'
  } = req.body;
  
  // Basic validation
  if (!email) {
    return res.status(400).json({ 
      error: 'Email is required' 
    });
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Invalid email format' 
    });
  }
  
  // Notification frequency validation
  const validFrequencies = ['immediate', 'daily', 'weekly', 'none'];
  if (!validFrequencies.includes(notification_frequency)) {
    return res.status(400).json({ 
      error: 'Notification frequency must be: immediate, daily, weekly, or none' 
    });
  }
  
  // Language validation
  const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt'];
  if (!validLanguages.includes(preferred_language)) {
    return res.status(400).json({ 
      error: 'Preferred language must be: en, es, fr, de, it, or pt' 
    });
  }
  
  const db = getDatabase();
  
  // First check if preferences already exist
  db.get(
    'SELECT id FROM user_preferences WHERE email = ?',
    [email],
    (err, existingRow) => {
      if (err) {
        console.error('Error checking existing preferences:', err);
        res.status(500).json({ error: 'Failed to save preferences' });
            return;
      }
      
      if (existingRow) {
        // Update existing preferences
        db.run(
          `UPDATE user_preferences 
           SET email_notifications = ?, sms_notifications = ?, notification_frequency = ?, 
               preferred_language = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE email = ?`,
          [email_notifications ? 1 : 0, sms_notifications ? 1 : 0, notification_frequency, preferred_language, email],
          function(err) {
            if (err) {
              console.error('Error updating preferences:', err);
              res.status(500).json({ error: 'Failed to update preferences' });
            } else {
              console.log(`📝 Updated preferences for ${email}`);
              res.json({ 
                email,
                email_notifications,
                sms_notifications,
                notification_frequency,
                preferred_language,
                message: 'Preferences updated successfully' 
              });
            }
                  }
        );
      } else {
        // Create new preferences
        const preferencesId = uuidv4();
        db.run(
          `INSERT INTO user_preferences (id, email, email_notifications, sms_notifications, notification_frequency, preferred_language) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [preferencesId, email, email_notifications ? 1 : 0, sms_notifications ? 1 : 0, notification_frequency, preferred_language],
          function(err) {
            if (err) {
              console.error('Error creating preferences:', err);
              res.status(500).json({ error: 'Failed to create preferences' });
            } else {
              console.log(`✅ Created preferences for ${email}`);
              res.status(201).json({ 
                id: preferencesId,
                email,
                email_notifications,
                sms_notifications,
                notification_frequency,
                preferred_language,
                message: 'Preferences created successfully' 
              });
            }
                  }
        );
      }
    }
  );
});

// GET /api/preferences/stats/summary - Get preference statistics
router.get('/stats/summary', (req, res) => {
  const db = getDatabase();
  
  const queries = [
    'SELECT COUNT(*) as total_users FROM user_preferences',
    'SELECT COUNT(*) as email_enabled FROM user_preferences WHERE email_notifications = 1',
    'SELECT COUNT(*) as sms_enabled FROM user_preferences WHERE sms_notifications = 1',
    'SELECT notification_frequency, COUNT(*) as count FROM user_preferences GROUP BY notification_frequency',
    'SELECT preferred_language, COUNT(*) as count FROM user_preferences GROUP BY preferred_language'
  ];
  
  const results = {};
  let completed = 0;
  
  // Execute all queries
  db.get(queries[0], [], (err, row) => {
    if (err) {
      console.error('Error fetching user stats:', err);
      res.status(500).json({ error: 'Failed to fetch preference statistics' });
        return;
    }
    results.total_users = row.total_users;
    if (++completed === 5) sendResponse();
  });
  
  db.get(queries[1], [], (err, row) => {
    if (err) return handleError(err);
    results.email_enabled = row.email_enabled;
    if (++completed === 5) sendResponse();
  });
  
  db.get(queries[2], [], (err, row) => {
    if (err) return handleError(err);
    results.sms_enabled = row.sms_enabled;
    if (++completed === 5) sendResponse();
  });
  
  db.all(queries[3], [], (err, rows) => {
    if (err) return handleError(err);
    results.frequency_breakdown = rows;
    if (++completed === 5) sendResponse();
  });
  
  db.all(queries[4], [], (err, rows) => {
    if (err) return handleError(err);
    results.language_breakdown = rows;
    if (++completed === 5) sendResponse();
  });
  
  function handleError(err) {
    console.error('Error fetching preference stats:', err);
    res.status(500).json({ error: 'Failed to fetch preference statistics' });
  }
  
  function sendResponse() {
    res.json(results);
  }
});

module.exports = router;