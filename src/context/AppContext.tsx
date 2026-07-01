import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { isFirebaseConfigured, firebaseAuth, firebaseDb } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import { showLocalNotification } from '../swRegistration';
import { getLocalDateString } from '../utils/dateUtils';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- TYPES ---
export interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  timestamp: string; // ISO String
  type: 'task' | 'reminder' | 'habit' | 'timetable';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  theme: 'light' | 'dark';
  geminiKey?: string;
  preferences: {
    notifyAtTime: boolean;
    notifyBefore5m: boolean;
    notifyBefore15m: boolean;
    notifyBefore1h: boolean;
    notifyBefore1d: boolean;
  };
}

export interface TimetableProfile {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TimetableEntry {
  id: string;
  profileId: string;
  title: string;
  description: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  weekdays: number[]; // 0 = Sunday, 1 = Monday, etc.
  date?: string; // Specific date (YYYY-MM-DD) if applicable
  notes?: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  repeat: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number; // Every X days
  customWeekdays?: number[]; // Selected weekdays
  alertOffset: number; // Offset in minutes (e.g. 0, 5, 15, 60)
  completed: boolean;
  completedDates?: string[]; // Array of YYYY-MM-DD strings for repeating reminders
  missedNotified?: boolean; // Flag if we already warned user they missed this
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  status: 'Not started' | 'In progress' | 'Completed';
  progress: number; // 0 to 100
  matrixQuadrant: 'q1' | 'q2' | 'q3' | 'q4'; // 2x2 matrix
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  reminderTime?: string; // HH:MM
  goal: number; // Target completions per week/month
  streak: number;
  completions: string[]; // Dates completed (YYYY-MM-DD)
  failures?: string[]; // Dates failed/skipped (YYYY-MM-DD)
  createdAt: string;
}

export interface MissedReminder {
  id: string;
  reminderId?: string;
  taskId?: string;
  title: string;
  originalTime: string; // Timestamp or formatted time
  type: 'reminder' | 'task';
  suggestedNewTime: string; // Intelligently generated
}

interface AppContextType {
  user: UserProfile | null;
  loading: boolean;
  isCloudSync: boolean;
  timetableProfiles: TimetableProfile[];
  timetableEntries: TimetableEntry[];
  reminders: Reminder[];
  tasks: Task[];
  habits: Habit[];
  missedReminders: MissedReminder[];
  activityLogs: ActivityLog[];
  
  // Actions
  clearActivityLogs: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (displayName: string, theme: 'light' | 'dark', geminiKey: string, prefs: UserProfile['preferences']) => Promise<void>;
  
  // Timetable
  addTimetableProfile: (name: string) => Promise<void>;
  deleteTimetableProfile: (id: string) => Promise<void>;
  setActiveTimetableProfile: (id: string) => Promise<void>;
  addTimetableEntry: (entry: Omit<TimetableEntry, 'id'>) => Promise<void>;
  updateTimetableEntry: (entry: TimetableEntry) => Promise<void>;
  deleteTimetableEntry: (id: string) => Promise<void>;
  
  // Reminders
  addReminder: (reminder: Omit<Reminder, 'id' | 'completed' | 'completedDates'>) => Promise<void>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string, date: string) => Promise<void>;
  
  // Tasks
  addTask: (task: Omit<Task, 'id' | 'progress'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTaskQuadrant: (taskId: string, quadrant: Task['matrixQuadrant']) => Promise<void>;
  
  // Habits
  addHabit: (habit: Omit<Habit, 'id' | 'streak' | 'completions' | 'createdAt'>) => Promise<void>;
  toggleHabitCompletion: (id: string, date: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  // Missed Reminder Actions
  resolveMissedReminder: (id: string, action: 'complete' | 'reschedule' | 'ignore', newDate?: string, newTime?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper function to recursively remove undefined fields from an object so Firestore doesn't reject them
export function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }

  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      cleaned[key] = cleanUndefined(obj[key]);
    }
  }
  return cleaned;
}

// Helper to hash string ID to 32-bit integer for Android notifications
export function stringToUniqueIntegerId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const scheduleNativeReminderNotification = async (reminder: Reminder) => {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    const id = stringToUniqueIntegerId(reminder.id);
    
    // First cancel any existing one
    await LocalNotifications.cancel({ notifications: [{ id }] });
    
    // If it's already completed, don't schedule
    if (reminder.completed) return;
    
    const scheduledDate = new Date(`${reminder.date}T${reminder.time}`);
    // Apply alertOffset
    scheduledDate.setMinutes(scheduledDate.getMinutes() - reminder.alertOffset);
    
    // If the scheduled time is in the past, don't schedule
    if (scheduledDate.getTime() <= Date.now()) return;
    
    const scheduleConfig: any = { at: scheduledDate };
    
    if (reminder.repeat === 'daily') {
      scheduleConfig.repeats = true;
      scheduleConfig.every = 'day';
    } else if (reminder.repeat === 'weekly') {
      scheduleConfig.repeats = true;
      scheduleConfig.every = 'week';
    } else if (reminder.repeat === 'monthly') {
      scheduleConfig.repeats = true;
      scheduleConfig.every = 'month';
    } else if (reminder.repeat === 'yearly') {
      scheduleConfig.repeats = true;
      scheduleConfig.every = 'year';
    }
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: reminder.title,
          body: reminder.description || `Alarm set for ${reminder.time}`,
          schedule: scheduleConfig,
          extra: { reminderId: reminder.id },
          sound: 'default'
        }
      ]
    });
    console.log(`Native notification scheduled for reminder "${reminder.title}" at ${scheduledDate}`);
  } catch (err) {
    console.error('Failed to schedule native reminder notification:', err);
  }
};

export const scheduleNativeTaskNotification = async (task: Task) => {
  if (!Capacitor.isNativePlatform() || !task.dueDate) return;
  
  try {
    const id = stringToUniqueIntegerId(task.id);
    
    // Cancel any existing one
    await LocalNotifications.cancel({ notifications: [{ id }] });
    
    // If task is completed, don't schedule
    if (task.status === 'Completed') return;
    
    const scheduledDate = new Date(`${task.dueDate}T${task.dueTime || '12:00'}`);
    if (scheduledDate.getTime() <= Date.now()) return;
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: `Task Due: ${task.title}`,
          body: task.description || `Task is due at ${task.dueTime || '12:00'}`,
          schedule: { at: scheduledDate },
          extra: { taskId: task.id },
          sound: 'default'
        }
      ]
    });
    console.log(`Native notification scheduled for task "${task.title}" at ${scheduledDate}`);
  } catch (err) {
    console.error('Failed to schedule native task notification:', err);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloudSync, setIsCloudSync] = useState(false);
  
  // Local/Fallback Database States
  const [timetableProfiles, setTimetableProfiles] = useState<TimetableProfile[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [missedReminders, setMissedReminders] = useState<MissedReminder[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Ref to hold the active Firestore sync cleanup function
  const syncCleanupRef = useRef<(() => void) | null>(null);

  // 1. Auth Change Listener (Firebase vs Demo)
  useEffect(() => {
    if (isFirebaseConfigured && firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        // Clean up previous sync listeners if any
        if (syncCleanupRef.current) {
          syncCleanupRef.current();
          syncCleanupRef.current = null;
        }

        if (firebaseUser) {
          setIsCloudSync(true);
          // Set up listeners for Firestore collections
          syncCleanupRef.current = setupFirestoreSync(firebaseUser.uid) || null;
        } else {
          setIsCloudSync(false);
          loadLocalData();
        }
      });
      return () => {
        unsubscribe();
        if (syncCleanupRef.current) {
          syncCleanupRef.current();
          syncCleanupRef.current = null;
        }
      };
    } else {
      setIsCloudSync(false);
      loadLocalData();
    }
  }, []);

  // 2. Local Storage Loader for Demo Mode
  const loadLocalData = () => {
    try {
      const savedUser = localStorage.getItem('lifeos_user_profile');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        const defaultProfile: UserProfile = {
          uid: 'demo_user',
          email: 'demo@lifeos.app',
          displayName: 'Demo Achiever',
          theme: 'dark',
          preferences: {
            notifyAtTime: true,
            notifyBefore5m: false,
            notifyBefore15m: true,
            notifyBefore1h: false,
            notifyBefore1d: false
          }
        };
        setUser(defaultProfile);
        localStorage.setItem('lifeos_user_profile', JSON.stringify(defaultProfile));
      }

      setTimetableProfiles(JSON.parse(localStorage.getItem('lifeos_timetable_profiles') || '[]'));
      setTimetableEntries(JSON.parse(localStorage.getItem('lifeos_timetable_entries') || '[]'));
      setReminders(JSON.parse(localStorage.getItem('lifeos_reminders') || '[]'));
      setTasks(JSON.parse(localStorage.getItem('lifeos_tasks') || '[]'));
      setHabits(JSON.parse(localStorage.getItem('lifeos_habits') || '[]'));
      setMissedReminders(JSON.parse(localStorage.getItem('lifeos_missed_reminders') || '[]'));
      setActivityLogs(JSON.parse(localStorage.getItem('lifeos_activity_logs') || '[]').sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp)));
    } catch (e) {
      console.error('Error loading local data:', e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Firestore Syncer
  const setupFirestoreSync = (userId: string) => {
    if (!firebaseDb) return;

    let hasAlerted = false;

    // Graceful error handler to prevent page load freezing when database permissions are restricted
    const handleSyncError = (error: any) => {
      console.error("Firestore synchronization error:", error);
      setLoading(false);
      if (error.code === 'permission-denied') {
        if (!hasAlerted) {
          hasAlerted = true;
          alert("Firestore database permission denied. Reverting to local fallback. Please verify your Security Rules or sign in again.");
          if (firebaseAuth) {
            signOut(firebaseAuth).catch(err => console.error("Sign out error:", err));
          }
        }
      }
    };
    
    // User profile listener
    const userDocRef = doc(firebaseDb, 'users', userId);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        const localKey = localStorage.getItem('lifeos_gemini_api_key');
        if (!data.geminiKey && localKey) {
          setDoc(userDocRef, cleanUndefined({ ...data, geminiKey: localKey }), { merge: true });
          setUser({ ...data, geminiKey: localKey });
        } else {
          setUser(data);
        }
      } else {
        // Create initial profile in Firestore
        const localKey = localStorage.getItem('lifeos_gemini_api_key');
        const defaultProfile: UserProfile = {
          uid: userId,
          email: firebaseAuth?.currentUser?.email || '',
          displayName: firebaseAuth?.currentUser?.displayName || 'User',
          theme: 'dark',
          geminiKey: localKey || undefined,
          preferences: {
            notifyAtTime: true,
            notifyBefore5m: false,
            notifyBefore15m: true,
            notifyBefore1h: false,
            notifyBefore1d: false
          }
        };
        setDoc(userDocRef, cleanUndefined(defaultProfile));
        setUser(defaultProfile);
      }
    }, handleSyncError);

    // Firestore Collections Real-time Listeners
    const unsubProfiles = onSnapshot(collection(firebaseDb, 'users', userId, 'timetableProfiles'), (snap) => {
      const items: TimetableProfile[] = [];
      snap.forEach((doc) => items.push(doc.data() as TimetableProfile));
      setTimetableProfiles(items);
    }, handleSyncError);

    const unsubEntries = onSnapshot(collection(firebaseDb, 'users', userId, 'timetableEntries'), (snap) => {
      const items: TimetableEntry[] = [];
      snap.forEach((doc) => items.push(doc.data() as TimetableEntry));
      setTimetableEntries(items);
    }, handleSyncError);

    const unsubReminders = onSnapshot(collection(firebaseDb, 'users', userId, 'reminders'), (snap) => {
      const items: Reminder[] = [];
      snap.forEach((doc) => items.push(doc.data() as Reminder));
      setReminders(items);
    }, handleSyncError);

    const unsubTasks = onSnapshot(collection(firebaseDb, 'users', userId, 'tasks'), (snap) => {
      const items: Task[] = [];
      snap.forEach((doc) => items.push(doc.data() as Task));
      setTasks(items);
    }, handleSyncError);

    const unsubHabits = onSnapshot(collection(firebaseDb, 'users', userId, 'habits'), (snap) => {
      const items: Habit[] = [];
      snap.forEach((doc) => items.push(doc.data() as Habit));
      setHabits(items);
    }, handleSyncError);

    const unsubMissed = onSnapshot(collection(firebaseDb, 'users', userId, 'missedReminders'), (snap) => {
      const items: MissedReminder[] = [];
      snap.forEach((doc) => items.push(doc.data() as MissedReminder));
      setMissedReminders(items);
    }, handleSyncError);

    const unsubLogs = onSnapshot(collection(firebaseDb, 'users', userId, 'activityLogs'), (snap) => {
      const items: ActivityLog[] = [];
      snap.forEach((doc) => items.push(doc.data() as ActivityLog));
      items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setActivityLogs(items);
      setLoading(false);
    }, handleSyncError);

    return () => {
      unsubUser();
      unsubProfiles();
      unsubEntries();
      unsubReminders();
      unsubTasks();
      unsubHabits();
      unsubMissed();
      unsubLogs();
    };
  };

  // Sync settings/preferences to LocalStorage/Firestore when user object changes
  useEffect(() => {
    if (user) {
      document.documentElement.setAttribute('data-theme', user.theme);
      if (user.geminiKey) {
        localStorage.setItem('lifeos_gemini_api_key', user.geminiKey);
      } else {
        localStorage.removeItem('lifeos_gemini_api_key');
      }
      if (!isCloudSync) {
        localStorage.setItem('lifeos_user_profile', JSON.stringify(user));
      }
    }
  }, [user, isCloudSync]);

  // Unified save functions
  const saveToStore = async (colName: string, id: string, data: any) => {
    if (isCloudSync && firebaseDb && user) {
      await setDoc(doc(firebaseDb, 'users', user.uid, colName, id), cleanUndefined(data));
    } else {
      // Local storage save
      const key = `lifeos_${colName === 'timetableProfiles' ? 'timetable_profiles' : colName === 'timetableEntries' ? 'timetable_entries' : colName === 'missedReminders' ? 'missed_reminders' : colName === 'activityLogs' ? 'activity_logs' : colName}`;
      let items = JSON.parse(localStorage.getItem(key) || '[]');
      items = items.filter((item: any) => item.id !== id);
      items.push(data);
      localStorage.setItem(key, JSON.stringify(items));
      // Trigger state updates
      if (colName === 'timetableProfiles') setTimetableProfiles(items);
      else if (colName === 'timetableEntries') setTimetableEntries(items);
      else if (colName === 'reminders') setReminders(items);
      else if (colName === 'tasks') setTasks(items);
      else if (colName === 'habits') setHabits(items);
      else if (colName === 'missedReminders') setMissedReminders(items);
      else if (colName === 'activityLogs') setActivityLogs(items.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp)));
    }
  };

  const removeFromStore = async (colName: string, id: string) => {
    if (isCloudSync && firebaseDb && user) {
      await deleteDoc(doc(firebaseDb, 'users', user.uid, colName, id));
    } else {
      const key = `lifeos_${colName === 'timetableProfiles' ? 'timetable_profiles' : colName === 'timetableEntries' ? 'timetable_entries' : colName === 'missedReminders' ? 'missed_reminders' : colName === 'activityLogs' ? 'activity_logs' : colName}`;
      let items = JSON.parse(localStorage.getItem(key) || '[]');
      items = items.filter((item: any) => item.id !== id);
      localStorage.setItem(key, JSON.stringify(items));
      
      if (colName === 'timetableProfiles') setTimetableProfiles(items);
      else if (colName === 'timetableEntries') setTimetableEntries(items);
      else if (colName === 'reminders') setReminders(items);
      else if (colName === 'tasks') setTasks(items);
      else if (colName === 'habits') setHabits(items);
      else if (colName === 'missedReminders') setMissedReminders(items);
      else if (colName === 'activityLogs') setActivityLogs(items);
    }
  };

  // --- AUTH ACTIONS ---
  const login = async (email: string, password: string) => {
    if (isFirebaseConfigured && firebaseAuth) {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } else {
      throw new Error("Firebase Authentication is not configured.");
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    if (isFirebaseConfigured && firebaseAuth && firebaseDb) {
      const res = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Wait a moment for onAuthStateChanged to spin up and save user profile
      const userDocRef = doc(firebaseDb, 'users', res.user.uid);
      await setDoc(userDocRef, cleanUndefined({
        uid: res.user.uid,
        email,
        displayName,
        theme: 'dark',
        preferences: {
          notifyAtTime: true,
          notifyBefore5m: false,
          notifyBefore15m: true,
          notifyBefore1h: false,
          notifyBefore1d: false
        }
      }));
    } else {
      throw new Error("Firebase is not configured.");
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      await signOut(firebaseAuth);
    } else {
      // Clear demo profile and reset default
      localStorage.removeItem('lifeos_user_profile');
      loadLocalData();
    }
  };

  const updateSettings = async (displayName: string, theme: 'light' | 'dark', geminiKey: string, prefs: UserProfile['preferences']) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      displayName,
      theme,
      geminiKey,
      preferences: prefs
    };
    
    if (isCloudSync && firebaseDb) {
      await setDoc(doc(firebaseDb, 'users', user.uid), cleanUndefined(updated));
    } else {
      localStorage.setItem('lifeos_user_profile', JSON.stringify(updated));
      setUser(updated);
    }
  };

  const logActivity = async (action: string, type: ActivityLog['type'], details?: string) => {
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      action,
      details,
      timestamp: new Date().toISOString(),
      type
    };
    await saveToStore('activityLogs', newLog.id, newLog);
  };

  const clearActivityLogs = async () => {
    if (isCloudSync && firebaseDb && user) {
      for (const log of activityLogs) {
        await deleteDoc(doc(firebaseDb, 'users', user.uid, 'activityLogs', log.id));
      }
    } else {
      localStorage.removeItem('lifeos_activity_logs');
      setActivityLogs([]);
    }
  };

  // --- TIMETABLE ACTIONS ---
  const addTimetableProfile = async (name: string) => {
    const newProfile: TimetableProfile = {
      id: crypto.randomUUID(),
      name,
      isActive: timetableProfiles.length === 0 ? true : false
    };
    await saveToStore('timetableProfiles', newProfile.id, newProfile);
    await logActivity(`Created Timetable Profile: "${name}"`, 'timetable');
  };

  const deleteTimetableProfile = async (id: string) => {
    const profile = timetableProfiles.find(p => p.id === id);
    await removeFromStore('timetableProfiles', id);
    // Delete corresponding entries
    const entriesToDelete = timetableEntries.filter(e => e.profileId === id);
    for (const e of entriesToDelete) {
      await removeFromStore('timetableEntries', e.id);
    }
    await logActivity(`Deleted Timetable Profile: "${profile?.name || 'Unknown'}"`, 'timetable');
  };

  const setActiveTimetableProfile = async (id: string) => {
    const updatedProfiles = timetableProfiles.map(p => ({
      ...p,
      isActive: p.id === id
    }));
    
    for (const p of updatedProfiles) {
      await saveToStore('timetableProfiles', p.id, p);
    }
    const active = timetableProfiles.find(p => p.id === id);
    if (active) {
      await logActivity(`Switched active profile to: "${active.name}"`, 'timetable');
    }
  };

  const addTimetableEntry = async (entry: Omit<TimetableEntry, 'id'>) => {
    const newEntry: TimetableEntry = {
      ...entry,
      id: crypto.randomUUID()
    };
    await saveToStore('timetableEntries', newEntry.id, newEntry);
    await logActivity(`Added Schedule Block: "${entry.title}" (${entry.startTime} - ${entry.endTime})`, 'timetable');
  };

  const updateTimetableEntry = async (entry: TimetableEntry) => {
    await saveToStore('timetableEntries', entry.id, entry);
    await logActivity(`Updated Schedule Block: "${entry.title}"`, 'timetable');
  };

  const deleteTimetableEntry = async (id: string) => {
    const entry = timetableEntries.find(e => e.id === id);
    await removeFromStore('timetableEntries', id);
    await logActivity(`Removed Schedule Block: "${entry?.title || 'Unknown'}"`, 'timetable');
  };

  // --- REMINDERS ---
  const addReminder = async (reminder: Omit<Reminder, 'id' | 'completed' | 'completedDates'>) => {
    const newReminder: Reminder = {
      ...reminder,
      id: crypto.randomUUID(),
      completed: false,
      completedDates: []
    };
    await saveToStore('reminders', newReminder.id, newReminder);
    await logActivity(`Set Reminder Alarm: "${reminder.title}" at ${reminder.time}`, 'reminder');
  };

  const updateReminder = async (reminder: Reminder) => {
    await saveToStore('reminders', reminder.id, reminder);
    await logActivity(`Updated Reminder Details: "${reminder.title}"`, 'reminder');
  };

  const deleteReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    await removeFromStore('reminders', id);
    await logActivity(`Deleted Reminder: "${reminder?.title || 'Unknown'}"`, 'reminder');
  };

  const completeReminder = async (id: string, date: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    if (reminder.repeat === 'one-time') {
      const updated = { ...reminder, completed: true };
      await saveToStore('reminders', id, updated);
    } else {
      // For repeating ones, save the date to completedDates list
      const dates = reminder.completedDates || [];
      if (!dates.includes(date)) {
        const updated = {
          ...reminder,
          completedDates: [...dates, date]
        };
        await saveToStore('reminders', id, updated);
      }
    }
    await logActivity(`Completed Reminder task: "${reminder.title}"`, 'reminder');
  };

  // --- TASKS ---
  const addTask = async (task: Omit<Task, 'id' | 'progress'>) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      progress: task.status === 'Completed' ? 100 : task.status === 'In progress' ? 50 : 0
    };
    await saveToStore('tasks', newTask.id, newTask);
    await logActivity(`Created Task: "${task.title}" (Priority: ${task.priority})`, 'task');
  };

  const updateTask = async (task: Task) => {
    const oldTask = tasks.find(t => t.id === task.id);
    const progress = task.status === 'Completed' ? 100 : task.status === 'In progress' ? task.progress || 50 : 0;
    const updated = { ...task, progress };
    await saveToStore('tasks', task.id, updated);
    
    if (oldTask?.status !== task.status) {
      await logActivity(`Task status updated: "${task.title}" -> ${task.status}`, 'task');
    } else {
      await logActivity(`Updated Task details: "${task.title}"`, 'task');
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    await removeFromStore('tasks', id);
    await logActivity(`Deleted Task: "${task?.title || 'Unknown'}"`, 'task');
  };

  const moveTaskQuadrant = async (taskId: string, quadrant: Task['matrixQuadrant']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = { ...task, matrixQuadrant: quadrant };
    await saveToStore('tasks', taskId, updated);
    await logActivity(`Moved Task "${task.title}" to Quadrant ${quadrant.toUpperCase()}`, 'task');
  };

  // --- HABITS ---
  const addHabit = async (habit: Omit<Habit, 'id' | 'streak' | 'completions' | 'failures' | 'createdAt'>) => {
    const newHabit: Habit = {
      ...habit,
      id: crypto.randomUUID(),
      streak: 0,
      completions: [],
      failures: [],
      createdAt: getLocalDateString()
    };
    await saveToStore('habits', newHabit.id, newHabit);
    await logActivity(`Created Habit Tracker: "${habit.name}"`, 'habit');
  };

  const toggleHabitCompletion = async (id: string, date: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    let completions = [...habit.completions];
    let failures = habit.failures ? [...habit.failures] : [];
    const wasCompleted = completions.includes(date);

    if (completions.includes(date)) {
      // Completed -> Failed (Green -> Red)
      completions = completions.filter(d => d !== date);
      failures.push(date);
    } else if (failures.includes(date)) {
      // Failed -> Neutral (Red -> Empty)
      failures = failures.filter(d => d !== date);
    } else {
      // Neutral -> Completed (Empty -> Green)
      completions.push(date);
    }

    // Recalculate streak
    completions.sort();
    let streak = 0;
    let checkDate = new Date();
    
    // Check if completed today
    const todayStr = getLocalDateString(checkDate);
    let completedIndex = completions.indexOf(todayStr);
    
    // If not completed today, check yesterday
    if (completedIndex === -1) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = getLocalDateString(checkDate);
      completedIndex = completions.indexOf(yesterdayStr);
    }

    if (completedIndex !== -1) {
      streak = 1;
      let currIndex = completedIndex;
      // Walk backwards to find consecutive days
      while (currIndex > 0) {
        const d1 = new Date(completions[currIndex]);
        const d2 = new Date(completions[currIndex - 1]);
        const diffTime = Math.abs(d1.getTime() - d2.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
          currIndex--;
        } else if (diffDays === 0) {
          currIndex--; // Skip duplicates
        } else {
          break;
        }
      }
    }

    const updated = { ...habit, completions, failures, streak };
    await saveToStore('habits', id, updated);
    await logActivity(`${!wasCompleted ? 'Completed' : 'Toggled status of'} Habit: "${habit.name}"`, 'habit');
  };

  const deleteHabit = async (id: string) => {
    const habit = habits.find(h => h.id === id);
    await removeFromStore('habits', id);
    await logActivity(`Deleted Habit: "${habit?.name || 'Unknown'}"`, 'habit');
  };

  // --- MISSED REMINDER RECOVERY ACTIONS ---
  const resolveMissedReminder = async (id: string, action: 'complete' | 'reschedule' | 'ignore', newDate?: string, newTime?: string) => {
    const missed = missedReminders.find(m => m.id === id);
    if (!missed) return;

    if (action === 'complete') {
      if (missed.type === 'reminder' && missed.reminderId) {
        const todayStr = new Date().toISOString().split('T')[0];
        await completeReminder(missed.reminderId, todayStr);
      } else if (missed.type === 'task' && missed.taskId) {
        const task = tasks.find(t => t.id === missed.taskId);
        if (task) {
          await updateTask({ ...task, status: 'Completed' });
        }
      }
    } else if (action === 'reschedule' && newDate && newTime) {
      if (missed.type === 'reminder' && missed.reminderId) {
        const rem = reminders.find(r => r.id === missed.reminderId);
        if (rem) {
          await updateReminder({ ...rem, date: newDate, time: newTime, completed: false, missedNotified: false });
        }
      } else if (missed.type === 'task' && missed.taskId) {
        const task = tasks.find(t => t.id === missed.taskId);
        if (task) {
          await updateTask({ ...task, dueDate: newDate, dueTime: newTime, status: 'In progress' });
        }
      }
    }

    // Remove the missed reminder recovery record
    await removeFromStore('missedReminders', id);
    await logActivity(`Resolved Missed Recovery Action (${action}) for: "${missed.title}"`, missed.type);
  };

  // Synchronize scheduled Native notifications on Android/iOS when reminders list changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncReminders = async () => {
      try {
        const pending = await LocalNotifications.getPending();
        const pendingIds = new Set(pending.notifications.map(n => n.id));
        
        for (const reminder of reminders) {
          const id = stringToUniqueIntegerId(reminder.id);
          const isCompleted = reminder.completed;
          
          if (isCompleted) {
            if (pendingIds.has(id)) {
              await LocalNotifications.cancel({ notifications: [{ id }] });
            }
          } else {
            await scheduleNativeReminderNotification(reminder);
          }
        }
        
        const currentReminderIds = new Set(reminders.map(r => stringToUniqueIntegerId(r.id)));
        for (const p of pending.notifications) {
          if (p.extra?.reminderId && !currentReminderIds.has(p.id)) {
            await LocalNotifications.cancel({ notifications: [{ id: p.id }] });
          }
        }
      } catch (err) {
        console.error('Error syncing native reminders:', err);
      }
    };

    syncReminders();
  }, [reminders]);

  // Synchronize scheduled Native notifications on Android/iOS when tasks list changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncTasks = async () => {
      try {
        const pending = await LocalNotifications.getPending();
        const pendingIds = new Set(pending.notifications.map(n => n.id));
        
        for (const task of tasks) {
          if (!task.dueDate) continue;
          const id = stringToUniqueIntegerId(task.id);
          const isCompleted = task.status === 'Completed';
          
          if (isCompleted) {
            if (pendingIds.has(id)) {
              await LocalNotifications.cancel({ notifications: [{ id }] });
            }
          } else {
            await scheduleNativeTaskNotification(task);
          }
        }
        
        const currentTaskIds = new Set(tasks.map(t => stringToUniqueIntegerId(t.id)));
        for (const p of pending.notifications) {
          if (p.extra?.taskId && !currentTaskIds.has(p.id)) {
            await LocalNotifications.cancel({ notifications: [{ id: p.id }] });
          }
        }
      } catch (err) {
        console.error('Error syncing native tasks:', err);
      }
    };

    syncTasks();
  }, [tasks]);

  // --- BACKGROUND POLLING: ALARMS AND MISSED REMINDER DETECTION ---
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = getLocalDateString(now);
      const dayOfWeek = now.getDay();

      // 1. Trigger Scheduled Alarms
      reminders.forEach((reminder) => {
        // Skip if already finished for today
        const isCompletedToday = reminder.completed || (reminder.completedDates && reminder.completedDates.includes(todayStr));
        if (isCompletedToday) return;

        // Check if date matches
        let dateMatches = reminder.date === todayStr;
        if (reminder.repeat === 'daily') dateMatches = true;
        else if (reminder.repeat === 'weekly') {
          const reminderDay = new Date(reminder.date).getDay();
          dateMatches = dayOfWeek === reminderDay;
        } else if (reminder.repeat === 'custom') {
          if (reminder.customWeekdays && reminder.customWeekdays.length > 0) {
            dateMatches = reminder.customWeekdays.includes(dayOfWeek);
          } else if (reminder.customDays) {
            // Check days difference since start date
            const start = new Date(reminder.date);
            const diffTime = Math.abs(now.getTime() - start.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            dateMatches = diffDays % reminder.customDays === 0;
          }
        }

        if (dateMatches) {
          // Check offset times
          const [remH, remM] = reminder.time.split(':').map(Number);
          const remDate = new Date(now);
          remDate.setHours(remH, remM, 0, 0);

          const minutesDiff = Math.round((remDate.getTime() - now.getTime()) / (60000));

          if (minutesDiff === reminder.alertOffset) {
            // Firing Notification!
            const bodyMessage = minutesDiff === 0 
              ? `Starts now (${reminder.time})` 
              : `Starts in ${minutesDiff} minutes (${reminder.time})`;
              
            showLocalNotification(`🔔 Reminder: ${reminder.title}`, {
              body: bodyMessage,
              tag: reminder.id,
              data: { id: reminder.id },
              actions: [
                { action: 'COMPLETE', title: 'Complete' },
                { action: 'SNOOZE', title: 'Snooze 15m' }
              ]
            } as any);
          }
        }
      });

      // 2. Detect Missed Reminders (whose scheduled time has passed by > 15 mins and user wasn't notified yet)
      reminders.forEach(async (reminder) => {
        const isCompletedToday = reminder.completed || (reminder.completedDates && reminder.completedDates.includes(todayStr));
        if (isCompletedToday || reminder.missedNotified) return;

        // Check if it was today
        const isToday = reminder.date === todayStr || reminder.repeat === 'daily' || 
          (reminder.repeat === 'weekly' && new Date(reminder.date).getDay() === dayOfWeek);

        if (isToday) {
          const [remH, remM] = reminder.time.split(':').map(Number);
          const remTime = new Date();
          remTime.setHours(remH, remM, 0, 0);

          // If scheduled time passed by more than 15 mins
          const diffMins = (now.getTime() - remTime.getTime()) / 60000;
          if (diffMins >= 15 && diffMins <= 1440) { // Passed today but not longer than a day
            // Trigger missed reminder recovery
            const alreadyLogged = missedReminders.some(m => m.reminderId === reminder.id);
            if (!alreadyLogged) {
              const suggested = new Date(now);
              suggested.setHours(now.getHours() + 1, 0, 0, 0); // Suggest 1 hour from now
              
              const newMissed: MissedReminder = {
                id: crypto.randomUUID(),
                reminderId: reminder.id,
                title: reminder.title,
                originalTime: `${reminder.date} ${reminder.time}`,
                type: 'reminder',
                suggestedNewTime: `${suggested.toISOString().split('T')[0]} ${String(suggested.getHours()).padStart(2, '0')}:00`
              };

              // Mark as notified so we don't log repeatedly
              const updated = { ...reminder, missedNotified: true };
              await saveToStore('reminders', reminder.id, updated);
              await saveToStore('missedReminders', newMissed.id, newMissed);

              showLocalNotification(`⚠️ Missed Reminder`, {
                body: `You missed: "${reminder.title}". Tap to recover/reschedule.`,
                icon: '/icon-192.png'
              });
            }
          }
        }
      });

      // Detect Missed Tasks (whose due date has passed without being Completed)
      tasks.forEach(async (task) => {
        if (task.status === 'Completed') return;
        if (!task.dueDate) return;

        const taskDueDate = new Date(task.dueDate + 'T' + (task.dueTime || '23:59:59'));
        if (now > taskDueDate) {
          const alreadyLogged = missedReminders.some(m => m.taskId === task.id);
          if (!alreadyLogged) {
            const suggested = new Date();
            suggested.setDate(suggested.getDate() + 1); // Suggest tomorrow morning 9am
            
            const newMissed: MissedReminder = {
              id: crypto.randomUUID(),
              taskId: task.id,
              title: task.title,
              originalTime: `${task.dueDate} ${task.dueTime || '23:59'}`,
              type: 'task',
              suggestedNewTime: `${suggested.toISOString().split('T')[0]} 09:00`
            };

            await saveToStore('missedReminders', newMissed.id, newMissed);
            
            showLocalNotification(`⚠️ Overdue Task`, {
              body: `Task "${task.title}" is overdue. Tap to resolve.`,
              icon: '/icon-192.png'
            });
          }
        }
      });

    }, 60000); // Poll every minute

    return () => clearInterval(interval);
  }, [reminders, tasks, missedReminders]);

  // Handle messages/actions received from Service Worker
  useEffect(() => {
    const handleSWMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
        const { action, reminderId } = event.data;
        console.log(`Context processing notification action ${action} for ID ${reminderId}`);
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (action === 'COMPLETE') {
          await completeReminder(reminderId, todayStr);
        } else if (action === 'SNOOZE') {
          const rem = reminders.find(r => r.id === reminderId);
          if (rem) {
            // Push reminder time forward by 15 mins
            const now = new Date();
            now.setMinutes(now.getMinutes() + 15);
            const newH = String(now.getHours()).padStart(2, '0');
            const newM = String(now.getMinutes()).padStart(2, '0');
            await updateReminder({
              ...rem,
              time: `${newH}:${newM}`,
              date: now.toISOString().split('T')[0],
              completed: false,
              missedNotified: false
            });
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    }
  }, [reminders]);

  return (
    <AppContext.Provider value={{
      user,
      loading,
      isCloudSync,
      timetableProfiles,
      timetableEntries,
      reminders,
      tasks,
      habits,
      missedReminders,
      login,
      register,
      logout,
      updateSettings,
      addTimetableProfile,
      deleteTimetableProfile,
      setActiveTimetableProfile,
      addTimetableEntry,
      updateTimetableEntry,
      deleteTimetableEntry,
      addReminder,
      updateReminder,
      deleteReminder,
      completeReminder,
      addTask,
      updateTask,
      deleteTask,
      moveTaskQuadrant,
      addHabit,
      toggleHabitCompletion,
      deleteHabit,
      resolveMissedReminder,
      activityLogs,
      clearActivityLogs
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
