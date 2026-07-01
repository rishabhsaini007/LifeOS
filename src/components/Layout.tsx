import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Clock, 
  Bell, 
  CheckSquare, 
  Flame, 
  Calendar, 
  History,
  MessageSquareCode, 
  Settings, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Plus, 
  LogOut, 
  CloudRain, 
  CloudLightning,
  Search
} from 'lucide-react';
import { parseNaturalLanguageInput } from '../gemini';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { user, isCloudSync, logout, updateSettings, addTask, addReminder, addTimetableEntry, tasks, reminders, timetableEntries, habits } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddResult, setQuickAddResult] = useState<any>(null);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  
  // Search Modal States
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth Form Modal States
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const { login: appLogin, register: appRegister } = useApp();

  const toggleTheme = () => {
    if (!user) return;
    const newTheme = user.theme === 'light' ? 'dark' : 'light';
    updateSettings(user.displayName || '', newTheme, user.geminiKey || '', user.preferences);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    setQuickAddLoading(true);
    setQuickAddResult(null);
    try {
      const nowContext = new Date().toString();
      const result = await parseNaturalLanguageInput(quickAddText, nowContext);
      
      setQuickAddResult(result);
      
      // If we extracted items successfully, add them!
      if (result.items && result.items.length > 0 && !result.missingInfo) {
        for (const item of result.items) {
          if (item.type === 'task') {
            await addTask({
              title: item.title,
              description: item.description || '',
              dueDate: item.date || new Date().toISOString().split('T')[0],
              dueTime: item.time || '12:00',
              priority: item.priority || 'Medium',
              category: item.category || 'General',
              status: 'Not started',
              matrixQuadrant: item.priority === 'High' ? 'q1' : 'q2'
            });
          } else if (item.type === 'reminder') {
            await addReminder({
              title: item.title,
              description: item.description || '',
              date: item.date || new Date().toISOString().split('T')[0],
              time: item.time || '12:00',
              priority: item.priority || 'Medium',
              category: item.category || 'General',
              repeat: item.repeat || 'one-time',
              alertOffset: 15 // Default 15 minutes before
            });
          } else if (item.type === 'timetable') {
            await addTimetableEntry({
              profileId: 'default', // Active profile fallback
              title: item.title,
              description: item.description || '',
              startTime: item.time || '09:00',
              endTime: '10:00', // Default 1 hour duration
              category: item.category || 'Routine',
              priority: item.priority || 'Medium',
              weekdays: [new Date().getDay()] // Default active today
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
    setAuthError('');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await appRegister(authEmail, authPassword, authName);
      } else {
        await appLogin(authEmail, authPassword);
      }
      closeAuthModal();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    { id: 'timetable', label: 'Timetable', icon: <Clock size={20} /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell size={20} /> },
    { id: 'tasks', label: 'Tasks & Matrix', icon: <CheckSquare size={20} /> },
    { id: 'habits', label: 'Habits', icon: <Flame size={20} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={20} /> },
    { id: 'history', label: 'Activity Logs', icon: <History size={20} /> },
    { id: 'assistant', label: 'AI Assistant', icon: <MessageSquareCode size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  const filteredTasks = searchQuery.trim() 
    ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const filteredReminders = searchQuery.trim()
    ? reminders.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || (r.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const filteredTimetable = searchQuery.trim()
    ? timetableEntries.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const filteredHabits = searchQuery.trim()
    ? habits.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <Clock className="text-primary" size={28} />
          <span className="logo-text">LifeOS</span>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', padding: '0.65rem 0.85rem', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}
            onClick={() => setSearchOpen(true)}
          >
            <Search size={16} className="text-secondary" />
            <span className="text-secondary" style={{ opacity: 0.8 }}>Search agenda...</span>
          </button>
        </div>
        
        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.id}>
                <a 
                  className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Cloud Sync Status */}
          <div className="glass-card" style={{ padding: '0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isCloudSync ? (
              <>
                <CloudLightning className="text-primary" size={16} />
                <span className="text-secondary">Synced: {user?.email}</span>
              </>
            ) : (
              <>
                <CloudRain className="text-muted" size={16} />
                <span className="text-secondary">Offline / Demo Mode</span>
              </>
            )}
          </div>

          <div className="flex-between">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
              {user?.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {isCloudSync ? (
              <button className="theme-toggle" onClick={logout} title="Sign Out">
                <LogOut size={20} />
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => { setIsRegistering(false); setAuthModalOpen(true); }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="mobile-nav" style={{ top: 0, bottom: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', borderTop: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock className="text-primary" size={24} />
          <span className="logo-text" style={{ fontSize: '1.25rem' }}>LifeOS</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="theme-toggle" onClick={() => setSearchOpen(true)}>
            <Search size={18} />
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {user?.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="theme-toggle" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Main Dynamic View Content */}
      <main className="main-content" style={{ marginTop: '3.5rem' }}>
        {children}
      </main>

      {/* Mobile Bottom Navigation (Quick Icons) */}
      <nav className="mobile-nav">
        <a className={`mobile-nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
          <Home size={18} />
          <span>Overview</span>
        </a>
        <a className={`mobile-nav-item ${currentTab === 'timetable' ? 'active' : ''}`} onClick={() => handleTabChange('timetable')}>
          <Clock size={18} />
          <span>Schedule</span>
        </a>
        <a className={`mobile-nav-item ${currentTab === 'tasks' ? 'active' : ''}`} onClick={() => handleTabChange('tasks')}>
          <CheckSquare size={18} />
          <span>Tasks</span>
        </a>
        <a className={`mobile-nav-item ${currentTab === 'habits' ? 'active' : ''}`} onClick={() => handleTabChange('habits')}>
          <Flame size={18} />
          <span>Habits</span>
        </a>
        <a className={`mobile-nav-item ${currentTab === 'assistant' ? 'active' : ''}`} onClick={() => handleTabChange('assistant')}>
          <MessageSquareCode size={18} />
          <span>Assistant</span>
        </a>
      </nav>

      {/* Mobile Full Sidebar Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="modal-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '280px', position: 'absolute', right: 0, top: 0, bottom: 0, height: '100vh', borderRadius: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="logo-text">More Sections</span>
              <button className="theme-toggle" onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'calc(100% - 70px)' }}>
              {navItems.map((item) => (
                <a 
                  key={item.id} 
                  className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
              
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                  {isCloudSync ? `Cloud: ${user?.email}` : 'Offline Mode (Local Storage)'}
                </div>
                {isCloudSync ? (
                  <button className="btn btn-danger btn-block" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                    Sign Out
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => { setIsRegistering(false); setAuthModalOpen(true); setMobileMenuOpen(false); }}>
                    Sign In Cloud Sync
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Natural Language Quick Add */}
      <button className="fab" onClick={() => setQuickAddOpen(true)} title="Quick Add Anything">
        <Plus size={28} />
      </button>

      {/* Quick Add Modal */}
      {quickAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="section-title"><Plus className="text-primary" size={20} /> Smart Quick Add</h2>
              <button className="theme-toggle" onClick={() => { setQuickAddOpen(false); setQuickAddResult(null); setQuickAddText(''); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleQuickAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Type naturally to schedule a reminder, task, or timetable block. 
                  (e.g., <i>"Study chemistry tomorrow at 4 PM"</i> or <i>"Buy milk by 8 PM"</i>)
                </p>
                <div className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="What would you like to plan?"
                    value={quickAddText}
                    onChange={(e) => setQuickAddText(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={quickAddLoading}>
                  {quickAddLoading ? 'Analyzing...' : 'Add Now'}
                </button>
              </form>

              {quickAddResult && (
                <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {quickAddResult.response}
                  </p>
                  {quickAddResult.missingInfo && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginTop: '0.5rem', fontWeight: 500 }}>
                      ⚠️ {quickAddResult.missingInfo}
                    </p>
                  )}
                  {!quickAddResult.missingInfo && quickAddResult.items && quickAddResult.items.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Successfully parsed and recorded {quickAddResult.items.length} item(s).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cloud Authentication Modal */}
      {authModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="section-title">
                {isRegistering ? 'Create LifeOS Cloud Account' : 'Sign in to LifeOS Cloud'}
              </h2>
              <button className="theme-toggle" onClick={closeAuthModal}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {authError && (
                  <div style={{ padding: '0.5rem 1rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    {authError}
                  </div>
                )}
                {isRegistering && (
                  <div className="form-group">
                    <label>Display Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  {isRegistering ? 'Register & Sync' : 'Login & Sync'}
                </button>
              </form>

              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
                <span className="text-secondary">
                  {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
                </span>
                <a 
                  style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setIsRegistering(!isRegistering)}
                >
                  {isRegistering ? 'Sign In Instead' : 'Register Here'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="section-title"><Search className="text-primary" size={20} /> Global Search</h2>
              <button className="theme-toggle" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search across tasks, reminders, routines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {searchQuery.trim() && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Matching Tasks */}
                  {filteredTasks.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--danger)', marginBottom: '0.4rem' }}>Tasks</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredTasks.map(t => (
                          <div 
                            key={t.id} 
                            style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { handleTabChange('tasks'); setSearchOpen(false); setSearchQuery(''); }}
                          >
                            <strong>{t.title}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Due: {t.dueDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Reminders */}
                  {filteredReminders.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--warning)', marginBottom: '0.4rem' }}>Reminders</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredReminders.map(r => (
                          <div 
                            key={r.id} 
                            style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { handleTabChange('reminders'); setSearchOpen(false); setSearchQuery(''); }}
                          >
                            <strong>{r.title}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Alarm: {r.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Timetable blocks */}
                  {filteredTimetable.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.4rem' }}>Schedules</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredTimetable.map(e => (
                          <div 
                            key={e.id} 
                            style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { handleTabChange('timetable'); setSearchOpen(false); setSearchQuery(''); }}
                          >
                            <strong>{e.title}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Time: {e.startTime} - {e.endTime}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Habits */}
                  {filteredHabits.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--info)', marginBottom: '0.4rem' }}>Habits</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredHabits.map(h => (
                          <div 
                            key={h.id} 
                            style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }}
                            onClick={() => { handleTabChange('habits'); setSearchOpen(false); setSearchQuery(''); }}
                          >
                            <strong>{h.name}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Streak: {h.streak} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTasks.length === 0 && filteredReminders.length === 0 && filteredTimetable.length === 0 && filteredHabits.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
                      No matching items found for "{searchQuery}"
                    </p>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Layout;
