import React, { useState } from 'react';
import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import FAQForm from './components/FAQForm';
import FAQList from './components/FAQList';
import ABTesting from './components/ABTesting';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('currentTab') || 'tickets';
  });
  const [ticketRefreshTrigger, setTicketRefreshTrigger] = useState(0);
  const [faqRefreshTrigger, setFaqRefreshTrigger] = useState(0);
  const [editingFAQ, setEditingFAQ] = useState(null);

  const handleTicketSubmitted = () => {
    setTicketRefreshTrigger(prev => prev + 1);
  };

  const handleFAQSubmitted = () => {
    setFaqRefreshTrigger(prev => prev + 1);
  };

  const handleEditFAQ = (faq) => {
    setEditingFAQ(faq);
  };

  const handleCancelEdit = () => {
    setEditingFAQ(null);
  };

  const tabs = [
    { id: 'tickets', label: 'Support Tickets', icon: '🎫' },
    { id: 'faqs', label: 'FAQ Management', icon: '❓' },
    { id: 'ab-testing', label: 'A/B Testing', icon: '🧪' }
  ];

  return (
    <div className="app">
      <div className="container">
        <header className="app-header">
          <h1>Customer Support System</h1>
          <p>Manage support tickets and knowledge base</p>
        </header>

        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                localStorage.setItem('currentTab', tab.id);
              }}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="main-content">
          {activeTab === 'tickets' && (
            <div className="tab-content">
              <div className="app-main">
                <section className="ticket-form-section">
                  <h2>Submit a Support Ticket</h2>
                  <TicketForm onTicketSubmitted={handleTicketSubmitted} />
                </section>

                <section className="ticket-list-section">
                  <h2>Support Tickets</h2>
                  <TicketList refreshTrigger={ticketRefreshTrigger} />
                </section>
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="tab-content">
              <div className="app-main">
                <section className="faq-form-section">
                  <FAQForm 
                    onFAQSubmitted={handleFAQSubmitted} 
                    editingFAQ={editingFAQ}
                    onCancelEdit={handleCancelEdit}
                  />
                </section>

                <section className="faq-list-section">
                  <h2>FAQ Knowledge Base</h2>
                  <FAQList 
                    refreshTrigger={faqRefreshTrigger} 
                    onEditFAQ={handleEditFAQ}
                  />
                </section>
              </div>
            </div>
          )}

          {activeTab === 'ab-testing' && (
            <div className="tab-content">
              <ABTesting />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
