import React, { useState } from 'react';
import ABTestForm from './ABTestForm';
import ABTestList from './ABTestList';

const ABTesting = () => {
  const [showForm, setShowForm] = useState(false);
  const [testRefreshTrigger, setTestRefreshTrigger] = useState(0);

  const handleTestCreated = (newTest) => {
    console.group('🧪 A/B Test Created');
    console.log('Test:', newTest);
    console.log('You can now start the experiment and begin collecting data');
    console.groupEnd();
    
    // Refresh the test list
    setTestRefreshTrigger(prev => prev + 1);
    
    // Hide the form after creation
    setShowForm(false);
  };

  return (
    <div className="ab-testing-container">
      <div className="ab-testing-header">
        <div className="header-content">
          <h2>🧪 A/B Testing</h2>
          <p>Design experiments, test hypotheses, and make data-driven decisions</p>
        </div>
        <div className="header-actions">
          {!showForm ? (
            <button 
              onClick={() => setShowForm(true)}
              className="create-test-button"
            >
              ➕ Create New Test
            </button>
          ) : (
            <button 
              onClick={() => setShowForm(false)}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="form-section">
          <ABTestForm 
            onTestCreated={handleTestCreated}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <div className="tests-section">
        <ABTestList refreshTrigger={testRefreshTrigger} />
      </div>
    </div>
  );
};

export default ABTesting;