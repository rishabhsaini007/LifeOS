import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  History, 
  Trash2, 
  Search, 
  Clock, 
  Bell, 
  CheckSquare, 
  Flame, 
  Filter
} from 'lucide-react';

export const HistoryLogsManager: React.FC = () => {
  const { activityLogs, clearActivityLogs } = useApp();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear your entire activity log history? This action is permanent.')) {
      try {
        await clearActivityLogs();
        alert('Logs successfully cleared.');
      } catch (err: any) {
        alert(`Failed to clear logs: ${err.message}`);
      }
    }
  };

  const getFilteredLogs = () => {
    return activityLogs.filter(log => {
      const matchesType = filterType === 'all' || log.type === filterType;
      const matchesQuery = searchQuery.trim() === '' || 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (log.details || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesQuery;
    });
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString('default', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Activity History</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Browse a complete audit trail of additions, completions, and edits across your system.
          </p>
        </div>
        {activityLogs.length > 0 && (
          <button className="btn btn-danger" onClick={handleClearLogs} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Trash2 size={16} /> Clear Logs
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search 
              size={16} 
              className="text-secondary" 
              style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} 
            />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Activities', icon: <Filter size={12} /> },
              { id: 'task', label: 'Tasks', icon: <CheckSquare size={12} /> },
              { id: 'reminder', label: 'Reminders', icon: <Bell size={12} /> },
              { id: 'habit', label: 'Habits', icon: <Flame size={12} /> },
              { id: 'timetable', label: 'Schedules', icon: <Clock size={12} /> }
            ].map(pill => (
              <button
                key={pill.id}
                className={`btn ${filterType === pill.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: 'var(--radius-sm)' }}
                onClick={() => setFilterType(pill.id)}
              >
                {pill.icon} {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Feed Timeline */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 className="section-title">
          <History size={18} className="text-primary" /> Activity Feed
        </h2>

        {filteredLogs.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>
            No history logs found matching your filters.
          </p>
        ) : (
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)' }}>
            {filteredLogs.map((log) => {
              let color = 'var(--primary)';
              let icon = <Clock size={14} />;
              
              if (log.type === 'reminder') {
                color = 'var(--warning)';
                icon = <Bell size={14} />;
              } else if (log.type === 'task') {
                color = 'var(--danger)';
                icon = <CheckSquare size={14} />;
              } else if (log.type === 'habit') {
                color = 'var(--info)';
                icon = <Flame size={14} />;
              }

              return (
                <div 
                  key={log.id} 
                  className="glass-card"
                  style={{ 
                    position: 'relative', 
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.85rem 1.25rem',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {/* Timeline node */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '-2.15rem', 
                    top: '1.2rem', 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: color,
                    border: '2px solid var(--bg-primary)'
                  }} />

                  <div className="flex-between" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        padding: '0.3rem', 
                        borderRadius: 'var(--radius-sm)', 
                        backgroundColor: 'var(--bg-tertiary)',
                        color: color 
                      }}>
                        {icon}
                      </span>
                      <strong style={{ fontSize: '0.9rem' }}>{log.action}</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.4rem', borderLeft: `2px solid ${color}`, paddingLeft: '0.5rem' }}>
                      {log.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryLogsManager;
