import { motion } from 'framer-motion';
import { Flame, Snowflake, Coins, Star } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle } from '@/components/shared';
import { useApp, BADGES, levelFromXP, xpForLevel } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🦉', '🐙', '🦄', '🐯', '🐨', '🦋'];
const CHALLENGES = [
  { name: 'Perfect morning', desc: 'Complete 3 habits before 10 AM', xp: 50, emoji: '🌅' },
  { name: 'Deep work warrior', desc: 'Finish 4 focus sessions in a day', xp: 80, emoji: '🧠' },
  { name: 'No-spend day', desc: 'Log zero expenses for a full day', xp: 40, emoji: '💰' },
  { name: 'Digital sunset', desc: 'Under 2h screen time today', xp: 60, emoji: '📵' },
];

export default function Rewards() {
  const { xp, coins, badges, streakFreezes, profile, updateProfile } = useApp();
  const lvl = levelFromXP(xp);
  const cur = xpForLevel(lvl);
  const next = xpForLevel(lvl + 1);
  const pct = ((xp - cur) / (next - cur)) * 100;

  return (
    <Page>
      <PageHeader title="Rewards" subtitle="Your progress, gamified" />

      {/* level hero */}
      <GlassCard className="mb-5 accent-gradient-soft text-center !p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="w-20 h-20 mx-auto rounded-3xl overflow-hidden accent-gradient flex items-center justify-center text-4xl shadow-glow mb-3 shrink-0">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : profile.avatarEmoji}
        </motion.div>
        <div className="text-2xl font-bold">Level {lvl}</div>
        <div className="text-xs text-muted-foreground mb-3">{xp} XP total · {next - xp} XP to level {lvl + 1}</div>
        <Progress value={pct} className="h-2.5 max-w-xs mx-auto" />
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Coins className="w-4 h-4 text-amber-500" /> {coins} coins</div>
          <div className="flex items-center gap-1.5 text-sm font-semibold"><Snowflake className="w-4 h-4 text-sky-400" /> {streakFreezes} streak freezes</div>
        </div>
      </GlassCard>

      {/* avatar picker */}
      <SectionTitle>🎭 Avatar</SectionTitle>
      <GlassCard>
        <div className="grid grid-cols-5 gap-2">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => updateProfile({ avatarEmoji: a, avatarUrl: '' })}
              className={cn('text-3xl p-3 rounded-2xl press transition-all', (!profile.avatarUrl && profile.avatarEmoji === a) ? 'accent-gradient-soft ring-2 ring-primary scale-105' : 'glass')}>
              {a}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* badges */}
      <SectionTitle>🏅 Badges · {Object.keys(badges).length}/{BADGES.length}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {BADGES.map((b, i) => {
          const earned = badges[b.id];
          return (
            <motion.div key={b.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className={cn('text-center !p-4', !earned && 'opacity-50 grayscale')}>
                <div className="text-4xl mb-2">{b.emoji}</div>
                <div className="font-semibold text-sm">{b.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{b.desc}</div>
                {earned && <div className="text-[9px] text-primary font-semibold mt-2 flex items-center justify-center gap-1"><Star className="w-3 h-3" /> Earned {earned}</div>}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* daily rewards */}
      <SectionTitle>🎁 Daily rewards</SectionTitle>
      <GlassCard>
        <div className="flex justify-between">
          {Array.from({ length: 7 }, (_, i) => {
            const claimed = i < 3; // demo: first 3 days claimed
            return (
              <div key={i} className={cn('flex flex-col items-center gap-1 p-2 rounded-2xl', claimed && 'accent-gradient-soft')}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg', claimed ? 'accent-gradient text-white shadow-glow' : 'bg-muted')}>
                  {claimed ? '✓' : i === 6 ? '🎁' : <Coins className="w-4 h-4 text-amber-500" />}
                </div>
                <span className="text-[9px] text-muted-foreground">Day {i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-500" /> Come back daily — Day 7 has a mystery reward!
        </div>
      </GlassCard>

      {/* challenges */}
      <SectionTitle>⚔️ Active challenges</SectionTitle>
      <div className="space-y-2.5">
        {CHALLENGES.map((c) => (
          <GlassCard key={c.name} className="flex items-center gap-3">
            <span className="text-2xl">{c.emoji}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">{c.name}</div>
              <div className="text-[11px] text-muted-foreground">{c.desc}</div>
            </div>
            <span className="text-xs font-bold text-gradient">+{c.xp} XP</span>
          </GlassCard>
        ))}
      </div>
    </Page>
  );
}
