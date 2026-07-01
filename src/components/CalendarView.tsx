import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getLocalDateString } from '../utils/dateUtils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Bell, 
  CheckSquare, 
  Square,
  Flame, 
  Calendar,
  X
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC = () => {
  const { 
    timetableProfiles, 
    timetableEntries, 
    reminders, 
    tasks, 
    habits,
    updateTask,
    updateReminder,
    toggleHabitCompletion
  } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Details Dialog State
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
    description: string;
    time?: string;
    category: string;
    type: 'timetable' | 'reminder' | 'task' | 'habit';
    statusOrPriority?: string;
    completed?: boolean;
  } | null>(null);

  // Selected Date Dialog State (shows all items for a specific date)
  const [selectedDateData, setSelectedDateData] = useState<{
    dateStr: string;
    dayOfWeek: number;
    dateObj: Date;
  } | null>(null);

  const activeProfile = timetableProfiles.find(p => p.isActive);

  const handleToggleItemCompletion = async (item: any, dateStr: string) => {
    try {
      if (item.type === 'task') {
        const t = tasks.find(x => x.id === item.id);
        if (t) {
          await updateTask({ ...t, status: t.status === 'Completed' ? 'Not started' : 'Completed' });
        }
      } else if (item.type === 'reminder') {
        const r = reminders.find(x => x.id === item.id);
        if (r) {
          if (r.repeat === 'one-time') {
            await updateReminder({ ...r, completed: !r.completed });
          } else {
            const dates = r.completedDates || [];
            const updatedDates = dates.includes(dateStr)
              ? dates.filter(d => d !== dateStr)
              : [...dates, dateStr];
            await updateReminder({ ...r, completedDates: updatedDates });
          }
        }
      } else if (item.type === 'habit') {
        await toggleHabitCompletion(item.id, dateStr);
      }
    } catch (err: any) {
      alert(`Failed to update item: ${err.message}`);
    }
  };

  // Helper date generators
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonthIndex = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekDays = (date: Date) => {
    const currentDay = date.getDay();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() - currentDay + i);
      days.push(d);
    }
    return days;
  };

  // Navigations
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  // --- Core Aggregator: Find all items scheduled on a given YYYY-MM-DD date ---
  const getItemsForDate = (dateStr: string, dayOfWeekIndex: number, includeCompleted = true) => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      time?: string;
      category: string;
      type: 'timetable' | 'reminder' | 'task' | 'habit';
      statusOrPriority?: string;
      completed: boolean;
    }> = [];

    // 1. Timetable blocks
    timetableEntries
      .filter(e => {
        if (e.profileId !== activeProfile?.id) return false;
        if (e.date) return e.date === dateStr;
        return e.weekdays.includes(dayOfWeekIndex);
      })
      .forEach(e => {
        items.push({
          id: e.id,
          title: e.title,
          description: e.description,
          time: `${e.startTime} - ${e.endTime}`,
          category: e.category,
          type: 'timetable',
          statusOrPriority: `Priority: ${e.priority}`,
          completed: false
        });
      });

    // 2. Reminders
    reminders
      .filter(r => {
        const isCompleted = r.completed || !!(r.completedDates && r.completedDates.includes(dateStr));
        if (!includeCompleted && isCompleted) return false;
        
        if (r.date === dateStr) return true;
        if (r.repeat === 'daily') return true;
        if (r.repeat === 'weekly') {
          return new Date(r.date).getDay() === dayOfWeekIndex;
        }
        if (r.repeat === 'custom') {
          if (r.customWeekdays) return r.customWeekdays.includes(dayOfWeekIndex);
          if (r.customDays) {
            const start = new Date(r.date);
            const check = new Date(dateStr);
            const diff = Math.floor((check.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return diff >= 0 && diff % r.customDays === 0;
          }
        }
        return false;
      })
      .forEach(r => {
        const isCompleted = r.completed || !!(r.completedDates && r.completedDates.includes(dateStr));
        items.push({
          id: r.id,
          title: r.title,
          description: r.description,
          time: r.time,
          category: r.category,
          type: 'reminder',
          statusOrPriority: `Priority: ${r.priority}`,
          completed: isCompleted
        });
      });

    // 3. Tasks
    tasks
      .filter(t => {
        const isCompleted = t.status === 'Completed';
        if (!includeCompleted && isCompleted) return false;
        return t.dueDate === dateStr;
      })
      .forEach(t => {
        items.push({
          id: t.id,
          title: t.title,
          description: t.description,
          time: t.dueTime || 'All day',
          category: t.category,
          type: 'task',
          statusOrPriority: `Status: ${t.status} | Priority: ${t.priority}`,
          completed: t.status === 'Completed'
        });
      });

    // 4. Habits
    habits.forEach(h => {
      const isCompleted = h.completions.includes(dateStr);
      let isScheduled = false;
      if (h.frequency === 'daily') {
        isScheduled = true;
      } else if (h.frequency === 'weekly') {
        const dayOfCreation = new Date(h.createdAt).getDay();
        isScheduled = dayOfWeekIndex === dayOfCreation;
      }

      if (isCompleted || (isScheduled && includeCompleted) || (isScheduled && !isCompleted)) {
        items.push({
          id: h.id,
          title: h.name,
          description: isCompleted ? `Completed! Streak: ${h.streak} days.` : 'Pending completion today.',
          time: h.reminderTime || 'Anytime',
          category: 'Routine',
          type: 'habit',
          statusOrPriority: isCompleted ? 'Completed' : 'Pending',
          completed: isCompleted
        });
      }
    });

    // Sort items by time
    return items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  const getFormatDateStr = (date: Date) => {
    return getLocalDateString(date);
  };

  // --- RENDER MONTH VIEW ---
  const renderMonthView = () => {
    const totalDays = getDaysInMonth(currentDate);
    const firstDayIndex = getFirstDayOfMonthIndex(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const blanks = [];
    for (let i = 0; i < firstDayIndex; i++) {
      blanks.push(<div key={`blank-${i}`} className="calendar-day-box empty" style={{ border: '1px solid var(--border-color)', minHeight: '100px', opacity: 0.3 }} />);
    }

    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const loopDate = new Date(year, month, day);
      const dateStr = getFormatDateStr(loopDate);
      const dayOfWeek = loopDate.getDay();
      
      const dayItems = getItemsForDate(dateStr, dayOfWeek);
      const isToday = getFormatDateStr(new Date()) === dateStr;

      days.push(
        <div 
          key={`day-${day}`} 
          className={`calendar-day-box ${isToday ? 'today' : ''}`}
          onClick={() => setSelectedDateData({ dateStr, dayOfWeek, dateObj: loopDate })}
          style={{ 
            border: '1px solid var(--border-color)', 
            minHeight: '110px', 
            padding: '0.4rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.3rem',
            backgroundColor: isToday ? 'var(--primary-light)' : 'var(--bg-secondary)',
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 800, alignSelf: 'flex-end', color: isToday ? 'var(--primary)' : 'var(--text-secondary)' }}>
            {day}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', flex: 1 }}>
            {dayItems.slice(0, 3).map((item, idx) => {
              let color = 'var(--primary)';
              let icon = <Clock size={10} />;
              if (item.type === 'reminder') { color = 'var(--warning)'; icon = <Bell size={10} />; }
              else if (item.type === 'task') { color = 'var(--danger)'; icon = <CheckSquare size={10} />; }
              else if (item.type === 'habit') { color = 'var(--info)'; icon = <Flame size={10} />; }

              return (
                <div 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                  }}
                  style={{ 
                    fontSize: '0.65rem', 
                    padding: '2px 4px', 
                    borderRadius: '2px', 
                    background: 'var(--bg-tertiary)', 
                    borderLeft: `2px solid ${color}`,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    textDecoration: item.completed ? 'line-through' : 'none',
                    opacity: item.completed ? 0.5 : 1
                  }}
                >
                  {icon}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                </div>
              );
            })}
            {dayItems.length > 3 && (
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                +{dayItems.length - 3} more
              </span>
            )}
          </div>
        </div>
      );
    }

    const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
      <div key={d} style={{ textAlign: 'center', fontWeight: 700, padding: '0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        {d}
      </div>
    ));

    return (
      <div className="glass-card" style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
          {weekdayHeaders}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {blanks}
          {days}
        </div>
      </div>
    );
  };

  // --- RENDER WEEK VIEW ---
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
      <div className="grid-3" style={{ gap: '1rem' }}>
        {weekDays.map((d) => {
          const dateStr = getFormatDateStr(d);
          const dayOfWeek = d.getDay();
          const dayItems = getItemsForDate(dateStr, dayOfWeek);
          const isToday = getFormatDateStr(new Date()) === dateStr;

          return (
            <div 
              key={dateStr} 
              className="glass-card" 
              onClick={() => setSelectedDateData({ dateStr, dayOfWeek, dateObj: d })}
              style={{ 
                minHeight: '200px', 
                backgroundColor: isToday ? 'var(--primary-light)' : 'var(--bg-secondary)',
                border: isToday ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {d.toLocaleDateString('default', { weekday: 'short', day: 'numeric' })}
                </span>
                {isToday && <span className="badge badge-low">Today</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                {dayItems.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Clean schedule</span>
                ) : (
                  dayItems.map((item, idx) => (
                    <div 
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.5rem', 
                        background: 'var(--bg-tertiary)', 
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textDecoration: item.completed ? 'line-through' : 'none',
                        opacity: item.completed ? 0.5 : 1
                      }}
                    >
                      <div style={{ width: '4px', height: '24px', borderRadius: 'var(--radius-full)', backgroundColor: item.type === 'timetable' ? 'var(--primary)' : item.type === 'reminder' ? 'var(--warning)' : item.type === 'task' ? 'var(--danger)' : 'var(--info)' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.title}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{item.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- RENDER DAY VIEW ---
  const renderDayView = () => {
    const dateStr = getFormatDateStr(currentDate);
    const dayItems = getItemsForDate(dateStr, currentDate.getDay());
    const isToday = getFormatDateStr(new Date()) === dateStr;

    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            {currentDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          {isToday && <span className="badge badge-low">Today</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {dayItems.length === 0 ? (
            <p className="text-secondary" style={{ textAlign: 'center', padding: '3rem 0', fontSize: '0.85rem' }}>
              No tasks, reminders, routines, or habits scheduled for this day.
            </p>
          ) : (
            dayItems.map((item, idx) => {
              const canComplete = item.type === 'task' || item.type === 'reminder' || item.type === 'habit';
              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedItem(item)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '0.85rem 1.25rem', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    opacity: item.completed ? 0.6 : 1
                  }}
                >
                  {canComplete && (
                    <button 
                      className="theme-toggle" 
                      style={{ padding: 0, color: item.completed ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleToggleItemCompletion(item, dateStr);
                      }}
                    >
                      {item.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  )}

                  <div style={{ 
                    padding: '0.6rem', 
                    borderRadius: 'var(--radius-sm)', 
                    backgroundColor: item.type === 'timetable' ? 'var(--primary-light)' : item.type === 'reminder' ? 'var(--warning-light)' : item.type === 'task' ? 'var(--danger-light)' : 'var(--info-light)',
                    color: item.type === 'timetable' ? 'var(--primary)' : item.type === 'reminder' ? 'var(--warning)' : item.type === 'task' ? 'var(--danger)' : 'var(--info)',
                    display: 'flex'
                  }}>
                    {item.type === 'timetable' ? <Clock size={18} /> : item.type === 'reminder' ? <Bell size={18} /> : item.type === 'task' ? <CheckSquare size={18} /> : <Flame size={18} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.75rem' }}>Time: {item.time} | Category: {item.category}</p>
                  </div>
                  <span className="badge badge-low" style={{ textTransform: 'capitalize' }}>{item.type}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Controls */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Master Calendar</h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Consolidated timeline aggregating timetables, alarms, Eisenhower matrix tasks, and habits.
          </p>
        </div>

        {/* View Selection Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '0.2rem' }}>
          {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={`btn ${viewMode === mode ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textTransform: 'capitalize', borderRadius: 'var(--radius-sm)' }}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex-between glass-card" style={{ padding: '0.85rem 1.25rem' }}>
        <button className="theme-toggle" onClick={handlePrev}><ChevronLeft size={20} /></button>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
          {viewMode === 'month' && currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          {viewMode === 'week' && `Week of ${getWeekDays(currentDate)[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })}`}
          {viewMode === 'day' && currentDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
        </h2>
        <button className="theme-toggle" onClick={handleNext}><ChevronRight size={20} /></button>
      </div>

      {/* Main Calendar View Rendering */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Item Detail Modal Popups */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title" style={{ textTransform: 'capitalize' }}>
                {selectedItem.type} details
              </h2>
              <button className="theme-toggle" onClick={() => setSelectedItem(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textDecoration: selectedItem.completed ? 'line-through' : 'none' }}>{selectedItem.title}</h3>
                <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{selectedItem.description}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                {selectedItem.time && (
                  <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} className="text-primary" />
                    <span>Time: <strong>{selectedItem.time}</strong></span>
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} className="text-primary" />
                  <span>Category: <strong>{selectedItem.category}</strong></span>
                </div>
                {selectedItem.statusOrPriority && (
                  <div style={{ fontSize: '0.85rem', background: 'var(--bg-tertiary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                    {selectedItem.statusOrPriority}
                  </div>
                )}
              </div>

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setSelectedItem(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Date Modal Popups */}
      {selectedDateData && (
        <div className="modal-overlay" onClick={() => setSelectedDateData(null)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  Agenda for {selectedDateData.dateObj.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <button className="theme-toggle" onClick={() => setSelectedDateData(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              {(() => {
                const dateModalItems = getItemsForDate(selectedDateData.dateStr, selectedDateData.dayOfWeek, true);
                if (dateModalItems.length === 0) {
                  return (
                    <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
                      No items scheduled for this date.
                    </p>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {dateModalItems.map((item, idx) => {
                      const canComplete = item.type === 'task' || item.type === 'reminder' || item.type === 'habit';
                      let color = 'var(--primary)';
                      if (item.type === 'reminder') color = 'var(--warning)';
                      else if (item.type === 'task') color = 'var(--danger)';
                      else if (item.type === 'habit') color = 'var(--info)';

                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem', 
                            padding: '0.75rem', 
                            background: 'var(--bg-secondary)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-sm)',
                            borderLeft: `3px solid ${color}`,
                            opacity: item.completed ? 0.6 : 1
                          }}
                        >
                          {canComplete && (
                            <button 
                              className="theme-toggle" 
                              style={{ padding: 0, color: item.completed ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}
                              onClick={async () => {
                                await handleToggleItemCompletion(item, selectedDateData.dateStr);
                              }}
                            >
                              {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          )}
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ 
                              fontSize: '0.95rem', 
                              fontWeight: 700, 
                              textDecoration: item.completed ? 'line-through' : 'none',
                              margin: 0
                            }}>
                              {item.title}
                            </h4>
                            <p className="text-secondary" style={{ fontSize: '0.75rem', margin: '2px 0 0 0' }}>
                              {item.time && `⏰ ${item.time}`} {item.description && `| ${item.description}`}
                            </p>
                          </div>
                          <span className="badge badge-low" style={{ fontSize: '0.65rem', textTransform: 'capitalize', padding: '0.15rem 0.4rem' }}>
                            {item.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setSelectedDateData(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CalendarView;
