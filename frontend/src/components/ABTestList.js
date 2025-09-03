import React, { useState, useEffect } from 'react';

const ABTestList = ({ refreshTrigger }) => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTest, setExpandedTest] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [calculating, setCalculating] = useState({});
  const [testErrors, setTestErrors] = useState({});

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/ab-tests');
      const data = await response.json();
      
      if (response.ok) {
        setTests(data);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch A/B tests');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateTestStatus = async (testId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:3001/api/ab-tests/${testId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await response.json();
        
        // Log status update to browser console
        console.group('🧪 A/B Test Status Updated');
        console.log('Test ID:', testId);
        console.log('New Status:', newStatus);
        console.groupEnd();
        
        // Refresh the test list
        fetchTests();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update test status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const calculateResults = async (testId) => {
    setCalculating(prev => ({ ...prev, [testId]: true }));
    
    try {
      const response = await fetch(`http://localhost:3001/api/ab-tests/${testId}/calculate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(prev => ({ ...prev, [testId]: data.results }));
        setTestErrors(prev => ({ ...prev, [testId]: null })); // Clear any previous errors
        
        console.group('📊 A/B Test Results Calculated');
        console.log('Test ID:', testId);
        console.log('Results:', data.results);
        console.log('Statistical Significance:', data.summary.has_significant_difference);
        console.log('P-value:', data.summary.p_value);
        console.groupEnd();
      } else {
        const data = await response.json();
        setTestErrors(prev => ({ ...prev, [testId]: data.error || 'Failed to calculate results' }));
      }
    } catch (err) {
      setTestErrors(prev => ({ ...prev, [testId]: 'Network error. Please try again.' }));
    } finally {
      setCalculating(prev => ({ ...prev, [testId]: false }));
    }
  };

  const toggleTestDetails = async (testId) => {
    if (expandedTest === testId) {
      setExpandedTest(null);
    } else {
      setExpandedTest(testId);
      
      // Always fetch the latest results when expanding
      try {
        // Always get the latest results from the database (now real-time!)
        let response = await fetch(`http://localhost:3001/api/ab-tests/${testId}/results`);
        let results;
        
        if (response.ok) {
          results = await response.json();
          // If no results exist, calculate them automatically
          if (!results || results.length === 0) {
            console.log('📊 No results found, calculating automatically...');
            await calculateResults(testId);
            return; // calculateResults will set the results
          }
          
          // Set the fresh results
          setTestResults(prev => ({ ...prev, [testId]: results }));
          console.log('📊 Loaded latest real-time results for test:', testId);
        } else {
          // If results endpoint fails, calculate them
          console.log('📊 Results endpoint failed, calculating...');
          await calculateResults(testId);
          return;
        }
      } catch (err) {
        console.error('Error fetching test results:', err);
        // Fallback to calculating results
        await calculateResults(testId);
      }
    }
  };

  // Auto-refresh results for expanded test every 5 seconds
  useEffect(() => {
    if (!expandedTest) return;

    const autoRefresh = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/ab-tests/${expandedTest}/results`);
        if (response.ok) {
          const results = await response.json();
          setTestResults(prev => ({ ...prev, [expandedTest]: results }));
          console.log('🔄 Auto-refreshed results for test:', expandedTest);
        }
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      }
    };

    const intervalId = setInterval(autoRefresh, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [expandedTest]);

  useEffect(() => {
    fetchTests();
  }, [refreshTrigger]);

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : 'Not set';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#6c757d';
      case 'running': return '#28a745';
      case 'paused': return '#ffc107';
      case 'completed': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatPValue = (pValue) => {
    if (!pValue) return 'Not calculated';
    return pValue < 0.001 ? '< 0.001' : pValue.toFixed(3);
  };

  if (loading) return <div className="loading">Loading A/B tests...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="ab-test-list">
      {tests.length === 0 ? (
        <div className="empty-state">
          <p>No A/B tests found. Create your first experiment to get started!</p>
        </div>
      ) : (
        <div className="tests-grid">
          {tests.map((test) => (
            <div key={test.id} className="test-card">
              <div className="test-header">
                <div className="test-title-section">
                  <h3>{test.name}</h3>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(test.status) }}
                  >
                    {test.status}
                  </span>
                </div>
                <div className="test-metrics">
                  <span className="participant-count">
                    👥 {test.total_participants || 0} participants
                  </span>
                  <span className="target-metric">
                    🎯 {test.target_metric}
                  </span>
                </div>
              </div>
              
              {test.description && (
                <p className="test-description">{test.description}</p>
              )}

              <div className="test-variants">
                <div className="variant control">
                  <strong>Control:</strong> {test.control_variant}
                </div>
                <div className="variant test">
                  <strong>Test:</strong> {test.test_variant}
                </div>
              </div>

              <div className="test-details">
                <p><strong>Hypothesis:</strong> {test.hypothesis || 'No hypothesis provided'}</p>
                <div className="test-metadata">
                  <span><strong>Created:</strong> {formatDate(test.created_at)}</span>
                  {test.start_date && (
                    <span><strong>Started:</strong> {formatDate(test.start_date)}</span>
                  )}
                  {test.end_date && (
                    <span><strong>Ended:</strong> {formatDate(test.end_date)}</span>
                  )}
                </div>
              </div>

              <div className="test-actions">
                <div className="status-actions">
                  {test.status === 'draft' && (
                    <button
                      onClick={() => updateTestStatus(test.id, 'running')}
                      className="start-button"
                    >
                      ▶️ Start Test
                    </button>
                  )}
                  
                  {test.status === 'running' && (
                    <>
                      <button
                        onClick={() => updateTestStatus(test.id, 'paused')}
                        className="pause-button"
                      >
                        ⏸️ Pause
                      </button>
                      <button
                        onClick={() => updateTestStatus(test.id, 'completed')}
                        className="stop-button"
                      >
                        ⏹️ Complete
                      </button>
                    </>
                  )}
                  
                  {test.status === 'paused' && (
                    <button
                      onClick={() => updateTestStatus(test.id, 'running')}
                      className="resume-button"
                    >
                      ▶️ Resume
                    </button>
                  )}
                </div>

                <div className="analysis-actions">
                  <button
                    onClick={() => calculateResults(test.id)}
                    disabled={calculating[test.id]}
                    className="calculate-button"
                  >
                    {calculating[test.id] ? 'Calculating...' : '📊 Refresh Results'}
                  </button>
                  
                  <button
                    onClick={() => toggleTestDetails(test.id)}
                    className="details-button"
                  >
                    {expandedTest === test.id ? '🔼 Hide Details' : '🔽 Show Details'}
                  </button>
                </div>
              </div>

              {expandedTest === test.id && (
                <div className="test-results">
                  <h4>Test Results</h4>
                  
                  {testErrors[test.id] && (
                    <div className="error-message" style={{
                      background: '#fff3cd',
                      color: '#856404',
                      padding: '12px',
                      borderRadius: '4px',
                      marginBottom: '20px',
                      border: '1px solid #ffeaa7'
                    }}>
                      ⚠️ {testErrors[test.id]}
                    </div>
                  )}
                  
                  {testResults[test.id] && testResults[test.id].length > 0 ? (
                    <div className="results-summary">
                      <div className="variants-comparison">
                        {testResults[test.id].map((result) => (
                          <div key={result.variant} className="variant-result">
                            <h5>{result.variant === test.control_variant ? '🅰️ Control' : '🅱️ Test'}: {result.variant}</h5>
                            <div className="result-metrics">
                              <div className="metric">
                                <span className="metric-label">Sample Size:</span>
                                <span className="metric-value">{result.sample_size}</span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Conversions:</span>
                                <span className="metric-value">{result.conversion_count}</span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Conversion Rate:</span>
                                <span className="metric-value conversion-rate">
                                  {formatPercentage(result.conversion_rate)}
                                </span>
                              </div>
                              <div className="metric">
                                <span className="metric-label">Confidence Interval:</span>
                                <span className="metric-value">
                                  [{formatPercentage(result.confidence_interval_lower)} - {formatPercentage(result.confidence_interval_upper)}]
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="statistical-significance">
                        <div className={`significance-indicator ${testResults[test.id][0]?.is_statistically_significant ? 'significant' : 'not-significant'}`}>
                          {testResults[test.id][0]?.is_statistically_significant ? 
                            '✅ Statistically Significant' : 
                            '⚠️ Not Statistically Significant'
                          }
                        </div>
                        <div className="p-value">
                          <strong>P-value:</strong> {formatPValue(testResults[test.id][0]?.p_value)}
                        </div>
                        <div className="confidence-level">
                          <strong>Confidence Level:</strong> {formatPercentage(test.confidence_level)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="no-results">
                      <p>No results available yet. Start the test and collect data, then calculate results.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ABTestList;