import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Plus, Trash2, BellRing, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState, SectionTitle } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import type { Medicine } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const SLOTS = [
  { key: 'morning', label: 'Morning', emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening', label: 'Evening', emoji: '🌇' },
  { key: 'night', label: 'Night', emoji: '🌙' },
] as const;


export default function MedicinePage() {
  const { medicines, addMedicine, updateMedicine, deleteMedicine, toggleDose } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const today = todayISO();
  const todayDow = new Date().getDay();

  const [form, setForm] = useState({
    name: '', dosage: '', foodTiming: 'any' as Medicine['foodTiming'],
    startDate: today, endDate: '', refillDate: '', doctorNotes: '',
    times: { morning: true, afternoon: false, evening: false, night: false },
  });

  const active = medicines.filter((m) => {
    if (m.weekdays.length && !m.weekdays.includes(todayDow)) return false;
    if (m.startDate && m.startDate > today) return false;
    if (m.endDate && m.endDate < today) return false;
    return true;
  });

  const totalDoses = active.reduce((n, m) => n + SLOTS.filter((s) => m.times[s.key]).length, 0);
  const takenDoses = active.reduce((n, m) => n + SLOTS.filter((s) => m.times[s.key] && m.taken.includes(`${today}_${s.key}`)).length, 0);

  const startEdit = (m: Medicine) => {
    setEditing(m);
    setForm({
      name: m.name, dosage: m.dosage, foodTiming: m.foodTiming,
      startDate: m.startDate, endDate: m.endDate || '', refillDate: m.refillDate || '', doctorNotes: m.doctorNotes || '',
      times: { ...m.times },
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateMedicine(editing.id, form);
    } else {
      addMedicine({ ...form, weekdays: [0, 1, 2, 3, 4, 5, 6] });
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', dosage: '', foodTiming: 'any', startDate: today, endDate: '', refillDate: '', doctorNotes: '', times: { morning: true, afternoon: false, evening: false, night: false } });
  };

  return (
    <Page>
      <PageHeader title="Medicine" subtitle={`${takenDoses}/${totalDoses} doses taken today`}
        right={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Add</Button>} />

      {totalDoses > 0 && (
        <GlassCard className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today's doses</span>
            <span className="text-sm font-bold text-gradient">{Math.round((takenDoses / totalDoses) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full accent-gradient transition-all duration-500" style={{ width: `${(takenDoses / totalDoses) * 100}%` }} />
          </div>
        </GlassCard>
      )}

      {medicines.length === 0 ? (
        <EmptyState emoji="💊" title="No medicines yet" hint="Add your medications and get reminded at the right times."
          action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add medicine</Button>} />
      ) : (
        <div className="space-y-3">
          {medicines.map((m) => {
            const refillDays = m.refillDate ? differenceInDays(parseISO(m.refillDate), new Date()) : null;
            return (
              <GlassCard key={m.id}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-pink-500/15 flex items-center justify-center text-xl">💊</div>
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.dosage} · {m.foodTiming === 'any' ? 'anytime' : `${m.foodTiming} food`}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => deleteMedicine(m.id)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.filter((s) => m.times[s.key]).map((s) => {
                    const isActive = active.includes(m);
                    const taken = m.taken.includes(`${today}_${s.key}`);
                    return (
                      <button key={s.key} disabled={!isActive} onClick={() => toggleDose(m.id, today, s.key)}
                        className={cn('flex items-center gap-2 rounded-xl p-2.5 press transition-all text-left',
                          taken ? 'accent-gradient text-white shadow-glow' : 'glass', !isActive && 'opacity-40')}>
                        <span>{s.emoji}</span>
                        <span className="text-xs font-medium flex-1">{s.label}</span>
                        <span className="text-xs">{taken ? '✓' : '○'}</span>
                      </button>
                    );
                  })}
                </div>
                {(refillDays !== null && refillDays <= 14) && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-xl p-2.5">
                    <BellRing className="w-3.5 h-3.5" />
                    Refill {refillDays <= 0 ? 'needed now' : `in ${refillDays} days`} ({format(parseISO(m.refillDate), 'MMM d')})
                  </div>
                )}
                {m.doctorNotes && <div className="mt-2 text-xs text-muted-foreground">🩺 {m.doctorNotes}</div>}
              </GlassCard>
            );
          })}
        </div>
      )}

      <SectionTitle>ℹ️ Missed dose tracking</SectionTitle>
      <GlassCard>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Untaken doses stay visible on this page until marked. Check the analytics page for your 14-day adherence rate.
        </p>
      </GlassCard>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit medicine' : 'Add medicine'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="rounded-xl" />
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="Dosage (e.g. 500mg)" className="rounded-xl" />
            </div>
            <div>
              <Label>Times of day</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {SLOTS.map((s) => (
                  <button key={s.key} onClick={() => setForm({ ...form, times: { ...form.times, [s.key]: !form.times[s.key] } })}
                    className={cn('rounded-xl py-2.5 flex flex-col items-center gap-1 press text-[10px] font-medium transition-all',
                      form.times[s.key] ? 'accent-gradient text-white shadow-glow' : 'glass text-muted-foreground')}>
                    <span className="text-base">{s.emoji}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Food timing</Label>
              <Select value={form.foodTiming} onValueChange={(v) => setForm({ ...form, foodTiming: v as Medicine['foodTiming'] })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before food</SelectItem>
                  <SelectItem value="after">After food</SelectItem>
                  <SelectItem value="any">Anytime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1.5 rounded-xl" /></div>
              <div><Label>End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            </div>
            <div><Label>Refill reminder date</Label><Input type="date" value={form.refillDate} onChange={(e) => setForm({ ...form, refillDate: e.target.value })} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Doctor notes</Label><Input value={form.doctorNotes} onChange={(e) => setForm({ ...form, doctorNotes: e.target.value })} placeholder="e.g. Take with breakfast" className="mt-1.5 rounded-xl" /></div>
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Add medicine'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
