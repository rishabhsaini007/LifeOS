import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { TimetableEntry } from '../context/AppContext';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Calendar, 
  Clock, 
  Tag, 
  X,
  MoreVertical 
} from 'lucide-react';

export const TimetableManager: React.FC = () => {
  const { 
    timetableProfiles, 
    timetableEntries, 
    addTimetableProfile, 
    deleteTimetableProfile, 
    setActiveTimetableProfile,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry 
  } = useApp();

  const [newProfileName, setNewProfileName] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);

  // Form Fields for Timetable Entry
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [activeMenuProfileId, setActiveMenuProfileId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('Study');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [specificDate, setSpecificDate] = useState('');
  const [notes, setNotes] = useState('');

  const activeProfile = timetableProfiles.find(p => p.isActive) || timetableProfiles[0];

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      await addTimetableProfile(newProfileName.trim());
      setNewProfileName('');
      setProfileModalOpen(false);
    } catch (error: any) {
      console.error("Error creating profile:", error);
      alert(`Failed to create profile: ${error.message || error}`);
    }
  };

  const handleOpenEntryModal = (entry?: TimetableEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setSelectedProfileId(entry.profileId);
      setTitle(entry.title);
      setDescription(entry.description);
      setStartTime(entry.startTime);
      setEndTime(entry.endTime);
      setCategory(entry.category);
      setPriority(entry.priority);
      setWeekdays(entry.weekdays);
      setSpecificDate(entry.date || '');
      setNotes(entry.notes || '');
    } else {
      setEditingEntry(null);
      setSelectedProfileId(activeProfile?.id || '');
      setTitle('');
      setDescription('');
      setStartTime('09:00');
      setEndTime('10:00');
      setCategory('Study');
      setPriority('Medium');
      setWeekdays([1, 2, 3, 4, 5]);
      setSpecificDate('');
      setNotes('');
    }
    setEntryModalOpen(true);
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProfileId = selectedProfileId || activeProfile?.id;
    if (!targetProfileId) {
      alert('Please create a timetable profile first.');
      return;
    }

    const entryData = {
      profileId: targetProfileId,
      title,
      description,
      startTime,
      endTime,
      category,
      priority,
      weekdays: specificDate ? [] : weekdays,
      date: specificDate || undefined,
      notes
    };

    try {
      if (editingEntry) {
        await updateTimetableEntry({ ...entryData, id: editingEntry.id });
      } else {
        await addTimetableEntry(entryData);
      }
      setEntryModalOpen(false);
    } catch (error: any) {
      console.error("Error saving timetable block:", error);
      alert(`Failed to save timetable block: ${error.message || error}`);
    }
  };

  const toggleWeekday = (day: number) => {
    if (weekdays.includes(day)) {
      setWeekdays(weekdays.filter(d => d !== day));
    } else {
      setWeekdays([...weekdays, day]);
    }
  };

  const activeEntries = timetableEntries
    .filter(e => e.profileId === activeProfile?.id)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Timetable System</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Set up different schedules for study, weekends, exams, or holidays.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenEntryModal()}>
          <Plus size={18} /> Add Block
        </button>
      </div>

      {/* Profiles Selection Panel */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="flex-between">
          <h2 className="section-title"><Calendar size={18} className="text-primary" /> Timetable Profiles</h2>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setProfileModalOpen(true)}>
            <Plus size={14} /> New Profile
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {timetableProfiles.length === 0 ? (
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No profiles created. Click "New Profile" to get started.</p>
          ) : (
            timetableProfiles.map((p) => (
              <div 
                key={p.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: p.isActive ? 'var(--primary-light)' : 'var(--bg-secondary)',
                  borderColor: p.isActive ? 'var(--primary)' : 'var(--border-color)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => setActiveTimetableProfile(p.id)}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: p.isActive ? 700 : 500, color: p.isActive ? 'var(--primary)' : 'var(--text-primary)' }}>
                  {p.name}
                </span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button 
                    className="theme-toggle" 
                    style={{ padding: '0.15rem', marginLeft: '0.25rem', color: 'var(--text-secondary)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuProfileId(activeMenuProfileId === p.id ? null : p.id);
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>

                  {activeMenuProfileId === p.id && (
                    <div 
                      className="glass-card" 
                      style={{ 
                        position: 'absolute', 
                        left: '0', 
                        top: '100%', 
                        zIndex: 100, 
                        minWidth: '110px', 
                        padding: '0.25rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        className="btn btn-secondary" 
                        style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', color: 'var(--danger)', border: 'none', display: 'flex', gap: '0.25rem', justifyContent: 'flex-start' }}
                        onClick={async () => {
                          if (confirm(`Delete profile "${p.name}"? This will delete all scheduled items under it.`)) {
                            await deleteTimetableProfile(p.id);
                          }
                          setActiveMenuProfileId(null);
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Schedule Visual Timeline */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 className="section-title">
          <Clock size={18} className="text-primary" /> Active Timeline: {activeProfile?.name || 'None Selected'}
        </h2>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)' }}>
          {activeEntries.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>
              Timeline empty. Click "Add Block" to schedule events.
            </p>
          ) : (
            activeEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="glass-card"
                style={{ 
                  position: 'relative', 
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '1rem 1.25rem'
                }}
              >
                {/* Visual Timeline Marker Node */}
                <div style={{ 
                  position: 'absolute', 
                  left: '-2.15rem', 
                  top: '1.5rem', 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary)',
                  border: '2px solid var(--bg-primary)'
                }} />

                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', padding: '0.2rem 0.5rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}>
                      {entry.startTime} - {entry.endTime}
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{entry.title}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="theme-toggle" onClick={() => handleOpenEntryModal(entry)}>
                      <Edit3 size={15} />
                    </button>
                    <button className="theme-toggle" onClick={() => deleteTimetableEntry(entry.id)}>
                      <Trash2 size={15} className="text-danger" />
                    </button>
                  </div>
                </div>

                <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{entry.description}</p>

                {entry.notes && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--text-muted)' }}>
                    {entry.notes}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Tag size={10} /> {entry.category}
                  </span>
                  <span className={`badge badge-${entry.priority.toLowerCase()}`}>
                    Priority: {entry.priority}
                  </span>
                  {entry.date ? (
                    <span className="badge badge-low" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                      Date: {entry.date}
                    </span>
                  ) : (
                    <span className="badge badge-low" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                      Days: {entry.weekdays.map(d => weekDayNames[d]).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Profile Creation Modal */}
      {profileModalOpen && (
        <div className="modal-overlay" onClick={() => setProfileModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">New Timetable Profile</h2>
              <button className="theme-toggle" onClick={() => setProfileModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Profile Name</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Exam Schedule, Vacation"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">Create Profile</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Entry Creation / Edit Modal */}
      {entryModalOpen && (
        <div className="modal-overlay" onClick={() => setEntryModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">{editingEntry ? 'Edit Schedule Block' : 'Add Schedule Block'}</h2>
              <button className="theme-toggle" onClick={() => setEntryModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label>Assign to Profile</label>
                  <select 
                    className="form-control" 
                    value={selectedProfileId} 
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    required
                  >
                    {timetableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g., Study Session, Lunch Break" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Brief description of activity" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Start Time</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>End Time</label>
                    <input 
                      type="time" 
                      className="form-control" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Category</label>
                    <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="Study">Study</option>
                      <option value="Routine">Routine</option>
                      <option value="Exercise">Exercise</option>
                      <option value="Work">Work</option>
                      <option value="Leisure">Leisure</option>
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

                <div className="form-group">
                  <label>Apply Options</label>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="applyType" 
                        checked={!specificDate}
                        onChange={() => setSpecificDate('')} 
                      />
                      Specific Weekdays
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="applyType" 
                        checked={!!specificDate}
                        onChange={() => setSpecificDate(new Date().toISOString().split('T')[0])} 
                      />
                      Specific Single Date
                    </label>
                  </div>

                  {specificDate ? (
                    <input 
                      type="date" 
                      className="form-control" 
                      value={specificDate} 
                      onChange={(e) => setSpecificDate(e.target.value)} 
                      required 
                    />
                  ) : (
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'space-between' }}>
                      {weekDayNames.map((name, index) => (
                        <button
                          key={name}
                          type="button"
                          className={`btn ${weekdays.includes(index) ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '0.4rem 0', fontSize: '0.75rem', minWidth: 0 }}
                          onClick={() => toggleWeekday(index)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Notes / Checklist</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Specific items to complete, e.g. - Read Chapter 4"
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  {editingEntry ? 'Save Changes' : 'Add Block to Schedule'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TimetableManager;
