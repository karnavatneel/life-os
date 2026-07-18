export type ThemeMode = 'light' | 'dark' | 'amoled' | 'system';

export interface Profile {
  name: string;
  username: string;
  bio: string;
  birthday: string;
  gender: string;
  height: number | null;
  weight: number | null;
  goalWeight: number | null;
  timezone: string;
  language: string;
  avatarEmoji: string;
  avatarUrl?: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customDays?: number[]; // 0-6
  notes: string;
  reminder: string;
  archived: boolean;
  createdAt: string;
  completions: string[]; // ISO date strings
}

export interface Subtask { id: string; title: string; done: boolean; }

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  dueTime: string;
  category: string;
  tags: string[];
  subtasks: Subtask[];
  done: boolean;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedAt?: string;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  color: string;
  category: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';
}

export interface HealthLog {
  mood: number; // 1-5
  energy: number; // 1-5
  sleepHours: number;
  sleepQuality: number; // 1-5
  water: number; // glasses
  steps: number;
  calories: number;
  weight: number | null;
  notes: string;
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  times: { morning: boolean; afternoon: boolean; evening: boolean; night: boolean };
  foodTiming: 'before' | 'after' | 'any';
  startDate: string;
  endDate: string;
  weekdays: number[];
  refillDate: string;
  doctorNotes: string;
  taken: string[]; // `${date}_${slot}`
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  note: string;
}

export interface Budget { category: string; limit: number; }
export interface SavingsGoal { id: string; name: string; target: number; saved: number; emoji: string; }
export interface Emi { id: string; name: string; amount: number; dueDay: number; remaining: number; total: number; }

export interface LearningItem {
  id: string;
  title: string;
  type: 'course' | 'book' | 'skill' | 'certification';
  progress: number; // 0-100
  notes: string;
  resource: string;
}

export interface Goal {
  id: string;
  title: string;
  horizon: 'short' | 'long';
  deadline: string;
  milestones: { id: string; title: string; done: boolean }[];
}

export interface VisionItem {
  id: string;
  title: string;
  category: string;
  quote: string;
  targetDate: string;
  gradient: string;
  emoji: string;
}

export interface ScreenTimeDay {
  minutes: number;
  unlocks: number;
  notifications: number;
  focusSessions: number;
  apps: { name: string; minutes: number; emoji: string }[];
}

export interface VaultItem {
  id: string;
  website: string;
  username: string;
  password: string;
  notes: string;
  category: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  list: 'grocery' | 'wishlist';
  category: string;
  qty: number;
  price: number;
  purchased: boolean;
  recurring: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: string;
  tags: string[];
}

export interface Reflection {
  wins: string;
  challenges: string;
  gratitude: string;
  lessons: string;
  mood: number;
  tomorrow: string;
  rating: number;
}

export interface FocusSession { id: string; date: string; minutes: number; kind: 'focus' | 'short' | 'long'; }

export interface Badge { id: string; name: string; emoji: string; desc: string; earnedAt?: string; }

export interface Activity { id: string; ts: number; text: string; emoji: string; }

export interface PlannerBlock { id: string; date: string; hour: number; title: string; kind: 'task' | 'habit' | 'meeting' | 'note' | 'personal'; }

export interface DayPlan {
  priorities: string[];
  eveningReview: string;
}
