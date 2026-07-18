import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { format, subDays, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Minus, Plus } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle } from '@/components/shared';
import { useApp, todayISO, emptyHealth } from '@/lib/store';
import { useIntegrations } from '@/lib/integrations';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const moodColor = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function SyncedStat({ label, emoji, value, unit }: { label: string; emoji: string; value: number; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{emoji}</span>
        <div className="flex flex-col">
          <span className="text-sm font-medium leading-none">{label}</span>
          <span className="text-[9px] text-emerald-500 font-medium mt-1">Synced from Google Fit</span>
        </div>
      </div>
      <div className="text-base font-bold tabular-nums pr-2">
        {value}
        {unit && <span className="text-xs text-muted-foreground font-normal ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function Stepper({ label, emoji, value, onChange, step = 1, min = 0, max = 999, unit }: { label: string; emoji: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))} className="w-8 h-8 rounded-xl glass flex items-center justify-center press"><Minus className="w-4 h-4" /></button>
        <span className="w-16 text-center font-bold tabular-nums">{value}{unit && <span className="text-xs text-muted-foreground font-normal ml-0.5">{unit}</span>}</span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))} className="w-8 h-8 rounded-xl glass flex items-center justify-center press"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function Scale({ label, emoji, value, onChange }: { label: string; emoji: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={cn('w-7 h-7 rounded-lg text-xs font-bold press transition-all', value >= n ? 'accent-gradient text-white' : 'bg-muted text-muted-foreground')}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Health() {
  const { health, updateHealth } = useApp();
  const [params, setParams] = useSearchParams();
  const [moodOpen, setMoodOpen] = useState(false);
  const today = todayISO();
  const h = health[today] ?? emptyHealth();
  const set = (p: Partial<typeof h>) => updateHealth(today, p);

  useEffect(() => { if (params.get('add') === 'mood') { setMoodOpen(true); setParams({}, { replace: true }); } }, [params, setParams]);

  const chartData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd');
    const log = health[d];
    return { day: format(parseISO(d), 'MMM d'), mood: log?.mood ?? null, sleep: log?.sleepHours ?? null, water: log?.water ?? null, steps: log?.steps ?? null, weight: log?.weight ?? null, energy: log?.energy ?? null };
  }), [health]);

  const { googleTokens } = useIntegrations();
  const isGoogleConnected = !!googleTokens;

  return (
    <Page>
      <PageHeader title="Health" subtitle="Track how your body & mind feel"
        right={<Button onClick={() => setMoodOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press">😊 Log mood</Button>} />

      {/* today's mood banner */}
      <GlassCard className="mb-5 flex items-center gap-4" onClick={() => setMoodOpen(true)}>
        <div className="text-5xl">{h.mood ? MOODS[h.mood - 1] : '🤔'}</div>
        <div>
          <div className="font-semibold">{h.mood ? ['Rough day', 'Not great', 'Okay', 'Good', 'Amazing'][h.mood - 1] : 'How are you feeling?'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Tap to {h.mood ? 'update' : 'log'} your mood</div>
        </div>
      </GlassCard>

      {/* loggers */}
      <GlassCard className="divide-y divide-border/50">
        <Scale label="Mood" emoji="😊" value={h.mood} onChange={(v) => set({ mood: v })} />
        <Scale label="Energy" emoji="⚡" value={h.energy} onChange={(v) => set({ energy: v })} />
        <Stepper label="Sleep" emoji="😴" value={h.sleepHours} onChange={(v) => set({ sleepHours: v })} step={0.5} max={14} unit="h" />
        <Scale label="Sleep quality" emoji="🌙" value={h.sleepQuality} onChange={(v) => set({ sleepQuality: v })} />
        <Stepper label="Water" emoji="💧" value={h.water} onChange={(v) => set({ water: v })} max={20} unit="/8" />
        {isGoogleConnected && (
          <>
            <SyncedStat label="Steps" emoji="👟" value={h.steps ?? 0} />
            <SyncedStat label="Calories" emoji="🔥" value={h.calories ?? 0} unit="kcal" />
          </>
        )}
        <Stepper label="Weight" emoji="⚖️" value={h.weight ?? 0} onChange={(v) => set({ weight: v })} step={0.1} max={300} unit="kg" />
      </GlassCard>

      {!isGoogleConnected && (
        <GlassCard className="mt-4 border-dashed border-primary/30 p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👟</span>
            <div>
              <div className="text-sm font-semibold">Track Steps & Calories Automatically</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Go to <strong>Settings → Integrations</strong> and connect your Google account to sync fitness data.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* charts */}
      <SectionTitle>😊 Mood & energy trends</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="moodG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 5]} hide />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="mood" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#moodG)" />
            <Area type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      <SectionTitle>😴 Sleep (hours)</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData}>
            <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 10]} hide />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="sleep" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {isGoogleConnected && (
        <>
          <SectionTitle>👟 Steps</SectionTitle>
          <GlassCard>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="steps" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </>
      )}

      <SectionTitle>⚖️ Weight (kg)</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={chartData}>
            <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="weight" stroke="#ec4899" strokeWidth={2.5} fill="#ec489922" />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* mood quick dialog */}
      <Dialog open={moodOpen} onOpenChange={setMoodOpen}>
        <DialogContent className="glass-strong rounded-3xl max-w-xs text-center">
          <DialogTitle className="text-xl font-bold">How do you feel?</DialogTitle>
          <div className="flex justify-center gap-2 my-6">
            {MOODS.map((m, i) => (
              <button key={i} onClick={() => { set({ mood: i + 1 }); setMoodOpen(false); }}
                className={cn('text-4xl p-2 rounded-2xl press transition-all', h.mood === i + 1 && 'scale-125')}
                style={h.mood === i + 1 ? { backgroundColor: moodColor[i] + '33' } : undefined}>
                {m}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Your mood helps the AI assistant spot patterns.</p>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
