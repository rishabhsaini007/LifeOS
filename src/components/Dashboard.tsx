import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { TimetableEntry } from '../context/AppContext';
import { getLocalDateString } from '../utils/dateUtils';
import { 
  Smile, 
  Clock, 
  Bell, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Award
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    user, 
    timetableProfiles, 
    timetableEntries, 
    reminders, 
    tasks, 
    habits,
    completeReminder,
    updateTask,
    toggleHabitCompletion
  } = useApp();

  const [greeting, setGreeting] = useState('Hello');
  const [now, setNow] = useState(new Date());

  // Keep time updated
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Set greeting based on hour
  useEffect(() => {
    const hr = now.getHours();
    if (hr < 12) setGreeting('Good Morning');
    else if (hr < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, [now]);

  const todayStr = getLocalDateString(now);
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, etc.

  // --- 1. Get Today's Active Timetable ---
  const activeProfile = timetableProfiles.find(p => p.isActive);
  const todayTimetable = timetableEntries
    .filter(entry => {
      // Must belong to active profile
      if (entry.profileId !== activeProfile?.id) return false;
      // Must match day of week OR specific date
      if (entry.date) return entry.date === todayStr;
      return entry.weekdays.includes(dayOfWeek);
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine current active and next timetable block
  const timeToMinutes = (tStr: string) => {
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let currentBlock: TimetableEntry | null = null;
  let nextBlock: TimetableEntry | null = null;

  for (const block of todayTimetable) {
    const startMins = timeToMinutes(block.startTime);
    const endMins = timeToMinutes(block.endTime);

    if (currentMinutes >= startMins && currentMinutes < endMins) {
      currentBlock = block;
    } else if (startMins > currentMinutes && !nextBlock) {
      nextBlock = block;
    }
  }

  // --- 2. Upcoming Reminders ---
  const todayReminders = reminders.filter(r => {
    const isCompleted = r.completed || (r.completedDates && r.completedDates.includes(todayStr));
    if (isCompleted) return false;

    if (r.date === todayStr) return true;
    if (r.repeat === 'daily') return true;
    if (r.repeat === 'weekly') {
      return new Date(r.date).getDay() === dayOfWeek;
    }
    if (r.repeat === 'custom') {
      if (r.customWeekdays) return r.customWeekdays.includes(dayOfWeek);
      if (r.customDays) {
        const start = new Date(r.date);
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diff % r.customDays === 0;
      }
    }
    return false;
  }).sort((a, b) => a.time.localeCompare(b.time));

  // --- 3. Tasks Stats ---
  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const urgentImportantTasks = pendingTasks.filter(t => t.matrixQuadrant === 'q1');

  // --- 4. Next Action Recommendation ---
  let nextActionTitle = 'Review your layout';
  let nextActionDesc = 'Take a look at your priority list and plan your next steps.';

  if (currentBlock) {
    nextActionTitle = `Ongoing: ${currentBlock.title}`;
    nextActionDesc = `Scheduled until ${currentBlock.endTime}. Focus on this session!`;
  } else if (todayReminders.length > 0) {
    const nextRem = todayReminders[0];
    nextActionTitle = `Upcoming: ${nextRem.title}`;
    nextActionDesc = `Reminder set for ${nextRem.time}. Category: ${nextRem.category}`;
  } else if (urgentImportantTasks.length > 0) {
    nextActionTitle = `Do Immediately: ${urgentImportantTasks[0].title}`;
    nextActionDesc = `High priority task due: ${urgentImportantTasks[0].dueDate}.`;
  } else if (nextBlock) {
    nextActionTitle = `Up Next: ${nextBlock.title}`;
    nextActionDesc = `Starts at ${nextBlock.startTime}. Category: ${nextBlock.category}`;
  }

  // --- 5. Daily Review Segment (Active after 6:00 PM) ---
  const isEvening = now.getHours() >= 18;
  const completedTasksTodayCount = tasks.filter(t => {
    // Basic check: status is completed. Since we don't have completed timestamp, we assume done
    return t.status === 'Completed';
  }).length;
  const missedTasksCount = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date(todayStr);
  }).length;

  const activeHabits = habits.length;
  const completedHabitsTodayCount = habits.filter(h => h.completions.includes(todayStr)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Header */}
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
            {greeting}, {user?.displayName || 'Achiever'}
          </h1>
          <p className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
            <Smile size={16} className="text-primary" />
            Let's stay organized and complete our goals today.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
          <Clock size={16} className="text-primary" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid-3" style={{ gap: '1.25rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{pendingTasks.length}</span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Pending Tasks</p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
            <Bell size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{todayReminders.length}</span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Upcoming Reminders</p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--danger)' }}>
            <Flame size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {habits.reduce((acc, h) => Math.max(acc, h.streak), 0)} days
            </span>
            <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Best Streak</p>
          </div>
        </div>
      </div>

      {/* Next Action Recommendation Card */}
      <div className="glass-card" style={{ borderLeft: '4px solid var(--primary)', animation: 'pulseGlow 3s infinite', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} /> Suggested Action
          </span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{nextActionTitle}</h3>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>{nextActionDesc}</p>
        </div>
        <ArrowRight size={20} className="text-primary" style={{ marginLeft: '1rem' }} />
      </div>

      {/* Primary Row: Timetable & Reminders */}
      <div className="grid-2">
        {/* Today's Timetable */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="flex-between">
            <h2 className="section-title"><Clock size={18} className="text-primary" /> Today's Schedule</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Profile: {activeProfile?.name || 'None'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {todayTimetable.length === 0 ? (
              <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
                No timetable entries scheduled for today.
              </p>
            ) : (
              todayTimetable.map((block) => {
                const isCurrent = currentBlock?.id === block.id;
                return (
                  <div 
                    key={block.id} 
                    className="glass-card" 
                    style={{ 
                      padding: '0.85rem 1rem', 
                      borderLeft: isCurrent ? '3px solid var(--primary)' : '3px solid var(--border-color)',
                      backgroundColor: isCurrent ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{block.title}</h4>
                      <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {block.startTime} - {block.endTime} | {block.category}
                      </p>
                    </div>
                    {isCurrent && (
                      <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>Ongoing</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Today's Reminders */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 className="section-title"><Bell size={18} className="text-primary" /> Remaining Reminders</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {todayReminders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle2 size={32} className="text-primary" style={{ margin: '0 auto 0.75rem' }} />
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>All clean! No upcoming reminders left.</p>
              </div>
            ) : (
              todayReminders.map((rem) => (
                <div 
                  key={rem.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '0.85rem 1rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{rem.title}</h4>
                    <p className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      ⏰ {rem.time} | Priority: <span className={`badge badge-${rem.priority.toLowerCase()}`}>{rem.priority}</span>
                    </p>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem' }}
                    onClick={() => completeReminder(rem.id, todayStr)}
                  >
                    <Check size={14} className="text-primary" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Habit Streak Overview Row */}
      <div className="glass-card">
        <h2 className="section-title" style={{ marginBottom: '1rem' }}><Flame size={18} className="text-warning" /> Habit Tracker Streaks</h2>
        <div className="grid-3" style={{ gap: '1rem' }}>
          {habits.length === 0 ? (
            <p className="text-secondary" style={{ gridColumn: 'span 3', textAlign: 'center', fontSize: '0.85rem', padding: '1rem 0' }}>
              No habits created yet. Go to the Habits tab to start!
            </p>
          ) : (
            habits.slice(0, 3).map(h => {
              const completedToday = h.completions.includes(todayStr);
              return (
                <div key={h.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-secondary)' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{h.name}</h4>
                    <span className="streak-badge" style={{ marginTop: '0.25rem' }}>
                      <Flame size={12} fill="currentColor" /> {h.streak} day streak
                    </span>
                  </div>
                  <button 
                    className={`btn ${completedToday ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 'var(--radius-full)', padding: '0.45rem' }}
                    onClick={() => toggleHabitCompletion(h.id, todayStr)}
                  >
                    <Check size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Priority Matrix Quick Summary */}
      {urgentImportantTasks.length > 0 && (
        <div className="glass-card" style={{ borderTop: '3px solid var(--danger)' }}>
          <h2 className="section-title" style={{ marginBottom: '0.75rem', color: 'var(--danger)' }}>
            ⚠️ Critical Priorities (Important + Urgent)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {urgentImportantTasks.slice(0, 2).map((task) => (
              <div key={task.id} className="flex-between" style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{task.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Due: {task.dueDate} {task.dueTime}</p>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => updateTask({ ...task, status: 'Completed' })}
                >
                  Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. DAILY REVIEW SECTION (Renders at night) */}
      {isEvening && (
        <div className="glass-card" style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--primary-light) 100%)', border: '1px solid var(--primary)', animation: 'popIn 0.5s ease-out' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ color: 'var(--primary)' }}>
              <Award size={20} /> Daily Review Summary
            </h2>
            <span className="badge badge-low">Evening Check-in</span>
          </div>
          
          <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {completedTasksTodayCount}
              </span>
              <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tasks Finished</p>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: missedTasksCount > 0 ? 'var(--danger)' : 'var(--primary)' }}>
                {missedTasksCount}
              </span>
              <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Overdue Tasks</p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>
                {completedHabitsTodayCount}/{activeHabits}
              </span>
              <p className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Habits Ticked</p>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', lineHeight: '1.45', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ fontWeight: 700 }}>💡 Suggestions for Tomorrow:</h4>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {missedTasksCount > 0 && (
                <li>Reschedule or complete the {missedTasksCount} overdue task(s) first thing in the morning.</li>
              )}
              {todayTimetable.length > 0 && (
                <li>You have {todayTimetable.length} items scheduled on your calendar. Have a quick review before sleeping!</li>
              )}
              <li>Keep up your habit streaks by completing them early tomorrow.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
