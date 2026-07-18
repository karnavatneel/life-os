import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Page, PageHeader, GlassCard, EmptyState, fmtMoney } from '@/components/shared';
import { useApp } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const GROCERY_CATS = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Snacks', 'Household'];
const WISHLIST_CATS = ['Tech', 'Fitness', 'Home', 'Fashion', 'Books', 'Other'];

import type { ShoppingItem } from '@/lib/types';
import { Pencil } from 'lucide-react';

export default function Shopping() {
  const { shopping, addShoppingItem, updateShoppingItem, toggleShopping, deleteShopping } = useApp();
  const [list, setList] = useState<'grocery' | 'wishlist'>('grocery');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Produce', qty: 1, price: '', recurring: false });

  const items = shopping.filter((i) => i.list === list);
  const pending = items.filter((i) => !i.purchased);
  const done = items.filter((i) => i.purchased);

  const estTotal = useMemo(() => pending.reduce((a, i) => a + i.price * i.qty, 0), [pending]);
  const inCart = useMemo(() => done.reduce((a, i) => a + i.price * i.qty, 0), [done]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof pending>();
    pending.forEach((i) => {
      const arr = m.get(i.category) ?? [];
      arr.push(i);
      m.set(i.category, arr);
    });
    return [...m.entries()];
  }, [pending]);

  const cats = list === 'grocery' ? GROCERY_CATS : WISHLIST_CATS;

  const startEdit = (i: ShoppingItem) => {
    setEditing(i);
    setForm({ name: i.name, category: i.category, qty: i.qty, price: String(i.price), recurring: i.recurring || false });
    setOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    const priceVal = parseFloat(form.price) || 0;
    if (editing) {
      updateShoppingItem(editing.id, { name: form.name, category: form.category, qty: form.qty, price: priceVal, recurring: form.recurring });
    } else {
      addShoppingItem({ name: form.name, list, category: form.category, qty: form.qty, price: priceVal, purchased: false, recurring: form.recurring });
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', category: cats[0], qty: 1, price: '', recurring: false });
  };

  return (
    <Page>
      <PageHeader title="Shopping" subtitle={`${pending.length} items to buy`}
        right={<Button onClick={() => { setForm({ ...form, category: cats[0] }); setOpen(true); }} className="accent-gradient border-0 rounded-2xl shadow-glow press"><Plus className="w-4 h-4 mr-1" /> Add</Button>} />

      <Tabs value={list} onValueChange={(v) => setList(v as typeof list)} className="mb-4">
        <TabsList className="glass rounded-2xl w-full grid grid-cols-2">
          <TabsTrigger value="grocery" className="rounded-xl">🛒 Groceries</TabsTrigger>
          <TabsTrigger value="wishlist" className="rounded-xl">✨ Wishlist</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* budget calculator */}
      <GlassCard className="mb-5 flex items-center justify-around text-center">
        <div>
          <div className="text-lg font-bold text-gradient">{fmtMoney(estTotal)}</div>
          <div className="text-[10px] text-muted-foreground">Estimated total</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="text-lg font-bold text-emerald-500">{fmtMoney(inCart)}</div>
          <div className="text-[10px] text-muted-foreground">In cart</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="text-lg font-bold">{items.length}</div>
          <div className="text-[10px] text-muted-foreground">Total items</div>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <EmptyState emoji={list === 'grocery' ? '🛒' : '✨'} title={list === 'grocery' ? 'List is empty' : 'No wishes yet'} hint="Add items with quantities and estimated prices."
          action={<Button onClick={() => setOpen(true)} className="accent-gradient border-0 rounded-2xl"><Plus className="w-4 h-4 mr-1" /> Add item</Button>} />
      ) : (
        <>
          {grouped.map(([cat, arr]) => (
            <div key={cat} className="mb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</div>
              <GlassCard className="!p-2 space-y-0.5">
                <AnimatePresence initial={false}>
                  {arr.map((i) => (
                    <motion.div key={i.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 50 }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40">
                      <button onClick={() => toggleShopping(i.id)} className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 press hover:border-primary transition-colors shrink-0" />
                      <span className="flex-1 text-sm font-medium">{i.name}{i.recurring && <span className="ml-1.5 text-[10px] text-primary">🔁 weekly</span>}</span>
                      <span className="text-xs text-muted-foreground">×{i.qty}</span>
                      <span className="text-sm font-semibold w-16 text-right">{fmtMoney(i.price * i.qty)}</span>
                      <div className="flex gap-0.5">
                        <button onClick={() => startEdit(i)} className="p-1 press" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => deleteShopping(i.id)} className="p-1 press" aria-label="Delete"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </GlassCard>
            </div>
          ))}

          {done.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">In cart ✓</div>
              <GlassCard className="!p-2 space-y-0.5 opacity-70">
                {done.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 p-2">
                    <button onClick={() => toggleShopping(i.id)} className="w-6 h-6 rounded-full accent-gradient text-white text-xs press">✓</button>
                    <span className="flex-1 text-sm line-through">{i.name}</span>
                    <span className="text-sm text-muted-foreground">{fmtMoney(i.price * i.qty)}</span>
                    <button onClick={() => startEdit(i)} className="p-1 press" aria-label="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                ))}
              </GlassCard>
            </div>
          )}
        </>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass-strong rounded-3xl max-w-sm">
          <DialogTitle className="text-xl font-bold">{editing ? 'Edit item' : `Add to ${list === 'grocery' ? 'groceries' : 'wishlist'}`}</DialogTitle>
          <div className="space-y-4 mt-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" className="rounded-xl h-12" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Quantity</div>
                <Input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Math.max(1, parseInt(e.target.value) || 1) })} className="rounded-xl" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Est. price</div>
                <Input type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" className="rounded-xl" />
              </div>
            </div>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <button onClick={() => setForm({ ...form, recurring: !form.recurring })}
              className={cn('w-full rounded-xl py-3 text-sm font-medium press transition-all', form.recurring ? 'accent-gradient text-white shadow-glow' : 'glass text-muted-foreground')}>
              🔁 Recurring weekly item
            </button>
            <Button onClick={save}
              className="w-full h-12 accent-gradient border-0 rounded-2xl font-semibold shadow-glow press">{editing ? 'Save changes' : 'Add item'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
