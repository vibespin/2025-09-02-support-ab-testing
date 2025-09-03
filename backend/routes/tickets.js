const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');
const notificationService = require('../services/notificationService');

const router = express.Router();

// GET /api/tickets - List all tickets
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all(
    'SELECT * FROM tickets ORDER BY created_at DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching tickets:', err);
        res.status(500).json({ error: 'Failed to fetch tickets' });
      } else {
        res.json(rows);
      }
    }
  );
});

// GET /api/tickets/:id - Get specific ticket
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get(
    'SELECT * FROM tickets WHERE id = ?',
    [id],
    (err, row) => {
      if (err) {
        console.error('Error fetching ticket:', err);
        res.status(500).json({ error: 'Failed to fetch ticket' });
      } else if (!row) {
        res.status(404).json({ error: 'Ticket not found' });
      } else {
        res.json(row);
      }
    }
  );
});

// POST /api/tickets - Create new ticket
router.post('/', (req, res) => {
  const { title, description, priority = 'medium', contact_email } = req.body;
  
  // Basic validation
  if (!title || !description || !contact_email) {
    return res.status(400).json({ 
      error: 'Missing required fields: title, description, contact_email' 
    });
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact_email)) {
    return res.status(400).json({ 
      error: 'Invalid email format' 
    });
  }
  
  // Priority validation
  if (!['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({ 
      error: 'Priority must be: low, medium, or high' 
    });
  }
  
  const db = getDatabase();
  const ticketId = uuidv4();
  
  db.run(
    `INSERT INTO tickets (id, title, description, priority, contact_email) 
     VALUES (?, ?, ?, ?, ?)`,
    [ticketId, title, description, priority, contact_email],
    async function(err) {
      if (err) {
        console.error('Error creating ticket:', err);
        res.status(500).json({ error: 'Failed to create ticket' });
          return;
      }
      
      console.log(`✅ Created ticket: ${ticketId} - ${title}`);
      
      const ticket = {
        id: ticketId,
        title,
        description,
        priority,
        contact_email,
        status: 'new'
      };
      
      // Send notification (async, but capture result for development)
      let emailSent = null;
      if (process.env.NODE_ENV !== 'production') {
        try {
          emailSent = await notificationService.sendTicketCreatedNotification(ticket);
        } catch (error) {
          console.error('Failed to send notification:', error);
        }
      } else {
        notificationService.sendTicketCreatedNotification(ticket)
          .catch(error => console.error('Failed to send notification:', error));
      }
      
      const response = { 
        id: ticketId, 
        title, 
        description, 
        priority, 
        contact_email,
        status: 'new',
        message: 'Ticket created successfully' 
      };

      // Include email details in development mode
      if (process.env.NODE_ENV !== 'production' && emailSent) {
        response.emailSent = {
          success: emailSent.success,
          notificationId: emailSent.notificationId,
          message: 'Email notification sent (check browser console for details)'
        };
      }
      
      res.status(201).json(response);
      
    }
  );
});

// PUT /api/tickets/:id - Update ticket status
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  // Status validation
  if (!['new', 'in-progress', 'resolved'].includes(status)) {
    return res.status(400).json({ 
      error: 'Status must be: new, in-progress, or resolved' 
    });
  }
  
  const db = getDatabase();
  
  try {
    // First, get the current ticket to check old status
    const currentTicket = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM tickets WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldStatus = currentTicket.status;
    
    // Skip if status hasn't changed
    if (oldStatus === status) {
      return res.json({ 
        id, 
        status, 
        message: 'Ticket status unchanged' 
      });
    }

    // Update ticket status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    // Record status change history
    const historyId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO ticket_status_history (id, ticket_id, old_status, new_status, notes) 
         VALUES (?, ?, ?, ?, ?)`,
        [historyId, id, oldStatus, status, notes || null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log(`📝 Updated ticket ${id} status: ${oldStatus} → ${status}`);

    // Send status update notification (async, don't wait but capture result for development)
    const updatedTicket = { ...currentTicket, status };
    const notificationPromise = notificationService.sendTicketStatusUpdateNotification(updatedTicket, oldStatus);
    
    // In development, include email content in response
    let emailSent = null;
    if (process.env.NODE_ENV !== 'production') {
      try {
        emailSent = await notificationPromise;
      } catch (error) {
        console.error('Failed to send status notification:', error);
      }
    } else {
      notificationPromise.catch(error => console.error('Failed to send status notification:', error));
    }

    const response = { 
      id, 
      status, 
      oldStatus,
      message: 'Ticket updated successfully'
    };

    // Include email details in development mode
    if (process.env.NODE_ENV !== 'production' && emailSent) {
      response.emailSent = {
        success: emailSent.success,
        notificationId: emailSent.notificationId,
        message: 'Email notification sent (check browser console for details)'
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// GET /api/tickets/:id/history - Get ticket status history
router.get('/:id/history', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.all(
    `SELECT * FROM ticket_status_history 
     WHERE ticket_id = ? 
     ORDER BY changed_at DESC`,
    [id],
    (err, rows) => {
      if (err) {
        console.error('Error fetching ticket history:', err);
        res.status(500).json({ error: 'Failed to fetch ticket history' });
      } else {
        res.json(rows);
      }
    }
  );
});

// GET /api/tickets/:id/notifications - Get ticket notifications
router.get('/:id/notifications', async (req, res) => {
  const { id } = req.params;
  
  try {
    const notifications = await notificationService.getTicketNotifications(id);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

module.exports = router;