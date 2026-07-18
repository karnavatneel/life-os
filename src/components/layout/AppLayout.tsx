import { Outlet, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, Repeat, CheckSquare, Plus, Grid3X3, Calendar, HeartPulse, Pill, Wallet, GraduationCap,
  Target, Sparkles, BookOpen, MoonStar, BarChart3, Hourglass, KeyRound, ShoppingCart, Bot, Trophy,
  Timer, Settings, ClipboardList, Star, X, Wifi,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useUI } from '@/lib/ui';
import { useApp, levelFromXP, xpForLevel } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const MODULES = [
  { path: '/planner', label: 'Daily Planner', icon: ClipboardList, emoji: '🗓️' },
  { path: '/calendar', label: 'Calendar', icon: Calendar, emoji: '📅' },
  { path: '/focus', label: 'Pomodoro', icon: Timer, emoji: '🍅' },
  { path: '/health', label: 'Health', icon: HeartPulse, emoji: '❤️' },
  { path: '/medicine', label: 'Medicine', icon: Pill, emoji: '💊' },
  { path: '/finance', label: 'Finance', icon: Wallet, emoji: '💰' },
  { path: '/learning', label: 'Learning', icon: GraduationCap, emoji: '🎓' },
  { path: '/goals', label: 'Goals', icon: Target, emoji: '🎯' },
  { path: '/vision', label: 'Vision Board', icon: Sparkles, emoji: '🌈' },
  { path: '/journal', label: 'Journal', icon: BookOpen, emoji: '📖' },
  { path: '/reflection', label: 'Daily Reflection', icon: MoonStar, emoji: '🌙' },
  { path: '/review', label: 'Weekly Review', icon: Star, emoji: '⭐' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, emoji: '📊' },
  { path: '/screentime', label: 'Screen Time', icon: Hourglass, emoji: '⏳' },
  { path: '/vault', label: 'Password Vault', icon: KeyRound, emoji: '🔐' },
  { path: '/shopping', label: 'Shopping', icon: ShoppingCart, emoji: '🛒' },
  { path: '/assistant', label: 'AI Assistant', icon: Bot, emoji: '✨' },
  { path: '/rewards', label: 'Rewards', icon: Trophy, emoji: '🏆' },
  { path: '/integrations', label: 'Integrations', icon: Wifi, emoji: '🔗' },
];

const QUICK = [
  { label: 'Add Habit', emoji: '🌱', to: '/habits?add=1' },
  { label: 'Add Task', emoji: '✅', to: '/tasks?add=1' },
  { label: 'Add Expense', emoji: '💸', to: '/finance?add=expense' },
  { label: 'Add Event', emoji: '📅', to: '/calendar?add=1' },
  { label: 'Add Journal', emoji: '✍️', to: '/journal?add=1' },
  { label: 'Log Mood', emoji: '😊', to: '/health?add=mood' },
  { label: 'Start Focus', emoji: '🍅', to: '/focus?start=1' },
];

function NavBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Home; label: string }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center justify-center gap-1 flex-1 py-1 press">
      {active && <motion.div layoutId="nav-pill" className="absolute -top-1.5 h-1 w-8 rounded-full accent-gradient" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
      <Icon className={cn('w-[22px] h-[22px] transition-colors', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2.4 : 2} />
      <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>{label}</span>
    </button>
  );
}

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { moreOpen, setMoreOpen, quickAction, setQuickAction } = useUI();
  const { profile, xp, settings } = useApp();
  const lvl = levelFromXP(xp);
  const lvlProgress = ((xp - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl))) * 100;
  const p = loc.pathname;

  const go = (to: string) => { setMoreOpen(false); setQuickAction(null); nav(to); };

  return (
    <div className="min-h-dvh relative">
      {/* ambient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full accent-gradient opacity-[0.13] blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full accent-gradient opacity-[0.09] blur-3xl animate-float-slow" style={{ animationDelay: '-4s' }} />
      </div>

      {/* desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col glass-strong border-r z-40 p-5">
        <button onClick={() => nav('/')} className="flex items-center gap-3 mb-8 press text-left">
          <div className="w-10 h-10 rounded-2xl accent-gradient flex items-center justify-center text-white text-lg shadow-glow">✦</div>
          <div>
            <div className="font-bold tracking-tight leading-none">Life OS</div>
            <div className="text-[11px] text-muted-foreground mt-1">Level {lvl} · {xp} XP</div>
          </div>
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar -mx-1 px-1">
          {[{ path: '/', label: 'Dashboard', icon: Home }, { path: '/habits', label: 'Habits', icon: Repeat }, { path: '/tasks', label: 'Tasks', icon: CheckSquare }, ...MODULES].map((m) => (
            <button key={m.path} onClick={() => nav(m.path)}
              className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm press transition-colors',
                p === m.path ? 'accent-gradient-soft text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
              <m.icon className="w-[18px] h-[18px]" />
              {m.label}
            </button>
          ))}
        </nav>
        <button onClick={() => nav('/settings')} className={cn('mt-4 flex items-center gap-3 p-2.5 rounded-2xl press transition-colors', p === '/settings' ? 'accent-gradient-soft' : 'hover:bg-muted/60')}>
          <div className="w-9 h-9 rounded-full overflow-hidden accent-gradient flex items-center justify-center text-lg shrink-0">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : profile.avatarEmoji}
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold truncate">{profile.name}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{settings.theme} theme</div>
          </div>
          <Settings className="w-4 h-4 ml-auto text-muted-foreground" />
        </button>
      </aside>

      {/* main */}
      <main className="md:pl-64 min-h-dvh">
        <AnimatePresence mode="wait">
          <Outlet key={loc.pathname} />
        </AnimatePresence>
      </main>

      {/* mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40">
        <div className="glass-strong border-t safe-bottom">
          <div className="flex items-end px-2 pt-2 pb-1.5 relative">
            <NavBtn active={p === '/'} onClick={() => nav('/')} icon={Home} label="Home" />
            <NavBtn active={p === '/habits'} onClick={() => nav('/habits')} icon={Repeat} label="Habits" />
            <div className="flex-1 flex justify-center">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setQuickAction('habit')}
                className="relative -top-5 w-14 h-14 rounded-full accent-gradient text-white flex items-center justify-center shadow-glow"
                aria-label="Quick add"
              >
                <Plus className="w-7 h-7" strokeWidth={2.5} />
                <span className="absolute inset-0 rounded-full accent-gradient animate-pulse-ring -z-10" />
              </motion.button>
            </div>
            <NavBtn active={p === '/tasks'} onClick={() => nav('/tasks')} icon={CheckSquare} label="Tasks" />
            <NavBtn active={moreOpen} onClick={() => setMoreOpen(true)} icon={Grid3X3} label="More" />
          </div>
        </div>
      </div>

      {/* desktop FAB */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setQuickAction('habit')}
        className="hidden md:flex fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full accent-gradient text-white items-center justify-center shadow-glow press">
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </motion.button>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl glass-strong border-t max-h-[82dvh] overflow-y-auto">
          <SheetTitle className="text-lg font-bold mb-1">All Modules</SheetTitle>
          <div className="flex items-center gap-3 mb-4 glass rounded-2xl p-3" onClick={() => go('/settings')} role="button">
            <div className="w-10 h-10 rounded-full overflow-hidden accent-gradient flex items-center justify-center text-xl shrink-0">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : profile.avatarEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{profile.name}</div>
              <div className="text-xs text-muted-foreground">Level {lvl}</div>
            </div>
            <div className="w-24">
              <Progress value={lvlProgress} className="h-1.5" />
              <div className="text-[10px] text-muted-foreground mt-1 text-right">{xp} XP</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 pb-6">
            {MODULES.map((m) => (
              <button key={m.path} onClick={() => go(m.path)}
                className="glass rounded-2xl p-3.5 flex flex-col items-center gap-2 press hover:shadow-glow transition-shadow">
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[11px] font-medium text-center leading-tight">{m.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick actions sheet */}
      <Sheet open={quickAction !== null} onOpenChange={(o) => !o && setQuickAction(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl glass-strong border-t">
          <div className="flex items-center justify-between mb-4">
            <SheetTitle className="text-lg font-bold">Quick Actions</SheetTitle>
            <button onClick={() => setQuickAction(null)} className="p-2 rounded-full hover:bg-muted press"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2.5 pb-8">
            {QUICK.map((q) => (
              <motion.button key={q.label} whileTap={{ scale: 0.92 }} onClick={() => go(q.to)}
                className="glass rounded-2xl p-3.5 flex flex-col items-center gap-2 press">
                <span className="text-2xl">{q.emoji}</span>
                <span className="text-[11px] font-medium text-center leading-tight">{q.label}</span>
              </motion.button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
