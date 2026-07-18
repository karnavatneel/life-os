import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, Trash2, Target, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState, Ring } from '@/components/shared';
import { useApp } from '@/lib/store';
import type { Goal } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal, toggleMilestone } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [tab, setTab] = useState<'short' | 'long'>('short');
  const [mInput, setMInput] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: '', horizon: 'short' as Goal['horizon'], deadline: '' });

  const shown = goals.filter((g) => g.horizon === tab);

  const startEdit = (g: Goal) => {
    setEditing(g);
    setForm({ title: g.title, horizon: g.horizon, deadline: g.deadline || '' });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editing) {
      updateGoal(editing.id, form);
    } else {
      addGoal({ ...form, milestones: [] });
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', horizon: 'short', deadline: '' });
  };

  return (
    <Page>
      <PageHeader title="Goals" subtitle="Milestones turn dreams into plans"
        right={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> New goal</Button>} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList className="glass rounded-2xl w-full grid grid-cols-2">
          <TabsTrigger value="short" className="rounded-xl">⚡ Short-term</TabsTrigger>
          <TabsTrigger value="long" className="rounded-xl">🏔️ Long-term</TabsTrigger>
        </TabsList>
      </Tabs>

      {shown.length === 0 ? (
        <EmptyState emoji="🎯" title={`No ${tab}-term goals`} hint="A goal without a plan is just a wish. Add one with milestones."
          action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add goal</Button>} />
      ) : (
        <div className="space-y-3">
          {shown.map((g) => {
            const done = g.milestones.filter((m) => m.done).length;
            const pct = g.milestones.length ? (done / g.milestones.length) * 100 : 0;
            const daysLeft = g.deadline ? differenceInDays(parseISO(g.deadline), new Date()) : null;
            return (
              <GlassCard key={g.id}>
                <div className="flex items-center gap-3.5 mb-3">
                  <Ring value={pct} size={60} stroke={6}>
                    <span className="text-xs font-bold">{Math.round(pct)}%</span>
                  </Ring>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{g.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {g.deadline && <>Due {format(parseISO(g.deadline), 'MMM d, yyyy')}
                        {daysLeft !== null && <span className={cn('ml-1.5 font-medium', daysLeft < 7 ? 'text-red-400' : 'text-primary')}>{daysLeft >= 0 ? `(${daysLeft}d left)` : '(overdue)'}</span>}</>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEdit(g)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteGoal(g.id)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="space-y-1.5 pl-1">
                  {g.milestones.map((m, i) => (
                    <motion.button key={m.id} whileTap={{ scale: 0.98 }} onClick={() => toggleMilestone(g.id, m.id)} className="w-full flex items-center gap-2.5 text-left press">
                      <div className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0', m.done ? 'accent-gradient text-white' : 'bg-muted text-muted-foreground')}>
                        {m.done ? '✓' : i + 1}
                      </div>
                      <span className={cn('text-sm', m.done && 'line-through opacity-50')}>{m.title}</span>
                    </motion.button>
                  ))}
                  <div className="flex gap-2 pt-1.5">
                    <Input value={mInput[g.id] ?? ''} onChange={(e) => setMInput({ ...mInput, [g.id]: e.target.value })}
                      placeholder="Add milestone…" className="h-8 text-xs rounded-lg glass border-0"
                      onKeyDown={(e) => {
                        const v = (mInput[g.id] ?? '').trim();
                        if (e.key === 'Enter' && v) {
                          updateGoal(g.id, { milestones: [...g.milestones, { id: crypto.randomUUID(), title: v, done: false }] });
                          setMInput({ ...mInput, [g.id]: '' });
                        }
                      }} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogTitle className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> {editing ? 'Edit goal' : 'New goal'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Run a half marathon" className="rounded-xl h-12" />
            <div>
              <Label>Horizon</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {(['short', 'long'] as const).map((h) => (
                  <button key={h} onClick={() => setForm({ ...form, horizon: h })}
                    className={cn('rounded-xl py-2.5 text-sm font-medium press capitalize transition-all', form.horizon === h ? 'accent-gradient text-white shadow-glow' : 'glass text-muted-foreground')}>
                    {h === 'short' ? '⚡ Short-term' : '🏔️ Long-term'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <Button onClick={save}
              className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Create goal'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
