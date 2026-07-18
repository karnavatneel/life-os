import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { format, parseISO, isSameMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Plus, Trash2, TrendingUp, TrendingDown, Download, CreditCard, Pencil } from 'lucide-react';
import { Page, PageHeader, GlassCard, SectionTitle, EmptyState, fmtMoney } from '@/components/shared';
import { useApp, todayISO } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Transaction, SavingsGoal, Emi } from '@/lib/types';

const EXPENSE_CATS = ['Food', 'Shopping', 'Bills', 'Travel', 'Fuel', 'Rent', 'Entertainment', 'Medical', 'Investment', 'Other'];
const INCOME_CATS = ['Salary', 'Business', 'Freelance', 'Other'];
const CAT_COLORS: Record<string, string> = { Food: '#f59e0b', Shopping: '#ec4899', Bills: '#8b5cf6', Travel: '#3b82f6', Fuel: '#f97316', Rent: '#ef4444', Entertainment: '#06b6d4', Medical: '#10b981', Investment: '#84cc16', Other: '#9ca3af' };
const CAT_EMOJI: Record<string, string> = { Food: '🍔', Shopping: '🛍️', Bills: '🧾', Travel: '✈️', Fuel: '⛽', Rent: '🏠', Entertainment: '🎬', Medical: '🏥', Investment: '📈', Other: '📦', Salary: '💼', Business: '🏢', Freelance: '💻' };

export default function Finance() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, budgets, setBudget, savingsGoals, addSavingsGoal, updateSavingsGoal, addToSavings, emis, addEmi, updateEmi, payEmi, logActivity } = useApp();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [form, setForm] = useState({ amount: '', category: 'Food', note: '', date: todayISO() });
  const [goalForm, setGoalForm] = useState({ name: '', target: '' });
  const [goalOpen, setGoalOpen] = useState(false);
  const [emiOpen, setEmiOpen] = useState(false);
  const [emiForm, setEmiForm] = useState({ name: '', amount: '', dueDay: '1', remaining: '12', total: '12' });

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editingEmi, setEditingEmi] = useState<Emi | null>(null);

  useEffect(() => {
    const add = params.get('add');
    if (add) { setType(add === 'income' ? 'income' : 'expense'); setOpen(true); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const now = new Date();
  const monthTx = transactions.filter((t) => isSameMonth(parseISO(t.date), now));
  const income = monthTx.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const spent = monthTx.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    monthTx.filter((t) => t.type === 'expense').forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTx]);

  const cashflow = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const txs = transactions.filter((t) => isSameMonth(parseISO(t.date), d));
      months.push({
        month: format(d, 'MMM'),
        income: txs.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0),
        expense: txs.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0),
      });
    }
    return months;
  }, [transactions]);

  const startEditTx = (t: Transaction) => {
    setEditingTx(t);
    setType(t.type);
    setForm({ amount: String(t.amount), category: t.category, note: t.note || '', date: t.date });
    setOpen(true);
  };

  const save = () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return;
    if (editingTx) {
      updateTransaction(editingTx.id, { type, amount: amt, category: form.category, note: form.note, date: form.date });
    } else {
      addTransaction({ type, amount: amt, category: form.category, note: form.note, date: form.date });
    }
    setOpen(false);
    setEditingTx(null);
    setForm({ amount: '', category: type === 'expense' ? 'Food' : 'Salary', note: '', date: todayISO() });
  };

  const startEditGoal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setGoalForm({ name: g.name, target: String(g.target) });
    setGoalOpen(true);
  };

  const saveGoal = () => {
    const tgt = parseFloat(goalForm.target);
    if (!goalForm.name || !tgt || tgt <= 0) return;
    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, { name: goalForm.name, target: tgt });
    } else {
      addSavingsGoal({ name: goalForm.name, target: tgt, saved: 0, emoji: '🎯' });
    }
    setGoalOpen(false);
    setEditingGoal(null);
    setGoalForm({ name: '', target: '' });
  };

  const startEditEmi = (e: Emi) => {
    setEditingEmi(e);
    setEmiForm({ name: e.name, amount: String(e.amount), dueDay: String(e.dueDay), remaining: String(e.remaining), total: String(e.total) });
    setEmiOpen(true);
  };

  const saveEmi = () => {
    const amt = parseFloat(emiForm.amount);
    const day = parseInt(emiForm.dueDay);
    const rem = parseInt(emiForm.remaining);
    const tot = parseInt(emiForm.total);
    if (!emiForm.name || isNaN(amt) || isNaN(day) || isNaN(rem) || isNaN(tot)) return;

    if (editingEmi) {
      updateEmi(editingEmi.id, { name: emiForm.name, amount: amt, dueDay: day, remaining: rem, total: tot });
    } else {
      addEmi({ name: emiForm.name, amount: amt, dueDay: day, remaining: rem, total: tot });
    }
    setEmiOpen(false);
    setEditingEmi(null);
    setEmiForm({ name: '', amount: '', dueDay: '1', remaining: '12', total: '12' });
  };

  const exportCSV = () => {
    const rows = [['Date', 'Type', 'Category', 'Amount', 'Note'], ...transactions.map((t) => [t.date, t.type, t.category, String(t.amount), t.note])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `life-os-finance-${todayISO()}.csv`;
    a.click();
    logActivity('Exported finance CSV', '📄');
  };

  const budgetTotal = budgets.reduce((a, b) => a + b.limit, 0);

  return (
    <Page>
      <PageHeader title="Finance" subtitle={format(now, 'MMMM yyyy')}
        right={<div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={exportCSV} className="rounded-2xl glass border-0"><Download className="w-4 h-4" /></Button>
          <Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>} />

      {/* balance hero */}
      <GlassCard className="mb-5 accent-gradient-soft">
        <div className="text-xs text-muted-foreground mb-1">Net this month</div>
        <div className={cn('text-3xl font-bold', income - spent >= 0 ? 'text-emerald-500' : 'text-red-500')}>
          {income - spent >= 0 ? '+' : ''}{fmtMoney(income - spent)}
        </div>
        <div className="flex gap-5 mt-3">
          <div className="flex items-center gap-1.5 text-sm"><TrendingUp className="w-4 h-4 text-emerald-500" /> {fmtMoney(income)}</div>
          <div className="flex items-center gap-1.5 text-sm"><TrendingDown className="w-4 h-4 text-red-400" /> {fmtMoney(spent)}</div>
        </div>
      </GlassCard>

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="glass rounded-2xl w-full grid grid-cols-4">
          <TabsTrigger value="overview" className="rounded-xl text-xs">Overview</TabsTrigger>
          <TabsTrigger value="budgets" className="rounded-xl text-xs">Budgets</TabsTrigger>
          <TabsTrigger value="goals" className="rounded-xl text-xs">Goals</TabsTrigger>
          <TabsTrigger value="bills" className="rounded-xl text-xs">EMI/Bills</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'overview' && (
        <>
          {byCat.length > 0 && (
            <>
              <SectionTitle>🍩 Spending by category</SectionTitle>
              <GlassCard>
                <div className="flex items-center gap-2">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={byCat} dataKey="value" innerRadius={42} outerRadius={65} paddingAngle={3} strokeWidth={0}>
                        {byCat.map((c) => <Cell key={c.name} fill={CAT_COLORS[c.name] ?? '#9ca3af'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => fmtMoney(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {byCat.slice(0, 5).map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[c.name] ?? '#9ca3af' }} />
                        <span className="flex-1 truncate">{CAT_EMOJI[c.name]} {c.name}</span>
                        <span className="font-semibold">{fmtMoney(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <SectionTitle>🌊 Cash flow</SectionTitle>
              <GlassCard>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={cashflow}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(v) => fmtMoney(Number(v))} />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </>
          )}

          <SectionTitle>🧾 Recent transactions</SectionTitle>
          {transactions.length === 0 ? (
            <EmptyState emoji="💸" title="No transactions yet" hint="Log your first expense or income to see insights." />
          ) : (
            <GlassCard className="space-y-0.5">
              {transactions.slice(0, 15).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: (CAT_COLORS[t.category] ?? '#9ca3af') + '22' }}>
                    {CAT_EMOJI[t.category] ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.note || t.category}</div>
                    <div className="text-[11px] text-muted-foreground">{t.category} · {format(parseISO(t.date), 'MMM d')}</div>
                  </div>
                  <span className={cn('text-sm font-bold', t.type === 'income' ? 'text-emerald-500' : 'text-foreground')}>
                    {t.type === 'income' ? '+' : '−'}{fmtMoney(t.amount)}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditTx(t)} className="p-1 rounded-lg hover:bg-muted press" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => deleteTransaction(t.id)} className="p-1 rounded-lg hover:bg-muted press" aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </GlassCard>
          )}
        </>
      )}

      {tab === 'budgets' && (
        <>
          <GlassCard className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly budget</span>
              <span className="text-sm font-bold">{fmtMoney(spent)} / {fmtMoney(budgetTotal)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full transition-all duration-500', spent > budgetTotal ? 'bg-red-500' : 'accent-gradient')} style={{ width: `${Math.min(100, budgetTotal ? (spent / budgetTotal) * 100 : 0)}%` }} />
            </div>
          </GlassCard>
          <div className="space-y-3">
            {budgets.map((b) => {
              const used = monthTx.filter((t) => t.type === 'expense' && t.category === b.category).reduce((a, x) => a + x.amount, 0);
              const pct = Math.min(100, (used / b.limit) * 100);
              return (
                <GlassCard key={b.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{CAT_EMOJI[b.category]} {b.category}</span>
                    <span className={cn('text-xs font-semibold', used > b.limit && 'text-red-500')}>{fmtMoney(used)} / {fmtMoney(b.limit)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2.5">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: used > b.limit ? '#ef4444' : CAT_COLORS[b.category] ?? 'hsl(var(--primary))' }} />
                  </div>
                  <div className="flex gap-2">
                    {[100, 200, 300, 500].map((v) => (
                      <button key={v} onClick={() => setBudget(b.category, v)} className={cn('text-[10px] px-2 py-1 rounded-lg press', b.limit === v ? 'accent-gradient text-white' : 'glass')}>${v}</button>
                    ))}
                  </div>
                </GlassCard>
              );
            })}
            <Button variant="outline" onClick={() => { const c = EXPENSE_CATS.find((x) => !budgets.some((b) => b.category === x)) ?? 'Other'; setBudget(c, 200); }} className="w-full rounded-2xl glass border-0">
              <Plus className="w-4 h-4 mr-1" /> Add budget category
            </Button>
          </div>
        </>
      )}

      {tab === 'goals' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savingsGoals.map((g) => (
              <GlassCard key={g.id} className="group">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{g.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtMoney(g.saved)} of {fmtMoney(g.target)} · {Math.round((g.saved / g.target) * 100)}%</div>
                  </div>
                  <button onClick={() => startEditGoal(g)} className="p-1.5 rounded-lg hover:bg-muted press opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-3">
                  <div className="h-full accent-gradient" style={{ width: `${Math.min(100, (g.saved / g.target) * 100)}%` }} />
                </div>
                <div className="flex gap-2">
                  {[20, 50, 100].map((v) => (
                    <button key={v} onClick={() => addToSavings(g.id, v)} className="text-xs px-3 py-1.5 rounded-xl glass press font-medium">+ ${v}</button>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
          <Button onClick={() => setGoalOpen(true)} variant="outline" className="w-full mt-3 rounded-2xl glass border-0"><Plus className="w-4 h-4 mr-1" /> New savings goal</Button>
          <Dialog open={goalOpen} onOpenChange={(o) => { setGoalOpen(o); if (!o) setEditingGoal(null); }}>
            <DialogContent className="glass-strong rounded-3xl max-w-xs">
              <DialogTitle className="text-lg font-bold">{editingGoal ? 'Edit savings goal' : 'Savings goal'}</DialogTitle>
              <div className="space-y-3 mt-2">
                <Input value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="Goal name" className="rounded-xl" />
                <Input type="number" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} placeholder="Target amount" className="rounded-xl" />
                <Button onClick={saveGoal}
                  className="w-full accent-gradient border-0 rounded-2xl h-11">{editingGoal ? 'Save changes' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === 'bills' && (
        <div className="space-y-3">
          {emis.map((e) => (
            <GlassCard key={e.id} className="group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0"><CreditCard className="w-5 h-5 text-violet-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{fmtMoney(e.amount)}/mo · due day {e.dueDay} · {e.remaining} of {e.total} left</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => startEditEmi(e)} className="p-1.5 rounded-lg hover:bg-muted press opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <Button size="sm" onClick={() => payEmi(e.id)} className="accent-gradient border-0 rounded-xl h-8 text-xs">Pay</Button>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                <div className="h-full accent-gradient" style={{ width: `${((e.total - e.remaining) / e.total) * 100}%` }} />
              </div>
            </GlassCard>
          ))}
          <Button variant="outline" onClick={() => { setEmiOpen(true); }} className="w-full rounded-2xl glass border-0">
            <Plus className="w-4 h-4 mr-1" /> Add EMI / bill
          </Button>
          <GlassCard>
            <div className="text-sm font-semibold mb-2">📅 Bill reminders</div>
            {['Rent — 1st of month', 'Electric bill — 10th', 'Internet — 15th', 'Credit card — 20th'].map((b) => (
              <div key={b} className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground"><span>🔔</span>{b}</div>
            ))}
          </GlassCard>

          <Dialog open={emiOpen} onOpenChange={(o) => { setEmiOpen(o); if (!o) setEditingEmi(null); }}>
            <DialogContent className="glass-strong rounded-3xl max-w-xs">
              <DialogTitle className="text-lg font-bold">{editingEmi ? 'Edit EMI / Bill' : 'Add EMI / Bill'}</DialogTitle>
              <div className="space-y-3 mt-2">
                <Input value={emiForm.name} onChange={(e) => setEmiForm({ ...emiForm, name: e.target.value })} placeholder="EMI name" className="rounded-xl" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Amount/mo</Label>
                    <Input type="number" value={emiForm.amount} onChange={(e) => setEmiForm({ ...emiForm, amount: e.target.value })} placeholder="Amount" className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Due Day (1-31)</Label>
                    <Input type="number" value={emiForm.dueDay} onChange={(e) => setEmiForm({ ...emiForm, dueDay: e.target.value })} placeholder="Day" className="rounded-xl mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Months Left</Label>
                    <Input type="number" value={emiForm.remaining} onChange={(e) => setEmiForm({ ...emiForm, remaining: e.target.value })} placeholder="Remaining" className="rounded-xl mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Total Months</Label>
                    <Input type="number" value={emiForm.total} onChange={(e) => setEmiForm({ ...emiForm, total: e.target.value })} placeholder="Total" className="rounded-xl mt-1" />
                  </div>
                </div>
                <Button onClick={saveEmi}
                  className="w-full accent-gradient border-0 rounded-2xl h-11">{editingEmi ? 'Save changes' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* add transaction */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingTx(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogTitle className="text-xl font-bold">{editingTx ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map((tp) => (
                <button key={tp} onClick={() => { setType(tp); setForm({ ...form, category: tp === 'expense' ? 'Food' : 'Salary' }); }}
                  className={cn('rounded-2xl py-3 font-semibold capitalize press transition-all',
                    type === tp ? (tp === 'expense' ? 'bg-red-500 text-white shadow-glow' : 'bg-emerald-500 text-white shadow-glow') : 'glass text-muted-foreground')}>
                  {tp === 'expense' ? '💸 Expense' : '💵 Income'}
                </button>
              ))}
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1.5 rounded-xl h-14 text-2xl font-bold text-center" />
            </div>
            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {(type === 'expense' ? EXPENSE_CATS : INCOME_CATS).map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, category: c })}
                    className={cn('rounded-xl py-2 flex flex-col items-center gap-0.5 press text-[9px] font-medium transition-all',
                      form.category === c ? 'text-white shadow-glow' : 'glass text-muted-foreground')}
                    style={form.category === c ? { backgroundColor: CAT_COLORS[c] ?? 'hsl(var(--primary))' } : undefined}>
                    <span className="text-base">{CAT_EMOJI[c]}</span>{c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Note" className="rounded-xl" />
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
            </div>
            <Button onClick={save} className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editingTx ? 'Save changes' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
