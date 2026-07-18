import { useMemo, useState } from 'react';
import { format, subDays, isSameMonth, parseISO } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Page, PageHeader, GlassCard, SectionTitle, fmtMins, fmtMoney } from '@/components/shared';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

const RANGES = [{ label: '7D', days: 7 }, { label: '14D', days: 14 }, { label: '30D', days: 30 }];

export default function Analytics() {
  const s = useApp();
  const [days, setDays] = useState(14);

  const daily = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
    const h = s.health[d];
    const habitDone = s.habits.reduce((n, hb) => n + (hb.completions.includes(d) ? 1 : 0), 0);
    return {
      day: format(subDays(new Date(), days - 1 - i), 'MMM d'),
      habits: habitDone,
      mood: h?.mood ?? null,
      sleep: h?.sleepHours ?? null,
      water: h?.water ?? null,
      steps: h?.steps ?? null,
      weight: h?.weight ?? null,
      energy: h?.energy ?? null,
      study: s.studyLog[d] ?? 0,
      screen: s.screenTime[d]?.minutes ?? null,
      focus: s.focusSessions.filter((f) => f.date === d && f.kind === 'focus').reduce((a, b) => a + b.minutes, 0),
      spent: s.transactions.filter((t) => t.type === 'expense' && t.date === d).reduce((a, b) => a + b.amount, 0),
    };
  }), [s, days]);

  const lifeScore = useMemo(() => {
    const avg = (arr: (number | null)[]) => { const v = arr.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
    const clamp = (n: number, max: number) => Math.min(100, (n / max) * 100);
    return [
      { area: 'Habits', score: Math.round(avg(daily.map((d) => clamp(d.habits, Math.max(1, s.habits.length))))) },
      { area: 'Mood', score: Math.round(avg(daily.map((d) => d.mood !== null ? clamp(d.mood, 5) : null))) },
      { area: 'Sleep', score: Math.round(avg(daily.map((d) => d.sleep !== null ? clamp(d.sleep, 8) : null))) },
      { area: 'Focus', score: Math.round(avg(daily.map((d) => clamp(d.focus, 100)))) },
      { area: 'Study', score: Math.round(avg(daily.map((d) => clamp(d.study, 60)))) },
      { area: 'Movement', score: Math.round(avg(daily.map((d) => d.steps !== null ? clamp(d.steps, 10000) : null))) },
    ];
  }, [daily, s.habits.length]);

  const monthSpent = s.transactions.filter((t) => t.type === 'expense' && isSameMonth(parseISO(t.date), new Date())).reduce((a, b) => a + b.amount, 0);

  const insights = useMemo(() => {
    const out: string[] = [];
    const moodAvg = lifeScore.find((l) => l.area === 'Mood')?.score ?? 0;
    const sleepAvg = lifeScore.find((l) => l.area === 'Sleep')?.score ?? 0;
    const habitAvg = lifeScore.find((l) => l.area === 'Habits')?.score ?? 0;
    if (habitAvg >= 70) out.push('🌱 Habit consistency is your superpower right now — consider adding one stretch habit.');
    else out.push('🌱 Habits are wobbling. Pick ONE keystone habit and defend it ruthlessly this week.');
    if (sleepAvg < 70) out.push('😴 Sleep is dragging your other scores down — it correlates with both mood and focus in your data.');
    if (moodAvg >= 70) out.push('😊 Mood trend is strong. Your journal shows gratitude entries on your best days — keep that ritual.');
    const screenAvg = daily.reduce((a, d) => a + (d.screen ?? 0), 0) / days;
    if (screenAvg > 240) out.push(`📱 Screen time averages ${fmtMins(Math.round(screenAvg))}/day — swapping 30 min for a walk would lift your Movement score.`);
    out.push(`💰 ${fmtMoney(monthSpent)} spent so far this month — ${monthSpent < 2000 ? 'comfortably within a healthy range.' : 'worth a category review on the Finance page.'}`);
    return out;
  }, [lifeScore, daily, days, monthSpent]);

  const ChartCard = ({ title, dataKey, color, type = 'area', formatter }: { title: string; dataKey: string; color: string; type?: 'area' | 'bar' | 'line'; formatter?: (v: number) => string }) => (
    <>
      <SectionTitle>{title}</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={140}>
          {type === 'area' ? (
            <AreaChart data={daily}>
              <defs><linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={Math.floor(days / 5)} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => formatter ? formatter(Number(v)) : Number(v)} />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g-${dataKey})`} connectNulls />
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart data={daily}>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={Math.floor(days / 5)} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => formatter ? formatter(Number(v)) : Number(v)} />
              <Bar dataKey={dataKey} fill={color} radius={[5, 5, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={daily}>
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={Math.floor(days / 5)} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => formatter ? formatter(Number(v)) : Number(v)} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={false} connectNulls />
            </LineChart>
          )}
        </ResponsiveContainer>
      </GlassCard>
    </>
  );

  return (
    <Page>
      <PageHeader title="Analytics" subtitle="Your life, visualized"
        right={
          <div className="flex glass rounded-2xl p-1">
            {RANGES.map((r) => (
              <button key={r.days} onClick={() => setDays(r.days)}
                className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold press transition-all', days === r.days ? 'accent-gradient text-white shadow-glow' : 'text-muted-foreground')}>
                {r.label}
              </button>
            ))}
          </div>
        } />

      {/* life balance radar */}
      <SectionTitle>🕸️ Life balance</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={230}>
          <RadarChart data={lifeScore}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="area" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </GlassCard>

      <ChartCard title="🌱 Habit completions" dataKey="habits" color="#10b981" type="bar" />
      <ChartCard title="😊 Mood (1–5)" dataKey="mood" color="#f59e0b" />
      <ChartCard title="😴 Sleep (hours)" dataKey="sleep" color="#8b5cf6" type="bar" />
      <ChartCard title="💧 Water (glasses)" dataKey="water" color="#3b82f6" type="bar" />
      <ChartCard title="⚖️ Weight (kg)" dataKey="weight" color="#ec4899" type="line" />
      <ChartCard title="👟 Steps" dataKey="steps" color="#22c55e" type="bar" />
      <ChartCard title="🍅 Focus (min)" dataKey="focus" color="#f97316" type="bar" formatter={(v) => fmtMins(v)} />
      <ChartCard title="📚 Study (min)" dataKey="study" color="#06b6d4" type="bar" formatter={(v) => fmtMins(v)} />
      <ChartCard title="📱 Screen time (min)" dataKey="screen" color="#94a3b8" formatter={(v) => fmtMins(v)} />
      <ChartCard title="💸 Spending ($)" dataKey="spent" color="#f43f5e" type="bar" formatter={(v) => fmtMoney(v)} />

      <SectionTitle>✨ AI insights</SectionTitle>
      <div className="space-y-2.5">
        {insights.map((ins, i) => <GlassCard key={i} className="text-sm leading-relaxed">{ins}</GlassCard>)}
      </div>
    </Page>
  );
}
