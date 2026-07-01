import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { askGemini, parseNaturalLanguageInput } from '../gemini';
import { 
  Bot, 
  Send, 
  User, 
  BrainCircuit
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isActionFeedback?: boolean;
}

export const SmartAssistant: React.FC = () => {
  const { 
    timetableProfiles, 
    timetableEntries, 
    reminders, 
    tasks, 
    habits,
    addTask,
    addReminder,
    addTimetableEntry
  } = useApp();

  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: "Hi! I am your LifeOS Smart Assistant. I have read your agenda, habits, matrix tasks, and active timetable. How can I help you organize your day or analyze your productivity?",
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Compile database state as text description for Gemini prompt
  const getSystemContextDescription = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const activeProfile = timetableProfiles.find(p => p.isActive);

    const activeBlocksText = timetableEntries
      .filter(e => e.profileId === activeProfile?.id)
      .map(e => `- ${e.title} from ${e.startTime} to ${e.endTime} (Days: ${e.date || e.weekdays.join(',')})`)
      .join('\n');

    const activeRemindersText = reminders
      .map(r => `- [${r.completed ? 'COMPLETED' : 'PENDING'}] ${r.title} at ${r.time} on ${r.date} (Repeat: ${r.repeat})`)
      .join('\n');

    const activeTasksText = tasks
      .map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate}, Quadrant: ${t.matrixQuadrant.toUpperCase()})`)
      .join('\n');

    const activeHabitsText = habits
      .map(h => `- ${h.name} (Streak: ${h.streak} days, completed on: ${h.completions.join(', ')})`)
      .join('\n');

    return `
You are the "LifeOS AI Assistant", integrated inside the user's personal PWA.
Your primary role is to help users who suffer from forgetfulness organize their lives.
Today's local time is: ${now.toString()}.
Today's Date: ${todayStr}.

USER DATA CURRENT CONTEXT:
---
TIMETABLE SCHEDULE BLOCKS (Active profile: ${activeProfile?.name || 'None'}):
${activeBlocksText || 'No schedule blocks loaded.'}

REMINDERS:
${activeRemindersText || 'No reminders configured.'}

EISENHOWER MATRIX TASKS:
${activeTasksText || 'No tasks created.'}

HABITS TRACKED:
${activeHabitsText || 'No habits registered.'}
---

Your response guidelines:
1. Be extremely encouraging, friendly, and structured.
2. Keep answers concise and direct. Focus on actionable insights.
3. Suggest clear next steps to help the user.
4. When asked what the user has to do today, summarize timetable blocks, reminders, and tasks in a beautiful readable checklist!
5. When analyzing productivity, check completed tasks and habits vs total goals and give insights.
6. If the user requests to create something like "add task x" or "remind me to y", explain that you are creating it. (The app will handle the background creation, you just need to explain what you've scheduled).
`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setChatLog(prev => [...prev, { sender: 'user', text: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      // 1. Check if user is asking to create/schedule something
      const isCreateRequest = /(add|remind|schedule|create|set reminder|put|new task)/i.test(userMessage);

      if (isCreateRequest) {
        const nowContext = new Date().toString();
        const parseResult = await parseNaturalLanguageInput(userMessage, nowContext);
        
        // Add Assistant text reply
        setChatLog(prev => [...prev, {
          sender: 'assistant',
          text: parseResult.response + (parseResult.missingInfo ? `\n\n⚠️ Missing Info: ${parseResult.missingInfo}` : ''),
          timestamp: new Date()
        }]);

        // If parsed items successfully and no missing key info, write them!
        if (parseResult.items && parseResult.items.length > 0 && !parseResult.missingInfo) {
          for (const item of parseResult.items) {
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
                alertOffset: 15
              });
            } else if (item.type === 'timetable') {
              await addTimetableEntry({
                profileId: 'default',
                title: item.title,
                description: item.description || '',
                startTime: item.time || '09:00',
                endTime: '10:00',
                category: item.category || 'Routine',
                priority: item.priority || 'Medium',
                weekdays: [new Date().getDay()]
              });
            }
          }
        }
      } else {
        // 2. Otherwise it's a general question, query Gemini with full Context Description
        const systemPrompt = getSystemContextDescription();
        const aiResponse = await askGemini(userMessage, systemPrompt);
        
        setChatLog(prev => [...prev, {
          sender: 'assistant',
          text: aiResponse,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      console.error(err);
      setChatLog(prev => [...prev, {
        sender: 'assistant',
        text: `Error connecting to Assistant: ${err.message || 'API Key is missing or invalid. Check Settings.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick prompt suggestions
  const suggestions = [
    "What do I need to do today?",
    "How productive was I this week?",
    "Suggest priority matrix corrections",
    "Remind me to take medicine tomorrow at 8 AM"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">LifeOS Smart Assistant</h1>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Your Gemini-powered productivity advisor. Ask questions or create tasks in plain English.
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="chat-container glass-card" style={{ display: 'flex', flexDirection: 'column', height: '550px', padding: 0 }}>
        
        {/* Header bar */}
        <div className="chat-header">
          <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', display: 'flex' }}>
            <BrainCircuit size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>LifeOS Assistant</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>Gemini 2.5 Flash Online</span>
          </div>
        </div>

        {/* Conversation list */}
        <div className="chat-messages">
          {chatLog.map((msg, index) => {
            const isAI = msg.sender === 'assistant';
            return (
              <div 
                key={index} 
                className={`chat-message ${isAI ? 'message-assistant' : 'message-user'}`}
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  alignSelf: isAI ? 'flex-start' : 'flex-end',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  backgroundColor: isAI ? 'var(--bg-tertiary)' : 'var(--primary)',
                  color: isAI ? 'var(--text-primary)' : '#fff'
                }}
              >
                {isAI ? <Bot size={14} style={{ marginTop: '0.2rem', color: 'var(--primary)' }} /> : <User size={14} style={{ marginTop: '0.2rem' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span>{msg.text}</span>
                  <span style={{ fontSize: '0.65rem', alignSelf: 'flex-end', opacity: 0.7 }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="chat-message message-assistant" style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
              <Bot size={14} className="text-primary" />
              <div style={{ display: 'flex', gap: '4px' }}>
                <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'fadeIn 1s infinite alternate' }} />
                <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'fadeIn 1s infinite alternate 0.2s' }} />
                <span className="dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block', animation: 'fadeIn 1s infinite alternate 0.4s' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
          {suggestions.map((s, idx) => (
            <button 
              key={idx}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', border: '1px solid var(--border-color)' }}
              onClick={() => setInput(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Form Input area */}
        <form onSubmit={handleSend} className="chat-input-area">
          <input 
            type="text" 
            className="form-control"
            style={{ flex: 1 }}
            placeholder="Ask AI or write command: 'add task study tonight at 9 PM'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }} disabled={loading}>
            <Send size={18} />
          </button>
        </form>

      </div>
    </div>
  );
};
export default SmartAssistant;
