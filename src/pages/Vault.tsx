import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Copy, Eye, EyeOff, Lock, RefreshCw, Check, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState } from '@/components/shared';
import { useApp } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 20, label: 'Weak', color: '#ef4444' };
  if (s <= 2) return { score: 40, label: 'Fair', color: '#f97316' };
  if (s <= 3) return { score: 60, label: 'Good', color: '#eab308' };
  if (s <= 4) return { score: 80, label: 'Strong', color: '#84cc16' };
  return { score: 100, label: 'Excellent', color: '#22c55e' };
}

function generate(len = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?';
  return Array.from(crypto.getRandomValues(new Uint32Array(len))).map((n) => chars[n % chars.length]).join('');
}

const CATS = ['Work', 'Personal', 'Finance', 'Social', 'Entertainment', 'Shopping'];

import type { VaultItem } from '@/lib/types';

export default function Vault() {
  const { vault, addVaultItem, updateVaultItem, deleteVaultItem, settings } = useApp();
  const [unlocked, setUnlocked] = useState(!settings.privacyLockVault);
  const [pinInput, setPinInput] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [query, setQuery] = useState('');
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ website: '', username: '', password: '', notes: '', category: 'Personal' });

  const shown = useMemo(() => vault.filter((v) => v.website.toLowerCase().includes(query.toLowerCase()) || v.username.toLowerCase().includes(query.toLowerCase())), [vault, query]);
  const st = strength(form.password);

  const startEdit = (v: VaultItem) => {
    setEditing(v);
    setForm({ website: v.website, username: v.username, password: v.password, notes: v.notes || '', category: v.category });
    setOpen(true);
  };

  const save = () => {
    if (!form.website || !form.password) return;
    if (editing) {
      updateVaultItem(editing.id, form);
    } else {
      addVaultItem(form);
    }
    setOpen(false);
    setEditing(null);
    setForm({ website: '', username: '', password: '', notes: '', category: 'Personal' });
  };

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!unlocked) {
    return (
      <Page className="flex flex-col items-center justify-center min-h-[70dvh]">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-xl font-bold mb-2">Password Vault</h1>
        <p className="text-sm text-muted-foreground mb-5 text-center max-w-[260px]">
          {settings.pin ? 'Enter your PIN to unlock.' : 'Set a PIN in Settings to secure your vault, or unlock for this session.'}
        </p>
        {settings.pin && (
          <Input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)}
            className="w-40 text-center text-2xl tracking-[0.5em] rounded-2xl h-14 mb-4" placeholder="••••" />
        )}
        <Button onClick={() => { if (!settings.pin || pinInput === settings.pin) setUnlocked(true); else setPinInput(''); }}
          className="accent-gradient border-0 rounded-2xl h-12 px-8 shadow-glow press"><Lock className="w-4 h-4 mr-1" /> Unlock vault</Button>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Password Vault" subtitle={`${vault.length} saved logins`}
        right={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Add</Button>} />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search logins…" className="pl-10 h-11 rounded-2xl glass border-0" />
      </div>

      {shown.length === 0 ? (
        <EmptyState emoji="🔑" title="Vault is empty" hint="Save your first login — everything stays on your device."
          action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add login</Button>} />
      ) : (
        <div className="space-y-3">
          {shown.map((v) => (
            <GlassCard key={v.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl accent-gradient-soft flex items-center justify-center font-bold text-primary uppercase">{v.website[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{v.website}</div>
                  <div className="text-xs text-muted-foreground truncate">{v.username}</div>
                </div>
                <span className="text-[10px] glass rounded-full px-2 py-0.5 shrink-0">{v.category}</span>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => startEdit(v)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => deleteVaultItem(v.id)} className="p-1.5 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 glass rounded-xl px-3 py-2">
                <span className="flex-1 font-mono text-sm truncate">{showPw[v.id] ? v.password : '••••••••••••'}</span>
                <button onClick={() => setShowPw({ ...showPw, [v.id]: !showPw[v.id] })} className="p-1 press">
                  {showPw[v.id] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => copy(v.id, v.password)} className="p-1 press">
                  {copied === v.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit login' : 'New login'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website (e.g. github.com)" className="rounded-xl" />
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Username / email" className="rounded-xl" />
            <div>
              <div className="flex gap-2">
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="rounded-xl font-mono" />
                <Button variant="outline" size="icon" onClick={() => setForm({ ...form, password: generate() })} className="rounded-xl glass border-0 shrink-0"><RefreshCw className="w-4 h-4" /></Button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${st.score}%`, backgroundColor: st.color }} />
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: st.color }}>{st.label}</div>
                </div>
              )}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="rounded-xl" />
            <Button onClick={save}
              className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Save to vault'}</Button>
            <p className="text-[10px] text-muted-foreground text-center">🔒 Stored locally on this device only. Never transmitted.</p>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
