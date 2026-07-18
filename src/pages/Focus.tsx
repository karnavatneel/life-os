import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Moon, Brain } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import { cn } from '@/lib/utils';
import { fmtMins } from '@/components/shared';

const MODES = {
  focus: { label: 'Focus', mins: 25, icon: Brain, color: 'hsl(var(--primary))' },
  short: { label: 'Short break', mins: 5, icon: Coffee, color: '#10b981' },
  long: { label: 'Long break', mins: 15, icon: Moon, color: '#3b82f6' },
} as const;

type Mode = keyof typeof MODES;

export default function Focus() {
  const { focusSessions, addFocusSession, settings } = useApp();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.mins * 60);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const endRef = useRef<number>(0);

  useEffect(() => {
    if (params.get('start')) { setRunning(true); endRef.current = Date.now() + secondsLeft * 1000; setParams({}, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!running) return;
    endRef.current = Date.now() + secondsLeft * 1000;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(t);
        setRunning(false);
        complete();
      }
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const complete = () => {
    addFocusSession(MODES[mode].mins, mode);
    if (settings.notifications.tasks && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(mode === 'focus' ? '🍅 Focus complete!' : '⏰ Break over', { body: mode === 'focus' ? 'Nice work — take a breather.' : 'Ready for another round?' });
    }
    if (mode === 'focus') {
      const next = rounds + 1;
      setRounds(next);
      switchMode(next % 4 === 0 ? 'long' : 'short');
    } else {
      switchMode('focus');
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setRunning(false);
    setSecondsLeft(MODES[m].mins * 60);
  };

  const reset = () => { setRunning(false); setSecondsLeft(MODES[mode].mins * 60); };

  const total = MODES[mode].mins * 60;
  const pct = ((total - secondsLeft) / total) * 100;
  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const today = todayISO();
  const todayFocus = focusSessions.filter((f) => f.date === today && f.kind === 'focus');
  const todayMins = todayFocus.reduce((a, b) => a + b.minutes, 0);

  const size = 260;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;

  return (
    <Page>
      <PageHeader title="Focus Timer" subtitle="Pomodoro technique — deep work in sprints" />

      <div className="flex justify-center gap-2 mb-6">
        {(Object.keys(MODES) as Mode[]).map((m) => {
          const Icon = MODES[m].icon;
          return (
            <button key={m} onClick={() => switchMode(m)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium press transition-all',
                mode === m ? 'accent-gradient text-white shadow-glow' : 'glass text-muted-foreground')}>
              <Icon className="w-4 h-4" /> {MODES[m].label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={10} className="fill-none stroke-muted/50" />
            <motion.circle
              cx={size / 2} cy={size / 2} r={r} strokeWidth={10} strokeLinecap="round"
              stroke={MODES[mode].color}
              className="fill-none"
              strokeDasharray={c}
              animate={{ strokeDashoffset: c - (c * pct) / 100 }}
              transition={{ duration: 0.5 }}
              style={{ filter: 'drop-shadow(0 0 12px hsl(var(--primary) / 0.5))' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div key={`${mm}:${ss}`} className="text-6xl font-bold tabular-nums tracking-tight">
              {mm}:{ss}
            </motion.div>
            <div className="text-sm text-muted-foreground mt-1">{MODES[mode].label} · Round {rounds + 1}</div>
            <div className="flex gap-1.5 mt-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn('w-2.5 h-2.5 rounded-full transition-colors', i < rounds % 4 || (rounds > 0 && rounds % 4 === 0) ? 'accent-gradient' : 'bg-muted')} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8">
          <button onClick={reset} className="w-12 h-12 rounded-full glass flex items-center justify-center press"><RotateCcw className="w-5 h-5" /></button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setRunning(!running)}
            className="w-20 h-20 rounded-full accent-gradient text-white flex items-center justify-center shadow-glow press">
            {running ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </motion.button>
          <button onClick={complete} className="w-12 h-12 rounded-full glass flex items-center justify-center press text-xs font-bold">Skip</button>
        </div>
      </div>

      <SectionTitle>📊 Today</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-gradient">{todayFocus.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Sessions</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-gradient">{fmtMins(todayMins)}</div>
          <div className="text-xs text-muted-foreground mt-1">Deep work</div>
        </GlassCard>
      </div>

      <SectionTitle>🕘 Session history</SectionTitle>
      <GlassCard className="space-y-1">
        {focusSessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No sessions yet — press play and flow.</p>}
        {[...focusSessions].reverse().slice(0, 8).map((f) => (
          <div key={f.id} className="flex items-center gap-3 p-2">
            <span className="text-lg">{f.kind === 'focus' ? '🍅' : f.kind === 'short' ? '☕' : '🌙'}</span>
            <span className="text-sm flex-1">{f.kind === 'focus' ? 'Focus session' : f.kind === 'short' ? 'Short break' : 'Long break'}</span>
            <span className="text-xs text-muted-foreground">{f.minutes} min · {f.date === today ? 'Today' : f.date.slice(5)}</span>
          </div>
        ))}
      </GlassCard>
    </Page>
  );
}
