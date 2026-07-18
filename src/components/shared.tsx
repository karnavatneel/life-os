import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/* ---------- page wrapper with transition ---------- */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn('px-4 pt-5 pb-32 md:pb-10 md:px-8 max-w-3xl mx-auto w-full', className)}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- glass card ---------- */
export function GlassCard({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn('glass rounded-3xl p-4 shadow-soft', onClick && 'press cursor-pointer', className)}
    >
      {children}
    </motion.div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-7 mb-3">
      <h2 className="text-base font-semibold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

/* ---------- progress ring ---------- */
export function Ring({ value, size = 64, stroke = 6, children, color }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
          stroke={color ?? 'hsl(var(--primary))'}
          strokeLinecap="round"
          className="fill-none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * v) / 100 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">{children}</div>
    </div>
  );
}

/* ---------- stat pill ---------- */
export function StatPill({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 glass rounded-2xl px-3.5 py-2.5">
      <span className="text-lg">{emoji}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground leading-none">{label}</div>
        <div className="text-sm font-semibold truncate mt-0.5">{value}</div>
      </div>
    </div>
  );
}

/* ---------- empty state ---------- */
export function EmptyState({ emoji, title, hint, action }: { emoji: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-12 px-6">
      <div className="text-5xl mb-4 animate-float-slow">{emoji}</div>
      <div className="font-semibold">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-1.5 max-w-[240px]">{hint}</div>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/* ---------- emoji picker (compact) ---------- */
const EMOJIS = ['🎯','💪','📚','💧','🧘','🏃','😴','🥗','💊','💰','✍️','🎨','🎵','🌍','🧠','❤️','🚀','🌱','☀️','🔥','🍎','🦷','💻','📱','🎓','🏆','🙏','☕','🛌','🚶'];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => onChange(e)}
          className={cn('text-xl p-1 rounded-lg press transition-colors', value === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted')}>
          {e}
        </button>
      ))}
    </div>
  );
}

export const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={cn('w-8 h-8 rounded-full press transition-all', value === c && 'ring-2 ring-offset-2 ring-offset-background ring-foreground/40 scale-110')}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

export const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const fmtMins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
