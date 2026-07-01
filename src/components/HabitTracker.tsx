import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Habit } from '../context/AppContext';
import { getLocalDateString } from '../utils/dateUtils';
import { 
  Flame, 
  Plus, 
  Trash2, 
  Check, 
  Clock, 
  Award,
  X 
} from 'lucide-react';

export const HabitTracker: React.FC = () => {
  const { habits, addHabit, toggleHabitCompletion, deleteHabit } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [goal, setGoal] = useState(20); // 20 days per month target

  const todayStr = getLocalDateString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addHabit({
      name: name.trim(),
      frequency,
      reminderTime: reminderTime || undefined,
      goal
    });

    setName('');
    setFrequency('daily');
    setReminderTime('08:00');
    setGoal(20);
    setModalOpen(false);
  };

  // Render a monthly calendar heatmap
  const renderHeatmap = (habit: Habit) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed

    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // First day of month weekday index
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days = [];
    // Blank paddings for first week offset
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`blank-${i}`} style={{ width: '22px', height: '22px' }} />);
    }

    // Days in month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCompleted = habit.completions.includes(dateStr);
      const isFailed = habit.failures?.includes(dateStr) ?? false;
      const isToday = todayStr === dateStr;

      let bgColor = 'var(--bg-tertiary)';
      let tooltip = dateStr;
      if (isCompleted) {
        bgColor = 'var(--primary)';
        tooltip += ' (Completed!)';
      } else if (isFailed) {
        bgColor = 'var(--danger)';
        tooltip += ' (Failed/Skipped)';
      }

      days.push(
        <div 
          key={dateStr}
          title={tooltip}
          style={{ 
            width: '22px', 
            height: '22px', 
            borderRadius: '4px',
            backgroundColor: bgColor,
            border: isToday ? '1px solid var(--text-primary)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'background-color var(--transition-fast)'
          }}
          onClick={() => toggleHabitCompletion(habit.id, dateStr)}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '240px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {today.toLocaleString('default', { month: 'long' })} Heatmap
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', justifyContent: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} style={{ fontSize: '0.65rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-muted)' }}>{d}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Habit Builder</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Strengthen your daily routines. Complete consistency is the key to memory recovery.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Create Habit
        </button>
      </div>

      {/* Habits Grid */}
      <div className="grid-2">
        {habits.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem 0' }}>
            <Award size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
            <h3>No Habits Programmed</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
              Create consistency loops to help remember essential chores or daily practices.
            </p>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              Get Started
            </button>
          </div>
        ) : (
          habits.map((habit) => {
            const completedToday = habit.completions.includes(todayStr);
            const totalCompletions = habit.completions.length;
            const completionPercent = Math.min(Math.round((totalCompletions / habit.goal) * 100), 100);

            return (
              <div key={habit.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', justifyContent: 'space-between' }}>
                
                {/* Header Row */}
                <div className="flex-between">
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{habit.name}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span className="streak-badge">
                        <Flame size={12} fill="currentColor" /> {habit.streak} day streak
                      </span>
                      <span className="badge badge-low" style={{ textTransform: 'capitalize' }}>
                        {habit.frequency}
                      </span>
                    </div>
                  </div>

                  <button 
                    className={`btn ${completedToday ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 'var(--radius-full)', padding: '0.65rem' }}
                    onClick={() => toggleHabitCompletion(habit.id, todayStr)}
                  >
                    <Check size={20} />
                  </button>
                </div>

                {/* Progress Stats */}
                <div>
                  <div className="flex-between" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Monthly Goal: {totalCompletions}/{habit.goal} days</span>
                    <span>{completionPercent}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${completionPercent}%`, 
                        height: '100%', 
                        backgroundColor: completionPercent >= 100 ? 'var(--primary)' : 'var(--warning)',
                        transition: 'width var(--transition-smooth)'
                      }} 
                    />
                  </div>
                </div>

                {/* Heatmap & Details */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {renderHeatmap(habit)}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '120px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Settings</span>
                    {habit.reminderTime && (
                      <div className="text-secondary" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> Alarm: {habit.reminderTime}
                      </div>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginTop: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--danger)', border: 'none', display: 'flex', gap: '0.25rem', alignSelf: 'flex-start' }}
                      onClick={() => {
                        if (confirm(`Delete habit "${habit.name}"?`)) {
                          deleteHabit(habit.id);
                        }
                      }}
                    >
                      <Trash2 size={12} /> Delete Habit
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Habit Creation Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">Program Habit Loop</h2>
              <button className="theme-toggle" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Habit Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Read books, exercise, take vitamins"
                    required 
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Frequency</label>
                    <select className="form-control" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Reminder Alarm</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={reminderTime} 
                      onChange={(e) => setReminderTime(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Monthly Target Goal (Days completed)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    max="31" 
                    value={goal} 
                    onChange={(e) => setGoal(Number(e.target.value))} 
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  Register Habit
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default HabitTracker;
