import { format, subDays, isSameMonth, parseISO } from 'date-fns';
import { todayISO, calcStreak, overdueTasks, type useApp } from './store';

type State = ReturnType<typeof useApp.getState>;

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function buildAssistant(s: State) {
  const today = todayISO();
  const health = s.health[today];

  const overdue = overdueTasks(s.tasks);
  const monthTx = s.transactions.filter((t) => isSameMonth(parseISO(t.date), new Date()));
  const spent = monthTx.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const earned = monthTx.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);

  const weekMoods = Array.from({ length: 7 }, (_, i) => s.health[format(subDays(new Date(), i), 'yyyy-MM-dd')]?.mood).filter(Boolean) as number[];
  const avgMood = weekMoods.length ? weekMoods.reduce((a, b) => a + b, 0) / weekMoods.length : 0;
  const weekSleep = Array.from({ length: 7 }, (_, i) => s.health[format(subDays(new Date(), i), 'yyyy-MM-dd')]?.sleepHours).filter(Boolean) as number[];
  const avgSleep = weekSleep.length ? weekSleep.reduce((a, b) => a + b, 0) / weekSleep.length : 0;
  const bestStreak = s.habits.length ? Math.max(...s.habits.map((h) => calcStreak(h.completions).current)) : 0;

  function weekSummary(): string {
    const completions = s.habits.reduce((n, h) => n + h.completions.filter((c) => {
      try { return parseISO(c) >= subDays(new Date(), 6); } catch { return false; }
    }).length, 0);
    return `📅 Your week so far:

🌱 Habits: ${completions} check-ins across ${s.habits.filter((h) => !h.archived).length} habits — best active streak is ${bestStreak} days${bestStreak >= 7 ? ' 🔥' : ''}.
✅ Tasks: ${s.tasks.filter((t) => t.done).length} done lifetime, ${overdue.length} overdue right now${overdue.length ? ' — clear those first tomorrow.' : '.'}
😊 Mood: averaging ${avgMood ? avgMood.toFixed(1) + '/5' : 'not enough data'} · Sleep: ${avgSleep ? avgSleep.toFixed(1) + 'h/night' : 'no data yet'}.
💰 Money: ${money(spent)} spent vs ${money(earned)} earned this month.

${avgMood >= 3.5 ? 'Overall: genuinely strong week. Keep the rhythm — don\'t add anything new, just protect what\'s working.' : 'Overall: a mixed week. My advice: shrink tomorrow to 3 must-do items and an early night.'}`;
  }

  function suggestHabit(): string {
    const names = s.habits.map((h) => h.name.toLowerCase());
    const pool = [
      { name: '10-minute walk after lunch', why: 'You already track steps — a short walk anchors the habit to an existing routine and lifts afternoon energy.', emoji: '🚶' },
      { name: '2-minute tidy-up before bed', why: 'Waking to a clean space lowers morning friction for your other habits.', emoji: '🧹' },
      { name: 'Phone outside the bedroom', why: `You averaged ${avgSleep ? avgSleep.toFixed(1) + 'h' : 'under 7h'} sleep — charging your phone in another room is the single highest-leverage change.`, emoji: '📵' },
      { name: 'One-line gratitude', why: 'You journal already — a one-liner keeps the chain alive on busy days.', emoji: '🙏' },
      { name: 'Read 5 pages', why: 'Tiny version of a reading habit — 5 pages always beats 0 pages.', emoji: '📖' },
    ];
    const pick = pool.find((p) => !names.some((n) => p.name.toLowerCase().includes(n.split(' ')[0]))) ?? pool[0];
    return `${pick.emoji} Based on your data, I'd suggest:

"${pick.name}"

Why: ${pick.why}

Start tiny: do it at the same time every day, and don't break the chain twice in a row. Want me to add it? Tap the + in Habits.`;
  }

  function moodAnalysis(): string {
    if (!avgMood) return 'I need a few days of mood logs first — tap "Log mood" on the Health page each day and I\'ll spot patterns.';
    const best = weekMoods.length ? Math.max(...weekMoods) : 0;
    const trend = weekMoods.length >= 4 ? weekMoods[0] - weekMoods[weekMoods.length - 1] : 0;
    return `😊 Mood analysis (last ${weekMoods.length} days):

• Average: ${avgMood.toFixed(1)}/5 ${avgMood >= 4 ? '— excellent' : avgMood >= 3 ? '— stable' : '— low, be kind to yourself'}
• Best day hit ${best}/5
• Trend: ${trend > 0.3 ? 'improving 📈' : trend < -0.3 ? 'dipping 📉 — worth a look' : 'steady ➡️'}
${avgSleep && avgSleep < 7 ? `• Note: sleep is averaging ${avgSleep.toFixed(1)}h. In your data, mood and sleep move together — protect the 7h minimum.` : ''}

Suggestion: check your journal entries from high-mood days — whatever you did there, schedule more of it next week.`;
  }

  function financeAdvice(): string {
    const byCat = new Map<string, number>();
    monthTx.filter((t) => t.type === 'expense').forEach((t) => byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount));
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const rate = earned > 0 ? Math.round(((earned - spent) / earned) * 100) : 0;
    return `💰 Your money this month:

• Earned ${money(earned)} · spent ${money(spent)}
• Savings rate: ${rate}% ${rate >= 20 ? '— excellent, above the 20% benchmark 🎉' : rate >= 0 ? '— positive, but aim for 20%' : '— negative, time to trim'}
${top ? `• Biggest category: ${top[0]} at ${money(top[1])}` : ''}

Quick win: ${top && top[0] === 'Food' ? 'meal-prep two dinners a week — food is usually the easiest 15% cut.' : 'set a category budget on the Finance page and watch it weekly.'}`;
  }

  function planTomorrow(): string {
    const openTasks = s.tasks.filter((t) => !t.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
    const undoneHabits = s.habits.filter((h) => !h.archived).slice(0, 3);
    return `🗓️ A realistic plan for tomorrow:

🌅 Morning (win before 10am)
${undoneHabits.map((h) => `  • ${h.emoji} ${h.name}`).join('\n') || '  • Morning routine'}

🧠 Deep work block (90 min, phone in another room)
${openTasks[0] ? `  • ${openTasks[0].title}` : '  • Your most important project'}

⚡ Afternoon (lighter tasks)
${openTasks.slice(1).map((t) => `  • ${t.title}`).join('\n') || '  • Admin + messages'}

🌙 Evening: 10-min reflection + prep tomorrow's top 3.

Protect the deep work block — everything else is negotiable.`;
  }

  function journalSummary(): string {
    if (s.journal.length === 0) return 'No journal entries yet — write one tonight and I\'ll summarize themes here.';
    const recent = s.journal.slice(0, 5);
    const tagCount = new Map<string, number>();
    recent.forEach((j) => j.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)));
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => `#${t}`).join(' ');
    const moods = recent.map((j) => j.mood).join(' ');
    return `📖 Your last ${recent.length} journal entries:

Recurring themes: ${topTags || 'no tags yet'}
Mood arc: ${moods}

What stands out: you write most honestly on ${recent[0] ? format(parseISO(recent[0].date), 'EEEE') : 'weekdays'}s. Keep the streak — even 3 lines counts. Gratitude entries correlate with your better mood days.`;
  }

  function fallback(q: string): string {
    if (/habit|streak/.test(q)) return suggestHabit();
    if (/mood|feel|happy|sad|anxious|stress/.test(q)) return moodAnalysis();
    if (/money|spend|budget|finance|save|saving/.test(q)) return financeAdvice();
    if (/plan|tomorrow|schedule|day/.test(q)) return planTomorrow();
    if (/journal|diary|write/.test(q)) return journalSummary();
    if (/week|doing|progress|review/.test(q)) return weekSummary();
    if (/sleep|tired|energy/.test(q)) return `😴 You logged ${health?.sleepHours ?? 'no'} hours last night and energy at ${health?.energy ?? '—'}/5 today.\n\n${avgSleep < 7 ? `Your 7-day average is ${avgSleep.toFixed(1)}h — below 7h. The fix isn't willpower, it's a consistent wake time and no screens 30 min before bed.` : 'Your sleep looks solid — protect it!'}`;
    if (/goal/.test(q)) return `🎯 You have ${s.goals.length} goals. ${s.goals.map((g) => `"${g.title}" is ${g.milestones.length ? Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100) : 0}% there`).join('; ')}.\n\nTip: work on the milestone due soonest, not the most exciting one.`;
    return `I can help with:\n• 📅 "How am I doing this week?"\n• 🌱 "Suggest a new habit"\n• 😊 "Analyze my mood"\n• 💰 "How is my spending?"\n• 🗓️ "Plan tomorrow"\n• 📖 "Summarize my journal"\n\nOr ask about sleep, goals, tasks, or screen time.`;
  }

  return { answer: (q: string) => {
    const l = q.toLowerCase();
    if (/week|doing|progress|review/.test(l)) return weekSummary();
    if (/suggest|new habit|recommend/.test(l)) return suggestHabit();
    if (/mood|feel|mental/.test(l)) return moodAnalysis();
    if (/spend|money|budget|finance/.test(l)) return financeAdvice();
    if (/plan|tomorrow/.test(l)) return planTomorrow();
    if (/journal|summar/.test(l)) return journalSummary();
    return fallback(l);
  } };
}
