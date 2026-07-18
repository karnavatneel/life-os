import { format, subDays, addDays } from 'date-fns';
import type { Habit, Task, Transaction, HealthLog, CalEvent, ScreenTimeDay, JournalEntry } from './types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

export function seedHabits(): Habit[] {
  const mk = (partial: Partial<Habit> & { name: string; emoji: string; color: string }, consistency: number): Habit => {
    const completions: string[] = [];
    for (let i = 1; i <= 60; i++) {
      if (Math.random() < consistency) completions.push(iso(subDays(new Date(), i)));
    }
    // streak: ensure last days complete
    for (let i = 0; i < rnd(3, 9); i++) {
      const d = iso(subDays(new Date(), i));
      if (!completions.includes(d)) completions.push(d);
    }
    return {
      id: uuid(),
      category: 'Health',
      frequency: 'daily',
      notes: '',
      reminder: '08:00',
      archived: false,
      createdAt: iso(subDays(new Date(), 60)),
      completions: completions.sort(),
      ...partial,
    };
  };
  return [
    mk({ name: 'Morning Meditation', emoji: '🧘', color: '#8b5cf6', category: 'Mindfulness' }, 0.82),
    mk({ name: 'Read 20 Pages', emoji: '📚', color: '#f59e0b', category: 'Learning' }, 0.7),
    mk({ name: 'Workout', emoji: '💪', color: '#ef4444', category: 'Fitness' }, 0.62),
    mk({ name: 'Drink 8 Glasses of Water', emoji: '💧', color: '#3b82f6', category: 'Health' }, 0.75),
    mk({ name: 'Journal', emoji: '✍️', color: '#10b981', category: 'Mindfulness' }, 0.55),
    mk({ name: 'No Sugar', emoji: '🍬', color: '#ec4899', category: 'Health' }, 0.48),
  ];
}

export function seedTasks(): Task[] {
  const t = (title: string, daysOffset: number, priority: Task['priority'], category: string, done = false, subtasks: string[] = []): Task => ({
    id: uuid(),
    title,
    description: '',
    priority,
    dueDate: iso(addDays(new Date(), daysOffset)),
    dueTime: daysOffset === 0 ? '14:00' : '',
    category,
    tags: [],
    subtasks: subtasks.map((s) => ({ id: uuid(), title: s, done: false })),
    done,
    recurring: 'none',
    createdAt: iso(subDays(new Date(), rnd(1, 10))),
    completedAt: done ? iso(subDays(new Date(), 1)) : undefined,
  });
  return [
    t('Finish project proposal', 0, 'urgent', 'Work', false, ['Draft outline', 'Add budget section', 'Review with team']),
    t('Call the dentist', 0, 'medium', 'Personal'),
    t('Buy groceries for the week', 0, 'high', 'Errands'),
    t('Review quarterly OKRs', 1, 'high', 'Work'),
    t('Plan weekend trip', 2, 'low', 'Personal'),
    t('Renew gym membership', 3, 'medium', 'Health'),
    t('Read chapter 5 of Deep Work', 1, 'low', 'Learning'),
    t('Prepare presentation slides', -1, 'high', 'Work', true),
    t('Submit expense report', -2, 'medium', 'Work', true),
  ];
}

export function seedTransactions(): Transaction[] {
  const expenses = [
    ['Groceries', 'Food', 300, 800], ['Coffee', 'Food', 60, 120], ['Dinner out', 'Food', 400, 900],
    ['Ola/Uber', 'Travel', 80, 250], ['Petrol', 'Travel', 300, 500], ['Movie night', 'Entertainment', 200, 450],
    ['Pharmacy', 'Medical', 100, 400], ['Electricity bill', 'Bills', 800, 1500], ['New clothes', 'Shopping', 500, 2000],
    ['Swiggy', 'Food', 150, 400], ['Jio Recharge', 'Bills', 149, 299], ['Gym', 'Health', 500, 1200],
  ] as const;
  const txs: Transaction[] = [];
  for (let i = 0; i < 45; i++) {
    const d = subDays(new Date(), rnd(0, 29));
    const [note, category, lo, hi] = expenses[rnd(0, expenses.length - 1)];
    txs.push({ id: uuid(), type: 'expense', amount: rnd(lo, hi), category, date: iso(d), note });
  }
  txs.push({ id: uuid(), type: 'income', amount: 75000, category: 'Salary', date: iso(subDays(new Date(), 12)), note: 'Monthly salary' });
  txs.push({ id: uuid(), type: 'income', amount: 15000, category: 'Freelance', date: iso(subDays(new Date(), 5)), note: 'Design project' });
  txs.push({ id: uuid(), type: 'expense', amount: 18000, category: 'Rent', date: iso(subDays(new Date(), 9)), note: 'Monthly rent' });
  return txs.sort((a, b) => b.date.localeCompare(a.date));
}

export function seedHealth(): Record<string, HealthLog> {
  const out: Record<string, HealthLog> = {};
  for (let i = 0; i < 30; i++) {
    out[iso(subDays(new Date(), i))] = {
      mood: rnd(2, 5), energy: rnd(2, 5),
      sleepHours: rnd(55, 85) / 10, sleepQuality: rnd(2, 5),
      water: rnd(3, 9), steps: rnd(3000, 12000),
      calories: rnd(1600, 2400), weight: Math.round((74 - i * 0.06) * 10) / 10,
      notes: '',
    };
  }
  return out;
}

export function seedEvents(): CalEvent[] {
  const e = (title: string, off: number, start: string, end: string, color: string, category: string): CalEvent => ({
    id: uuid(), title, date: iso(addDays(new Date(), off)), start, end, color, category, repeat: 'none',
  });
  return [
    e('Team standup', 0, '09:30', '10:00', '#3b82f6', 'Work'),
    e('Lunch with Sarah', 0, '12:30', '13:30', '#10b981', 'Personal'),
    e('Dentist appointment', 1, '15:00', '16:00', '#ef4444', 'Health'),
    e('Product review', 2, '11:00', '12:00', '#8b5cf6', 'Work'),
    e('Yoga class', 3, '18:00', '19:00', '#f59e0b', 'Fitness'),
    e('Birthday dinner', 5, '19:30', '22:00', '#ec4899', 'Personal'),
  ];
}

export function seedScreenTime(): Record<string, ScreenTimeDay> {
  const apps = [
    { name: 'Instagram', emoji: '📸' }, { name: 'YouTube', emoji: '▶️' }, { name: 'WhatsApp', emoji: '💬' },
    { name: 'Twitter / X', emoji: '🐦' }, { name: 'Chrome', emoji: '🌐' }, { name: 'TikTok', emoji: '🎵' },
  ];
  const out: Record<string, ScreenTimeDay> = {};
  for (let i = 0; i < 14; i++) {
    const total = rnd(140, 420);
    let left = total;
    const usage = apps.map((a, idx) => {
      const m = idx === apps.length - 1 ? left : rnd(10, Math.max(15, Math.floor(left * 0.45)));
      left = Math.max(0, left - m);
      return { ...a, minutes: m };
    }).filter((a) => a.minutes > 4).sort((a, b) => b.minutes - a.minutes);
    out[iso(subDays(new Date(), i))] = { minutes: total, unlocks: rnd(35, 110), notifications: rnd(60, 220), focusSessions: rnd(0, 4), apps: usage };
  }
  return out;
}

export function seedJournal(): JournalEntry[] {
  return [
    {
      id: uuid(), date: iso(subDays(new Date(), 1)), title: 'A really good day',
      body: 'Woke up early and meditated before checking my phone — small win, big difference.\n\nThe project proposal finally clicked today. I sketched the outline on paper first and everything flowed from there.\n\nGrateful for: morning sunlight, a slow breakfast, and a long walk after dinner.',
      mood: '😊', tags: ['gratitude', 'work'],
    },
    {
      id: uuid(), date: iso(subDays(new Date(), 3)), title: 'Feeling a bit scattered',
      body: 'Too many open loops today. I kept switching between tasks and finished very little.\n\nTomorrow: pick ONE thing, time-block the morning, phone in another room.',
      mood: '😕', tags: ['focus'],
    },
    {
      id: crypto.randomUUID(), date: iso(subDays(new Date(), 6)), title: 'Weekend reset',
      body: 'Slow morning, farmers market, meal prep for the week. Called mom — we talked for an hour.\n\nNote to self: protect Sundays. No meetings, no errands, just reset.',
      mood: '😌', tags: ['family', 'rest'],
    },
  ];
}
