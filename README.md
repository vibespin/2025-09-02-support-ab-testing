# Customer Support & A/B Testing System

A learning project focused on building core customer support functionality and A/B testing infrastructure from scratch.

## 🎯 Learning Goals

1. **Customer Support System**: Help desk ticketing, FAQ management, user communication flows
2. **A/B Testing**: Experiment setup, user assignment, metrics collection, statistical analysis

## 🏗️ Architecture Overview

**Why this stack?**
- **Node.js/Express**: Familiar, fast API development with excellent npm ecosystem
- **React**: Component-based UI perfect for forms and dashboards
- **SQLite**: Zero-config database that's easy to inspect and debug during development
- **Monorepo**: Simple development workflow - everything in one place

```
├── frontend/          # React app (port 3000)
├── backend/           # Express API (port 3001)
├── database/          # SQLite database file
└── package.json       # Root scripts for running both services
```

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd breakthrough_2025-09-02_support_ab_testing
npm run setup

# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health

## 📋 Implementation Phases

### ✅ Phase 0: Project Setup (COMPLETED)
**What we built:**
- Monorepo structure with frontend/backend separation
- Database schema design for all phases
- Development workflow with hot reloading

**Technical decisions:**
- Express server with CORS for cross-origin requests
- SQLite with promise-based queries for simplicity
- React with minimal template to focus on functionality

**Test it:**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"OK","message":"Support API is running"}
```

### 🔄 Phase 1: Help Desk Ticketing (IN PROGRESS)

**What we're building:**
- Ticket submission form (title, description, priority, contact email)
- Ticket storage with unique IDs and timestamps
- Basic ticket listing and viewing interface

**Learning focus:**
- Form handling and validation
- REST API design patterns
- Database CRUD operations
- Error handling and user feedback

**Database schema:**
```sql
tickets (
  id TEXT PRIMARY KEY,        -- UUID for unique identification
  title TEXT NOT NULL,        -- Short description
  description TEXT NOT NULL,  -- Detailed problem description
  priority TEXT DEFAULT 'medium',  -- low/medium/high
  status TEXT DEFAULT 'new',  -- new/in-progress/resolved
  contact_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**API endpoints to implement:**
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets` - List all tickets
- `GET /api/tickets/:id` - Get specific ticket
- `PUT /api/tickets/:id` - Update ticket status

### 🔜 Phase 2: FAQ System (PLANNED)

**What we'll build:**
- FAQ content management (create/edit questions and answers)
- Category organization for FAQs
- Search functionality across FAQ content
- FAQ display interface with filtering

**Learning focus:**
- Content management patterns
- Search implementation (basic text matching)
- Data organization and categorization

### 🔜 Phase 3: User Communication Flow (PLANNED)

**What we'll build:**
- Ticket status update workflow
- Email notification system (placeholder integration)
- User preference management
- Status tracking and history

**Learning focus:**
- State management and workflows
- Integration patterns (email providers)
- User preference handling

**Production integrations needed:**
- **SendGrid/Mailgun**: For sending status update emails
- **Twilio**: For SMS notifications (optional)

### 🔜 Phase 4: A/B Testing (PLANNED)

**What we'll build:**
- Experiment configuration interface
- User assignment to control/test groups
- Metrics collection and storage
- Basic statistical analysis dashboard

**Learning focus:**
- Experimentation methodology
- Statistical significance calculations
- Data visualization basics
- User segmentation

## 🗄️ Database Design

**Why SQLite?**
- Zero configuration - just a file
- Easy to examine data during development
- Built-in with Node.js sqlite3 package
- Perfect for learning and prototyping

**Schema highlights:**
- UUIDs for all primary keys (better than auto-increment for distributed systems)
- Timestamps for audit trails
- Foreign key relationships for data integrity
- Sensible defaults to reduce required fields

## 🧪 Testing Each Phase

### Testing Phase 1 (once implemented):
```bash
# 1. Submit a test ticket
curl -X POST http://localhost:3001/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login issues", 
    "description": "Cannot log into my account",
    "priority": "high",
    "contact_email": "user@example.com"
  }'

# 2. List all tickets
curl http://localhost:3001/api/tickets

# 3. View specific ticket
curl http://localhost:3001/api/tickets/<ticket-id>
```

## 🚀 Making This Production-Ready

**Current limitations and production solutions:**

### Security
- **Current**: No authentication/authorization
- **Production**: Implement JWT tokens, rate limiting, input validation

### Database
- **Current**: SQLite file storage
- **Production**: PostgreSQL with connection pooling, migrations

### Email Integration
- **Current**: Console logs only
- **Production**: SendGrid/Mailgun for transactional emails

### Monitoring
- **Current**: Basic console logging
- **Production**: Structured logging (Winston), APM (DataDog/New Relic)

### Deployment
- **Current**: Local development only  
- **Production**: Docker containers, CI/CD pipelines, environment management

### A/B Testing
- **Current**: Simple random assignment
- **Production**: Statistical power analysis, experiment ramping, bias detection

## 💡 Key Learning Takeaways

**Architecture decisions matter:**
- Monorepo vs microservices tradeoffs
- Database choice impacts development speed
- API design affects frontend complexity

**Progressive enhancement:**
- Start with core functionality
- Add complexity only when needed
- Placeholders for production integrations

**Full-stack thinking:**
- Frontend forms drive backend API design
- Database schema affects query performance
- User experience guides technical decisions

---

## 📝 Development Log

- **Commit 1**: Initial project setup and database schema
- **Commit 2**: Phase 1 - Help desk ticketing system (pending)
- **Commit 3**: Phase 2 - FAQ system (pending) 
- **Commit 4**: Phase 3 - User communication flow (pending)
- **Commit 5**: Phase 4 - A/B testing infrastructure (pending)

*Repository: https://github.com/OTProjects/breakthrough_2025-09-02_support_ab_testing*