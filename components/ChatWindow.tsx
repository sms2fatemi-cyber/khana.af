
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Loader2, User } from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface ChatWindowProps {
  receiverPhone: string;
  adId: string;
  adTitle: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ receiverPhone, adId, adTitle, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const userPhone = localStorage.getItem('user_phone') || '';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('public:user_chats')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: TABLES.USER_CHATS 
      }, (payload) => {
        if (
          (payload.new.sender_phone === userPhone && payload.new.receiver_phone === receiverPhone) ||
          (payload.new.sender_phone === receiverPhone && payload.new.receiver_phone === userPhone)
        ) {
          setMessages(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [receiverPhone, userPhone]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_CHATS)
        .select('*')
        .or(`and(sender_phone.eq.${userPhone},receiver_phone.eq.${receiverPhone}),and(sender_phone.eq.${receiverPhone},receiver_phone.eq.${userPhone})`)
        .eq('ad_id', adId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      console.error("Chat fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from(TABLES.USER_CHATS).insert([{
        sender_phone: userPhone,
        receiver_phone: receiverPhone,
        ad_id: adId,
        ad_title: adTitle,
        text: inputText.trim(),
        is_read: false
      }]);

      if (error) throw error;
      setInputText('');
    } catch (e) {
      alert("خطا در ارسال پیام");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[13000] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md h-[90vh] md:h-[600px] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600"><User size={20} /></div>
             <div>
                <h3 className="font-black text-sm text-gray-800">{receiverPhone}</h3>
                <p className="text-[9px] text-gray-400 font-bold truncate max-w-[150px]">{adTitle}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"><X size={24} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold text-xs">هنوز پیامی وجود ندارد. گفتگو را شروع کنید!</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender_phone === userPhone ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-6 shadow-sm ${
                  msg.sender_phone === userPhone 
                  ? 'bg-red-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-gray-50 focus:ring-2 focus:ring-red-100 transition-all"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isSending}
            className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center active:scale-90 disabled:opacity-50 transition-all"
          >
            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} className="rotate-180" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
