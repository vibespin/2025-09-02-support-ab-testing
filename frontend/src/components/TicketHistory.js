import React, { useState, useEffect } from 'react';

const TicketHistory = ({ ticketId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('history');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ticketId) {
      fetchTicketData();
    }
  }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTicketData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch both history and notifications in parallel
      const [historyResponse, notificationsResponse] = await Promise.all([
        fetch(`http://localhost:3001/api/tickets/${ticketId}/history`),
        fetch(`http://localhost:3001/api/tickets/${ticketId}/notifications`)
      ]);

      if (historyResponse.ok && notificationsResponse.ok) {
        const historyData = await historyResponse.json();
        const notificationsData = await notificationsResponse.json();
        
        setHistory(historyData);
        setNotifications(notificationsData);
      } else {
        setError('Failed to fetch ticket data');
      }
    } catch (error) {
      console.error('Error fetching ticket data:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': '#3498db',
      'in-progress': '#f39c12', 
      'resolved': '#27ae60'
    };
    return colors[status] || '#95a5a6';
  };

  const getNotificationTypeIcon = (type) => {
    const icons = {
      'ticket_created': '🎫',
      'status_update': '📝',
      'response_sent': '📧'
    };
    return icons[type] || '📬';
  };

  const getNotificationStatusColor = (status) => {
    const colors = {
      'sent': '#27ae60',
      'pending': '#f39c12',
      'failed': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  if (loading) {
    return (
      <div className="ticket-history-overlay">
        <div className="ticket-history-modal">
          <div className="loading">Loading ticket data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-history-overlay" onClick={onClose}>
      <div className="ticket-history-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ticket Details</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Status History ({history.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications ({notifications.length})
          </button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">{error}</div>
          )}

          {activeTab === 'history' && (
            <div className="history-section">
              {history.length === 0 ? (
                <div className="empty-state">No status changes recorded</div>
              ) : (
                <div className="history-timeline">
                  {history.map((item, index) => (
                    <div key={item.id} className="timeline-item">
                      <div className="timeline-marker">
                        <div 
                          className="status-dot"
                          style={{ backgroundColor: getStatusColor(item.new_status) }}
                        />
                      </div>
                      <div className="timeline-content">
                        <div className="status-change">
                          <span className="old-status">{item.old_status || 'new'}</span>
                          <span className="arrow">→</span>
                          <span 
                            className="new-status"
                            style={{ color: getStatusColor(item.new_status) }}
                          >
                            {item.new_status}
                          </span>
                        </div>
                        <div className="change-info">
                          <span className="changed-by">by {item.changed_by}</span>
                          <span className="changed-at">{formatDateTime(item.changed_at)}</span>
                        </div>
                        {item.notes && (
                          <div className="change-notes">{item.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="notifications-section">
              {notifications.length === 0 ? (
                <div className="empty-state">No notifications sent</div>
              ) : (
                <div className="notifications-list">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="notification-item">
                      <div className="notification-header">
                        <span className="notification-type">
                          {getNotificationTypeIcon(notification.notification_type)} 
                          {notification.notification_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span 
                          className="notification-status"
                          style={{ color: getNotificationStatusColor(notification.status) }}
                        >
                          {notification.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="notification-details">
                        <div className="notification-subject">{notification.subject}</div>
                        <div className="notification-recipient">To: {notification.recipient_email}</div>
                        <div className="notification-timestamps">
                          <span>Created: {formatDateTime(notification.created_at)}</span>
                          {notification.sent_at && (
                            <span>Sent: {formatDateTime(notification.sent_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketHistory;