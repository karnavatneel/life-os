import { useState } from 'react';
import { Moon, Sun, Monitor, Lock, Download, Trash2, ChevronRight, User, LogOut, Upload } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle } from '@/components/shared';
import { useApp } from '@/lib/store';
import { ACCENTS } from '@/lib/ui';
import { mode, supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/types';

const NOTIF_ITEMS = [
  { key: 'habits', label: 'Habit reminders', emoji: '🌱' },
  { key: 'medicine', label: 'Medicine reminders', emoji: '💊' },
  { key: 'tasks', label: 'Task reminders', emoji: '✅' },
  { key: 'planner', label: 'Planner reminders', emoji: '🗓️' },
  { key: 'water', label: 'Water reminders', emoji: '💧' },
  { key: 'sleep', label: 'Sleep reminders', emoji: '😴' },
  { key: 'events', label: 'Calendar reminders', emoji: '📅' },
  { key: 'bills', label: 'Bill reminders', emoji: '💵' },
  { key: 'quotes', label: 'Daily motivation', emoji: '✨' },
];

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun; desc: string }[] = [
  { id: 'light', label: 'Light', icon: Sun, desc: 'Clean & bright' },
  { id: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on eyes' },
  { id: 'amoled', label: 'AMOLED', icon: Monitor, desc: 'Pure black' },
  { id: 'system', label: 'System', icon: Monitor, desc: 'Follow device' },
];

export default function SettingsPage() {
  const { profile, updateProfile, settings, setTheme, setAccent, setPin, toggleNotification, habits, tasks, journal, transactions } = useApp();
  const [editProfile, setEditProfile] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinVal, setPinVal] = useState('');
  const [pForm, setPForm] = useState(profile);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 128;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        ctx?.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setPForm((prev) => ({ ...prev, avatarUrl: compressedBase64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const exportAll = () => {
    const data = { profile, habits, tasks, journal, transactions, exportedAt: new Date().toISOString() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'life-os-backup.json';
    a.click();
  };

  const handleReset = async () => {
    if (!confirm('Erase all data and start over?')) return;
    
    // Clear local cache
    localStorage.removeItem('life-os-store-v2');
    
    // Clear Supabase cloud sync data
    if (mode === 'supabase' && supabase) {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user) {
          await supabase!
            .from('user_backups')
            .delete()
            .eq('user_id', session.user.id);
        }
      } catch (err) {
        console.error('Failed to clear Supabase backup:', err);
      }
    }
    
    // Refresh page to restart onboarding
    location.reload();
  };

  return (
    <Page>
      <PageHeader title="Settings" subtitle={`Signed in · ${mode === 'demo' ? 'demo mode (local data)' : 'cloud sync active'}`} />

      {/* profile card */}
      <GlassCard className="flex items-center gap-4 mb-2" onClick={() => { setPForm(profile); setEditProfile(true); }}>
        <div className="w-14 h-14 rounded-3xl overflow-hidden accent-gradient flex items-center justify-center text-3xl shadow-glow shrink-0">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : profile.avatarEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold">{profile.name}</div>
          <div className="text-xs text-muted-foreground truncate">@{profile.username} · {profile.bio}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </GlassCard>

      {/* theme */}
      <SectionTitle>🎨 Appearance</SectionTitle>
      <GlassCard>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={cn('rounded-2xl p-3 flex flex-col items-center gap-1.5 press transition-all',
                settings.theme === t.id ? 'accent-gradient text-white shadow-glow' : 'glass text-muted-foreground')}>
              <t.icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Accent color · {settings.accentName}</div>
        <div className="flex gap-3">
          {ACCENTS.map((a) => (
            <button key={a.name} onClick={() => setAccent(a.hsl, a.name)}
              className={cn('w-10 h-10 rounded-full press transition-all', settings.accentName === a.name && 'ring-2 ring-offset-2 ring-offset-background ring-foreground/50 scale-110')}
              style={{ background: `hsl(${a.hsl})` }} aria-label={a.name} />
          ))}
        </div>
      </GlassCard>

      <SectionTitle>🔔 Notifications</SectionTitle>
      <GlassCard className="divide-y divide-border/50">
        <div className="flex items-center gap-3 py-3">
          <div className="flex-1">
            <div className="text-sm font-medium">System Permission</div>
            <div className="text-[11px] text-muted-foreground">
              {typeof window !== 'undefined' && 'Notification' in window
                ? Notification.permission === 'granted'
                  ? 'Enabled — you will receive alerts.'
                  : Notification.permission === 'denied'
                  ? 'Blocked — please unblock in browser settings.'
                  : 'Not granted yet.'
                : 'Not supported on this device.'}
            </div>
          </div>
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <Button
              size="sm"
              className="accent-gradient border-0 text-xs h-8 rounded-xl"
              onClick={() => {
                Notification.requestPermission().then(() => {
                  import('@/lib/notifications').then(({ registerPeriodicSync }) => registerPeriodicSync());
                  window.location.reload();
                });
              }}
            >
              Enable
            </Button>
          )}
        </div>
        {NOTIF_ITEMS.map((n) => (
          <div key={n.key} className="flex items-center gap-3 py-3">
            <span className="text-lg">{n.emoji}</span>
            <span className="flex-1 text-sm font-medium">{n.label}</span>
            <Switch checked={settings.notifications[n.key] ?? true} onCheckedChange={() => {
              toggleNotification(n.key);
            }} />
          </div>
        ))}
      </GlassCard>

      {/* privacy */}
      <SectionTitle>🔒 Privacy & security</SectionTitle>
      <GlassCard className="divide-y divide-border/50">
        <button onClick={() => setPinOpen(true)} className="w-full flex items-center gap-3 py-3 press text-left">
          <Lock className="w-4.5 h-4.5 w-5 h-5 text-primary" />
          <span className="flex-1 text-sm font-medium">App PIN lock</span>
          <span className="text-xs text-muted-foreground">{settings.pin ? '••••' : 'Not set'}</span>
        </button>
        <div className="flex items-center gap-3 py-3">
          <span className="text-lg">📖</span>
          <span className="flex-1 text-sm font-medium">Lock journal with PIN</span>
          <Switch checked={useApp.getState().settings.privacyLockJournal} onCheckedChange={(v) => useApp.setState((s) => ({ settings: { ...s.settings, privacyLockJournal: v } }))} />
        </div>
        <div className="flex items-center gap-3 py-3">
          <span className="text-lg">🔐</span>
          <span className="flex-1 text-sm font-medium">Lock vault with PIN</span>
          <Switch checked={useApp.getState().settings.privacyLockVault} onCheckedChange={(v) => useApp.setState((s) => ({ settings: { ...s.settings, privacyLockVault: v } }))} />
        </div>
      </GlassCard>

      {/* data */}
      <SectionTitle>💾 Data & backup</SectionTitle>
      <GlassCard className="space-y-2">
        <button onClick={exportAll} className="w-full flex items-center gap-3 py-2.5 press text-left">
          <Download className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-medium">Export all data</div>
            <div className="text-[11px] text-muted-foreground">JSON backup of everything</div>
          </div>
        </button>
         <button onClick={handleReset}
          className="w-full flex items-center gap-3 py-2.5 press text-left">
          <Trash2 className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <div className="text-sm font-medium text-destructive">Reset app</div>
            <div className="text-[11px] text-muted-foreground">Erase everything and restart onboarding</div>
          </div>
        </button>
        <button onClick={() => { useApp.setState({ onboarded: false }); }} className="w-full flex items-center gap-3 py-2.5 press text-left">
          <LogOut className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </GlassCard>

      <div className="text-center text-[11px] text-muted-foreground mt-8">Life OS v1.0 · Made with 💜</div>

      {/* profile edit dialog */}
      <Dialog open={editProfile} onOpenChange={setEditProfile}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Profile</DialogTitle>
          <div className="space-y-3 mt-2">
            <div className="flex flex-col items-center justify-center gap-2.5 pb-2">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden accent-gradient flex items-center justify-center text-4xl shadow-glow shrink-0">
                  {pForm.avatarUrl ? <img src={pForm.avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : pForm.avatarEmoji}
                </div>
                <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer shadow-soft press hover:scale-105 transition-transform" title="Upload avatar">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              <span className="text-[10px] text-muted-foreground">Upload a profile picture from gallery</span>
            </div>
            <div><Label>Name</Label><Input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} className="mt-1 rounded-xl" /></div>
            <div><Label>Username</Label><Input value={pForm.username} onChange={(e) => setPForm({ ...pForm, username: e.target.value })} className="mt-1 rounded-xl" /></div>
            <div><Label>Bio</Label><Input value={pForm.bio} onChange={(e) => setPForm({ ...pForm, bio: e.target.value })} className="mt-1 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Birthday</Label><Input type="date" value={pForm.birthday} onChange={(e) => setPForm({ ...pForm, birthday: e.target.value })} className="mt-1 rounded-xl" /></div>
              <div><Label>Gender</Label>
                <Select value={pForm.gender} onValueChange={(v) => setPForm({ ...pForm, gender: v })}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Height (cm)</Label><Input type="number" value={pForm.height ?? ''} onChange={(e) => setPForm({ ...pForm, height: Number(e.target.value) })} className="mt-1 rounded-xl" /></div>
              <div><Label>Weight (kg)</Label><Input type="number" value={pForm.weight ?? ''} onChange={(e) => setPForm({ ...pForm, weight: Number(e.target.value) })} className="mt-1 rounded-xl" /></div>
              <div><Label>Goal (kg)</Label><Input type="number" value={pForm.goalWeight ?? ''} onChange={(e) => setPForm({ ...pForm, goalWeight: Number(e.target.value) })} className="mt-1 rounded-xl" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Timezone</Label><Input value={pForm.timezone} onChange={(e) => setPForm({ ...pForm, timezone: e.target.value })} className="mt-1 rounded-xl" /></div>
              <div><Label>Language</Label>
                <Select value={pForm.language} onValueChange={(v) => setPForm({ ...pForm, language: v })}>
                  <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => { updateProfile(pForm); setEditProfile(false); }} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">Save profile</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="glass-strong rounded-3xl max-w-xs text-center">
          <DialogTitle className="text-xl font-bold">Set PIN lock</DialogTitle>
          <p className="text-xs text-muted-foreground mb-4">4 digits. Used for journal & vault locks.</p>
          <Input type="password" inputMode="numeric" maxLength={4} value={pinVal} onChange={(e) => setPinVal(e.target.value.replace(/\D/g, ''))}
            className="w-40 mx-auto text-center text-2xl tracking-[0.5em] rounded-2xl h-14 mb-4" placeholder="••••" />
          <div className="flex gap-2">
            {settings.pin && <Button variant="outline" onClick={() => { setPin(''); setPinOpen(false); }} className="flex-1 rounded-2xl glass border-0 h-11">Remove</Button>}
            <Button onClick={() => { if (pinVal.length === 4) { setPin(pinVal); setPinOpen(false); setPinVal(''); } }} className="flex-1 accent-gradient border-0 rounded-2xl h-11">Save PIN</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
