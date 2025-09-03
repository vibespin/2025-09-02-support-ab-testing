const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Support API is running' });
});

// Ticket routes (Phase 1)
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

// FAQ routes (Phase 2) 
const faqRoutes = require('./routes/faqs');
app.use('/api/faqs', faqRoutes);

// User preferences routes (Phase 3)
const preferencesRoutes = require('./routes/preferences');
app.use('/api/preferences', preferencesRoutes);

// A/B Testing routes (Phase 4)
const abTestRoutes = require('./routes/ab-tests');
app.use('/api/ab-tests', abTestRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api/health`);
});