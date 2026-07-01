import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  User, 
  BrainCircuit, 
  Cloud, 
  Save, 
  RotateCcw, 
  Download, 
  Sliders,
  Moon,
  Sun,
  Eye,
  EyeOff
} from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const { user, isCloudSync, updateSettings } = useApp();

  // Settings states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [theme, setTheme] = useState<'light' | 'dark'>(user?.theme || 'dark');
  const [geminiKey, setGeminiKey] = useState(user?.geminiKey || localStorage.getItem('lifeos_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);

  // Notification Preferences
  const [notifyAtTime, setNotifyAtTime] = useState(user?.preferences.notifyAtTime ?? true);
  const [notifyBefore5m, setNotifyBefore5m] = useState(user?.preferences.notifyBefore5m ?? false);
  const [notifyBefore15m, setNotifyBefore15m] = useState(user?.preferences.notifyBefore15m ?? true);
  const [notifyBefore1h, setNotifyBefore1h] = useState(user?.preferences.notifyBefore1h ?? false);
  const [notifyBefore1d, setNotifyBefore1d] = useState(user?.preferences.notifyBefore1d ?? false);

  // Firebase configurations
  const [fbApiKey, setFbApiKey] = useState(() => {
    const saved = localStorage.getItem('lifeos_firebase_config');
    return saved ? JSON.parse(saved).apiKey : '';
  });
  const [fbAuthDomain, setFbAuthDomain] = useState(() => {
    const saved = localStorage.getItem('lifeos_firebase_config');
    return saved ? JSON.parse(saved).authDomain : '';
  });
  const [fbProjectId, setFbProjectId] = useState(() => {
    const saved = localStorage.getItem('lifeos_firebase_config');
    return saved ? JSON.parse(saved).projectId : '';
  });
  const [fbStorageBucket, setFbStorageBucket] = useState(() => {
    const saved = localStorage.getItem('lifeos_firebase_config');
    return saved ? JSON.parse(saved).storageBucket : '';
  });
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState(() => {
    const saved = localStorage.getItem('lifeos_firebase_config');
    return saved ? JSON.parse(saved).messagingSenderId : '';
  });
  const [fbAppId, setFbAppId] = useState(() => {
    const saved = localStorage.getItem('lifeos_firebase_config');
    return saved ? JSON.parse(saved).appId : '';
  });

  const [fbMessage, setFbMessage] = useState('');

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefs = {
      notifyAtTime,
      notifyBefore5m,
      notifyBefore15m,
      notifyBefore1h,
      notifyBefore1d
    };

    try {
      await updateSettings(displayName, theme, geminiKey, prefs);
      alert('Preferences successfully updated!');
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setFbMessage('');
    
    if (!fbApiKey.trim() || !fbProjectId.trim()) {
      localStorage.removeItem('lifeos_firebase_config');
      setFbMessage('Firebase config cleared. Running in local storage mode.');
      setTimeout(() => window.location.reload(), 1500);
      return;
    }

    const config = {
      apiKey: fbApiKey.trim(),
      authDomain: fbAuthDomain.trim(),
      projectId: fbProjectId.trim(),
      storageBucket: fbStorageBucket.trim(),
      messagingSenderId: fbMessagingSenderId.trim(),
      appId: fbAppId.trim()
    };

    localStorage.setItem('lifeos_firebase_config', JSON.stringify(config));
    setFbMessage('Firebase config saved! Reloading application to connect Cloud...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const exportBackup = () => {
    const backup: Record<string, any> = {};
    const keys = [
      'lifeos_user_profile',
      'lifeos_timetable_profiles',
      'lifeos_timetable_entries',
      'lifeos_reminders',
      'lifeos_tasks',
      'lifeos_habits',
      'lifeos_missed_reminders'
    ];

    keys.forEach(k => {
      const v = localStorage.getItem(k);
      if (v) backup[k] = JSON.parse(v);
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "lifeos_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const resetAllData = () => {
    if (confirm('CAUTION: This will wipe out all local timetables, tasks, alarms, and settings. This action is irreversible. Proceed?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Customize your profiles, configure AI assistants, link cloud sync databases, and manage backups.
        </p>
      </div>

      <div className="grid-2">
        
        {/* Left Column: Profile, Theme, AI Keys */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* User Profile Settings Form */}
          <div className="glass-card">
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}><User size={18} className="text-primary" /> Profile Preferences</h2>
            
            <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  placeholder="Your Name"
                  required 
                />
              </div>

              <div className="form-group">
                <label>Theme Selection</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={16} /> Light
                  </button>
                  <button 
                    type="button" 
                    className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={16} /> Dark
                  </button>
                </div>
              </div>

              {/* Notification preferences checkboxes */}
              <div className="form-group">
                <label>PWA Notification Settings</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyAtTime} onChange={(e) => setNotifyAtTime(e.target.checked)} />
                    Alert exactly at reminder time
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyBefore5m} onChange={(e) => setNotifyBefore5m(e.target.checked)} />
                    Alert 5 minutes before schedule
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyBefore15m} onChange={(e) => setNotifyBefore15m(e.target.checked)} />
                    Alert 15 minutes before schedule (Recommended)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyBefore1h} onChange={(e) => setNotifyBefore1h(e.target.checked)} />
                    Alert 1 hour before schedule
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifyBefore1d} onChange={(e) => setNotifyBefore1d(e.target.checked)} />
                    Alert 1 day before schedule
                  </label>
                </div>
              </div>

              {/* Gemini API Key Form */}
              <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <BrainCircuit size={16} className="text-primary" /> Gemini Developer API Key
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type={showKey ? 'text' : 'password'} 
                    className="form-control" 
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                    value={geminiKey} 
                    onChange={(e) => setGeminiKey(e.target.value)} 
                    placeholder="AI_SECRET_KEY"
                  />
                  <button 
                    type="button" 
                    className="theme-toggle" 
                    style={{ position: 'absolute', right: '0.5rem', padding: '0.25rem' }}
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Used locally to analyze routines and power natural language Quick Adds. Securely stored on-device.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifySelf: 'flex-start', marginTop: '0.5rem' }}>
                <Save size={16} /> Save Settings
              </button>
            </form>
          </div>

          {/* Backup Panel */}
          <div className="glass-card">
            <h2 className="section-title" style={{ marginBottom: '1rem' }}><Sliders size={18} className="text-primary" /> Data Management</h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Your scheduling database is stored inside your browser sandboxed local storage and securely synced with Firebase.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={exportBackup}>
                <Download size={15} /> Backup Data (JSON)
              </button>
              <button className="btn btn-danger" onClick={resetAllData}>
                <RotateCcw size={15} /> Reset Local Memory
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Firebase Cloud Sync config */}
        <div>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 className="section-title"><Cloud size={18} className="text-primary" /> Firebase Cloud Synchronization</h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Connecting Firestore enables real-time synchronization between your phone, tablet, and computer.
            </p>

            {isCloudSync && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600 }}>
                ✔️ Cloud Sync Active: Currently logged in as {user?.email}
              </div>
            )}

            {fbMessage && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--info-light)', color: 'var(--info)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                {fbMessage}
              </div>
            )}

            <form onSubmit={handleSaveFirebaseConfig} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label>Firebase API Key</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fbApiKey} 
                  onChange={(e) => setFbApiKey(e.target.value)} 
                  placeholder="AIzaSyA..."
                />
              </div>

              <div className="form-group">
                <label>Project ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fbProjectId} 
                  onChange={(e) => setFbProjectId(e.target.value)} 
                  placeholder="lifeos-app-123"
                />
              </div>

              <div className="form-group">
                <label>Auth Domain</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fbAuthDomain} 
                  onChange={(e) => setFbAuthDomain(e.target.value)} 
                  placeholder="lifeos-app-123.firebaseapp.com"
                />
              </div>

              <div className="form-group">
                <label>Storage Bucket</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fbStorageBucket} 
                  onChange={(e) => setFbStorageBucket(e.target.value)} 
                  placeholder="lifeos-app-123.appspot.com"
                />
              </div>

              <div className="form-group">
                <label>Messaging Sender ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fbMessagingSenderId} 
                  onChange={(e) => setFbMessagingSenderId(e.target.value)} 
                  placeholder="890123456789"
                />
              </div>

              <div className="form-group">
                <label>App ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={fbAppId} 
                  onChange={(e) => setFbAppId(e.target.value)} 
                  placeholder="1:890123456789:web:abcdef123456"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Config
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setFbApiKey('');
                    setFbAuthDomain('');
                    setFbProjectId('');
                    setFbStorageBucket('');
                    setFbMessagingSenderId('');
                    setFbAppId('');
                  }}
                >
                  Clear Fields
                </button>
              </div>
            </form>

            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              To clear cloud config and run strictly offline, empty the fields and click "Save Config".
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
export default SettingsManager;
