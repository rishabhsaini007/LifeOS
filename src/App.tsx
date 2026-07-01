import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { registerServiceWorker } from './swRegistration';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TimetableManager from './components/TimetableManager';
import ReminderManager from './components/ReminderManager';
import TaskManager from './components/TaskManager';
import HabitTracker from './components/HabitTracker';
import CalendarView from './components/CalendarView';
import SmartAssistant from './components/SmartAssistant';
import SettingsManager from './components/SettingsManager';
import HistoryLogsManager from './components/HistoryLogsManager';
import { BrainCircuit } from 'lucide-react';

function AppContent() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const { loading } = useApp();

  // Register service worker and bind push notifications / background tasks
  useEffect(() => {
    registerServiceWorker((action, reminderId) => {
      console.log(`PWA Callback triggered: Action "${action}" on Reminder "${reminderId}"`);
      // We can also trigger specific redirection or context actions directly from background click
      if (action === 'click') {
        setCurrentTab('reminders');
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ padding: '1rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)', animation: 'pulseGlow 2s infinite' }}>
          <BrainCircuit size={40} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Initializing LifeOS</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Setting up your secure memory workspace...</p>
        </div>
      </div>
    );
  }

  // Render view based on active tab selection
  const renderView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'timetable':
        return <TimetableManager />;
      case 'reminders':
        return <ReminderManager />;
      case 'tasks':
        return <TaskManager />;
      case 'habits':
        return <HabitTracker />;
      case 'calendar':
        return <CalendarView />;
      case 'history':
        return <HistoryLogsManager />;
      case 'assistant':
        return <SmartAssistant />;
      case 'settings':
        return <SettingsManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderView()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
