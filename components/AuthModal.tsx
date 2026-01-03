
import { useState, useEffect, useRef } from 'react';
import { List, Heart, LogOut, User, Loader2, ChevronRight, Camera, ArrowLeft, MessageSquare, Phone, UserCircle, Bell, CheckCheck, Shield } from 'lucide-react';
import { translations, getRelativeTime } from '../services/translations';
import { supabase, TABLES, uploadImage } from '../services/supabaseClient';
import ChatWindow from './ChatWindow.tsx';

interface AuthModalProps {
  onClose: () => void;
  onShowMyAds: () => void;
  onShowSaved: () => void;
  onAdminClick: () => void;
  lang: 'dari' | 'pashto';
  hasUnreadChats?: boolean;
  onCheckNotifications: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onShowMyAds, onShowSaved, onAdminClick, lang, hasUnreadChats, onCheckNotifications }) => {
  const t = translations[lang];
  const [view, setView] = useState<'login' | 'profile' | 'user_chats' | 'admin_notifications'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({ fullName: '', avatarUrl: '' });
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      loadProfile(savedPhone);
    }
  }, []);

  const loadProfile = async (phone: string) => {
    setPhoneNumber(phone);
    const { data } = await supabase.from('profiles').select('*').eq('phone', phone).single();
    if (data && data.full_name) {
      setProfile({ fullName: data.full_name, avatarUrl: data.avatar_url || '' });
      setFullName(data.full_name);
      setView('profile');
    } else {
      setView('login');
    }
  };

  const handleLogin = async () => {
    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert(lang === 'dari' ? "شماره باید با 07 شروع شده و 10 رقم باشد" : "شماره باید په 07 پیل او 10 عدد وي");
      return;
    }
    if (fullName.trim().length < 3) {
      alert(lang === 'dari' ? "لطفاً نام و تخلص کامل خود را وارد کنید" : "مهرباني وکړئ خپل بشپړ نوم ولیکئ");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        phone: phoneNumber,
        full_name: fullName,
        updated_at: new Date()
      });

      if (error) throw error;

      localStorage.setItem('user_phone', phoneNumber);
      setProfile(prev => ({ ...prev, fullName }));
      setView('profile');
    } catch (e: any) {
      alert("خطا در ورود: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_phone');
    setPhoneNumber('');
    setFullName('');
    setProfile({ fullName: '', avatarUrl: '' });
    setView('login');
    onClose(); 
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      const url = await uploadImage(e.target.files[0]);
      if (url) {
        await supabase.from('profiles').update({ avatar_url: url }).eq('phone', phoneNumber);
        setProfile(prev => ({ ...prev, avatarUrl: url }));
      }
      setIsLoading(false);
    }
  };

  const fetchUserChats = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.USER_CHATS)
        .select('*')
        .or(`sender_phone.eq.${phoneNumber},receiver_phone.eq.${phoneNumber}`)
        .order('created_at', { ascending: false });
      
      const conversationsMap: Record<string, any> = {};
      
      for (const msg of (data || [])) {
        const otherPhone = msg.sender_phone === phoneNumber ? msg.receiver_phone : msg.sender_phone;
        const key = `${otherPhone}_${msg.ad_id}`;
        
        if (!conversationsMap[key]) {
          const { data: pData } = await supabase.from('profiles').select('full_name').eq('phone', otherPhone).maybeSingle();
          conversationsMap[key] = { ...msg, otherName: pData?.full_name || otherPhone };
        }
      }
      setUserConversations(Object.values(conversationsMap));
    } catch (e) {} finally { setIsLoading(false); }
  };

  const fetchAdminMessages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.MESSAGES)
        .select('*')
        .eq('target_phone', phoneNumber)
        .order('date', { ascending: false });
      
      setAdminMessages(data || []);
      
      if (data && data.some(m => !m.is_read)) {
        // علامت‌گذاری به عنوان خوانده شده و اطلاع‌رسانی برای حذف نقطه قرمز
        await supabase.from(TABLES.MESSAGES).update({ is_read: true }).eq('target_phone', phoneNumber);
        onCheckNotifications(); 
      }
    } catch (e) {} finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (view === 'user_chats') fetchUserChats();
    if (view === 'admin_notifications') fetchAdminMessages();
  }, [view]);

  if (view === 'login') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#a62626] mb-3">
            <UserCircle size={40} />
          </div>
          <h2 className="text-xl font-black">{t.login_title}</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 mr-2">نام و تخلص (اجباری)</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="احمد ولی" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 px-5 text-sm font-bold outline-none focus:border-[#a62626]" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 mr-2">شماره تماس</label>
            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} maxLength={10} placeholder="07XXXXXXXX" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-3.5 px-5 text-lg font-black text-left dir-ltr outline-none focus:border-[#a62626]" />
          </div>
          <button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center">
            {isLoading ? <Loader2 className="animate-spin" /> : 'ورود / ثبت‌نام'}
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'admin_notifications') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-full max-h-[85vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => {setView('profile'); onCheckNotifications();}} className="p-2 hover:bg-gray-100 rounded-full transition-all active:scale-90"><ArrowLeft size={24} className={lang === 'dari' ? '' : 'rotate-180'} /></button>
          <h2 className="text-xl font-black">{t.notifications}</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
          {isLoading ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#a62626]" /></div> ) : adminMessages.length === 0 ? ( <div className="text-center py-20 flex flex-col items-center gap-4"> <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300"><Bell size={32} /></div> <p className="text-gray-400 font-bold text-sm">پیامی از طرف مدیریت دریافت نشده است.</p> </div> ) : (
            adminMessages.map((msg, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-1 h-full bg-[#a62626]"></div>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full">
                       <Shield size={12} className="text-[#a62626]" />
                       <span className="text-[10px] font-black text-[#a62626]">پیام سیستم</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold">{getRelativeTime(msg.date, lang)}</span>
                 </div>
                 <p className="text-sm font-bold text-gray-700 leading-7">{msg.text}</p>
                 <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                    <CheckCheck size={14} className="text-blue-500" />
                 </div>
              </div>
            ))
          )}
        </div>
        <button onClick={() => {setView('profile'); onCheckNotifications();}} className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black mt-4">بازگشت</button>
      </div>
    </div>
  );

  if (view === 'user_chats') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-full max-h-[85vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => {setView('profile'); onCheckNotifications();}} className="p-2 hover:bg-gray-100 rounded-full transition-all active:scale-90"><ArrowLeft size={24} className={lang === 'dari' ? '' : 'rotate-180'} /></button>
          <h2 className="text-xl font-black">گفتگوهای من</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
          {isLoading ? ( <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#a62626]" /></div> ) : userConversations.length === 0 ? ( <div className="text-center py-10 text-gray-400 font-bold">هنوز گفتگویی ندارید.</div> ) : (
            userConversations.map((conv, i) => {
              const otherPhone = conv.sender_phone === phoneNumber ? conv.receiver_phone : conv.sender_phone;
              return (
                <div key={i} onClick={() => setActiveChat({ phone: otherPhone, name: conv.otherName, id: conv.ad_id, title: conv.ad_title })} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm border font-black text-lg">{conv.otherName[0]}</div>
                     <div className="max-w-[180px]">
                        <h4 className="font-black text-sm text-gray-800 truncate">{conv.otherName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold truncate">{conv.ad_title}</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              );
            })
          )}
        </div>
        {activeChat && <ChatWindow receiverPhone={activeChat.phone} receiverName={activeChat.name} adId={activeChat.id} adTitle={activeChat.title} onClose={() => { setActiveChat(null); fetchUserChats(); onCheckNotifications(); }} />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-xs md:max-w-sm max-h-[90vh] rounded-[3rem] p-8 shadow-2xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
            <div className="flex flex-col items-center gap-4 mb-8">
               <div className="relative group">
                  <div className="w-24 h-24 bg-gray-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                     {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300" />}
                     {isLoading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#a62626] text-white p-2 rounded-xl shadow-lg border-2 border-white active:scale-90 transition-transform"><Camera size={16} /></button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
               </div>
               <div className="w-full text-center">
                  <h3 className="text-lg font-black text-gray-800">{profile.fullName || phoneNumber}</h3>
                  <div className="flex items-center justify-center gap-2 text-gray-400 font-bold text-sm mt-1">
                    <Phone size={14} /> <span dir="ltr">{phoneNumber}</span>
                  </div>
               </div>
            </div>

            <div className="space-y-3 pb-4">
              <button onClick={() => setView('admin_notifications')} className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl text-blue-700 font-black relative transition-all active:scale-95 group">
                <div className="flex items-center gap-3"><Bell size={20} className="group-hover:rotate-12 transition-transform" /> {t.notifications}</div>
                <div className="flex items-center gap-2">
                   {adminMessages.some(m => !m.is_read) && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full border border-white"></div>}
                   <ChevronRight size={18} />
                </div>
              </button>

              <button onClick={() => setView('user_chats')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black group relative transition-all active:scale-95">
                <div className="flex items-center gap-3"><MessageSquare size={20} /> گفتگوهای من</div>
                <div className="flex items-center gap-2"> {hasUnreadChats && <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></div>} <ChevronRight size={18} /> </div>
              </button>
              
              <button onClick={onShowMyAds} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold group transition-all"> <div className="flex items-center gap-3"><List size={20} /> {t.my_ads}</div> <ChevronRight size={18} /> </button>
              <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold group transition-all"> <div className="flex items-center gap-3"><Heart size={20} /> {t.saved}</div> <ChevronRight size={18} /> </button>
              
              <div className="pt-4 border-t space-y-2">
                <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all"> بازگشت </button>
                <button onClick={handleLogout} className="w-full p-4 text-red-600 font-bold flex items-center justify-center gap-2 transition-all"> <LogOut size={18} /> خروج از حساب </button>
              </div>
              <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 font-bold mt-2 text-center pb-4">ورود به پنل مدیریت</button>
            </div>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
