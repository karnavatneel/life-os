import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Pencil, Mic, MicOff, Lock } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import type { JournalEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const MOODS = ['😄', '😊', '😌', '😐', '😕', '😢', '😤', '🥳'];
const TAGS = ['gratitude', 'work', 'family', 'focus', 'health', 'ideas', 'rest', 'travel'];

export default function Journal() {
  const { journal, addJournal, updateJournal, deleteJournal, settings } = useApp();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [unlocked, setUnlocked] = useState(!settings.privacyLockJournal);
  const [pinInput, setPinInput] = useState('');
  const [form, setForm] = useState({ title: '', body: '', mood: '😊', tags: [] as string[] });

  useEffect(() => { if (params.get('add')) { resetAndOpen(); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line

  const resetAndOpen = () => {
    setEditing(null);
    setForm({ title: '', body: '', mood: '😊', tags: [] });
    setOpen(true);
  };

  const openEdit = (j: JournalEntry) => {
    setEditing(j);
    setForm({ title: j.title, body: j.body, mood: j.mood, tags: j.tags });
    setOpen(true);
  };

  const save = () => {
    if (!form.body.trim() && !form.title.trim()) return;
    if (editing) updateJournal(editing.id, form);
    else addJournal({ ...form, date: todayISO() });
    setOpen(false);
  };

  const toggleVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
    if (!SR) { alert('Speech-to-text is not supported in this browser. Try Chrome.'); return; }
    if (listening) { setListening(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<{ [0]: { transcript: string } }>).slice(e.resultIndex).map((r) => r[0].transcript).join(' ');
      setForm((f) => ({ ...f, body: f.body + (f.body ? ' ' : '') + text }));
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const shown = journal.filter((j) =>
    j.title.toLowerCase().includes(query.toLowerCase()) ||
    j.body.toLowerCase().includes(query.toLowerCase()) ||
    j.tags.some((t) => t.includes(query.toLowerCase())));

  if (!unlocked) {
    return (
      <Page className="flex flex-col items-center justify-center min-h-[70dvh]">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold mb-2">Journal is locked</h1>
        <p className="text-sm text-muted-foreground mb-5">Enter your PIN to continue</p>
        <Input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)}
          className="w-40 text-center text-2xl tracking-[0.5em] rounded-2xl h-14 mb-4" placeholder="••••" />
        <Button onClick={() => { if (pinInput === settings.pin || !settings.pin) setUnlocked(true); else setPinInput(''); }}
          className="accent-gradient border-0 rounded-2xl h-12 px-8 shadow-glow press"><Lock className="w-4 h-4 mr-1" /> Unlock</Button>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Journal" subtitle={`${journal.length} entries`}
        right={<Button onClick={resetAndOpen} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Write</Button>} />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search entries, tags…" className="pl-10 h-11 rounded-2xl glass border-0" />
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="📖" title={query ? 'No matches' : 'Your story starts here'} hint="Write freely — this space is just for you."
          action={<Button onClick={resetAndOpen} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> First entry</Button>} />
      ) : (
        <div className="space-y-3">
          {shown.map((j, i) => (
            <motion.div key={j.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard onClick={() => openEdit(j)}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{j.mood}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{j.title || 'Untitled'}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{format(parseISO(j.date), 'MMM d')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{j.body}</p>
                    {j.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {j.tags.map((t) => <span key={t} className="text-[10px] glass rounded-full px-2 py-0.5">#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(j); }} className="p-1.5 rounded-lg hover:bg-muted press"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteJournal(j.id); }} className="p-1.5 rounded-lg hover:bg-muted press"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong rounded-3xl max-w-lg max-h-[88dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit entry' : 'New entry'} · {format(new Date(), 'MMM d')}</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2">
              {MOODS.map((m) => (
                <button key={m} onClick={() => setForm({ ...form, mood: m })}
                  className={cn('text-2xl p-1.5 rounded-xl press transition-all', form.mood === m && 'bg-primary/15 scale-110')}>
                  {m}
                </button>
              ))}
            </div>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-xl h-12 text-lg font-semibold" />
            <div className="relative">
              <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Dear diary…" rows={9} className="rounded-xl leading-relaxed" />
              <button onClick={toggleVoice}
                className={cn('absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center press transition-all',
                  listening ? 'bg-red-500 text-white animate-pulse' : 'glass')}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {TAGS.map((t) => (
                <button key={t} onClick={() => setForm({ ...form, tags: form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t] })}
                  className={cn('text-xs rounded-full px-3 py-1.5 press transition-all', form.tags.includes(t) ? 'accent-gradient text-white' : 'glass text-muted-foreground')}>
                  #{t}
                </button>
              ))}
            </div>
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">
              {editing ? 'Save changes' : 'Save entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
