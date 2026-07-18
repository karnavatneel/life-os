import { useMemo } from 'react';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { useNavigate } from 'react-router';
import { Page, PageHeader, GlassCard, SectionTitle, Ring, fmtMoney, fmtMins } from '@/components/shared';
import { useApp, calcStreak } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function WeeklyReview() {
  const s = useApp();
  const nav = useNavigate();

  const data = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 6);
    const inWeek = (d: string) => { try { return isWithinInterval(parseISO(d), { start, end }); } catch { return false; } };
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(end, i), 'yyyy-MM-dd'));

    const habitCompletions = s.habits.reduce((n, h) => n + h.completions.filter(inWeek).length, 0);
    const habitPossible = s.habits.filter((h) => !h.archived).length * 7;
    const tasksDone = s.tasks.filter((t) => t.completedAt && inWeek(t.completedAt)).length;
    const focusMins = s.focusSessions.filter((f) => f.kind === 'focus' && inWeek(f.date)).reduce((a, b) => a + b.minutes, 0);
    const moods = days.map((d) => s.health[d]?.mood).filter(Boolean) as number[];
    const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    const sleep = days.map((d) => s.health[d]?.sleepHours).filter(Boolean) as number[];
    const avgSleep = sleep.length ? sleep.reduce((a, b) => a + b, 0) / sleep.length : 0;
    const spent = s.transactions.filter((t) => t.type === 'expense' && inWeek(t.date)).reduce((a, b) => a + b.amount, 0);
    const earned = s.transactions.filter((t) => t.type === 'income' && inWeek(t.date)).reduce((a, b) => a + b.amount, 0);
    const studyMins = days.reduce((a, d) => a + (s.studyLog[d] ?? 0), 0);
    const screen = days.reduce((a, d) => a + (s.screenTime[d]?.minutes ?? 0), 0);
    const bestStreak = s.habits.length ? Math.max(...s.habits.map((h) => calcStreak(h.completions).current)) : 0;
    const goalsProgress = s.goals.map((g) => ({ title: g.title, pct: g.milestones.length ? Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100) : 0 }));
    return { habitCompletions, habitPossible, tasksDone, focusMins, avgMood, avgSleep, spent, earned, studyMins, screen, bestStreak, goalsProgress };
  }, [s]);

  const insights: string[] = [];
  if (data.habitPossible > 0) {
    const pct = Math.round((data.habitCompletions / data.habitPossible) * 100);
    insights.push(pct >= 80 ? `🔥 Outstanding week — you hit ${pct}% of your habit check-ins. Keep the chain alive!` : pct >= 50 ? `💪 Solid consistency at ${pct}% habit completion. One more push on weekends would level you up.` : `🌱 Habit completion was ${pct}%. Try shrinking your habits — 2 minutes counts.`);
  }
  if (data.avgSleep > 0) insights.push(data.avgSleep >= 7 ? `😴 Great sleep discipline — ${data.avgSleep.toFixed(1)}h average. Your mood data thanks you.` : `😴 You averaged ${data.avgSleep.toFixed(1)}h of sleep. Aim for 7h+ — it's the highest-leverage habit you have.`);
  if (data.avgMood > 0) insights.push(data.avgMood >= 3.5 ? `😊 Your mood averaged ${data.avgMood.toFixed(1)}/5 — a genuinely good week emotionally.` : `🫂 Mood averaged ${data.avgMood.toFixed(1)}/5. Notice what drained you and plan one joy-giving activity next week.`);
  if (data.focusMins > 0) insights.push(`🧠 ${fmtMins(data.focusMins)} of deep work this week — that's real output.`);
  if (data.spent > 0) insights.push(`💰 You spent ${fmtMoney(data.spent)}${data.earned > 0 ? ` against ${fmtMoney(data.earned)} earned` : ''}. ${data.earned - data.spent >= 0 ? 'You stayed cash-flow positive — nice.' : 'Consider a no-spend day next week.'}`);
  if (data.screen > 0) insights.push(`📱 Screen time totaled ${fmtMins(data.screen)} (${fmtMins(Math.round(data.screen / 7))}/day). ${data.screen / 7 > 240 ? 'Try a 1-hour phone-free block each evening.' : 'That\'s a healthy balance.'}`);

  const cards = [
    { label: 'Habits', value: `${data.habitCompletions}/${data.habitPossible}`, emoji: '🌱' },
    { label: 'Tasks done', value: String(data.tasksDone), emoji: '✅' },
    { label: 'Focus', value: fmtMins(data.focusMins), emoji: '🍅' },
    { label: 'Avg mood', value: data.avgMood ? `${data.avgMood.toFixed(1)}/5` : '—', emoji: '😊' },
    { label: 'Avg sleep', value: data.avgSleep ? `${data.avgSleep.toFixed(1)}h` : '—', emoji: '😴' },
    { label: 'Study', value: fmtMins(data.studyMins), emoji: '📚' },
    { label: 'Spent', value: fmtMoney(data.spent), emoji: '💸' },
    { label: 'Screen', value: fmtMins(data.screen), emoji: '📱' },
  ];

  return (
    <Page>
      <PageHeader title="Weekly Review" subtitle={`${format(subDays(new Date(), 6), 'MMM d')} — ${format(new Date(), 'MMM d, yyyy')}`} />

      {/* score */}
      <GlassCard className="flex items-center gap-5 mb-5 accent-gradient-soft">
        <Ring value={data.habitPossible ? (data.habitCompletions / data.habitPossible) * 100 : 0} size={92} stroke={9}>
          <div className="text-center">
            <div className="text-xl font-bold">{data.habitPossible ? Math.round((data.habitCompletions / data.habitPossible) * 100) : 0}%</div>
          </div>
        </Ring>
        <div>
          <div className="font-bold text-lg">Your week at a glance</div>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Best active streak: {data.bestStreak} days 🔥<br />
            {data.tasksDone} tasks crushed · {fmtMins(data.focusMins)} focused
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-4 gap-2.5 mb-2">
        {cards.map((c) => (
          <GlassCard key={c.label} className="!p-3 text-center">
            <div className="text-lg">{c.emoji}</div>
            <div className="text-sm font-bold mt-1 truncate">{c.value}</div>
            <div className="text-[9px] text-muted-foreground">{c.label}</div>
          </GlassCard>
        ))}
      </div>

      <SectionTitle>🎯 Goal progress</SectionTitle>
      <GlassCard className="space-y-3">
        {data.goalsProgress.length === 0 && <p className="text-sm text-muted-foreground text-center py-1">No goals yet — set some to track here.</p>}
        {data.goalsProgress.map((g) => (
          <div key={g.title}>
            <div className="flex justify-between text-xs mb-1"><span className="font-medium truncate">{g.title}</span><span className="text-muted-foreground">{g.pct}%</span></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full accent-gradient" style={{ width: `${g.pct}%` }} /></div>
          </div>
        ))}
      </GlassCard>

      <SectionTitle>✨ AI insights</SectionTitle>
      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <GlassCard key={i} className="text-sm leading-relaxed">{ins}</GlassCard>
        ))}
      </div>

      <Button onClick={() => nav('/reflection')} className="w-full h-13 mt-6 py-4 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">
        Plan next week →
      </Button>
    </Page>
  );
}
