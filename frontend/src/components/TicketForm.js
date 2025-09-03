import React, { useState, useEffect, useCallback } from 'react';
import abTestingService from '../utils/abTestingService';

const TicketForm = ({ onTicketSubmitted }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    contact_email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [suggestedFAQs, setSuggestedFAQs] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // A/B Testing states
  const [abTestVariant, setAbTestVariant] = useState(null);
  const [abTestAssigned, setAbTestAssigned] = useState(false);

  // Debounced FAQ search function
  const searchFAQs = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 3) {
      setSuggestedFAQs([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await fetch(`http://localhost:3001/api/faqs?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const faqs = await response.json();
        setSuggestedFAQs(faqs.slice(0, 3)); // Show top 3 suggestions
        setShowSuggestions(faqs.length > 0);
      }
    } catch (error) {
      console.error('Error fetching FAQ suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounce FAQ search when description changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchFAQs(formData.description);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.description, searchFAQs]);

  // A/B Test Assignment - Component Mount
  useEffect(() => {
    const assignABTest = async () => {
      try {
        const assignment = await abTestingService.getUserAssignment('6e319e6e-bd12-42fc-95c6-f853c78bb54c');
        if (assignment) {
          console.log('🧪 A/B Test Assignment:', assignment.variant);
          console.log('🎯 Test ID: 6e319e6e-bd12-42fc-95c6-f853c78bb54c');
          setAbTestVariant(assignment.variant);
          setAbTestAssigned(true);
        }
      } catch (error) {
        console.error('A/B test assignment failed:', error);
        // Fallback to control variant
        console.log('🧪 A/B Test Fallback: control variant');
        setAbTestVariant('control');
        setAbTestAssigned(true);
      }
    };
    
    assignABTest();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFAQClick = (faq) => {
    setShowSuggestions(false);
    setMessage({ 
      type: 'info', 
      text: `Found this helpful answer! If it solves your issue, you don't need to submit a ticket.` 
    });
    
    // Track FAQ suggestion engagement
    if (abTestAssigned && abTestVariant) {
      abTestingService.trackEvent('6e319e6e-bd12-42fc-95c6-f853c78bb54c', 'faq_suggestion_clicked', 1, {
        faq_id: faq.id,
        faq_category: faq.category,
        variant: abTestVariant
      });
    }
  };

  const dismissSuggestions = () => {
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:3001/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Log email notification to browser console in development
        if (data.emailSent) {
          console.group('📧 Email Notification Sent (Ticket Created)');
          console.log('Ticket ID:', data.id);
          console.log('Title:', data.title);
          console.log('Contact Email:', data.contact_email);
          console.log('Notification ID:', data.emailSent.notificationId);
          console.log('Success:', data.emailSent.success);
          console.log('💡 Full email content is shown in the backend terminal');
          console.groupEnd();
        }
        
        setMessage({ type: 'success', text: `Ticket created successfully! ID: ${data.id}` });
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          contact_email: ''
        });
        
        // Track A/B test conversion event
        if (abTestAssigned && abTestVariant) {
          abTestingService.trackEvent('6e319e6e-bd12-42fc-95c6-f853c78bb54c', 'ticket_submitted', 1, {
            ticket_id: data.id,
            priority: formData.priority,
            variant: abTestVariant
          });
        }
        
        // Notify parent component
        if (onTicketSubmitted) {
          onTicketSubmitted();
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create ticket' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };


  // A/B Testing: Different messaging and layout based on variant
  const getVariantConfig = () => {
    if (abTestVariant === 'test') {
      return {
        submitButtonText: 'Get Help Now',
        formClass: 'ticket-form variant-test',
        placeholderTitle: 'What can we help you with?',
        placeholderDescription: 'Tell us about your issue and we\'ll get you sorted',
        headerText: '🚀 Get Quick Support'
      };
    }
    // Default control variant
    return {
      submitButtonText: 'Submit Ticket',
      formClass: 'ticket-form',
      placeholderTitle: 'Brief description of your issue',
      placeholderDescription: 'Please provide details about your issue',
      headerText: null
    };
  };

  const config = getVariantConfig();

  // Reset A/B test user ID for testing
  const resetABTestUser = () => {
    localStorage.removeItem('ab_test_user_id');
    window.location.reload();
  };

  return (
    <div className={config.formClass}>
      {/* A/B Test Debug Panel */}
      {abTestAssigned && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000
        }}>
          <div style={{
            background: abTestVariant === 'test' ? '#667eea' : '#28a745',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            🧪 A/B Test: {abTestVariant === 'test' ? 'TEST VARIANT' : 'CONTROL'}
          </div>
          <button
            onClick={resetABTestUser}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '15px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            title="Reset user ID and reload to get new A/B test assignment"
          >
            🔄 Reset & Test
          </button>
        </div>
      )}

      {config.headerText && abTestVariant === 'test' && (
        <div className="variant-header">
          <h3>{config.headerText}</h3>
          <p>We're here to help! Just fill out this quick form.</p>
        </div>
      )}
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Issue Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder={config.placeholderTitle}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="4"
            placeholder={config.placeholderDescription}
          />
          
          {/* FAQ Suggestions */}
          {showSuggestions && (
            <div className="faq-suggestions">
              <div className="suggestions-header">
                <span>💡 Found some helpful articles:</span>
                <button 
                  type="button"
                  onClick={dismissSuggestions}
                  className="dismiss-suggestions"
                  title="Dismiss suggestions"
                >
                  ×
                </button>
              </div>
              
              {loadingSuggestions ? (
                <div className="loading-suggestions">Searching FAQs...</div>
              ) : (
                <div className="suggestions-list">
                  {suggestedFAQs.map((faq) => (
                    <div 
                      key={faq.id} 
                      className="suggestion-item"
                      onClick={() => handleFAQClick(faq)}
                    >
                      <div className="suggestion-question">{faq.question}</div>
                      <div className="suggestion-answer">{faq.answer.substring(0, 120)}...</div>
                      <div className="suggestion-category">{faq.category}</div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="suggestions-footer">
                <small>
                  These articles might help solve your issue. Click to read more.
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="contact_email">Contact Email *</label>
          <input
            type="email"
            id="contact_email"
            name="contact_email"
            value={formData.contact_email}
            onChange={handleChange}
            required
            placeholder="your.email@example.com"
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? 'Submitting...' : config.submitButtonText}
        </button>
      </form>
    </div>
  );
};

export default TicketForm;