import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Smartphone, Bell, Unlock, Timer } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle, fmtMins } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';

const APP_COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export default function ScreenTime() {
  const { screenTime } = useApp();
  const today = todayISO();
  const t = screenTime[today];

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    return { day: format(subDays(new Date(), 6 - i), 'EEE'), mins: screenTime[d]?.minutes ?? 0 };
  }), [screenTime]);

  const weekAvg = Math.round(week.reduce((a, b) => a + b.mins, 0) / 7);
  const weeklyTotal = week.reduce((a, b) => a + b.mins, 0);

  const detox = useMemo(() => {
    const tips: string[] = [];
    if (weekAvg > 300) tips.push('🚨 Your daily average is over 5 hours. Try app timers on your top 2 apps.');
    if (weekAvg > 240) tips.push('⏰ Set a "no phone after 9pm" rule — your sleep data will thank you.');
    if ((t?.unlocks ?? 0) > 80) tips.push(`🔓 ${t?.unlocks} unlocks today — try keeping your phone in another room during focus blocks.`);
    tips.push('🌿 Schedule a 2-hour digital sunset before bed.');
    tips.push('📵 Turn off non-essential notifications — every buzz costs ~23 minutes of refocus time.');
    tips.push('🎯 Replace one scrolling session with a 10-minute walk today.');
    return tips.slice(0, 4);
  }, [weekAvg, t]);

  return (
    <Page>
      <PageHeader title="Screen Time" subtitle="Awareness is the first step to balance" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { icon: Smartphone, label: 'Today', value: t ? fmtMins(t.minutes) : '—', color: '#8b5cf6' },
          { icon: Timer, label: 'Daily avg (7d)', value: fmtMins(weekAvg), color: '#3b82f6' },
          { icon: Unlock, label: 'Unlocks', value: String(t?.unlocks ?? 0), color: '#f59e0b' },
          { icon: Bell, label: 'Notifications', value: String(t?.notifications ?? 0), color: '#ec4899' },
        ].map((c) => (
          <GlassCard key={c.label} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: c.color + '22' }}>
              <c.icon className="w-5 h-5" style={{ color: c.color }} />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">{c.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{c.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <SectionTitle>📊 This week · {fmtMins(weeklyTotal)} total</SectionTitle>
      <GlassCard>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={week}>
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => fmtMins(Number(v))} />
            <Bar dataKey="mins" radius={[6, 6, 0, 0]}>
              {week.map((d, i) => <Cell key={i} fill={d.mins > 300 ? '#ef4444' : 'hsl(var(--primary))'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <SectionTitle>📱 App usage today</SectionTitle>
      <GlassCard className="space-y-3">
        {(t?.apps ?? []).map((a, i) => (
          <div key={a.name}>
            <div className="flex items-center gap-2 text-sm mb-1">
              <span>{a.emoji}</span>
              <span className="flex-1 font-medium">{a.name}</span>
              <span className="text-muted-foreground text-xs">{fmtMins(a.minutes)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(a.minutes / (t?.minutes ?? 1)) * 100}%`, backgroundColor: APP_COLORS[i % APP_COLORS.length] }} />
            </div>
          </div>
        ))}
        {!t && <p className="text-sm text-muted-foreground text-center py-2">No data for today yet.</p>}
      </GlassCard>

      <SectionTitle>🌿 Digital detox suggestions</SectionTitle>
      <div className="space-y-2.5">
        {detox.map((d, i) => <GlassCard key={i} className="text-sm leading-relaxed">{d}</GlassCard>)}
      </div>
    </Page>
  );
}
