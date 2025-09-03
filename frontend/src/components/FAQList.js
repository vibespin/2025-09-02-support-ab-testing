import React, { useState, useEffect, useCallback } from 'react';

const FAQList = ({ refreshTrigger, onEditFAQ }) => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryStats, setCategoryStats] = useState([]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'account', label: 'Account' },
    { value: 'technical', label: 'Technical' },
    { value: 'billing', label: 'Billing' }
  ];

  const fetchFAQs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm);
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      const queryString = params.toString();
      const url = `http://localhost:3001/api/faqs${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setFaqs(data);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch FAQs');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, selectedCategory]);

  const fetchCategoryStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/faqs/categories/stats');
      const data = await response.json();
      
      if (response.ok) {
        setCategoryStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch category stats:', err);
    }
  };

  const deleteFAQ = async (faqId) => {
    if (!window.confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/faqs/${faqId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFAQs(); // Refresh the list
        fetchCategoryStats(); // Update stats
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete FAQ');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fetch FAQs when debounced search term or category changes
  useEffect(() => {
    fetchFAQs();
  }, [debouncedSearchTerm, selectedCategory, fetchFAQs]);

  // Fetch FAQs when refresh trigger changes
  useEffect(() => {
    fetchFAQs();
  }, [refreshTrigger, fetchFAQs]);

  useEffect(() => {
    fetchCategoryStats();
  }, [refreshTrigger]);

  const getCategoryColor = (category) => {
    const colors = {
      general: '#007bff',
      account: '#28a745',
      technical: '#dc3545',
      billing: '#ffc107'
    };
    return colors[category] || '#6c757d';
  };

  const getCategoryCount = (category) => {
    const stat = categoryStats.find(s => s.category === category);
    return stat ? stat.count : 0;
  };

  if (loading) return <div className="loading">Loading FAQs...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="faq-list">
      <div className="faq-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
                {cat.value !== 'all' && ` (${getCategoryCount(cat.value)})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {faqs.length === 0 ? (
        <div className="empty-state">
          <p>
            {searchTerm || selectedCategory !== 'all' 
              ? 'No FAQs match your search criteria.' 
              : 'No FAQs found. Add your first FAQ to get started!'
            }
          </p>
        </div>
      ) : (
        <div className="faqs-grid">
          {faqs.map((faq) => (
            <div key={faq.id} className="faq-card">
              <div className="faq-header">
                <span 
                  className="category-badge"
                  style={{ backgroundColor: getCategoryColor(faq.category) }}
                >
                  {faq.category}
                </span>
                <div className="faq-actions">
                  <button
                    onClick={() => onEditFAQ(faq)}
                    className="edit-button"
                    title="Edit FAQ"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteFAQ(faq.id)}
                    className="delete-button"
                    title="Delete FAQ"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="faq-content">
                <h4 className="faq-question">{faq.question}</h4>
                <p className="faq-answer">{faq.answer}</p>
              </div>
              
              <div className="faq-meta">
                <small>Created: {new Date(faq.created_at).toLocaleDateString()}</small>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {faqs.length > 0 && (
        <div className="faq-summary">
          <p>Showing {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''}</p>
        </div>
      )}
    </div>
  );
};

export default FAQList;