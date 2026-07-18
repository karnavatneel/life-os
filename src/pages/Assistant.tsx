import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { Page, PageHeader } from '@/components/shared';
import { buildAssistant } from '@/lib/assistant-engine';
import { useApp } from '@/lib/store';
import { cn } from '@/lib/utils';

interface Msg { id: string; role: 'user' | 'ai'; text: string; }

const QUICK_PROMPTS = [
  'How am I doing this week?',
  'Suggest a new habit for me',
  'Analyze my mood',
  'How is my spending?',
  'Help me plan tomorrow',
  'Summarize my journal',
];

export default function Assistant() {
  const app = useApp();
  const engine = useMemo(() => buildAssistant(app), [app]);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: '0', role: 'ai', text: `Hey ${app.profile.name.split(' ')[0]} ✨ I'm your Life OS assistant. I've looked at your habits, mood, money and more — ask me anything, or tap a suggestion below.` },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { id: crypto.randomUUID(), role: 'user', text: t }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: crypto.randomUUID(), role: 'ai', text: engine.answer(t) }]);
      setTyping(false);
    }, 900);
  };

  return (
    <Page className="flex flex-col !pb-28" >
      <PageHeader title="AI Assistant" subtitle="Insights from your real data" />

      <div className="flex-1 space-y-3">
        {msgs.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line',
              m.role === 'user' ? 'accent-gradient text-white rounded-br-lg shadow-glow' : 'glass rounded-bl-lg')}>
              {m.role === 'ai' && <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-primary" />}
              {m.text}
            </div>
          </motion.div>
        ))}
        {typing && (
          <div className="flex">
            <div className="glass rounded-3xl rounded-bl-lg px-4 py-3 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-primary"
                  animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* quick prompts */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-3 -mx-4 px-4">
        {QUICK_PROMPTS.map((q) => (
          <button key={q} onClick={() => send(q)} className="glass rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap press shrink-0">
            {q}
          </button>
        ))}
      </div>

      {/* input */}
      <div className="fixed md:sticky bottom-[76px] md:bottom-4 inset-x-0 px-4 md:px-0 z-30 max-w-3xl mx-auto w-full">
        <div className="glass-strong rounded-full flex items-center gap-2 p-2 shadow-glow">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Ask about your habits, mood, money…"
            className="flex-1 bg-transparent outline-none px-3 text-sm placeholder:text-muted-foreground" />
          <button onClick={() => send(input)} className="w-10 h-10 rounded-full accent-gradient text-white flex items-center justify-center press shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Page>
  );
}
