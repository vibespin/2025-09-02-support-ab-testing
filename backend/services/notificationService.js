const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const { DB_PATH } = require('../database/init');

class NotificationService {
  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER || 'mock';
  }

  // Send notification with logging
  async sendNotification({ ticketId, recipientEmail, type, subject, content }) {
    const db = new sqlite3.Database(DB_PATH);
    const notificationId = uuidv4();

    try {
      // Log notification to database
      await this.logNotification(db, {
        id: notificationId,
        ticketId,
        recipientEmail,
        type,
        subject,
        content
      });

      // Send the actual notification
      const result = await this.sendEmail({
        to: recipientEmail,
        subject,
        content,
        type
      });

      // Update notification status
      await this.updateNotificationStatus(db, notificationId, result.success ? 'sent' : 'failed');

      console.log(`📧 ${result.success ? 'Sent' : 'Failed'} ${type} notification to ${recipientEmail}`);
      return { success: result.success, notificationId };

    } catch (error) {
      console.error('Notification service error:', error);
      await this.updateNotificationStatus(db, notificationId, 'failed');
      return { success: false, error: error.message };
    } finally {
      db.close();
    }
  }

  // Mock email implementation (placeholder for real email service)
  async sendEmail({ to, subject, content, type }) {
    // In development, we simulate email sending
    if (this.emailProvider === 'mock') {
      console.log(`📧 MOCK EMAIL SENT:`);
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Type: ${type}`);
      console.log(`   Content:`);
      console.log(`${content}`);
      console.log(`--- END EMAIL ---`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true, provider: 'mock' };
    }

    // Production email implementations would go here
    switch (this.emailProvider) {
      case 'sendgrid':
        return await this.sendWithSendGrid({ to, subject, content });
      case 'mailgun':
        return await this.sendWithMailgun({ to, subject, content });
      case 'ses':
        return await this.sendWithSES({ to, subject, content });
      default:
        throw new Error(`Unsupported email provider: ${this.emailProvider}`);
    }
  }

  // Production email provider implementations (placeholders)
  async sendWithSendGrid({ to, subject, content }) {
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    console.log(`📧 SENDGRID: Would send email to ${to}`);
    return { success: true, provider: 'sendgrid' };
  }

  async sendWithMailgun({ to, subject, content }) {
    // const mailgun = require('mailgun-js')({
    //   apiKey: process.env.MAILGUN_API_KEY,
    //   domain: process.env.MAILGUN_DOMAIN
    // });
    
    console.log(`📧 MAILGUN: Would send email to ${to}`);
    return { success: true, provider: 'mailgun' };
  }

  async sendWithSES({ to, subject, content }) {
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES({region: process.env.AWS_REGION});
    
    console.log(`📧 AWS SES: Would send email to ${to}`);
    return { success: true, provider: 'ses' };
  }

  // Log notification to database
  logNotification(db, notification) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO notifications (id, ticket_id, recipient_email, notification_type, subject, content) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          notification.id,
          notification.ticketId,
          notification.recipientEmail,
          notification.type,
          notification.subject,
          notification.content
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Update notification status after sending
  updateNotificationStatus(db, notificationId, status) {
    return new Promise((resolve, reject) => {
      const updateData = { status };
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      }

      db.run(
        'UPDATE notifications SET status = ?, sent_at = ? WHERE id = ?',
        [status, updateData.sent_at || null, notificationId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Template methods for different notification types
  async sendTicketCreatedNotification(ticket) {
    const subject = `Support Ticket Created: ${ticket.title}`;
    const content = `
Hello,

Your support ticket has been created successfully.

Ticket Details:
- ID: ${ticket.id}
- Title: ${ticket.title}
- Priority: ${ticket.priority}
- Status: ${ticket.status}

Description:
${ticket.description}

We'll get back to you soon with an update.

Best regards,
Support Team
    `.trim();

    return await this.sendNotification({
      ticketId: ticket.id,
      recipientEmail: ticket.contact_email,
      type: 'ticket_created',
      subject,
      content
    });
  }

  async sendTicketStatusUpdateNotification(ticket, oldStatus) {
    const subject = `Ticket Status Updated: ${ticket.title}`;
    const content = `
Hello,

Your support ticket status has been updated.

Ticket Details:
- ID: ${ticket.id}
- Title: ${ticket.title}
- Status: ${oldStatus} → ${ticket.status}

${ticket.status === 'resolved' ? 
  'Your issue has been resolved. If you have any further questions, please let us know.' :
  'We\'ll continue working on your issue and update you with progress.'
}

Best regards,
Support Team
    `.trim();

    return await this.sendNotification({
      ticketId: ticket.id,
      recipientEmail: ticket.contact_email,
      type: 'status_update',
      subject,
      content
    });
  }

  // Get notification history for a ticket
  async getTicketNotifications(ticketId) {
    const db = new sqlite3.Database(DB_PATH);
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM notifications WHERE ticket_id = ? ORDER BY created_at DESC',
        [ticketId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
          db.close();
        }
      );
    });
  }
}

module.exports = new NotificationService();