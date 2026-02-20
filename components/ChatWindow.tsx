
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Loader2 } from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface ChatWindowProps {
  receiverPhone: string;
  receiverName?: string;
  adId: string;
  adTitle: string;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ receiverPhone, receiverName, adId, adTitle, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [displayName, setDisplayName] = useState(receiverName || receiverPhone);
  const userPhone = localStorage.getItem('user_phone') || '';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const markAsRead = useCallback(async () => {
    if (!userPhone || !receiverPhone || !adId) return;
    try {
      // Step 1: Update the database
      const { error } = await supabase
        .from(TABLES.USER_CHATS)
        .update({ is_read: true })
        .match({ 
          ad_id: adId, 
          receiver_phone: userPhone, 
          sender_phone: receiverPhone,
          is_read: false 
        });
      
      if (error) {
        console.error("MarkAsRead Error:", error);
      } else {
        // Step 2: Dispatch a custom event to force refresh UI in other components
        window.dispatchEvent(new CustomEvent('messages_read'));
      }
    } catch (e) {
      console.error("MarkAsRead Exception:", e);
    }
  }, [adId, receiverPhone, userPhone]);

  useEffect(() => {
    const initChat = async () => {
      if (receiverPhone === 'ADMIN') {
        setDisplayName('پشتیبانی خانه');
      } else if (!receiverName) {
        const { data } = await supabase.from('profiles').select('full_name').eq('phone', receiverPhone).maybeSingle();
        if (data?.full_name) setDisplayName(data.full_name);
      }
      await fetchMessages();
      await markAsRead(); 
    };

    initChat();
    
    const channel = supabase
      .channel(`chat_active_${adId}_${userPhone}_${receiverPhone}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: TABLES.USER_CHATS,
        filter: `ad_id=eq.${adId}` 
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new;
          if ((newMsg.sender_phone === userPhone && newMsg.receiver_phone === receiverPhone) ||
              (newMsg.sender_phone === receiverPhone && newMsg.receiver_phone === userPhone)) {
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.receiver_phone === userPhone) {
              markAsRead();
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [adId, receiverPhone, userPhone, receiverName, markAsRead]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from(TABLES.USER_CHATS)
        .select('*')
        .eq('ad_id', adId)
        .or(`and(sender_phone.eq.${userPhone},receiver_phone.eq.${receiverPhone}),and(sender_phone.eq.${receiverPhone},receiver_phone.eq.${userPhone})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    } catch (e) {
      console.error("Fetch error:", e);
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
      alert("خطا در ارسال پیام."); 
    } finally { 
      setIsSending(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[13000] bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md h-[90vh] md:h-[600px] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-black uppercase shadow-inner">
                {displayName ? displayName[0] : '#'}
             </div>
             <div>
                <h3 className="font-black text-sm text-gray-800">{displayName}</h3>
                <p className="text-[9px] text-gray-400 font-bold truncate max-w-[150px]">{adTitle}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] no-scrollbar">
          {isLoading ? ( <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div> ) : (
            messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex ${msg.sender_phone === userPhone ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] font-medium leading-6 shadow-sm ${msg.sender_phone === userPhone ? 'bg-[#a62626] text-white rounded-tr-none' : 'bg-white text-gray-700 rounded-tl-none border'}`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="پیام خود را بنویسید..." className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none border-2 border-transparent focus:border-red-100 transition-all" />
          <button type="submit" disabled={!inputText.trim() || isSending} className="w-12 h-12 bg-[#a62626] text-white rounded-xl flex items-center justify-center active:scale-90 disabled:opacity-50 transition-all shadow-lg">
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="rotate-180" />}
          </button>
        </form>
      </div>
    </div>
  );
};
export default ChatWindow;
