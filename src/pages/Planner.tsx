import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Sunrise, MoonStar, Trash2 } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle } from '@/components/shared';
import { useApp, todayISO, isHabitDueToday } from '@/lib/store';
import type { PlannerBlock } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const KIND_STYLE: Record<PlannerBlock['kind'], { color: string; emoji: string }> = {
  task: { color: '#3b82f6', emoji: '✅' },
  habit: { color: '#10b981', emoji: '🌱' },
  meeting: { color: '#8b5cf6', emoji: '📅' },
  note: { color: '#f59e0b', emoji: '📝' },
  personal: { color: '#ec4899', emoji: '💜' },
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 - 22:00

export default function Planner() {
  const { plans, savePlan, blocks, addBlock, deleteBlock, habits, tasks, toggleHabit, toggleTask } = useApp();
  const today = todayISO();
  const plan = plans[today] ?? { priorities: ['', '', ''], eveningReview: '' };
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [form, setForm] = useState({ title: '', kind: 'task' as PlannerBlock['kind'] });

  const todayBlocks = blocks.filter((b) => b.date === today).sort((a, b) => a.hour - b.hour);
  const dueHabits = habits.filter(isHabitDueToday);
  const todayTasks = tasks.filter((t) => t.dueDate === today && !t.done);

  const setPriority = (i: number, v: string) => {
    const p = [...plan.priorities];
    p[i] = v;
    savePlan(today, { ...plan, priorities: p });
  };

  const hourNow = new Date().getHours();

  return (
    <Page>
      <PageHeader title="Daily Planner" subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} />

      {/* morning planning */}
      <GlassCard className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center"><Sunrise className="w-4 h-4 text-amber-500" /></div>
          <div className="font-semibold">Top 3 priorities</div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-2">
            <div className={cn('w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0', i === 0 ? 'accent-gradient text-white' : 'bg-muted text-muted-foreground')}>{i + 1}</div>
            <Input value={plan.priorities[i] ?? ''} onChange={(e) => setPriority(i, e.target.value)}
              placeholder={['Most important thing…', 'Second priority…', 'Third priority…'][i]}
              className="rounded-xl glass border-0 h-10" />
          </div>
        ))}
      </GlassCard>

      {/* hourly timeline */}
      <SectionTitle right={<Button size="sm" onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-xl h-8"><Plus className="w-3.5 h-3.5 mr-1" /> Block</Button>}>
        ⏰ Time blocks
      </SectionTitle>
      <GlassCard className="!p-2">
        {HOURS.map((h) => {
          const block = todayBlocks.find((b) => b.hour === h);
          const isNow = h === hourNow;
          return (
            <div key={h} className={cn('flex items-stretch gap-3 group', isNow && 'relative')}>
              <div className={cn('w-11 text-right text-[11px] pt-2.5 shrink-0', isNow ? 'text-primary font-bold' : 'text-muted-foreground')}>
                {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'am' : 'pm'}
              </div>
              <div className={cn('flex-1 min-h-[44px] border-l-2 pl-3 py-1', isNow ? 'border-primary' : 'border-border/60')}>
                {block ? (
                  <motion.div layout className="flex items-center gap-2 rounded-xl p-2 glass" style={{ borderLeft: `3px solid ${KIND_STYLE[block.kind].color}` }}>
                    <span className="text-sm">{KIND_STYLE[block.kind].emoji}</span>
                    <span className="text-sm flex-1 truncate">{block.title}</span>
                    <button onClick={() => deleteBlock(block.id)} className="p-1 opacity-0 group-hover:opacity-100 press"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </motion.div>
                ) : (
                  <button onClick={() => { setHour(h); setOpen(true); }} className="w-full h-[36px] rounded-xl text-left text-xs text-muted-foreground/50 px-2 opacity-0 group-hover:opacity-100 hover:bg-muted/40 transition-opacity press">
                    + add block
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </GlassCard>

      {/* habits & tasks checklists */}
      <div className="grid md:grid-cols-2 gap-3 mt-5">
        <GlassCard>
          <div className="font-semibold mb-2.5 text-sm">🌱 Habits today</div>
          {dueHabits.map((h) => {
            const done = h.completions.includes(today);
            return (
              <button key={h.id} onClick={() => toggleHabit(h.id)} className="w-full flex items-center gap-2.5 py-1.5 press text-left">
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[11px]', done ? 'text-white' : 'bg-muted')} style={done ? { backgroundColor: h.color } : undefined}>{done && '✓'}</div>
                <span className={cn('text-sm', done && 'line-through opacity-50')}>{h.emoji} {h.name}</span>
              </button>
            );
          })}
        </GlassCard>
        <GlassCard>
          <div className="font-semibold mb-2.5 text-sm">✅ Tasks due today</div>
          {todayTasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks due today 🎉</p>}
          {todayTasks.map((t) => (
            <button key={t.id} onClick={() => toggleTask(t.id)} className="w-full flex items-center gap-2.5 py-1.5 press text-left">
              <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center" />
              <span className="text-sm">{t.title}</span>
            </button>
          ))}
        </GlassCard>
      </div>

      {/* evening review */}
      <GlassCard className="mt-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center"><MoonStar className="w-4 h-4 text-indigo-400" /></div>
          <div>
            <div className="font-semibold">Evening review & tomorrow</div>
            <div className="text-[11px] text-muted-foreground">How did today go? What's the plan for tomorrow?</div>
          </div>
        </div>
        <Textarea value={plan.eveningReview} onChange={(e) => savePlan(today, { ...plan, eveningReview: e.target.value })}
          placeholder="Reflect on today and set tomorrow's intention…" rows={3} className="rounded-xl glass border-0" />
      </GlassCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogTitle className="text-xl font-bold">Time block</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What's happening?" className="rounded-xl h-12" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hour</Label>
                <Select value={String(hour)} onValueChange={(v) => setHour(Number(v))}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{HOURS.map((h) => <SelectItem key={h} value={String(h)}>{h % 12 === 0 ? 12 : h % 12}:00 {h < 12 ? 'AM' : 'PM'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as PlannerBlock['kind'] })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(KIND_STYLE) as PlannerBlock['kind'][]).map((k) => <SelectItem key={k} value={k}>{KIND_STYLE[k].emoji} {k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => { if (form.title.trim()) { addBlock({ date: today, hour, ...form }); setOpen(false); setForm({ title: '', kind: 'task' }); } }}
              className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">Add block</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
