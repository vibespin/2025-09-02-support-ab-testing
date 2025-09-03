import React, { useState, useEffect } from 'react';
import abTestingService from '../utils/abTestingService';

const FAQForm = ({ onFAQSubmitted, editingFAQ, onCancelEdit }) => {
  const [formData, setFormData] = useState({
    question: editingFAQ?.question || '',
    answer: editingFAQ?.answer || '',
    category: editingFAQ?.category || 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // A/B Testing states
  const [abTestVariant, setAbTestVariant] = useState(null);
  const [abTestAssigned, setAbTestAssigned] = useState(false);

  // Update form data when editingFAQ changes
  useEffect(() => {
    if (editingFAQ) {
      setFormData({
        question: editingFAQ.question || '',
        answer: editingFAQ.answer || '',
        category: editingFAQ.category || 'general'
      });
    } else {
      // Reset form when not editing
      setFormData({
        question: '',
        answer: '',
        category: 'general'
      });
    }
    // Clear any existing messages when switching modes
    setMessage({ type: '', text: '' });
  }, [editingFAQ]);

  // A/B Test Assignment - Component Mount
  useEffect(() => {
    const assignABTest = async () => {
      try {
        const assignment = await abTestingService.getUserAssignment('94799b19-ed7d-440d-8d51-ce3f6bc9ce2d');
        if (assignment) {
          console.log('📝 FAQ A/B Test Assignment:', assignment.variant);
          console.log('🎯 FAQ Test ID: 94799b19-ed7d-440d-8d51-ce3f6bc9ce2d');
          setAbTestVariant(assignment.variant);
          setAbTestAssigned(true);
        }
      } catch (error) {
        console.error('A/B test assignment failed:', error);
        // Fallback to control variant
        console.log('📝 FAQ A/B Test Fallback: control variant');
        setAbTestVariant('control');
        setAbTestAssigned(true);
      }
    };
    
    assignABTest();
  }, []);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'account', label: 'Account' },
    { value: 'technical', label: 'Technical' },
    { value: 'billing', label: 'Billing' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const url = editingFAQ 
        ? `http://localhost:3001/api/faqs/${editingFAQ.id}`
        : 'http://localhost:3001/api/faqs';
      
      const method = editingFAQ ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const action = editingFAQ ? 'updated' : 'created';
        setMessage({ 
          type: 'success', 
          text: `FAQ ${action} successfully!` 
        });
        
        if (!editingFAQ) {
          setFormData({
            question: '',
            answer: '',
            category: 'general'
          });
        }
        
        // Track A/B test conversion event
        if (abTestAssigned && abTestVariant) {
          const eventName = editingFAQ ? 'faq_updated' : 'faq_created';
          abTestingService.trackEvent('94799b19-ed7d-440d-8d51-ce3f6bc9ce2d', eventName, 1, {
            faq_id: data.id,
            category: formData.category,
            variant: abTestVariant,
            is_edit: !!editingFAQ
          });
        }
        
        // Notify parent component
        if (onFAQSubmitted) {
          onFAQSubmitted();
        }
        
        // Clear edit mode
        if (editingFAQ && onCancelEdit) {
          setTimeout(() => onCancelEdit(), 1000);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save FAQ' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  // A/B Testing: Different styling and messaging based on variant
  const getVariantConfig = () => {
    if (abTestVariant === 'test') {
      return {
        submitButtonText: editingFAQ ? 'Save Changes' : 'Create FAQ',
        formClass: 'faq-form variant-test',
        placeholderQuestion: 'What question are your customers frequently asking?',
        placeholderAnswer: 'Provide a comprehensive, helpful answer that solves their problem',
        headerText: editingFAQ ? '✏️ Update Knowledge Base' : '💡 Share Knowledge'
      };
    }
    // Default control variant
    return {
      submitButtonText: editingFAQ ? 'Update FAQ' : 'Add FAQ',
      formClass: 'faq-form',
      placeholderQuestion: 'What question are customers asking?',
      placeholderAnswer: 'Provide a clear, helpful answer',
      headerText: editingFAQ ? 'Edit FAQ' : 'Add New FAQ'
    };
  };

  const config = getVariantConfig();

  // Reset A/B test user ID for testing (stay on current page)
  const resetABTestUser = () => {
    localStorage.removeItem('ab_test_user_id');
    // Force page reload without changing URL
    window.location.reload(true);
  };

  return (
    <>
      {/* A/B Test Debug Panel for FAQ Form - Fixed position in top-right */}
      {abTestAssigned && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '120px', // Offset to avoid conflicts with Support page buttons
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000
        }}>
          <div style={{
            background: abTestVariant === 'test' ? '#ff8f00' : '#28a745',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            📝 FAQ: {abTestVariant === 'test' ? 'TEST' : 'CONTROL'}
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

    <div className={config.formClass}>

      <h3>{config.headerText}</h3>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="question">Question *</label>
          <input
            type="text"
            id="question"
            name="question"
            value={formData.question}
            onChange={handleChange}
            required
            placeholder={config.placeholderQuestion}
          />
        </div>

        <div className="form-group">
          <label htmlFor="answer">Answer *</label>
          <textarea
            id="answer"
            name="answer"
            value={formData.answer}
            onChange={handleChange}
            required
            rows="4"
            placeholder={config.placeholderAnswer}
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Saving...' : config.submitButtonText}
          </button>
          
          {editingFAQ && (
            <button 
              type="button" 
              onClick={handleCancel}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
    </>
  );
};

export default FAQForm;