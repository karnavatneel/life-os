import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState, ColorPicker } from '@/components/shared';
import { useApp, todayISO, isHabitDueToday } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type View = 'month' | 'week' | 'day' | 'agenda';

export default function CalendarPage() {
  const { events, tasks, habits, addEvent, updateEvent, deleteEvent } = useApp();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; date: string; start: string; end: string; color: string; category: string; repeat: 'none' | 'daily' | 'weekly' | 'monthly' }>({ title: '', date: todayISO(), start: '', end: '', color: '#8b5cf6', category: 'Personal', repeat: 'none' });

  useEffect(() => { if (params.get('add')) { setOpen(true); setParams({}, { replace: true }); } }, [params, setParams]);

  const sel = parseISO(selected + 'T12:00:00');
  const dayEvents = useMemo(() => events.filter((e) => e.date === selected).sort((a, b) => a.start.localeCompare(b.start)), [events, selected]);
  const dayTasks = tasks.filter((t) => t.dueDate === selected && !t.done);
  const dayHabits = isSameDay(sel, new Date()) ? habits.filter(isHabitDueToday) : [];

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return days;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [cursor]);

  const agendaDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);

  const startEdit = (ev: typeof events[0]) => {
    setEditing(ev.id);
    setForm({ title: ev.title, date: ev.date, start: ev.start, end: ev.end, color: ev.color, category: ev.category, repeat: ev.repeat as 'none' | 'daily' | 'weekly' | 'monthly' });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editing) {
      updateEvent(editing, form);
    } else {
      addEvent(form);
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', date: selected, start: '', end: '', color: '#8b5cf6', category: 'Personal', repeat: 'none' });
  };

  const DayDetail = ({ dateStr }: { dateStr: string }) => {
    const evs = events.filter((e) => e.date === dateStr).sort((a, b) => a.start.localeCompare(b.start));
    const tks = tasks.filter((t) => t.dueDate === dateStr && !t.done);
    if (evs.length === 0 && tks.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {evs.map((e) => (
          <div key={e.id} className="flex items-center gap-2.5 p-2 rounded-xl glass">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: e.color }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{e.title}</div>
              <div className="text-[11px] text-muted-foreground">{e.start}{e.end && ` – ${e.end}`}</div>
            </div>
            <button onClick={() => deleteEvent(e.id)} className="p-1 press"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
        ))}
        {tks.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-xl glass">
            <span>✅</span>
            <span className="text-sm truncate">{t.title}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Page>
      <PageHeader title="Calendar" subtitle="Events, tasks & habits in one view"
        right={<Button onClick={() => { setForm((f) => ({ ...f, date: selected })); setOpen(true); }} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Event</Button>} />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex glass rounded-2xl p-1 flex-1">
          {(['month', 'week', 'day', 'agenda'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('flex-1 py-1.5 rounded-xl text-xs font-medium capitalize press transition-all', view === v && 'accent-gradient text-white shadow-glow')}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(view === 'month' ? addMonths(cursor, -1) : addDays(cursor, -7))} className="p-2 rounded-xl glass press"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, 7))} className="p-2 rounded-xl glass press"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {view === 'month' && (
        <GlassCard>
          <div className="text-center font-semibold mb-3">{format(cursor, 'MMMM yyyy')}</div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d) => {
              const ds = format(d, 'yyyy-MM-dd');
              const hasEvent = events.some((e) => e.date === ds);
              const hasTask = tasks.some((t) => t.dueDate === ds && !t.done);
              const isSel = ds === selected;
              const isToday = ds === todayISO();
              return (
                <button key={ds} onClick={() => setSelected(ds)}
                  className={cn('aspect-square rounded-xl text-sm flex flex-col items-center justify-center gap-0.5 press transition-all relative',
                    !isSameMonth(d, cursor) && 'opacity-30',
                    isSel ? 'accent-gradient text-white font-bold shadow-glow' : isToday && 'ring-1 ring-primary font-semibold')}>
                  {format(d, 'd')}
                  <div className="flex gap-0.5 h-1">
                    {hasEvent && <div className={cn('w-1 h-1 rounded-full', isSel ? 'bg-white' : 'bg-primary')} />}
                    {hasTask && <div className={cn('w-1 h-1 rounded-full', isSel ? 'bg-white/70' : 'bg-orange-400')} />}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}

      {view === 'week' && (
        <GlassCard>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d) => {
              const ds = format(d, 'yyyy-MM-dd');
              const isSel = ds === selected;
              return (
                <button key={ds} onClick={() => setSelected(ds)}
                  className={cn('rounded-2xl py-2 flex flex-col items-center press transition-all', isSel && 'accent-gradient text-white shadow-glow')}>
                  <span className="text-[10px] opacity-70">{format(d, 'EEE')}</span>
                  <span className="text-lg font-bold">{format(d, 'd')}</span>
                  {events.some((e) => e.date === ds) && <div className={cn('w-1 h-1 rounded-full', isSel ? 'bg-white' : 'bg-primary')} />}
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}

      {(view === 'month' || view === 'week' || view === 'day') && (
        <>
          <div className="mt-5 mb-3 font-semibold text-base">{isSameDay(sel, new Date()) ? 'Today' : format(sel, 'EEEE, MMM d')}</div>
          {dayEvents.length === 0 && dayTasks.length === 0 && dayHabits.length === 0 ? (
            <GlassCard><p className="text-sm text-muted-foreground text-center py-3">Nothing scheduled — wide open day 🌤️</p></GlassCard>
          ) : (
            <GlassCard className="space-y-2">
              {dayEvents.map((e) => (
                  <motion.div key={e.id} layout className="flex items-center gap-3 p-2.5 rounded-2xl glass">
                  <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: e.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground">{e.start || 'All day'}{e.end && ` – ${e.end}`} · {e.category}</div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => startEdit(e)} className="p-1.5 press rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deleteEvent(e.id)} className="p-1.5 press"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </motion.div>
              ))}
              {dayTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-2xl glass">
                  <span className="text-lg">✅</span>
                  <div className="flex-1 text-sm truncate">{t.title}</div>
                  <span className="text-[11px] text-muted-foreground">{t.dueTime || 'Task'}</span>
                </div>
              ))}
              {dayHabits.map((h) => (
                <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-2xl glass">
                  <span className="text-lg">{h.emoji}</span>
                  <div className="flex-1 text-sm truncate">{h.name}</div>
                  <span className="text-[11px] text-muted-foreground">Habit</span>
                </div>
              ))}
            </GlassCard>
          )}
        </>
      )}

      {view === 'agenda' && (
        <div className="space-y-4">
          {agendaDays.map((d) => {
            const ds = format(d, 'yyyy-MM-dd');
            const has = events.some((e) => e.date === ds) || tasks.some((t) => t.dueDate === ds && !t.done);
            if (!has) return null;
            return (
              <div key={ds}>
                <div className="text-sm font-semibold mb-2 text-muted-foreground">{isSameDay(d, new Date()) ? 'Today' : format(d, 'EEE, MMM d')}</div>
                <DayDetail dateStr={ds} />
              </div>
            );
          })}
          {agendaDays.every((d) => !events.some((e) => e.date === format(d, 'yyyy-MM-dd')) && !tasks.some((t) => t.dueDate === format(d, 'yyyy-MM-dd') && !t.done)) && (
            <EmptyState emoji="📅" title="Clear schedule" hint="No events or tasks in the next two weeks." />
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit event' : 'New event'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="rounded-xl h-12" />
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div><Label>End</Label><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="mt-1.5 rounded-xl" /></div>
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
                  <SelectContent>{['Work', 'Personal', 'Health', 'Fitness', 'Social'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Repeat</Label>
                <Select value={form.repeat} onValueChange={(v) => setForm({ ...form, repeat: v as typeof form.repeat })}>
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
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Add event'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
