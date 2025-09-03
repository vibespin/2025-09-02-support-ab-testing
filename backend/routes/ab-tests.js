const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

const router = express.Router();

// Utility function for statistical calculations
const calculateStatistics = {
  // Calculate conversion rate
  conversionRate: (conversions, total) => total > 0 ? conversions / total : 0,
  
  // Calculate standard error for conversion rate
  standardError: (conversionRate, sampleSize) => {
    if (sampleSize <= 0) return 0;
    return Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
  },
  
  // Calculate z-score for two proportions
  zScore: (p1, p2, se1, se2) => {
    const seCombined = Math.sqrt(se1 * se1 + se2 * se2);
    return seCombined > 0 ? (p1 - p2) / seCombined : 0;
  },
  
  // Calculate p-value from z-score (two-tailed test)
  pValue: (zScore) => 2 * (1 - normalCdf(Math.abs(zScore))),
  
  // Calculate confidence interval
  confidenceInterval: (proportion, standardError, confidenceLevel = 0.95) => {
    const zCritical = confidenceLevel === 0.95 ? 1.96 : 2.576; // 95% or 99%
    const margin = zCritical * standardError;
    return {
      lower: Math.max(0, proportion - margin),
      upper: Math.min(1, proportion + margin)
    };
  }
};

// Approximate normal CDF function
function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// Approximate error function
function erf(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}

// GET /api/ab-tests - List all experiments
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all(
    `SELECT *, 
     (SELECT COUNT(*) FROM ab_test_assignments WHERE test_id = ab_tests.id) as total_participants
     FROM ab_tests ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching A/B tests:', err);
        res.status(500).json({ error: 'Failed to fetch A/B tests' });
      } else {
        res.json(rows);
      }
      }
  );
});

// GET /api/ab-tests/:id - Get specific experiment details
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  try {
    // Get experiment details
    const experiment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM ab_tests WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!experiment) {
        return res.status(404).json({ error: 'Experiment not found' });
    }
    
    // Get participant counts by variant
    const participants = await new Promise((resolve, reject) => {
      db.all(
        `SELECT variant, COUNT(*) as count 
         FROM ab_test_assignments 
         WHERE test_id = ? 
         GROUP BY variant`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    // Get latest results
    const results = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM ab_test_results WHERE test_id = ? ORDER BY calculated_at DESC',
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    res.json({
      experiment,
      participants,
      results
    });
    
  } catch (error) {
    console.error('Error fetching experiment details:', error);
    res.status(500).json({ error: 'Failed to fetch experiment details' });
  } finally {
  }
});

// POST /api/ab-tests - Create new experiment
router.post('/', (req, res) => {
  const { 
    name, 
    description, 
    hypothesis,
    control_variant, 
    test_variant,
    target_metric,
    minimum_sample_size = 100,
    confidence_level = 0.95
  } = req.body;
  
  // Basic validation
  if (!name || !control_variant || !test_variant || !target_metric) {
    return res.status(400).json({ 
      error: 'Missing required fields: name, control_variant, test_variant, target_metric' 
    });
  }
  
  // Validate confidence level
  if (confidence_level < 0.8 || confidence_level > 0.99) {
    return res.status(400).json({ 
      error: 'Confidence level must be between 0.8 and 0.99' 
    });
  }
  
  const db = getDatabase();
  const experimentId = uuidv4();
  
  db.run(
    `INSERT INTO ab_tests (id, name, description, hypothesis, control_variant, test_variant, 
                           target_metric, minimum_sample_size, confidence_level) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [experimentId, name, description, hypothesis, control_variant, test_variant, 
     target_metric, minimum_sample_size, confidence_level],
    function(err) {
      if (err) {
        console.error('Error creating A/B test:', err);
        res.status(500).json({ error: 'Failed to create A/B test' });
      } else {
        console.log(`✅ Created A/B test: ${experimentId} - ${name}`);
        res.status(201).json({ 
          id: experimentId, 
          name, 
          description,
          hypothesis,
          control_variant,
          test_variant,
          target_metric,
          minimum_sample_size,
          confidence_level,
          status: 'draft',
          message: 'A/B test created successfully' 
        });
      }
      }
  );
});

// PUT /api/ab-tests/:id/status - Update experiment status
router.put('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // Status validation
  if (!['draft', 'running', 'paused', 'completed'].includes(status)) {
    return res.status(400).json({ 
      error: 'Status must be: draft, running, paused, or completed' 
    });
  }
  
  const db = getDatabase();
  
  // Set start/end dates based on status
  let updateQuery = 'UPDATE ab_tests SET status = ?, updated_at = CURRENT_TIMESTAMP';
  let updateParams = [status, id];
  
  if (status === 'running') {
    updateQuery += ', start_date = CURRENT_TIMESTAMP WHERE id = ?';
  } else if (status === 'completed') {
    updateQuery += ', end_date = CURRENT_TIMESTAMP WHERE id = ?';
  } else {
    updateQuery += ' WHERE id = ?';
  }
  
  db.run(updateQuery, updateParams, function(err) {
    if (err) {
      console.error('Error updating A/B test status:', err);
      res.status(500).json({ error: 'Failed to update A/B test status' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'A/B test not found' });
    } else {
      console.log(`📝 Updated A/B test ${id} status to: ${status}`);
      res.json({ 
        id, 
        status, 
        message: 'A/B test status updated successfully' 
      });
    }
  });
});

// POST /api/ab-tests/:id/assign - Assign user to experiment variant
router.post('/:id/assign', async (req, res) => {
  const { id: testId } = req.params;
  const { user_identifier } = req.body;
  
  if (!user_identifier) {
    return res.status(400).json({ error: 'user_identifier is required' });
  }
  
  const db = getDatabase();
  
  try {
    // Check if experiment exists and is running
    const experiment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM ab_tests WHERE id = ?', [testId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!experiment) {
        return res.status(404).json({ error: 'Experiment not found' });
    }
    
    if (experiment.status !== 'running') {
        return res.status(400).json({ error: 'Experiment is not currently running' });
    }
    
    // Check if user is already assigned
    const existingAssignment = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM ab_test_assignments WHERE test_id = ? AND user_identifier = ?',
        [testId, user_identifier],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (existingAssignment) {
        return res.json({
        testId,
        user_identifier,
        variant: existingAssignment.variant,
        message: 'User already assigned',
        existing: true
      });
    }
    
    // Assign user to variant using true randomization (50/50 split)
    const variants = [experiment.control_variant, experiment.test_variant];
    const randomIndex = Math.floor(Math.random() * 2);
    const assignedVariant = variants[randomIndex];
    
    // Create assignment record
    const assignmentId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO ab_test_assignments (id, test_id, user_identifier, variant) VALUES (?, ?, ?, ?)',
        [assignmentId, testId, user_identifier, assignedVariant],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    console.log(`🎲 Assigned user ${user_identifier} to ${assignedVariant} variant in test ${testId}`);
    
    res.json({
      testId,
      user_identifier,
      variant: assignedVariant,
      message: 'User assigned to experiment variant',
      existing: false
    });
    
  } catch (error) {
    console.error('Error assigning user to experiment:', error);
    res.status(500).json({ error: 'Failed to assign user to experiment' });
  } finally {
  }
});

// POST /api/ab-tests/:id/events - Record experiment event
router.post('/:id/events', (req, res) => {
  const { id: testId } = req.params;
  const { user_identifier, event_name, event_value, event_data } = req.body;
  
  if (!user_identifier || !event_name) {
    return res.status(400).json({ 
      error: 'user_identifier and event_name are required' 
    });
  }
  
  const db = getDatabase();
  
  // First, get the user's variant assignment
  db.get(
    'SELECT variant FROM ab_test_assignments WHERE test_id = ? AND user_identifier = ?',
    [testId, user_identifier],
    (err, assignment) => {
      if (err) {
        console.error('Error checking user assignment:', err);
        res.status(500).json({ error: 'Failed to record event' });
            return;
      }
      
      if (!assignment) {
        res.status(400).json({ error: 'User not assigned to this experiment' });
            return;
      }
      
      // Record the event
      const eventId = uuidv4();
      db.run(
        `INSERT INTO ab_test_events (id, test_id, user_identifier, variant, event_name, event_value, event_data) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [eventId, testId, user_identifier, assignment.variant, event_name, event_value || null, event_data || null],
        function(err) {
          if (err) {
            console.error('Error recording A/B test event:', err);
            res.status(500).json({ error: 'Failed to record event' });
          } else {
            console.log(`📊 Recorded event "${event_name}" for user ${user_identifier} in test ${testId}`);
            res.status(201).json({ 
              eventId,
              testId,
              user_identifier,
              variant: assignment.variant,
              event_name,
              message: 'Event recorded successfully' 
            });
          }
              }
      );
    }
  );
});

// POST /api/ab-tests/:id/calculate - Calculate experiment results
router.post('/:id/calculate', async (req, res) => {
  const { id: testId } = req.params;
  const db = getDatabase();
  
  try {
    // Get experiment details
    const experiment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM ab_tests WHERE id = ?', [testId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!experiment) {
        return res.status(404).json({ error: 'Experiment not found' });
    }
    
    // Get conversion data for each variant
    const conversionData = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          a.variant,
          COUNT(DISTINCT a.user_identifier) as total_users,
          COUNT(DISTINCT CASE WHEN e.event_name = ? THEN e.user_identifier END) as conversions
        FROM ab_test_assignments a
        LEFT JOIN ab_test_events e ON a.test_id = e.test_id AND a.user_identifier = e.user_identifier
        WHERE a.test_id = ?
        GROUP BY a.variant
      `, [experiment.target_metric, testId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    if (conversionData.length < 2) {
        return res.status(400).json({ 
        error: 'Not enough data to calculate results. Need both control and test variants.' 
      });
    }
    
    // Calculate statistics for each variant
    const results = [];
    const variantStats = {};
    
    for (const data of conversionData) {
      const conversionRate = calculateStatistics.conversionRate(data.conversions, data.total_users);
      const standardError = calculateStatistics.standardError(conversionRate, data.total_users);
      const confidenceInterval = calculateStatistics.confidenceInterval(
        conversionRate, 
        standardError, 
        experiment.confidence_level
      );
      
      variantStats[data.variant] = {
        conversionRate,
        standardError,
        sampleSize: data.total_users,
        conversions: data.conversions
      };
      
      const resultId = uuidv4();
      const result = {
        id: resultId,
        test_id: testId,
        variant: data.variant,
        metric_name: experiment.target_metric,
        sample_size: data.total_users,
        conversion_count: data.conversions,
        conversion_rate: conversionRate,
        confidence_interval_lower: confidenceInterval.lower,
        confidence_interval_upper: confidenceInterval.upper,
        p_value: null, // Will calculate after comparing variants
        is_statistically_significant: false
      };
      
      results.push(result);
    }
    
    // Calculate statistical significance between control and test
    const controlStats = variantStats[experiment.control_variant];
    const testStats = variantStats[experiment.test_variant];
    
    if (controlStats && testStats) {
      const zScore = calculateStatistics.zScore(
        testStats.conversionRate,
        controlStats.conversionRate,
        testStats.standardError,
        controlStats.standardError
      );
      
      const pValue = calculateStatistics.pValue(zScore);
      const isSignificant = pValue < (1 - experiment.confidence_level);
      
      // Update results with p-value and significance
      results.forEach(result => {
        result.p_value = pValue;
        result.is_statistically_significant = isSignificant;
      });
    }
    
    // Clear previous results and insert new ones
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM ab_test_results WHERE test_id = ?', [testId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Insert new results
    for (const result of results) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO ab_test_results 
          (id, test_id, variant, metric_name, sample_size, conversion_count, 
           conversion_rate, confidence_interval_lower, confidence_interval_upper, 
           p_value, is_statistically_significant) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          result.id, result.test_id, result.variant, result.metric_name,
          result.sample_size, result.conversion_count, result.conversion_rate,
          result.confidence_interval_lower, result.confidence_interval_upper,
          result.p_value, result.is_statistically_significant
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    console.log(`📈 Calculated results for A/B test ${testId}`);
    
    res.json({
      testId,
      results,
      summary: {
        total_variants: results.length,
        has_significant_difference: results[0]?.is_statistically_significant || false,
        p_value: results[0]?.p_value,
        calculated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error calculating A/B test results:', error);
    res.status(500).json({ error: 'Failed to calculate A/B test results' });
  } finally {
  }
});

// GET /api/ab-tests/:id/results - Get experiment results (real-time calculations)
router.get('/:id/results', async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  try {
    // Get experiment details
    const experiment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM ab_tests WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!experiment) {
      return res.status(404).json({ error: 'A/B test not found' });
    }

    // Get real-time conversion data
    const conversionData = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          a.variant,
          COUNT(DISTINCT a.user_id) as total_users,
          COUNT(DISTINCT e.user_id) as conversions
        FROM ab_test_assignments a
        LEFT JOIN ab_test_events e ON a.test_id = e.test_id 
          AND a.user_id = e.user_id 
          AND e.event_name = ?
        WHERE a.test_id = ?
        GROUP BY a.variant
        ORDER BY a.variant
      `, [experiment.target_metric, id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (conversionData.length === 0) {
      return res.json([]);
    }

    // Calculate real-time statistics
    const results = [];
    const variantStats = {};

    for (const data of conversionData) {
      const conversionRate = data.total_users > 0 ? data.conversions / data.total_users : 0;
      const standardError = calculateStatistics.standardError(conversionRate, data.total_users);
      const confidenceInterval = calculateStatistics.confidenceInterval(
        conversionRate, 
        standardError, 
        experiment.confidence_level
      );
      
      variantStats[data.variant] = {
        conversionRate,
        standardError,
        sampleSize: data.total_users,
        conversions: data.conversions
      };
      
      const result = {
        variant: data.variant,
        metric_name: experiment.target_metric,
        sample_size: data.total_users,
        conversion_count: data.conversions,
        conversion_rate: conversionRate,
        confidence_interval_lower: confidenceInterval.lower,
        confidence_interval_upper: confidenceInterval.upper,
        p_value: null, // Will calculate after comparing variants
        is_statistically_significant: false
      };
      
      results.push(result);
    }

    // Calculate statistical significance between variants
    if (results.length === 2) {
      const controlVariant = results.find(r => r.variant === experiment.control_variant);
      const testVariant = results.find(r => r.variant === experiment.test_variant);
      
      if (controlVariant && testVariant) {
        const controlStats = variantStats[experiment.control_variant];
        const testStats = variantStats[experiment.test_variant];
        
        const zScore = calculateStatistics.zScore(
          controlStats.conversionRate,
          testStats.conversionRate,
          controlStats.standardError,
          testStats.standardError
        );
        
        const pValue = calculateStatistics.pValue(zScore);
        const isSignificant = calculateStatistics.isSignificant(pValue, experiment.confidence_level);
        
        // Update both results with the same p-value and significance
        results.forEach(result => {
          result.p_value = pValue;
          result.is_statistically_significant = isSignificant;
        });
      }
    }

    console.log(`📊 Real-time results calculated for test ${id}:`, results);
    res.json(results);
  } catch (error) {
    console.error('Error calculating real-time A/B test results:', error);
    res.status(500).json({ error: 'Failed to calculate A/B test results' });
  }
});

module.exports = router;