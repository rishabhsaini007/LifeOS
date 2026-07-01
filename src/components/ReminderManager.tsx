import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../utils/dateUtils';
import type { Reminder, MissedReminder } from '../context/AppContext';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  X,
  CalendarCheck
} from 'lucide-react';

export const ReminderManager: React.FC = () => {
  const { 
    reminders, 
    missedReminders,
    addReminder, 
    updateReminder, 
    deleteReminder,
    completeReminder,
    resolveMissedReminder
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [time, setTime] = useState('12:00');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [category, setCategory] = useState('Personal');
  const [repeat, setRepeat] = useState<Reminder['repeat']>('one-time');
  const [customDays, setCustomDays] = useState(1);
  const [customWeekdays, setCustomWeekdays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [alertOffset, setAlertOffset] = useState(15); // Default 15 mins before

  // Custom Reschedule Modal states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [targetMissed, setTargetMissed] = useState<MissedReminder | null>(null);
  const [reschedDate, setReschedDate] = useState(getLocalDateString());
  const [reschedTime, setReschedTime] = useState('12:00');

  const handleOpenModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder(reminder);
      setTitle(reminder.title);
      setDescription(reminder.description);
      setDate(reminder.date);
      setTime(reminder.time);
      setPriority(reminder.priority);
      setCategory(reminder.category);
      setRepeat(reminder.repeat);
      setCustomDays(reminder.customDays || 1);
      setCustomWeekdays(reminder.customWeekdays || []);
      setAlertOffset(reminder.alertOffset);
    } else {
      setEditingReminder(null);
      setTitle('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('12:00');
      setPriority('Medium');
      setCategory('Personal');
      setRepeat('one-time');
      setCustomDays(1);
      setCustomWeekdays([]);
      setAlertOffset(15);
    }
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      description,
      date,
      time,
      priority,
      category,
      repeat,
      customDays: repeat === 'custom' && customDays > 0 ? customDays : undefined,
      customWeekdays: repeat === 'custom' && customWeekdays.length > 0 ? customWeekdays : undefined,
      alertOffset
    };

    try {
      if (editingReminder) {
        await updateReminder({ 
          ...data, 
          id: editingReminder.id, 
          completed: editingReminder.completed,
          completedDates: editingReminder.completedDates,
          missedNotified: editingReminder.missedNotified
        });
      } else {
        await addReminder(data);
      }
      setModalOpen(false);
    } catch (error: any) {
      console.error("Error saving reminder:", error);
      alert(`Failed to save reminder: ${error.message || error}`);
    }
  };

  const toggleWeekday = (day: number) => {
    if (customWeekdays.includes(day)) {
      setCustomWeekdays(customWeekdays.filter(d => d !== day));
    } else {
      setCustomWeekdays([...customWeekdays, day]);
    }
  };

  const openRescheduleFlow = (missed: MissedReminder) => {
    setTargetMissed(missed);
    const [sDate, sTime] = missed.suggestedNewTime.split(' ');
    setReschedDate(sDate);
    setReschedTime(sTime);
    setRescheduleModalOpen(true);
  };

  const submitReschedule = async () => {
    if (!targetMissed) return;
    await resolveMissedReminder(targetMissed.id, 'reschedule', reschedDate, reschedTime);
    setRescheduleModalOpen(false);
    setTargetMissed(null);
  };

  // Grouping reminders
  const todayStr = getLocalDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  const groupedReminders = {
    today: [] as Reminder[],
    tomorrow: [] as Reminder[],
    upcoming: [] as Reminder[],
    repeating: [] as Reminder[]
  };

  reminders.forEach((r) => {
    // If it's a repeating reminder, group it in repeating category
    if (r.repeat !== 'one-time') {
      groupedReminders.repeating.push(r);
    } else if (r.date === todayStr) {
      groupedReminders.today.push(r);
    } else if (r.date === tomorrowStr) {
      groupedReminders.tomorrow.push(r);
    } else if (new Date(r.date) > new Date(todayStr)) {
      groupedReminders.upcoming.push(r);
    }
  });

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Reminders</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Never forget a phone call, chore, or assignment deadline with smart recurrence rules.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Reminder
        </button>
      </div>

      {/* 1. MISSED REMINDER RECOVERY BLOCK */}
      {missedReminders.length > 0 && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)', backgroundColor: 'var(--danger-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={20} />
            <span>Missed Reminder Recovery System</span>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            The following actions were missed. Intelligently reschedule, tick complete, or ignore them to keep your streak clean.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {missedReminders.map((m) => (
              <div 
                key={m.id} 
                className="glass-card flex-between" 
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  padding: '0.85rem 1.25rem',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{m.title}</h4>
                  <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    Scheduled: {m.originalTime} | Suggested: {m.suggestedNewTime}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    onClick={() => resolveMissedReminder(m.id, 'complete')}
                  >
                    Mark Done
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    onClick={() => openRescheduleFlow(m)}
                  >
                    Reschedule
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                    onClick={() => resolveMissedReminder(m.id, 'ignore')}
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. REMINDER LIST CATEGORIES */}
      <div className="grid-2">
        {/* Today & Tomorrow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Today */}
          <div className="glass-card">
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              <Bell size={18} className="text-primary" /> Due Today
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {groupedReminders.today.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No one-time reminders for today.
                </p>
              ) : (
                groupedReminders.today.map((r) => (
                  <div key={r.id} className="flex-between glass-card" style={{ padding: '0.85rem', background: 'var(--bg-secondary)', textDecoration: r.completed ? 'line-through' : 'none', opacity: r.completed ? 0.6 : 1 }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{r.title}</h4>
                      <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        ⏰ {r.time} | Offset: {r.alertOffset}m | <span className="badge badge-low">{r.category}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {!r.completed && (
                        <button className="theme-toggle text-primary" onClick={() => completeReminder(r.id, todayStr)}>
                          <Check size={16} />
                        </button>
                      )}
                      <button className="theme-toggle" onClick={() => handleOpenModal(r)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="theme-toggle text-danger" onClick={() => deleteReminder(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tomorrow */}
          <div className="glass-card">
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              <Calendar size={18} className="text-primary" /> Tomorrow
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {groupedReminders.tomorrow.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No reminders tomorrow.
                </p>
              ) : (
                groupedReminders.tomorrow.map((r) => (
                  <div key={r.id} className="flex-between glass-card" style={{ padding: '0.85rem', background: 'var(--bg-secondary)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{r.title}</h4>
                      <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        ⏰ {r.time} | Offset: {r.alertOffset}m | <span className="badge badge-low">{r.category}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="theme-toggle" onClick={() => handleOpenModal(r)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="theme-toggle text-danger" onClick={() => deleteReminder(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Future One-Time & Recurring Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Repeating / Recurrent Reminders */}
          <div className="glass-card">
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              <CalendarCheck size={18} className="text-warning" /> Repeating Rules
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {groupedReminders.repeating.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No repeating rules configured.
                </p>
              ) : (
                groupedReminders.repeating.map((r) => (
                  <div key={r.id} className="flex-between glass-card" style={{ padding: '0.85rem', background: 'var(--bg-secondary)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{r.title}</h4>
                      <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        ⏰ {r.time} | Repeat: <span className="badge badge-medium" style={{ textTransform: 'capitalize' }}>{r.repeat}</span>
                        {r.repeat === 'custom' && r.customWeekdays && ` (${r.customWeekdays.map(d => weekdayNames[d]).join(',')})`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="theme-toggle" onClick={() => handleOpenModal(r)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="theme-toggle text-danger" onClick={() => deleteReminder(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Future Reminders */}
          <div className="glass-card">
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              <ChevronRight size={18} className="text-primary" /> Future Schedule
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {groupedReminders.upcoming.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                  No future scheduled reminders.
                </p>
              ) : (
                groupedReminders.upcoming.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex-between glass-card" style={{ padding: '0.85rem', background: 'var(--bg-secondary)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{r.title}</h4>
                      <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        📅 {r.date} at {r.time} | <span className="badge badge-low">{r.category}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="theme-toggle" onClick={() => handleOpenModal(r)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="theme-toggle text-danger" onClick={() => deleteReminder(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Edit/Create Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">
                {editingReminder ? 'Modify Reminder' : 'Set New Reminder'}
              </h2>
              <button className="theme-toggle" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Reminder Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="e.g. Call dentist, submit paper"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="e.g. Phone number 555-0199"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={date} 
                      onChange={(e) => setDate(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Time</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={time} 
                      onChange={(e) => setTime(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Category</label>
                    <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="Personal">Personal</option>
                      <option value="Study">Study</option>
                      <option value="Work">Work</option>
                      <option value="Health">Health</option>
                      <option value="Bills">Bills</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Priority</label>
                    <select className="form-control" value={priority} onChange={(e) => setPriority(e.target.value as any)}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                {/* Recurrence Selection */}
                <div className="form-group">
                  <label>Recurrence (Repeat Rule)</label>
                  <select className="form-control" value={repeat} onChange={(e) => setRepeat(e.target.value as any)}>
                    <option value="one-time">One-time (No repeat)</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom Recurrence</option>
                  </select>
                </div>

                {repeat === 'custom' && (
                  <div className="form-group" style={{ padding: '0.85rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Repeat Every X Days</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        min="1" 
                        value={customDays} 
                        onChange={(e) => setCustomDays(Number(e.target.value))} 
                        style={{ marginTop: '0.25rem' }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem', display: 'block' }}>Or On Weekdays</label>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {weekdayNames.map((name, index) => (
                          <button
                            key={name}
                            type="button"
                            className={`btn ${customWeekdays.includes(index) ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ flex: 1, padding: '0.35rem 0', fontSize: '0.7rem', minWidth: 0 }}
                            onClick={() => toggleWeekday(index)}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notification Offset */}
                <div className="form-group">
                  <label>Alarm Reminder Setting</label>
                  <select className="form-control" value={alertOffset} onChange={(e) => setAlertOffset(Number(e.target.value))}>
                    <option value={0}>Exactly at reminder time</option>
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  {editingReminder ? 'Update Reminder' : 'Set Alarm'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Missed Reminder Reschedule Modal */}
      {rescheduleModalOpen && targetMissed && (
        <div className="modal-overlay" onClick={() => setRescheduleModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">Reschedule: {targetMissed.title}</h2>
              <button className="theme-toggle" onClick={() => setRescheduleModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                💡 Intelligently suggested new time: {targetMissed.suggestedNewTime}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>New Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={reschedDate} 
                    onChange={(e) => setReschedDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>New Time</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={reschedTime} 
                    onChange={(e) => setReschedTime(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitReschedule}>
                    Reschedule Event
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }} 
                    onClick={() => {
                      // Autoselect suggested time
                      const [sDate, sTime] = targetMissed.suggestedNewTime.split(' ');
                      setReschedDate(sDate);
                      setReschedTime(sTime);
                    }}
                  >
                    Use Suggested
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReminderManager;
