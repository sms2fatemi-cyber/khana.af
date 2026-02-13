
import { useState, useEffect } from 'react';
import { supabase, TABLES } from '../services/supabaseClient';
import { ChevronLeft, MessageCircle, Package, Loader2, ShieldCheck } from 'lucide-react';
import ChatWindow from './ChatWindow';

interface ChatListProps {
  onClose: () => void;
}

const ChatList: React.FC<ChatListProps> = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const userPhone = localStorage.getItem('user_phone');

  const fetchConversations = async () => {
    if (!userPhone) return;
    try {
      const { data } = await supabase
        .from(TABLES.USER_CHATS)
        .select('*')
        .or(`sender_phone.eq.${userPhone},receiver_phone.eq.${userPhone}`)
        .order('created_at', { ascending: false });

      if (data) {
        const unique = data.reduce((acc: any[], curr: any) => {
          const otherPhone = curr.sender_phone === userPhone ? curr.receiver_phone : curr.sender_phone;
          const key = `${curr.ad_id}_${otherPhone}`;
          const existing = acc.find(x => x.key === key);
          
          if (!existing) {
            acc.push({ 
              ...curr, 
              otherPhone, 
              key, 
              unreadCount: (curr.receiver_phone === userPhone && !curr.is_read) ? 1 : 0 
            });
          } else {
            if (curr.receiver_phone === userPhone && !curr.is_read) {
              existing.unreadCount += 1;
            }
          }
          return acc;
        }, []);
        setConversations(unique);
      }
    } catch (e) {
      console.error("Chat fetch error:", e);
    } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchConversations();
    if (!userPhone) return;
    
    const channel = supabase.channel('chat_list_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.USER_CHATS }, () => {
        fetchConversations();
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [userPhone]);

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
         <div className="bg-red-50 p-3 rounded-2xl text-red-600"><MessageCircle size={24}/></div>
         <div>
            <h2 className="text-xl font-black">گفتگوهای من</h2>
            <p className="text-[10px] text-gray-400 font-black">تمام پیام‌های مربوط به آگهی‌ها و پشتیبانی.</p>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-24">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div> :
         conversations.length === 0 ? <div className="text-center py-32 text-gray-300 font-black">هنوز گفتگویی ندارید.</div> :
         conversations.map((chat, i) => (
           <div key={i} onClick={() => setSelectedChat(chat)} className={`bg-white p-4 rounded-[1.8rem] border transition-all flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.98] ${chat.otherPhone === 'ADMIN' ? 'border-red-200 bg-red-50/20' : 'hover:border-red-200'}`}>
              <div className="flex items-center gap-4 text-right overflow-hidden flex-1">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 ${chat.otherPhone === 'ADMIN' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                    {chat.otherPhone === 'ADMIN' ? <ShieldCheck size={24}/> : <Package size={24}/>}
                 </div>
                 <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-2">
                       <h4 className="font-black text-sm text-gray-800 truncate">{chat.ad_title}</h4>
                       {chat.unreadCount > 0 && <div className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{chat.unreadCount}</div>}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">
                       {chat.otherPhone === 'ADMIN' ? 'مدیریت خانه (پشتیبانی)' : `طرف مقابل: ${chat.otherPhone}`}
                    </p>
                 </div>
              </div>
              <ChevronLeft size={18} className="text-gray-300 shrink-0" />
           </div>
         ))
        }
      </div>

      {selectedChat && (
        <ChatWindow 
          adId={selectedChat.ad_id} 
          adTitle={selectedChat.ad_title} 
          receiverPhone={selectedChat.otherPhone} 
          onClose={() => setSelectedChat(null)} 
        />
      )}
    </div>
  );
};
export default ChatList;
