import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { format, isSameMonth, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { ChevronRight, Flame, Droplets, Footprints, BedDouble, Zap, Smile, Mail, Wifi, Play, Pause } from 'lucide-react';
import { Page, GlassCard, SectionTitle, Ring } from '@/components/shared';
import { useApp, todayISO, calcStreak, isHabitDueToday, todayTasks, levelFromXP, emptyHealth } from '@/lib/store';
import { fmtMoney } from '@/components/shared';
import { useIntegrations, spotifyControl, fetchSpotifyNowPlaying } from '@/lib/integrations';
import { toast } from 'sonner';

const QUOTES = [
  'Small steps every day add up to big results.',
  'Discipline is choosing what you want most over what you want now.',
  "You don't have to be extreme, just consistent.",
  'The best time to start was yesterday. The next best time is now.',
  'Focus on progress, not perfection.',
  'Your future is created by what you do today.',
  'Done is better than perfect.',
  'Success is the sum of small efforts repeated day in and day out.',
  'The secret of getting ahead is getting started.',
  "Great things never come from comfort zones.",
];

const MOOD = ['😞', '😕', '😐', '🙂', '😄'];

export default function Dashboard() {
  const nav = useNavigate();
  const s = useApp();
  const int = useIntegrations();
  const [now, setNow] = useState(new Date());

  async function handlePlayPause(e: React.MouseEvent) {
    e.stopPropagation();
    if (!int.spotifyTokens || !int.spotifyTrack) return;
    try {
      await spotifyControl(int.spotifyTrack.isPlaying ? 'pause' : 'play', int.spotifyTokens);
      const track = await fetchSpotifyNowPlaying(int.spotifyTokens);
      int.setSpotifyTrack(track);
    } catch (err: any) {
      if (err.message === 'Premium Required') {
        toast.error('Spotify Premium is required for player controls');
      } else {
        toast.error('Make sure Spotify is active on your device');
      }
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = todayISO();
  const health = s.health[today] ?? emptyHealth();
  const dueHabits = s.habits.filter(isHabitDueToday);
  const doneHabits = dueHabits.filter((h) => h.completions.includes(today));
  const habitPct = dueHabits.length ? (doneHabits.length / dueHabits.length) * 100 : 0;

  const streaks = s.habits.map((h) => calcStreak(h.completions));
  const currentStreak = streaks.length ? Math.max(...streaks.map((x) => x.current)) : 0;
  const longestStreak = streaks.length ? Math.max(...streaks.map((x) => x.best)) : 0;

  const tTasks = todayTasks(s.tasks);
  const tEvents = s.events.filter((e) => e.date === today);
  const focusToday = s.focusSessions.filter((f) => f.date === today && f.kind === 'focus').reduce((a, b) => a + b.minutes, 0);

  const monthTx = s.transactions.filter((t) => isSameMonth(parseISO(t.date), new Date()));
  const spentToday = s.transactions.filter((t) => t.type === 'expense' && t.date === today).reduce((a, b) => a + b.amount, 0);
  const spentMonth = monthTx.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const budgetTotal = s.budgets.reduce((a, b) => a + b.limit, 0);

  const studyToday = s.studyLog[today] ?? 0;
  const studyStreak = useMemo(() => {
    let n = 0; const d = new Date();
    while ((s.studyLog[format(d, 'yyyy-MM-dd')] ?? 0) > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [s.studyLog]);

  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const hour = now.getHours();
  const greeting = hour < 5 ? 'Night owl 🦉' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Winding down';
  const lvl = levelFromXP(s.xp);

  const weather = int.weather;
  const track = int.spotifyTrack;
  const unreadEmails = int.gmailMessages.filter((m) => m.unread).length;
  const isGoogleConnected = !!int.googleTokens && int.googleTokens.expires_at > Date.now();
  const isSpotifyConnected = !!int.spotifyTokens && int.spotifyTokens.expires_at > Date.now();

  return (
    <Page>
      {/* header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
            {format(now, 'EEEE, MMMM d')} · <span className="font-mono">{format(now, 'h:mm:ss a')}</span>
          </motion.p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
            {greeting}, <span className="text-gradient">{s.profile.name.split(' ')[0]}</span>
          </h1>
        </div>
        <button onClick={() => nav('/settings')} className="press">
          <div className="w-11 h-11 rounded-2xl overflow-hidden accent-gradient flex items-center justify-center text-xl shadow-glow">
            {s.profile.avatarUrl ? <img src={s.profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : s.profile.avatarEmoji}
          </div>
        </button>
      </div>

      {/* weather + quote */}
      <GlassCard className="flex items-center gap-4 overflow-hidden relative">
        <div className="absolute inset-0 accent-gradient-soft -z-0 rounded-3xl" />
        <div className="relative text-4xl">{weather?.emoji ?? '🌤️'}</div>
        <div className="relative flex-1 min-w-0">
          <div className="font-semibold">
            {weather ? `${weather.temp}°C · ${weather.desc}` : 'Loading weather…'}
            {weather && <span className="text-xs text-muted-foreground ml-2">{weather.city}</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">"{quote}"</div>
        </div>
        <div className="relative text-right shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Level</div>
          <div className="text-xl font-bold text-gradient">{lvl}</div>
          <div className="text-[10px] text-muted-foreground">{s.xp} XP</div>
        </div>
      </GlassCard>

      {/* Spotify mini widget */}
      {isSpotifyConnected && track && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
          <GlassCard className="flex items-center gap-3 py-3" onClick={() => nav('/integrations')}>
            <div className="relative shrink-0">
              {track.albumArt ? (
                <img src={track.albumArt} alt="album" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#1DB954]/20 flex items-center justify-center">🎵</div>
              )}
              {track.isPlaying && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#1DB954] flex items-center justify-center">
                  <div className="flex gap-[1px] items-end h-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-[2px] bg-black rounded-full animate-bounce" style={{ animationDelay: `${i * 0.12}s`, height: `${[40, 100, 65][i-1]}%` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#1DB954] font-medium">{track.isPlaying ? '▶ PLAYING' : '⏸ PAUSED'}</div>
              <div className="text-sm font-semibold truncate">{track.name}</div>
              <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
            </div>
            <button onClick={handlePlayPause} className="p-2 rounded-full hover:bg-muted text-[#1DB954] hover:text-[#1aa34a] transition-colors press" aria-label="Toggle playback">
              {track.isPlaying ? <Pause className="w-4 h-4 fill-[#1DB954]" /> : <Play className="w-4 h-4 fill-[#1DB954]" />}
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* Google mini badges */}
      {isGoogleConnected && (
        <div className="flex gap-2 mt-3">
          {unreadEmails > 0 && (
            <a href="https://mail.google.com/mail/u/0/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-medium press">
              <Mail className="w-3.5 h-3.5 text-red-400" />
              {unreadEmails} unread
            </a>
          )}
          {int.googleCalendarEvents.length > 0 && (
            <a href="https://calendar.google.com/calendar/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-xs font-medium press">
              📅 {int.googleCalendarEvents[0].summary.slice(0, 18)}{int.googleCalendarEvents[0].summary.length > 18 ? '…' : ''}
            </a>
          )}
        </div>
      )}

      {/* health snapshot */}
      <SectionTitle right={<button onClick={() => nav('/health')} className="text-xs text-primary font-medium flex items-center press">See all <ChevronRight className="w-3.5 h-3.5" /></button>}>
        ❤️ Health
      </SectionTitle>
      <GlassCard onClick={() => nav('/health')}>
        <div className="grid grid-cols-3 gap-y-4 gap-x-2">
          {[
            { icon: Smile, label: 'Mood', value: health.mood ? MOOD[health.mood - 1] : '—', color: '#f59e0b' },
            { icon: Zap, label: 'Energy', value: health.energy ? `${health.energy}/5` : '—', color: '#eab308' },
            { icon: BedDouble, label: 'Sleep', value: health.sleepHours ? `${health.sleepHours}h` : '—', color: '#8b5cf6' },
            { icon: Droplets, label: 'Water', value: `${health.water}/8`, color: '#3b82f6' },
            { icon: Footprints, label: 'Steps', value: health.steps ? health.steps.toLocaleString() : '—', color: '#10b981' },
            { icon: Flame, label: 'Calories', value: health.calories ? `${health.calories}` : '—', color: '#ef4444' },
          ].map((it) => (
            <div key={it.label} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: it.color + '22' }}>
                <it.icon className="w-4 h-4" style={{ color: it.color }} />
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">{it.label}</div>
                <div className="text-sm font-semibold">{it.value}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* productivity */}
      <SectionTitle right={<button onClick={() => nav('/habits')} className="text-xs text-primary font-medium flex items-center press">Habits <ChevronRight className="w-3.5 h-3.5" /></button>}>
        ⚡ Productivity
      </SectionTitle>
      <GlassCard className="flex items-center gap-5">
        <Ring value={habitPct} size={84} stroke={8}>
          <div className="text-center">
            <div className="text-lg font-bold">{doneHabits.length}/{dueHabits.length}</div>
          </div>
        </Ring>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> Streak</div>
            <div className="font-bold">{currentStreak} days</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Best</div>
            <div className="font-bold">{longestStreak} days</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Tasks today</div>
            <div className="font-bold">{tTasks.length} open</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">Focus</div>
            <div className="font-bold">{focusToday} min</div>
          </div>
        </div>
      </GlassCard>

      {/* today's plan */}
      <SectionTitle right={<button onClick={() => nav('/planner')} className="text-xs text-primary font-medium flex items-center press">Planner <ChevronRight className="w-3.5 h-3.5" /></button>}>
        🗓️ Today's plan
      </SectionTitle>
      <GlassCard className="space-y-2.5">
        {[...tEvents.map((e) => ({ time: e.start, label: e.title, emoji: '📅', to: '/calendar' })),
          ...tTasks.slice(0, 3).map((t) => ({ time: t.dueTime || 'Anytime', label: t.title, emoji: '✅', to: '/tasks' })),
          ...dueHabits.filter((h) => !h.completions.includes(today)).slice(0, 3).map((h) => ({ time: h.reminder || 'Anytime', label: h.name, emoji: h.emoji, to: '/habits' })),
        ].slice(0, 5).map((it, i) => (
          <button key={i} onClick={() => nav(it.to)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 press text-left">
            <span className="text-lg">{it.emoji}</span>
            <span className="text-sm font-medium flex-1 truncate">{it.label}</span>
            <span className="text-xs text-muted-foreground">{it.time}</span>
          </button>
        ))}
        {tTasks.length === 0 && tEvents.length === 0 && doneHabits.length === dueHabits.length && (
          <p className="text-sm text-muted-foreground text-center py-2">All clear — enjoy your day ✨</p>
        )}
      </GlassCard>

      {/* finance + learning */}
      <div className="grid grid-cols-2 gap-3 mt-7">
        <GlassCard onClick={() => nav('/finance')}>
          <div className="text-xs text-muted-foreground mb-1">💰 Spent today</div>
          <div className="text-xl font-bold">{fmtMoney(spentToday)}</div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full accent-gradient" initial={{ width: 0 }} animate={{ width: `${Math.min(100, budgetTotal ? (spentMonth / budgetTotal) * 100 : 0)}%` }} transition={{ duration: 0.8 }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1.5">{fmtMoney(Math.max(0, budgetTotal - spentMonth))} of {fmtMoney(budgetTotal)} left</div>
        </GlassCard>
        <GlassCard onClick={() => nav('/learning')}>
          <div className="text-xs text-muted-foreground mb-1">🎓 Study time</div>
          <div className="text-xl font-bold">{studyToday} min</div>
          <div className="text-[10px] text-muted-foreground mt-2">Learning streak</div>
          <div className="text-sm font-semibold flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-500" /> {studyStreak} days</div>
        </GlassCard>
      </div>

      {/* Connect integrations prompt if not connected */}
      {!isGoogleConnected && !isSpotifyConnected && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4">
          <GlassCard onClick={() => nav('/integrations')} className="flex items-center gap-3 border-2 border-dashed border-primary/30">
            <div className="w-10 h-10 rounded-2xl accent-gradient-soft flex items-center justify-center text-xl">🔗</div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Connect Google & Spotify</div>
              <div className="text-xs text-muted-foreground">See your emails, calendar & music here</div>
            </div>
            <Wifi className="w-4 h-4 text-primary" />
          </GlassCard>
        </motion.div>
      )}

      {/* recent activity */}
      <SectionTitle>🕘 Recent activity</SectionTitle>
      <GlassCard className="space-y-1">
        {s.activity.slice(0, 6).map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 p-2">
            <span className="text-lg">{a.emoji}</span>
            <span className="text-sm flex-1">{a.text}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{format(a.ts, 'h:mm a')}</span>
          </motion.div>
        ))}
      </GlassCard>
    </Page>
  );
}
