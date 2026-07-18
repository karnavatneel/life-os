import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ACCENTS } from '@/lib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { mode, supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const SLIDES = [
  { emoji: '🌅', title: 'Your entire life,\none calm place', body: 'Habits, tasks, health, money, learning and journaling — beautifully unified.' },
  { emoji: '🔥', title: 'Build streaks that stick', body: 'Smart habit tracking, XP, coins and badges that make progress addictive.' },
  { emoji: '📊', title: 'See yourself clearly', body: 'Mood, sleep, spending, screen time — gentle insights, not judgment.' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [accentIdx, setAccentIdx] = useState(0);
  const [email, setEmail] = useState('');
  const { completeOnboarding, setAccent } = useApp();

  const total = SLIDES.length + 2;
  const isSlide = step < SLIDES.length;

  const finish = () => {
    setAccent(ACCENTS[accentIdx].hsl, ACCENTS[accentIdx].name);
    completeOnboarding(name.trim());
  };

  const handleGoogleSignIn = async () => {
    setAccent(ACCENTS[accentIdx].hsl, ACCENTS[accentIdx].name);
    if (mode === 'supabase' && supabase) {
      toast.info('Redirecting to Google Sign-In...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/',
        },
      });
      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
        // Fallback to local mode
        completeOnboarding(name.trim() || 'Alex');
      }
    } else {
      completeOnboarding(name.trim() || 'Alex');
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setAccent(ACCENTS[accentIdx].hsl, ACCENTS[accentIdx].name);
    if (mode === 'supabase' && supabase) {
      toast.info('Sending magic link...');
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + '/',
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Magic login link sent to your email!');
      }
    } else {
      completeOnboarding(name.trim() || email.split('@')[0]);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full accent-gradient opacity-20 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full accent-gradient opacity-15 blur-3xl animate-float-slow" style={{ animationDelay: '-4s' }} />
      </div>

      <AnimatePresence mode="wait">
        {isSlide ? (
          <motion.div key={`slide-${step}`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="text-center max-w-sm">
            <motion.div className="text-7xl mb-8" animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
              {SLIDES[step].emoji}
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight mb-4 whitespace-pre-line">{SLIDES[step].title}</h1>
            <p className="text-muted-foreground leading-relaxed">{SLIDES[step].body}</p>
          </motion.div>
        ) : step === SLIDES.length ? (
          <motion.div key="name" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} className="w-full max-w-sm text-center">
            <div className="text-6xl mb-6">👋</div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">What should we call you?</h1>
            <p className="text-muted-foreground text-sm mb-8">And pick your vibe — you can change it anytime.</p>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
              className="h-14 text-lg text-center rounded-2xl glass border-0 mb-6" />
            <div className="flex justify-center gap-3 mb-4">
              {ACCENTS.map((a, i) => (
                <button key={a.name} onClick={() => { setAccentIdx(i); setAccent(a.hsl, a.name); }}
                  className={cn('w-10 h-10 rounded-full press transition-all', accentIdx === i && 'ring-2 ring-offset-2 ring-offset-background ring-foreground/50 scale-110')}
                  style={{ background: `hsl(${a.hsl})` }} aria-label={a.name} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{ACCENTS[accentIdx].name}</p>
          </motion.div>
        ) : (
          <motion.div key="account" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} className="w-full max-w-sm text-center">
            <div className="text-6xl mb-6">🔐</div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create your account</h1>
            <p className="text-muted-foreground text-sm mb-7">
              {mode === 'demo' ? 'Demo mode — your data stays on this device. Connect Supabase later for cloud sync.' : 'Sign up to sync across all your devices.'}
            </p>
            <div className="space-y-3 mb-5">
              <Button variant="outline" onClick={handleGoogleSignIn} className="w-full h-13 rounded-2xl glass border-0 text-base gap-2 py-6">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"/></svg>
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
                  className="h-13 rounded-2xl glass border-0 text-center" />
                <Button onClick={handleMagicLink} className="h-13 rounded-2xl px-5 font-semibold">Send Link</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 inset-x-0 px-6 max-w-sm mx-auto w-full">
        <div className="flex justify-center gap-1.5 mb-6">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i === step ? 'w-6 accent-gradient' : 'w-1.5 bg-muted')} />
          ))}
        </div>
        <Button onClick={() => (step < total - 1 ? setStep(step + 1) : finish())}
          className="w-full h-14 rounded-2xl accent-gradient border-0 text-base font-semibold shadow-glow press">
          {step === total - 1 ? <><Check className="w-5 h-5 mr-1" /> Start my journey</> : <>Continue <ArrowRight className="w-5 h-5 ml-1" /></>}
        </Button>
      </div>
    </div>
  );
}
