// A/B Testing Integration Service
class ABTestingService {
  constructor() {
    this.userIdentifier = this.getUserIdentifier();
    this.activeTests = new Map(); // Cache for active test assignments
    this.isEnabled = true; // Can be disabled in production if needed
  }

  // Generate or retrieve user identifier
  getUserIdentifier() {
    let userId = localStorage.getItem('ab_test_user_id');
    if (!userId) {
      // Generate a unique identifier for this browser session
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ab_test_user_id', userId);
    }
    return userId;
  }

  // Get user assignment for a specific test
  async getUserAssignment(testId) {
    if (!this.isEnabled) return null;
    
    // Check cache first
    if (this.activeTests.has(testId)) {
      return this.activeTests.get(testId);
    }

    try {
      const response = await fetch(`http://localhost:3001/api/ab-tests/${testId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_identifier: this.userIdentifier
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assignment = {
          variant: data.variant,
          existing: data.existing
        };
        
        // Cache the assignment
        this.activeTests.set(testId, assignment);
        
        if (!data.existing) {
          console.log(`🧪 Assigned to A/B test "${testId}": ${data.variant}`);
        }
        
        return assignment;
      }
    } catch (error) {
      console.error('Error getting A/B test assignment:', error);
    }
    
    return null;
  }

  // Track an event for A/B testing
  async trackEvent(testId, eventName, eventValue = null, eventData = null) {
    if (!this.isEnabled) return;

    try {
      const response = await fetch(`http://localhost:3001/api/ab-tests/${testId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_identifier: this.userIdentifier,
          event_name: eventName,
          event_value: eventValue,
          event_data: eventData ? JSON.stringify(eventData) : null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Tracked event "${eventName}" for test ${testId}`);
        return data;
      }
    } catch (error) {
      console.error('Error tracking A/B test event:', error);
    }
    
    return null;
  }

  // Helper: Check if user is in a specific variant for a test
  async isInVariant(testId, variantName) {
    const assignment = await this.getUserAssignment(testId);
    return assignment && assignment.variant === variantName;
  }

  // Helper: Get all active test assignments for debugging
  getActiveAssignments() {
    return Object.fromEntries(this.activeTests);
  }

  // Helper: Clear all cached assignments (useful for testing)
  clearAssignments() {
    this.activeTests.clear();
    console.log('🧹 Cleared all A/B test assignments');
  }

  // Helper: Disable A/B testing (useful for production control)
  disable() {
    this.isEnabled = false;
    console.log('🚫 A/B testing disabled');
  }

  // Helper: Enable A/B testing
  enable() {
    this.isEnabled = true;
    console.log('✅ A/B testing enabled');
  }
}

// Create a singleton instance
const abTestingService = new ABTestingService();

// Export the service and make it available globally for debugging
if (typeof window !== 'undefined') {
  window.abTestingService = abTestingService;
}

export default abTestingService;