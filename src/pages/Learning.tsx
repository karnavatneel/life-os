import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Plus, Trash2, Timer, BookOpen, Award, Code, GraduationCap, Flame, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle, EmptyState, Ring } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import type { LearningItem } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const TYPE_META: Record<LearningItem['type'], { icon: typeof BookOpen; emoji: string; color: string }> = {
  course: { icon: GraduationCap, emoji: '🎓', color: '#8b5cf6' },
  book: { icon: BookOpen, emoji: '📚', color: '#f59e0b' },
  skill: { icon: Code, emoji: '🛠️', color: '#3b82f6' },
  certification: { icon: Award, emoji: '📜', color: '#10b981' },
};

export default function Learning() {
  const { learning, addLearning, updateLearning, deleteLearning, studyLog, logStudy } = useApp();
  const [open, setOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [mins, setMins] = useState(30);
  const [editing, setEditing] = useState<LearningItem | null>(null);
  const [form, setForm] = useState({ title: '', type: 'course' as LearningItem['type'], resource: '', notes: '' });

  const today = todayISO();
  const studyStreak = useMemo(() => {
    let n = 0; const d = new Date();
    while ((studyLog[format(d, 'yyyy-MM-dd')] ?? 0) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [studyLog]);

  const weekData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    return { day: format(subDays(new Date(), 6 - i), 'EEE'), mins: studyLog[d] ?? 0 };
  }), [studyLog]);

  const weekTotal = weekData.reduce((a, b) => a + b.mins, 0);
  const weeklyGoal = 300;

  const startEdit = (l: LearningItem) => {
    setEditing(l);
    setForm({ title: l.title, type: l.type, resource: l.resource || '', notes: l.notes || '' });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editing) {
      updateLearning(editing.id, form);
    } else {
      addLearning({ ...form, progress: 0 });
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', type: 'course', resource: '', notes: '' });
  };

  return (
    <Page>
      <PageHeader title="Learning" subtitle="Courses, books, skills & certifications"
        right={<div className="flex gap-2">
          <Button variant="outline" onClick={() => setStudyOpen(true)} className="rounded-2xl glass border-0"><Timer className="w-4 h-4 mr-1" /> Log</Button>
          <Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>} />

      {/* stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <GlassCard className="text-center !p-3">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold text-gradient"><Flame className="w-5 h-5 text-orange-500" />{studyStreak}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Day streak</div>
        </GlassCard>
        <GlassCard className="text-center !p-3">
          <div className="text-2xl font-bold text-gradient">{studyLog[today] ?? 0}<span className="text-sm">m</span></div>
          <div className="text-[10px] text-muted-foreground mt-1">Today</div>
        </GlassCard>
        <GlassCard className="text-center !p-3">
          <div className="text-2xl font-bold text-gradient">{Math.round((weekTotal / weeklyGoal) * 100)}%</div>
          <div className="text-[10px] text-muted-foreground mt-1">Weekly goal</div>
        </GlassCard>
      </div>

      <SectionTitle>📊 This week</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={weekData}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => `${v} min`} />
            <Bar dataKey="mins" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground text-center mt-1">{weekTotal} / {weeklyGoal} min weekly goal</div>
      </GlassCard>

      <SectionTitle>📚 My learning</SectionTitle>
      {learning.length === 0 ? (
        <EmptyState emoji="🎓" title="Nothing in progress" hint="Add a course, book, or skill you're working on." action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add item</Button>} />
      ) : (
        <div className="space-y-3">
          {learning.map((l) => {
            const meta = TYPE_META[l.type];
            return (
              <GlassCard key={l.id}>
                <div className="flex items-center gap-3">
                  <Ring value={l.progress} size={56} stroke={6} color={meta.color}>
                    <span className="text-[11px] font-bold">{l.progress}%</span>
                  </Ring>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{meta.emoji} {l.title}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">{l.type}{l.resource && ` · ${l.resource}`}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Slider value={[l.progress]} max={100} step={5} onValueChange={([v]) => updateLearning(l.id, { progress: v })} className="flex-1" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 self-start shrink-0">
                    <button onClick={() => startEdit(l)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteLearning(l.id)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
                {l.progress === 100 && <div className="mt-2 text-xs text-emerald-500 bg-emerald-500/10 rounded-xl p-2 text-center font-medium">🎉 Completed — amazing work!</div>}
              </GlassCard>
            );
          })}
        </div>
      )}

      <SectionTitle>🔁 Revision planner</SectionTitle>
      <GlassCard>
        {[
          { when: 'Today', what: 'Review: React Advanced Patterns — ch. 4 notes' },
          { when: 'In 3 days', what: 'Spaced repetition: Atomic Habits key ideas' },
          { when: 'Next week', what: 'Practice quiz: AWS Cloud Practitioner' },
        ].map((r) => (
          <div key={r.what} className="flex items-center gap-3 py-2">
            <span className="text-xs glass rounded-full px-2.5 py-1 font-medium shrink-0">{r.when}</span>
            <span className="text-sm">{r.what}</span>
          </div>
        ))}
      </GlassCard>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit learning item' : 'Add learning item'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Deep Work)" className="rounded-xl h-12" />
            <div>
              <Label>Type</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {(Object.keys(TYPE_META) as LearningItem['type'][]).map((t) => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })}
                    className={cn('rounded-xl py-2.5 flex flex-col items-center gap-1 press text-[10px] font-medium capitalize transition-all',
                      form.type === t ? 'accent-gradient text-white shadow-glow' : 'glass text-muted-foreground')}>
                    <span className="text-base">{TYPE_META[t].emoji}</span>{t.slice(0, 5)}
                  </button>
                ))}
              </div>
            </div>
            <Input value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })} placeholder="Resource / link (optional)" className="rounded-xl" />
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="rounded-xl" />
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Add'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={studyOpen} onOpenChange={setStudyOpen}>
        <DialogContent className="glass-strong rounded-3xl max-w-xs text-center">
          <DialogTitle className="text-xl font-bold">Log study time</DialogTitle>
          <div className="text-5xl font-bold text-gradient my-6">{mins}<span className="text-2xl">min</span></div>
          <Slider value={[mins]} max={180} step={5} onValueChange={([v]) => setMins(v)} />
          <div className="flex gap-2 justify-center mt-4 mb-5">
            {[15, 30, 45, 60].map((m) => (
              <button key={m} onClick={() => setMins(m)} className={cn('text-xs px-3 py-1.5 rounded-xl press', mins === m ? 'accent-gradient text-white' : 'glass')}>{m}m</button>
            ))}
          </div>
          <Button onClick={() => { logStudy(mins); setStudyOpen(false); }} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">Log it</Button>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
