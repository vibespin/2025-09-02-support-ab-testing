const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/init');

const router = express.Router();

// GET /api/faqs - List all FAQs with optional search and category filter
router.get('/', (req, res) => {
  const { search, category } = req.query;
  const db = getDatabase();
  
  let query = 'SELECT * FROM faqs';
  let params = [];
  let conditions = [];
  
  // Add search functionality
  if (search) {
    conditions.push('(question LIKE ? OR answer LIKE ? OR category LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  // Add category filter
  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  
  // Build final query
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching FAQs:', err);
      res.status(500).json({ error: 'Failed to fetch FAQs' });
    } else {
      res.json(rows);
    }
  });
});

// GET /api/faqs/:id - Get specific FAQ
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get('SELECT * FROM faqs WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching FAQ:', err);
      res.status(500).json({ error: 'Failed to fetch FAQ' });
    } else if (!row) {
      res.status(404).json({ error: 'FAQ not found' });
    } else {
      res.json(row);
    }
  });
});

// POST /api/faqs - Create new FAQ
router.post('/', (req, res) => {
  const { question, answer, category = 'general' } = req.body;
  
  // Basic validation
  if (!question || !answer) {
    return res.status(400).json({ 
      error: 'Missing required fields: question, answer' 
    });
  }
  
  // Category validation
  const validCategories = ['general', 'account', 'technical', 'billing'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ 
      error: 'Category must be: general, account, technical, or billing' 
    });
  }
  
  const db = getDatabase();
  const faqId = uuidv4();
  
  db.run(
    `INSERT INTO faqs (id, question, answer, category) 
     VALUES (?, ?, ?, ?)`,
    [faqId, question, answer, category],
    function(err) {
      if (err) {
        console.error('Error creating FAQ:', err);
        res.status(500).json({ error: 'Failed to create FAQ' });
      } else {
        console.log(`✅ Created FAQ: ${faqId} - ${question.substring(0, 50)}...`);
        res.status(201).json({ 
          id: faqId, 
          question, 
          answer, 
          category,
          message: 'FAQ created successfully' 
        });
      }
      }
  );
});

// PUT /api/faqs/:id - Update FAQ
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { question, answer, category } = req.body;
  
  // Basic validation
  if (!question || !answer) {
    return res.status(400).json({ 
      error: 'Missing required fields: question, answer' 
    });
  }
  
  // Category validation
  const validCategories = ['general', 'account', 'technical', 'billing'];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({ 
      error: 'Category must be: general, account, technical, or billing' 
    });
  }
  
  const db = getDatabase();
  
  db.run(
    'UPDATE faqs SET question = ?, answer = ?, category = ? WHERE id = ?',
    [question, answer, category || 'general', id],
    function(err) {
      if (err) {
        console.error('Error updating FAQ:', err);
        res.status(500).json({ error: 'Failed to update FAQ' });
      } else if (this.changes === 0) {
        res.status(404).json({ error: 'FAQ not found' });
      } else {
        console.log(`📝 Updated FAQ ${id}: ${question.substring(0, 50)}...`);
        res.json({ 
          id, 
          question, 
          answer, 
          category,
          message: 'FAQ updated successfully' 
        });
      }
      }
  );
});

// DELETE /api/faqs/:id - Delete FAQ
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  db.run('DELETE FROM faqs WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting FAQ:', err);
      res.status(500).json({ error: 'Failed to delete FAQ' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'FAQ not found' });
    } else {
      console.log(`🗑️ Deleted FAQ ${id}`);
      res.json({ message: 'FAQ deleted successfully' });
    }
  });
});

// GET /api/faqs/categories/stats - Get FAQ count by category
router.get('/categories/stats', (req, res) => {
  const db = getDatabase();
  
  db.all(
    'SELECT category, COUNT(*) as count FROM faqs GROUP BY category ORDER BY count DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching FAQ stats:', err);
        res.status(500).json({ error: 'Failed to fetch FAQ statistics' });
      } else {
        res.json(rows);
      }
      }
  );
});

module.exports = router;