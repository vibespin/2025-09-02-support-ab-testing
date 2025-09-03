import React, { useState, useEffect } from 'react';

const UserPreferences = ({ userEmail, onClose }) => {
  const [preferences, setPreferences] = useState({
    email: userEmail || '',
    email_notifications: true,
    sms_notifications: false,
    notification_frequency: 'immediate',
    preferred_language: 'en'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const frequencyOptions = [
    { value: 'immediate', label: 'Immediate' },
    { value: 'daily', label: 'Daily Digest' },
    { value: 'weekly', label: 'Weekly Summary' },
    { value: 'none', label: 'No Notifications' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' }
  ];

  useEffect(() => {
    if (userEmail) {
      fetchPreferences();
    }
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreferences = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`http://localhost:3001/api/preferences/${encodeURIComponent(userEmail)}`);
      
      if (response.ok) {
        const data = await response.json();
        setPreferences({
          email: data.email,
          email_notifications: data.email_notifications,
          sms_notifications: data.sms_notifications,
          notification_frequency: data.notification_frequency,
          preferred_language: data.preferred_language
        });
        
        if (data.is_new) {
          setMessage({ 
            type: 'info', 
            text: 'No preferences found. Default settings loaded.' 
          });
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to load preferences' });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:3001/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: data.message || 'Preferences saved successfully!' 
        });
        
        // Close modal after successful save
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="preferences-overlay">
        <div className="preferences-modal">
          <div className="loading">Loading preferences...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="preferences-overlay" onClick={onClose}>
      <div className="preferences-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Notification Preferences</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={preferences.email}
                disabled
                className="disabled-email"
                title="Email address cannot be changed from preferences. This manages settings for the ticket's contact email."
              />
              <small className="field-description">
                Managing notification preferences for this email address. 
                Email cannot be changed here - it's tied to the ticket's contact.
              </small>
            </div>

            <div className="form-section">
              <h4>Notification Settings</h4>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="email_notifications"
                    checked={preferences.email_notifications}
                    onChange={handleChange}
                  />
                  <span className="checkbox-text">Email Notifications</span>
                  <span className="checkbox-description">
                    Receive updates about your support tickets via email
                  </span>
                </label>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="sms_notifications"
                    checked={preferences.sms_notifications}
                    onChange={handleChange}
                  />
                  <span className="checkbox-text">SMS Notifications</span>
                  <span className="checkbox-description">
                    Receive urgent updates via text message (coming soon)
                  </span>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="notification_frequency">Notification Frequency</label>
                <select
                  id="notification_frequency"
                  name="notification_frequency"
                  value={preferences.notification_frequency}
                  onChange={handleChange}
                  disabled={!preferences.email_notifications}
                >
                  {frequencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field-description">
                  How often you'd like to receive notification emails
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="preferred_language">Preferred Language</label>
                <select
                  id="preferred_language"
                  name="preferred_language"
                  value={preferences.preferred_language}
                  onChange={handleChange}
                >
                  {languageOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field-description">
                  Language for email notifications and support responses
                </span>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={onClose}
                className="cancel-button"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="submit-button"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserPreferences;