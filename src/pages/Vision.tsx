import { useState } from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Page, PageHeader, EmptyState, EmojiPicker } from '@/components/shared';
import { useApp } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { VisionItem } from '@/lib/types';

const GRADIENTS = [
  'from-violet-500 to-fuchsia-500', 'from-emerald-500 to-teal-500', 'from-orange-500 to-red-500',
  'from-blue-500 to-cyan-400', 'from-pink-500 to-rose-400', 'from-amber-400 to-orange-500',
  'from-indigo-500 to-purple-500', 'from-lime-400 to-emerald-500',
];

export default function Vision() {
  const { vision, addVision, updateVision, deleteVision } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VisionItem | null>(null);
  const [form, setForm] = useState({ title: '', category: 'Lifestyle', quote: '', targetDate: '', emoji: '✨', gradient: GRADIENTS[0] });

  const startEdit = (v: VisionItem) => {
    setEditing(v);
    setForm({ title: v.title, category: v.category, quote: v.quote || '', targetDate: v.targetDate || '', emoji: v.emoji, gradient: v.gradient });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (editing) {
      updateVision(editing.id, form);
    } else {
      addVision(form);
    }
    setOpen(false);
    setEditing(null);
    setForm({ title: '', category: 'Lifestyle', quote: '', targetDate: '', emoji: '✨', gradient: GRADIENTS[0] });
  };

  return (
    <Page>
      <PageHeader title="Vision Board" subtitle="Keep your dreams in sight, every day"
        right={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Dream</Button>} />

      {vision.length === 0 ? (
        <EmptyState emoji="🌈" title="Your board is empty" hint="Add the life you're building toward — images, quotes, and goals."
          action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add dream</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {vision.map((v, i) => {
            const days = v.targetDate ? differenceInDays(parseISO(v.targetDate), new Date()) : null;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn('relative rounded-3xl overflow-hidden bg-gradient-to-br text-white shadow-soft press cursor-default group', v.gradient, i % 3 === 0 ? 'row-span-2 min-h-[220px]' : 'min-h-[150px]')}
              >
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative p-4 h-full flex flex-col">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl drop-shadow">{v.emoji}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(v); }} className="p-1.5 rounded-lg bg-black/20 press" aria-label="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteVision(v.id); }} className="p-1.5 rounded-lg bg-black/20 press" aria-label="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <div className="font-bold leading-tight drop-shadow">{v.title}</div>
                    {v.quote && <div className="text-[11px] opacity-90 mt-1 italic">"{v.quote}"</div>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-white/25 backdrop-blur rounded-full px-2 py-0.5">{v.category}</span>
                      {days !== null && <span className="text-[10px] bg-white/25 backdrop-blur rounded-full px-2 py-0.5">{days > 0 ? `${days}d to go` : 'achieved?'}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit dream' : 'Add to vision board'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Dream title" className="rounded-xl h-12" />
            <Input value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="Motivational quote" className="rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Lifestyle', 'Money', 'Health', 'Travel', 'Career', 'Relationships'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target date</Label>
                <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} className="mt-1.5 rounded-xl" />
              </div>
            </div>
            <div>
              <Label>Emoji</Label>
              <div className="mt-1.5"><EmojiPicker value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e })} /></div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {GRADIENTS.map((g) => (
                  <button key={g} onClick={() => setForm({ ...form, gradient: g })}
                    className={cn('h-10 rounded-xl bg-gradient-to-br press transition-all', g, form.gradient === g && 'ring-2 ring-offset-2 ring-offset-background ring-foreground/50 scale-105')} />
                ))}
              </div>
            </div>
            <Button onClick={save}
              className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Pin to board'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
