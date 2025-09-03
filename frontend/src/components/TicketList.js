import React, { useState, useEffect } from 'react';
import TicketHistory from './TicketHistory';
import UserPreferences from './UserPreferences';

const TicketList = ({ refreshTrigger }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [preferencesEmail, setPreferencesEmail] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/tickets');
      const data = await response.json();
      
      if (response.ok) {
        setTickets(data);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch tickets');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Log email notification to browser console in development
        if (data.emailSent) {
          console.group('📧 Email Notification Sent');
          console.log('Ticket ID:', ticketId);
          console.log('Status Change:', `${data.oldStatus} → ${data.status}`);
          console.log('Notification ID:', data.emailSent.notificationId);
          console.log('Success:', data.emailSent.success);
          console.log('💡 Full email content is shown in the backend terminal');
          console.groupEnd();
        }
        
        // Refresh the ticket list
        fetchTickets();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update ticket');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [refreshTrigger]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#007bff';
      case 'in-progress': return '#ffc107';
      case 'resolved': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) return <div className="loading">Loading tickets...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="ticket-list">
      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found. Submit your first ticket to get started!</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <h3>{ticket.title}</h3>
                <div className="ticket-meta">
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                  >
                    {ticket.priority}
                  </span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(ticket.status) }}
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>
              
              <p className="ticket-description">{ticket.description}</p>
              
              <div className="ticket-details">
                <p><strong>Contact:</strong> {ticket.contact_email}</p>
                <p><strong>Created:</strong> {formatDate(ticket.created_at)}</p>
                {ticket.updated_at !== ticket.created_at && (
                  <p><strong>Updated:</strong> {formatDate(ticket.updated_at)}</p>
                )}
              </div>

              <div className="ticket-actions">
                <div className="status-update">
                  <label>Update Status:</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="new">New</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="ticket-buttons">
                  <button
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="history-button"
                    title="View ticket history and notifications"
                  >
                    📊 History
                  </button>
                  <button
                    onClick={() => setPreferencesEmail(ticket.contact_email)}
                    className="preferences-button"
                    title="Manage notification preferences"
                  >
                    ⚙️ Preferences
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedTicketId && (
        <TicketHistory 
          ticketId={selectedTicketId} 
          onClose={() => setSelectedTicketId(null)} 
        />
      )}
      
      {preferencesEmail && (
        <UserPreferences 
          userEmail={preferencesEmail} 
          onClose={() => setPreferencesEmail(null)} 
        />
      )}
    </div>
  );
};

export default TicketList;