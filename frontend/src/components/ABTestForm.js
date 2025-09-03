import React, { useState } from 'react';

const ABTestForm = ({ onTestCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hypothesis: '',
    control_variant: '',
    test_variant: '',
    target_metric: '',
    minimum_sample_size: 100,
    confidence_level: 0.95
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const targetMetrics = [
    { value: 'ticket_submitted', label: 'Ticket Submitted' },
    { value: 'faq_clicked', label: 'FAQ Clicked' },
    { value: 'contact_form_completed', label: 'Contact Form Completed' },
    { value: 'search_performed', label: 'Search Performed' },
    { value: 'page_viewed', label: 'Page Viewed' }
  ];

  const confidenceLevels = [
    { value: 0.90, label: '90% Confidence' },
    { value: 0.95, label: '95% Confidence' },
    { value: 0.99, label: '99% Confidence' }
  ];

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:3001/api/ab-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `A/B Test "${data.name}" created successfully!` 
        });
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          hypothesis: '',
          control_variant: '',
          test_variant: '',
          target_metric: '',
          minimum_sample_size: 100,
          confidence_level: 0.95
        });
        
        // Notify parent component
        if (onTestCreated) {
          onTestCreated(data);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create A/B test' });
      }
    } catch (error) {
      console.error('Error creating A/B test:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ab-test-form">
      <div className="form-header">
        <h3>Create New A/B Test</h3>
        {onCancel && (
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Experiment Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., FAQ Layout Test"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="target_metric">Target Metric *</label>
            <select
              id="target_metric"
              name="target_metric"
              value={formData.target_metric}
              onChange={handleChange}
              required
            >
              <option value="">Select a metric to track</option>
              {targetMetrics.map(metric => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="2"
            placeholder="Brief description of what this test does"
          />
        </div>

        <div className="form-group">
          <label htmlFor="hypothesis">Hypothesis *</label>
          <textarea
            id="hypothesis"
            name="hypothesis"
            value={formData.hypothesis}
            onChange={handleChange}
            required
            rows="3"
            placeholder="e.g., If we change the FAQ layout from a list to cards, then users will find answers faster and ticket submissions will decrease by 15%"
          />
        </div>

        <div className="form-section">
          <h4>Variants</h4>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="control_variant">Control Variant *</label>
              <input
                type="text"
                id="control_variant"
                name="control_variant"
                value={formData.control_variant}
                onChange={handleChange}
                required
                placeholder="e.g., Current FAQ List"
              />
              <small className="field-description">
                The current version (baseline)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="test_variant">Test Variant *</label>
              <input
                type="text"
                id="test_variant"
                name="test_variant"
                value={formData.test_variant}
                onChange={handleChange}
                required
                placeholder="e.g., FAQ Cards Layout"
              />
              <small className="field-description">
                The new version you want to test
              </small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Test Configuration</h4>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="minimum_sample_size">Minimum Sample Size</label>
              <input
                type="number"
                id="minimum_sample_size"
                name="minimum_sample_size"
                value={formData.minimum_sample_size}
                onChange={handleChange}
                min="50"
                max="10000"
                step="10"
              />
              <small className="field-description">
                Minimum users needed in each variant for reliable results
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confidence_level">Confidence Level</label>
              <select
                id="confidence_level"
                name="confidence_level"
                value={formData.confidence_level}
                onChange={handleChange}
              >
                {confidenceLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <small className="field-description">
                Statistical confidence required to call results significant
              </small>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="submit-button"
          >
            {isSubmitting ? 'Creating...' : 'Create A/B Test'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ABTestForm;