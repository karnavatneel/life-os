import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, Flame, Archive, Pencil, Trash2, Search } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState, EmojiPicker, ColorPicker, Ring } from '@/components/shared';
import { useApp, todayISO, calcStreak, isHabitDueToday } from '@/lib/store';
import type { Habit } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  { name: 'Morning Meditation', emoji: '🧘', color: '#8b5cf6', category: 'Mindfulness' },
  { name: 'Drink Water', emoji: '💧', color: '#3b82f6', category: 'Health' },
  { name: 'Exercise', emoji: '💪', color: '#ef4444', category: 'Fitness' },
  { name: 'Read', emoji: '📚', color: '#f59e0b', category: 'Learning' },
  { name: 'Sleep by 11pm', emoji: '😴', color: '#06b6d4', category: 'Health' },
  { name: 'Gratitude Journal', emoji: '🙏', color: '#10b981', category: 'Mindfulness' },
];

const CATEGORIES = ['Health', 'Fitness', 'Mindfulness', 'Learning', 'Work', 'Personal'];

function WeekChain({ habit }: { habit: Habit }) {
  const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
  return (
    <div className="flex gap-1.5">
      {days.map((d) => {
        const done = habit.completions.includes(d);
        return (
          <div key={d} className="flex flex-col items-center gap-1">
            <motion.div
              initial={false}
              animate={{ scale: done ? 1 : 0.85 }}
              className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-colors',
                done ? 'text-white' : 'bg-muted text-muted-foreground')}
              style={done ? { backgroundColor: habit.color } : undefined}
            >
              {done ? '✓' : format(new Date(d + 'T12:00:00'), 'EEEEE')}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

export default function Habits() {
  const { habits, addHabit, updateHabit, deleteHabit, toggleHabit } = useApp();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [tab, setTab] = useState('active');
  const [query, setQuery] = useState('');
  const today = todayISO();

  const [form, setForm] = useState({ name: '', emoji: '🎯', color: '#8b5cf6', category: 'Health', frequency: 'daily' as Habit['frequency'], notes: '', reminder: '' });

  useEffect(() => {
    if (params.get('add')) { setOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const openEdit = (h: Habit) => {
    setEditing(h);
    setForm({ name: h.name, emoji: h.emoji, color: h.color, category: h.category, frequency: h.frequency, notes: h.notes, reminder: h.reminder });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) updateHabit(editing.id, form);
    else addHabit(form);
    setOpen(false); setEditing(null);
    setForm({ name: '', emoji: '🎯', color: '#8b5cf6', category: 'Health', frequency: 'daily', notes: '', reminder: '' });
  };

  const shown = useMemo(() => habits
    .filter((h) => (tab === 'archived' ? h.archived : !h.archived))
    .filter((h) => h.name.toLowerCase().includes(query.toLowerCase())), [habits, tab, query]);

  const dueToday = habits.filter(isHabitDueToday);
  const doneToday = dueToday.filter((h) => h.completions.includes(today)).length;

  return (
    <Page>
      <PageHeader title="Habits" subtitle={`${doneToday}/${dueToday.length} done today`}
        right={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> New</Button>} />

      {dueToday.length > 0 && (
        <GlassCard className="flex items-center gap-4 mb-5">
          <Ring value={(doneToday / Math.max(1, dueToday.length)) * 100} size={64} stroke={7}>
            <span className="text-sm font-bold">{Math.round((doneToday / Math.max(1, dueToday.length)) * 100)}%</span>
          </Ring>
          <div>
            <div className="font-semibold">Today's progress</div>
            <div className="text-xs text-muted-foreground mt-0.5">{doneToday === dueToday.length ? 'Perfect day! 🎉' : `${dueToday.length - doneToday} habits remaining`}</div>
          </div>
        </GlassCard>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Tabs value={tab} onValueChange={setTab} className="flex-1">
          <TabsList className="glass rounded-2xl">
            <TabsTrigger value="active" className="rounded-xl">Active</TabsTrigger>
            <TabsTrigger value="archived" className="rounded-xl"><Archive className="w-3.5 h-3.5 mr-1" />Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="pl-9 h-10 w-32 rounded-2xl glass border-0" />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="🌱" title={tab === 'archived' ? 'No archived habits' : 'No habits yet'} hint="Start small — one tiny habit beats ten abandoned ones." action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Create habit</Button>} />
      ) : (
        <div className="space-y-3">
          {shown.map((h) => {
            const { current, best } = calcStreak(h.completions);
            const done = h.completions.includes(today);
            return (
              <GlassCard key={h.id}>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left part: Check Button, Name, Stats & Actions for mobile */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => toggleHabit(h.id)}
                      className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all press shrink-0',
                        done ? 'shadow-glow' : 'bg-muted/70')}
                      style={done ? { backgroundColor: h.color } : undefined}
                    >
                      {done ? '✓' : h.emoji}
                    </motion.button>
                    <div className="flex-1 min-w-0">
                      <div className={cn('font-semibold truncate text-sm md:text-base', done && 'line-through opacity-60')}>{h.name}</div>
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5 shrink-0"><Flame className="w-3.5 h-3.5 text-orange-500" />{current} day{current !== 1 && 's'}</span>
                        <span className="shrink-0">Best: {best}</span>
                        <span className="capitalize truncate">{h.frequency}</span>
                      </div>
                    </div>
                    {/* Action buttons (only visible on mobile) */}
                    <div className="flex md:hidden items-center gap-0.5 ml-auto">
                      <button onClick={() => openEdit(h)} className="p-2 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => updateHabit(h.id, { archived: !h.archived })} className="p-2 rounded-lg hover:bg-muted press" aria-label="Archive"><Archive className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => deleteHabit(h.id)} className="p-2 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </div>

                  {/* WeekChain tracker (centered on mobile, inline on desktop) */}
                  <div className="w-full md:w-auto flex justify-center md:justify-start py-1 overflow-x-auto no-scrollbar">
                    <WeekChain habit={h} />
                  </div>

                  {/* Action buttons (only visible on desktop) */}
                  <div className="hidden md:flex flex-col gap-1 ml-auto">
                    <button onClick={() => openEdit(h)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => updateHabit(h.id, { archived: !h.archived })} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Archive"><Archive className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deleteHabit(h.id)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* templates */}
      {tab === 'active' && (
        <>
          <div className="mt-7 mb-3 text-base font-semibold">✨ Templates</div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => addHabit({ ...t, frequency: 'daily', notes: '', reminder: '' })}
                className="glass rounded-2xl px-4 py-3 flex items-center gap-2.5 whitespace-nowrap press shrink-0">
                <span className="text-xl">{t.emoji}</span>
                <span className="text-sm font-medium">{t.name}</span>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* add/edit dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit habit' : 'New habit'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning run" className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="mt-1.5"><EmojiPicker value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e })} /></div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-1.5"><ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Habit['frequency'] })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reminder time</Label>
              <Input type="time" value={form.reminder} onChange={(e) => setForm({ ...form, reminder: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Why does this matter?" className="mt-1.5 rounded-xl" />
            </div>
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">
              {editing ? 'Save changes' : 'Create habit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
