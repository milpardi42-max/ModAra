import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Headphones } from 'lucide-react';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
};

const botResponses = [
  'سلام! خوش آمدید به مُدارا. چطور می‌تونم کمکتون کنم؟',
  'ممنون از پیامتون! تیم پشتیبانی ما به‌زودی پاسخ خواهند داد.',
  'برای پیگیری سفارش می‌تونید به صفحه «سفارش‌های من» در حساب کاربری‌تان مراجعه کنید.',
  'بله، ارسال برای سفارش‌های بالای ۵۰۰ هزار تومان رایگانه!',
  'محصولات ما همگی اصل و با ضمانت بازگشت ۷ روزه هستند.',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: botResponses[0], sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now(), text: input.trim(), sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const response = botResponses[Math.floor(Math.random() * (botResponses.length - 1)) + 1];
      setMessages((prev) => [...prev, { id: Date.now() + 1, text: response, sender: 'bot' }]);
      setTyping(false);
    }, 1500);
  };

  return (
    <>
      {/* Chat button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110 sm:bottom-6 sm:left-6 sm:h-14 sm:w-14 ${
          open ? 'bg-dark-900 text-white rotate-90' : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
        }`}
        aria-label="چت پشتیبانی"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-success-500" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] left-4 z-50 w-[calc(100vw-2rem)] max-w-sm origin-bottom-left transition-all duration-300 sm:bottom-24 sm:left-6 sm:w-[calc(100vw-3rem)] ${
          open ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        dir="rtl"
      >
        <div className="overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-600 to-orange-700 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">پشتیبانی مُدارا</p>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success-300 animate-pulse" />
                  آنلاین
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-[min(20rem,45svh)] overflow-y-auto bg-dark-50 p-4 space-y-3 scrollbar-hide">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-amber-600 text-white rounded-bl-sm'
                      : 'bg-white border border-dark-100 text-dark-700 rounded-br-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-end">
                <div className="rounded-2xl bg-white border border-dark-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-dark-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-dark-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-dark-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t border-dark-100 p-3 flex gap-2 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              className="flex-1 rounded-xl border border-dark-200 bg-dark-50 px-4 py-2.5 text-sm text-dark-900 placeholder-dark-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="submit"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white transition-all hover:bg-amber-700 active:scale-90"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
