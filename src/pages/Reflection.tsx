import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Page, PageHeader, GlassCard } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const FIELDS = [
  { key: 'wins', label: "Today's wins", emoji: '🏆', placeholder: 'What went well today?' },
  { key: 'challenges', label: 'Challenges', emoji: '🧗', placeholder: 'What was hard?' },
  { key: 'gratitude', label: 'Gratitude', emoji: '🙏', placeholder: 'Three things you\'re grateful for…' },
  { key: 'lessons', label: 'Lessons learned', emoji: '💡', placeholder: 'What did today teach you?' },
  { key: 'tomorrow', label: "Tomorrow's focus", emoji: '🎯', placeholder: 'The one thing for tomorrow…' },
] as const;

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

export default function Reflection() {
  const { reflections, saveReflection } = useApp();
  const today = todayISO();
  const existing = reflections[today];
  const [form, setForm] = useState({
    wins: existing?.wins ?? '', challenges: existing?.challenges ?? '', gratitude: existing?.gratitude ?? '',
    lessons: existing?.lessons ?? '', mood: existing?.mood ?? 0, tomorrow: existing?.tomorrow ?? '', rating: existing?.rating ?? 0,
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveReflection(today, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Page>
      <PageHeader title="Daily Reflection" subtitle="Five quiet minutes to close the day" />

      <GlassCard className="mb-4">
        <div className="text-sm font-semibold mb-3">😊 How was your day overall?</div>
        <div className="flex justify-between mb-4">
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setForm({ ...form, mood: i + 1 })}
              className={cn('text-3xl p-2 rounded-2xl press transition-all', form.mood === i + 1 && 'bg-primary/15 scale-125')}>
              {m}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold mb-2">⭐ Rate your day</div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button key={n} onClick={() => setForm({ ...form, rating: n })}
              className={cn('flex-1 h-8 rounded-lg text-xs font-bold press transition-all', form.rating >= n ? 'accent-gradient text-white' : 'bg-muted text-muted-foreground')}>
              {n}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="space-y-4">
        {FIELDS.map((f, i) => (
          <motion.div key={f.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard>
              <div className="text-sm font-semibold mb-2">{f.emoji} {f.label}</div>
              <Textarea value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder} rows={2} className="rounded-xl glass border-0 resize-none" />
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <Button onClick={save} className="w-full h-14 mt-6 accent-gradient border-0 rounded-2xl font-semibold text-base shadow-glow press">
        {saved ? <><Check className="w-5 h-5 mr-1" /> Saved — sleep well 🌙</> : existing ? 'Update reflection' : 'Complete reflection (+15 XP)'}
      </Button>
    </Page>
  );
}
