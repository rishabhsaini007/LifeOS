// Gemini API client using native fetch

export function getStoredGeminiKey(): string {
  const saved = localStorage.getItem('lifeos_gemini_api_key');
  if (saved) return saved;
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

export interface ParseResult {
  items: Array<{
    type: 'task' | 'reminder' | 'timetable';
    title: string;
    description?: string;
    date?: string; // YYYY-MM-DD
    time?: string; // HH:MM
    duration?: number; // In minutes, for timetable
    priority?: 'Low' | 'Medium' | 'High';
    category?: string;
    repeat?: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  }>;
  response: string; // Friendly text explanation of what was created
  missingInfo?: string; // If info is missing, prompt user for it
}

export async function askGemini(prompt: string, systemInstruction = ''): Promise<string> {
  const key = getStoredGeminiKey();
  if (!key) {
    throw new Error('Gemini API key is not configured. Please add it in Settings.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  
  const body = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    systemInstruction: systemInstruction ? {
      parts: [{ text: systemInstruction }]
    } : undefined
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// Parses natural language input to create tasks, reminders, or timetable blocks
export async function parseNaturalLanguageInput(
  input: string,
  currentTimeContext: string
): Promise<ParseResult> {
  const key = getStoredGeminiKey();
  if (!key) {
    return {
      items: [],
      response: 'Gemini API key is missing. Please add your key in Settings to use the Smart Assistant.'
    };
  }

  const systemInstruction = `You are the parsing module of "LifeOS", a personal productivity app.
Your job is to analyze the user's input and extract schedules, tasks, or reminders to be created.
The current local time context is: ${currentTimeContext}.

Output MUST be a JSON object containing:
1. "items": An array of extracted items. Each item must have:
   - "type": "task", "reminder", or "timetable"
   - "title": (string, required)
   - "description": (string, optional)
   - "date": "YYYY-MM-DD" (optional, resolve relative dates like "tomorrow" relative to ${currentTimeContext})
   - "time": "HH:MM" (optional, 24-hour format)
   - "duration": number (duration in minutes, optional, mostly for timetable)
   - "priority": "Low", "Medium", or "High" (optional)
   - "category": (string, optional, e.g. "Work", "Personal", "Health", "Study")
   - "repeat": "one-time", "daily", "weekly", "monthly", "yearly" (optional)
2. "response": A brief, friendly summary of what you are going to create (e.g. "Sure, I'll create a task to wash the car tomorrow at 3 PM.").
3. "missingInfo": A string prompt asking for specific clarification IF key info is missing (e.g. if the user says "remind me to call John" but doesn't specify a time or date, ask them when they want to be reminded. If all details are present, omit or set to null).

Be conservative: If a date or time is completely missing for a REMINDER, ask for it using "missingInfo" instead of making it up, as reminders need a specific time. If it's a TASK, a due date is optional.
Return ONLY valid JSON in your response. Do not wrap in markdown \`\`\`json blocks.`;

  try {
    const rawResult = await askGemini(`Parse this request: "${input}"`, systemInstruction);
    // Strip code block wrappers if any
    let cleaned = rawResult.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    
    const parsed = JSON.parse(cleaned) as ParseResult;
    return parsed;
  } catch (error) {
    console.error('Failed to parse input with Gemini:', error);
    return {
      items: [],
      response: 'I had trouble understanding that. Could you please specify the date, time, and title more clearly?',
      missingInfo: 'Please provide the task/reminder title and time.'
    };
  }
}
