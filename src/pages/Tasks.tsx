import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, AlertCircle, Search, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import type { Task } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const PRIORITIES = {
  urgent: { label: 'Urgent', color: '#ef4444', emoji: '🔴' },
  high: { label: 'High', color: '#f59e0b', emoji: '🟠' },
  medium: { label: 'Medium', color: '#3b82f6', emoji: '🔵' },
  low: { label: 'Low', color: '#9ca3af', emoji: '⚪' },
} as const;

const CATEGORIES = ['Work', 'Personal', 'Health', 'Errands', 'Learning', 'Finance'];

function dueLabel(d: string) {
  try {
    const dt = parseISO(d);
    if (isToday(dt)) return 'Today';
    if (isTomorrow(dt)) return 'Tomorrow';
    return format(dt, 'MMM d');
  } catch { return d; }
}

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, toggleSubtask } = useApp();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'done'>('all');
  const [sort, setSort] = useState<'due' | 'priority'>('due');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subInput, setSubInput] = useState('');

  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as Task['priority'], dueDate: todayISO(), dueTime: '', category: 'Personal', recurring: 'none' as Task['recurring'] });

  useEffect(() => { if (params.get('add')) { setOpen(true); setParams({}, { replace: true }); } }, [params, setParams]);

  const startEdit = (t: Task) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description || '', priority: t.priority, dueDate: t.dueDate, dueTime: t.dueTime || '', category: t.category, recurring: t.recurring });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editing) {
      updateTask(editing.id, form);
    } else {
      addTask(form);
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', description: '', priority: 'medium', dueDate: todayISO(), dueTime: '', category: 'Personal', recurring: 'none' });
  };

  const today = todayISO();
  const shown = useMemo(() => {
    let list = tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));
    if (filter === 'today') list = list.filter((t) => !t.done && t.dueDate <= today);
    else if (filter === 'overdue') list = list.filter((t) => !t.done && t.dueDate < today);
    else if (filter === 'done') list = list.filter((t) => t.done);
    else list = list.filter((t) => !t.done);
    const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...list].sort((a, b) => sort === 'priority' ? rank[a.priority] - rank[b.priority] : a.dueDate.localeCompare(b.dueDate));
  }, [tasks, query, filter, sort, today]);

  const stats = {
    open: tasks.filter((t) => !t.done).length,
    overdue: tasks.filter((t) => !t.done && t.dueDate < today).length,
    doneToday: tasks.filter((t) => t.completedAt === today).length,
  };

  return (
    <Page>
      <PageHeader title="Tasks" subtitle={`${stats.open} open · ${stats.doneToday} done today`}
        right={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> New</Button>} />

      {stats.overdue > 0 && (
        <GlassCard className="mb-4 border-l-4 !border-l-red-500 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="text-sm"><span className="font-semibold">{stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}</span> — tackle them first or reschedule.</div>
        </GlassCard>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" className="pl-9 h-10 rounded-2xl glass border-0" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[110px] h-10 rounded-2xl glass border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Open</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-[110px] h-10 rounded-2xl glass border-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due">By date</SelectItem>
            <SelectItem value="priority">By priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="✅" title="Nothing here" hint="Your task list is clear. Add something meaningful." action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add task</Button>} />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {shown.map((t) => {
              const overdue = !t.done && t.dueDate < today;
              const p = PRIORITIES[t.priority];
              const isExp = expanded === t.id;
              const subsDone = t.subtasks.filter((s) => s.done).length;
              return (
                <motion.div key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60, transition: { duration: 0.2 } }}>
                  <GlassCard className="!p-3">
                    <div className="flex items-center gap-3">
                      <motion.button whileTap={{ scale: 0.75 }} onClick={() => toggleTask(t.id)}
                        className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          t.done ? 'accent-gradient border-transparent text-white' : 'border-muted-foreground/40 hover:border-primary')}
                        style={{ borderColor: t.done ? undefined : overdue ? '#ef4444' : undefined }}>
                        {t.done && '✓'}
                      </motion.button>
                      <div className="flex-1 min-w-0" onClick={() => setExpanded(isExp ? null : t.id)} role="button">
                        <div className={cn('text-sm font-medium truncate', t.done && 'line-through opacity-50')}>{t.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span style={{ color: p.color }}>{p.emoji} {p.label}</span>
                          <span className={cn(overdue && 'text-red-500 font-semibold')}>{dueLabel(t.dueDate)}{t.dueTime && ` · ${t.dueTime}`}</span>
                          <span className="glass rounded-full px-1.5 py-px">{t.category}</span>
                          {t.subtasks.length > 0 && <span>{subsDone}/{t.subtasks.length} sub</span>}
                          {t.recurring !== 'none' && <span>🔁</span>}
                        </div>
                      </div>
                      {t.subtasks.length > 0 && (
                        <button onClick={() => setExpanded(isExp ? null : t.id)} className="p-1 press">
                          {isExp ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      )}
                      <div className="flex gap-0.5">
                        <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => deleteTask(t.id)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExp && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pl-9 pt-2 space-y-1.5">
                            {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                            {t.subtasks.map((st) => (
                              <button key={st.id} onClick={() => toggleSubtask(t.id, st.id)} className="flex items-center gap-2.5 w-full text-left press">
                                <div className={cn('w-4 h-4 rounded border flex items-center justify-center text-[10px]', st.done ? 'accent-gradient border-transparent text-white' : 'border-muted-foreground/40')}>{st.done && '✓'}</div>
                                <span className={cn('text-xs', st.done && 'line-through opacity-50')}>{st.title}</span>
                              </button>
                            ))}
                            <div className="flex gap-2 pt-1">
                              <Input value={subInput} onChange={(e) => setSubInput(e.target.value)} placeholder="Add subtask…" className="h-8 text-xs rounded-lg"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && subInput.trim()) {
                                    updateTask(t.id, { subtasks: [...t.subtasks, { id: crypto.randomUUID(), title: subInput.trim(), done: false }] });
                                    setSubInput('');
                                  }
                                }} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit task' : 'New task'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs doing?" className="rounded-xl h-12" />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" className="rounded-xl" rows={2} />
            <div>
              <Label>Priority</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {(Object.keys(PRIORITIES) as Task['priority'][]).map((pr) => (
                  <button key={pr} onClick={() => setForm({ ...form, priority: pr })}
                    className={cn('rounded-xl py-2 text-xs font-medium press transition-all', form.priority === pr ? 'text-white shadow-glow' : 'glass')}
                    style={form.priority === pr ? { backgroundColor: PRIORITIES[pr].color } : undefined}>
                    {PRIORITIES[pr].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
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
                <Label>Repeats</Label>
                <Select value={form.recurring} onValueChange={(v) => setForm({ ...form, recurring: v as Task['recurring'] })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Add task'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
