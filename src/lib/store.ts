import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import type * as T from './types';
import { mode, supabase } from './supabase';

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

/* ---------- streak helpers ---------- */
export function calcStreak(completions: string[]): { current: number; best: number } {
  const set = new Set(completions);
  let current = 0;
  const d = new Date();
  if (!set.has(format(d, 'yyyy-MM-dd'))) d.setDate(d.getDate() - 1); // today pending is ok
  while (set.has(format(d, 'yyyy-MM-dd'))) { current++; d.setDate(d.getDate() - 1); }
  const sorted = [...completions].sort();
  let best = 0, run = 0, prev = '';
  for (const c of sorted) {
    run = prev && format(subDays(parseISO(c), 1), 'yyyy-MM-dd') === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = c;
  }
  return { current, best };
}

/* ---------- badges ---------- */
const BADGES: T.Badge[] = [
  { id: 'first-habit', name: 'First Step', emoji: '🌱', desc: 'Complete your first habit' },
  { id: 'streak-7', name: 'On Fire', emoji: '🔥', desc: 'Reach a 7-day streak' },
  { id: 'streak-30', name: 'Unstoppable', emoji: '⚡', desc: 'Reach a 30-day streak' },
  { id: 'tasks-10', name: 'Task Crusher', emoji: '✅', desc: 'Complete 10 tasks' },
  { id: 'focus-5', name: 'Deep Diver', emoji: '🧠', desc: 'Finish 5 focus sessions' },
  { id: 'journal-5', name: 'Storyteller', emoji: '📖', desc: 'Write 5 journal entries' },
  { id: 'saver', name: 'Money Minded', emoji: '💰', desc: 'Log 10 transactions' },
  { id: 'early-bird', name: 'Early Bird', emoji: '🌅', desc: 'Plan your day before 9 AM' },
];

interface AppState {
  onboarded: boolean;
  profile: T.Profile;
  settings: {
    theme: T.ThemeMode;
    accent: string; // hsl triple e.g. "252 95% 68%"
    accentName: string;
    pin: string;
    notifications: Record<string, boolean>;
    privacyLockJournal: boolean;
    privacyLockVault: boolean;
  };
  habits: T.Habit[];
  tasks: T.Task[];
  events: T.CalEvent[];
  health: Record<string, T.HealthLog>;
  medicines: T.Medicine[];
  transactions: T.Transaction[];
  budgets: T.Budget[];
  savingsGoals: T.SavingsGoal[];
  emis: T.Emi[];
  learning: T.LearningItem[];
  studyLog: Record<string, number>; // date -> minutes
  goals: T.Goal[];
  vision: T.VisionItem[];
  screenTime: Record<string, T.ScreenTimeDay>;
  vault: T.VaultItem[];
  shopping: T.ShoppingItem[];
  journal: T.JournalEntry[];
  reflections: Record<string, T.Reflection>;
  focusSessions: T.FocusSession[];
  plans: Record<string, T.DayPlan>;
  blocks: T.PlannerBlock[];
  xp: number;
  coins: number;
  streakFreezes: number;
  badges: Record<string, string>; // badgeId -> earnedAt
  activity: T.Activity[];

  /* actions */
  completeOnboarding: (name: string) => void;
  updateProfile: (p: Partial<T.Profile>) => void;
  setTheme: (t: T.ThemeMode) => void;
  setAccent: (hsl: string, name: string) => void;
  setPin: (pin: string) => void;
  toggleNotification: (k: string) => void;
  logActivity: (text: string, emoji: string) => void;
  addXP: (n: number, coins?: number) => void;
  earnBadge: (id: string) => void;

  addHabit: (h: Omit<T.Habit, 'id' | 'createdAt' | 'completions' | 'archived'>) => void;
  updateHabit: (id: string, p: Partial<T.Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date?: string) => void;

  addTask: (t: Partial<T.Task> & { title: string }) => void;
  updateTask: (id: string, p: Partial<T.Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;

  addEvent: (e: Omit<T.CalEvent, 'id'>) => void;
  updateEvent: (id: string, p: Partial<Omit<T.CalEvent, 'id'>>) => void;
  deleteEvent: (id: string) => void;

  updateHealth: (date: string, p: Partial<T.HealthLog>) => void;

  addMedicine: (m: Omit<T.Medicine, 'id' | 'taken'>) => void;
  updateMedicine: (id: string, p: Partial<T.Medicine>) => void;
  deleteMedicine: (id: string) => void;
  toggleDose: (id: string, date: string, slot: string) => void;

  addTransaction: (t: Omit<T.Transaction, 'id'>) => void;
  updateTransaction: (id: string, p: Partial<T.Transaction>) => void;
  deleteTransaction: (id: string) => void;
  setBudget: (category: string, limit: number) => void;
  addSavingsGoal: (g: Omit<T.SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, p: Partial<T.SavingsGoal>) => void;
  addToSavings: (id: string, amount: number) => void;
  addEmi: (e: Omit<T.Emi, 'id'>) => void;
  updateEmi: (id: string, p: Partial<T.Emi>) => void;
  payEmi: (id: string) => void;

  addLearning: (l: Omit<T.LearningItem, 'id'>) => void;
  updateLearning: (id: string, p: Partial<T.LearningItem>) => void;
  deleteLearning: (id: string) => void;
  logStudy: (minutes: number) => void;

  addGoal: (g: Omit<T.Goal, 'id'>) => void;
  updateGoal: (id: string, p: Partial<T.Goal>) => void;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, mId: string) => void;

  addVision: (v: Omit<T.VisionItem, 'id'>) => void;
  updateVision: (id: string, p: Partial<T.VisionItem>) => void;
  deleteVision: (id: string) => void;

  addVaultItem: (v: Omit<T.VaultItem, 'id'>) => void;
  updateVaultItem: (id: string, p: Partial<T.VaultItem>) => void;
  deleteVaultItem: (id: string) => void;

  addShoppingItem: (s: Omit<T.ShoppingItem, 'id'>) => void;
  updateShoppingItem: (id: string, p: Partial<T.ShoppingItem>) => void;
  toggleShopping: (id: string) => void;
  deleteShopping: (id: string) => void;

  addJournal: (j: Omit<T.JournalEntry, 'id'>) => void;
  updateJournal: (id: string, p: Partial<T.JournalEntry>) => void;
  deleteJournal: (id: string) => void;

  saveReflection: (date: string, r: T.Reflection) => void;
  savePlan: (date: string, p: T.DayPlan) => void;
  addBlock: (b: Omit<T.PlannerBlock, 'id'>) => void;
  deleteBlock: (id: string) => void;
  addFocusSession: (minutes: number, kind: T.FocusSession['kind']) => void;
  addScreenTime: (date: string, d: T.ScreenTimeDay) => void;
}

const emptyHealth = (): T.HealthLog => ({ mood: 0, energy: 0, sleepHours: 0, sleepQuality: 0, water: 0, steps: 0, calories: 0, weight: null, notes: '' });

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      profile: {
        name: 'Alex', username: 'alex', bio: 'Building a better me, one day at a time ✨',
        birthday: '', gender: '', height: 175, weight: 74, goalWeight: 70,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: 'English', avatarEmoji: '🦊',
      },
      settings: {
        theme: 'dark', accent: '252 95% 68%', accentName: 'Violet', pin: '',
        notifications: { habits: true, medicine: true, tasks: true, planner: true, water: true, sleep: true, events: true, bills: true, quotes: true },
        privacyLockJournal: false, privacyLockVault: true,
      },
      habits: [],
      tasks: [],
      events: [],
      health: {},
      medicines: [],
      transactions: [],
      budgets: [],
      savingsGoals: [],
      emis: [],
      learning: [],
      studyLog: {},
      goals: [],
      vision: [],
      screenTime: {},
      vault: [],
      shopping: [],
      journal: [],
      reflections: {},
      focusSessions: [],
      plans: {},
      blocks: [],
      xp: 0,
      coins: 0,
      streakFreezes: 2,
      badges: {},
      activity: [],

      /* ---- core ---- */
      completeOnboarding: (name) => set((s) => ({ onboarded: true, profile: { ...s.profile, name: name || s.profile.name } })),
      updateProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setTheme: (t) => set((s) => ({ settings: { ...s.settings, theme: t } })),
      setAccent: (hsl, name) => set((s) => ({ settings: { ...s.settings, accent: hsl, accentName: name } })),
      setPin: (pin) => set((s) => ({ settings: { ...s.settings, pin } })),
      toggleNotification: (k) => set((s) => ({ settings: { ...s.settings, notifications: { ...s.settings.notifications, [k]: !s.settings.notifications[k] } } })),
      logActivity: (text, emoji) => set((s) => ({ activity: [{ id: uid(), ts: Date.now(), text, emoji }, ...s.activity].slice(0, 50) })),
      addXP: (n, coins = 0) => set((s) => ({ xp: s.xp + n, coins: s.coins + coins })),
      earnBadge: (id) => { const s = get(); if (!s.badges[id]) { set({ badges: { ...s.badges, [id]: todayISO() } }); s.logActivity(`Badge unlocked: ${BADGES.find(b => b.id === id)?.name}`, BADGES.find(b => b.id === id)?.emoji ?? '🏆'); } },

      /* ---- habits ---- */
      addHabit: (h) => { set((s) => ({ habits: [...s.habits, { ...h, id: uid(), createdAt: todayISO(), completions: [], archived: false }] })); get().logActivity(`Created habit: ${h.name}`, h.emoji); },
      updateHabit: (id, p) => set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...p } : h)) })),
      deleteHabit: (id) => set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
      toggleHabit: (id, date = todayISO()) => {
        const s = get();
        const h = s.habits.find((x) => x.id === id);
        if (!h) return;
        const done = h.completions.includes(date);
        const completions = done ? h.completions.filter((c) => c !== date) : [...h.completions, date];
        set({ habits: s.habits.map((x) => (x.id === id ? { ...x, completions } : x)) });
        if (!done) {
          s.addXP(10, 2);
          s.logActivity(`Completed habit: ${h.name}`, h.emoji);
          s.earnBadge('first-habit');
          const { current } = calcStreak(completions);
          if (current >= 7) s.earnBadge('streak-7');
          if (current >= 30) s.earnBadge('streak-30');
        }
      },

      /* ---- tasks ---- */
      addTask: (t) => { set((s) => ({ tasks: [{ id: uid(), title: t.title, description: t.description ?? '', priority: t.priority ?? 'medium', dueDate: t.dueDate ?? todayISO(), dueTime: t.dueTime ?? '', category: t.category ?? 'Personal', tags: t.tags ?? [], subtasks: t.subtasks ?? [], done: false, recurring: t.recurring ?? 'none', createdAt: todayISO() }, ...s.tasks] })); get().logActivity(`Added task: ${t.title}`, '📝'); },
      updateTask: (id, p) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleTask: (id) => {
        const s = get();
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;
        set({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, done: !x.done, completedAt: !x.done ? todayISO() : undefined } : x)) });
        if (!t.done) {
          s.addXP(15, 3);
          s.logActivity(`Completed task: ${t.title}`, '✅');
          const doneCount = s.tasks.filter((x) => x.done).length + 1;
          if (doneCount >= 10) s.earnBadge('tasks-10');
        }
      },
      toggleSubtask: (taskId, subId) => set((s) => ({ tasks: s.tasks.map((t) => t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => st.id === subId ? { ...st, done: !st.done } : st) } : t) })),

      /* ---- events ---- */
      addEvent: (e) => { set((s) => ({ events: [...s.events, { ...e, id: uid() }] })); get().logActivity(`Added event: ${e.title}`, '📅'); },
      updateEvent: (id, p) => set((s) => ({ events: s.events.map((e) => e.id === id ? { ...e, ...p } : e) })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      /* ---- health ---- */
      updateHealth: (date, p) => set((s) => ({ health: { ...s.health, [date]: { ...(s.health[date] ?? emptyHealth()), ...p } } })),

      /* ---- medicine ---- */
      addMedicine: (m) => { set((s) => ({ medicines: [...s.medicines, { ...m, id: uid(), taken: [] }] })); get().logActivity(`Added medicine: ${m.name}`, '💊'); },
      updateMedicine: (id, p) => set((s) => ({ medicines: s.medicines.map((m) => (m.id === id ? { ...m, ...p } : m)) })),
      deleteMedicine: (id) => set((s) => ({ medicines: s.medicines.filter((m) => m.id !== id) })),
      toggleDose: (id, date, slot) => set((s) => ({
        medicines: s.medicines.map((m) => {
          if (m.id !== id) return m;
          const key = `${date}_${slot}`;
          return { ...m, taken: m.taken.includes(key) ? m.taken.filter((k) => k !== key) : [...m.taken, key] };
        }),
      })),

      /* ---- finance ---- */
      addTransaction: (t) => { set((s) => ({ transactions: [{ ...t, id: uid() }, ...s.transactions] })); const s = get(); s.logActivity(`${t.type === 'income' ? 'Income' : 'Expense'}: ${t.note || t.category} $${t.amount}`, t.type === 'income' ? '💵' : '💸'); if (s.transactions.length >= 10) s.earnBadge('saver'); },
      updateTransaction: (id, p) => set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
      setBudget: (category, limit) => set((s) => ({ budgets: [...s.budgets.filter((b) => b.category !== category), { category, limit }] })),
      addSavingsGoal: (g) => set((s) => ({ savingsGoals: [...s.savingsGoals, { ...g, id: uid() }] })),
      updateSavingsGoal: (id, p) => set((s) => ({ savingsGoals: s.savingsGoals.map((g) => (g.id === id ? { ...g, ...p } : g)) })),
      addToSavings: (id, amount) => set((s) => ({ savingsGoals: s.savingsGoals.map((g) => (g.id === id ? { ...g, saved: g.saved + amount } : g)) })),
      addEmi: (e) => set((s) => ({ emis: [...s.emis, { ...e, id: uid() }] })),
      updateEmi: (id, p) => set((s) => ({ emis: s.emis.map((e) => (e.id === id ? { ...e, ...p } : e)) })),
      payEmi: (id) => set((s) => ({ emis: s.emis.map((e) => (e.id === id ? { ...e, remaining: Math.max(0, e.remaining - 1) } : e)) })),

      /* ---- learning ---- */
      addLearning: (l) => { set((s) => ({ learning: [...s.learning, { ...l, id: uid() }] })); get().logActivity(`Started learning: ${l.title}`, '🎓'); },
      updateLearning: (id, p) => set((s) => ({ learning: s.learning.map((l) => (l.id === id ? { ...l, ...p } : l)) })),
      deleteLearning: (id) => set((s) => ({ learning: s.learning.filter((l) => l.id !== id) })),
      logStudy: (minutes) => { const d = todayISO(); set((s) => ({ studyLog: { ...s.studyLog, [d]: (s.studyLog[d] ?? 0) + minutes } })); get().logActivity(`Studied ${minutes} minutes`, '📚'); },

      /* ---- goals ---- */
      addGoal: (g) => { set((s) => ({ goals: [...s.goals, { ...g, id: uid() }] })); get().logActivity(`New goal: ${g.title}`, '🎯'); },
      updateGoal: (id, p) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...p } : g)) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      toggleMilestone: (goalId, mId) => set((s) => ({ goals: s.goals.map((g) => g.id === goalId ? { ...g, milestones: g.milestones.map((m) => m.id === mId ? { ...m, done: !m.done } : m) } : g) })),

      /* ---- vision ---- */
      addVision: (v) => set((s) => ({ vision: [...s.vision, { ...v, id: uid() }] })),
      updateVision: (id, p) => set((s) => ({ vision: s.vision.map((v) => (v.id === id ? { ...v, ...p } : v)) })),
      deleteVision: (id) => set((s) => ({ vision: s.vision.filter((v) => v.id !== id) })),

      /* ---- vault ---- */
      addVaultItem: (v) => { set((s) => ({ vault: [...s.vault, { ...v, id: uid() }] })); get().logActivity(`Vault: saved login for ${v.website}`, '🔐'); },
      updateVaultItem: (id, p) => set((s) => ({ vault: s.vault.map((v) => (v.id === id ? { ...v, ...p } : v)) })),
      deleteVaultItem: (id) => set((s) => ({ vault: s.vault.filter((v) => v.id !== id) })),

      /* ---- shopping ---- */
      addShoppingItem: (si) => set((s) => ({ shopping: [...s.shopping, { ...si, id: uid() }] })),
      updateShoppingItem: (id, p) => set((s) => ({ shopping: s.shopping.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      toggleShopping: (id) => set((s) => ({ shopping: s.shopping.map((x) => (x.id === id ? { ...x, purchased: !x.purchased } : x)) })),
      deleteShopping: (id) => set((s) => ({ shopping: s.shopping.filter((x) => x.id !== id) })),

      /* ---- journal ---- */
      addJournal: (j) => { set((s) => ({ journal: [{ ...j, id: uid() }, ...s.journal] })); const s = get(); s.logActivity('Wrote a journal entry', '✍️'); s.addXP(10, 2); if (s.journal.length >= 5) s.earnBadge('journal-5'); },
      updateJournal: (id, p) => set((s) => ({ journal: s.journal.map((j) => (j.id === id ? { ...j, ...p } : j)) })),
      deleteJournal: (id) => set((s) => ({ journal: s.journal.filter((j) => j.id !== id) })),

      /* ---- reflection / planner / focus / screentime ---- */
      saveReflection: (date, r) => { set((s) => ({ reflections: { ...s.reflections, [date]: r } })); get().logActivity('Completed daily reflection', '🌙'); get().addXP(15, 5); },
      savePlan: (date, p) => set((s) => ({ plans: { ...s.plans, [date]: p } })),
      addBlock: (b) => set((s) => ({ blocks: [...s.blocks, { ...b, id: uid() }] })),
      deleteBlock: (id) => set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) })),
      addFocusSession: (minutes, kind) => {
        set((s) => ({ focusSessions: [...s.focusSessions, { id: uid(), date: todayISO(), minutes, kind }] }));
        const s = get();
        if (kind === 'focus') { s.addXP(minutes, Math.floor(minutes / 5)); s.logActivity(`Finished a ${minutes}-min focus session`, '🍅'); if (s.focusSessions.filter((f) => f.kind === 'focus').length >= 5) s.earnBadge('focus-5'); }
      },
      addScreenTime: (date, d) => set((s) => ({ screenTime: { ...s.screenTime, [date]: d } })),
    }),
    { name: 'life-os-store-v2' },
  ),
);

export { BADGES, emptyHealth };

/* derived helpers */
export const levelFromXP = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
export const xpForLevel = (lvl: number) => Math.pow(lvl - 1, 2) * 100;

export function todayTasks(tasks: T.Task[]) {
  const today = todayISO();
  return tasks.filter((t) => !t.done && t.dueDate <= today);
}
export function overdueTasks(tasks: T.Task[]) {
  const today = todayISO();
  return tasks.filter((t) => !t.done && t.dueDate < today);
}
export function isHabitDueToday(h: T.Habit): boolean {
  if (h.archived) return false;
  const dow = new Date().getDay();
  if (h.frequency === 'daily') return true;
  if (h.frequency === 'weekly') return dow === 1 || (h.customDays?.includes(dow) ?? false);
  if (h.frequency === 'monthly') return new Date().getDate() === 1;
  return h.customDays?.includes(dow) ?? true;
}
export function sameDay(a: string, b: string) {
  try { return isSameDay(parseISO(a), parseISO(b)); } catch { return false; }
}

// ────────────────────────────────────────────────────────────────
// SUPABASE BACKUP SYNC SUBSCRIBER
// ────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  let timeoutId: any = null;

  const triggerBackup = () => {
    if (mode === 'supabase' && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(async () => {
            const userId = session.user.id;
            const state = useApp.getState();
            // Dynamically import useIntegrations to avoid circular dependency if any, 
            // but since it's already in another file we can just import it.
            // Actually, we can just import it at the top of store.ts, but let's just use a custom event or pass it.
            // Wait, we can't easily import useIntegrations here because it imports useApp.
            // Let's use localStorage direct read, or just fire a custom event from integrations.ts.
            // Better yet, just read from localStorage since persist writes there.
            let intState = null;
            try {
              const raw = localStorage.getItem('life-os-integrations-v1');
              if (raw) intState = JSON.parse(raw).state;
            } catch (_) {}

            const dataToSync = {
              profile: state.profile,
              settings: state.settings,
              habits: state.habits,
              tasks: state.tasks,
              events: state.events,
              health: state.health,
              medicines: state.medicines,
              transactions: state.transactions,
              budgets: state.budgets,
              savingsGoals: state.savingsGoals,
              emis: state.emis,
              learning: state.learning,
              studyLog: state.studyLog,
              goals: state.goals,
              vision: state.vision,
              screenTime: state.screenTime,
              vault: state.vault,
              shopping: state.shopping,
              journal: state.journal,
              reflections: state.reflections,
              focusSessions: state.focusSessions,
              plans: state.plans,
              blocks: state.blocks,
              xp: state.xp,
              coins: state.coins,
              badges: state.badges,
              activity: state.activity,
              integrationsState: intState,
            };

            await supabase!
              .from('user_backups')
              .upsert({ 
                user_id: userId, 
                state: dataToSync, 
                updated_at: new Date().toISOString() 
              });
          }, 1500); // 1.5s debounce
        }
      });
    }
  };

  useApp.subscribe(triggerBackup);
  
  // Listen for storage events from integrations
  window.addEventListener('storage', (e) => {
    if (e.key === 'life-os-integrations-v1') {
      triggerBackup();
    }
  });
  
  // Custom event for same-tab updates
  window.addEventListener('integrations-updated', triggerBackup);
}
