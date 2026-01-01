
import React, { useState, useEffect, useRef } from 'react';
import { Heart, LogOut, User, Loader2, Bell, ChevronRight, Camera, ArrowLeft, CheckCircle2, MessageSquare, Phone, List } from 'lucide-react';
import { translations } from '../services/translations';
import { supabase, TABLES, uploadImage } from '../services/supabaseClient';
import { AdminMessage, UserChat } from '../types';
import ChatWindow from './ChatWindow';

interface AuthModalProps {
  onClose: () => void;
  onShowMyAds: () => void;
  onShowSaved: () => void;
  onAdminClick: () => void;
  lang: 'dari' | 'pashto';
  hasUnreadChats?: boolean;
  hasUnreadAdmin?: boolean;
  onCheckNotifications: () => void;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onShowMyAds, onShowSaved, onAdminClick, lang, hasUnreadChats, hasUnreadAdmin, onCheckNotifications }) => {
  const t = translations[lang];
  const [view, setView] = useState<'login' | 'profile' | 'messages' | 'user_chats'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ firstName: '', lastName: '', avatarUrl: '' });
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [userConversations, setUserConversations] = useState<UserChat[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      const savedProfile = localStorage.getItem(`profile_${savedPhone}`);
      if (savedProfile) {
        try { setProfile(JSON.parse(savedProfile)); } catch (e) {}
      }
      setView('profile');
    }
  }, []);

  const handleQuickLogin = () => {
    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      alert(lang === 'dari' ? "شماره باید ۱۰ رقم باشد و با ۰۷ شروع شود" : "شماره باید ۱۰ رقم وي");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('user_phone', phoneNumber);
      setIsLoading(false);
      window.location.reload(); 
    }, 600);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_phone');
    window.location.reload();
  };

  const saveProfileToLocal = () => {
    setIsLoading(true);
    localStorage.setItem(`profile_${phoneNumber}`, JSON.stringify(profile));
    setTimeout(() => {
      setIsLoading(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    }, 800);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      const url = await uploadImage(e.target.files[0]);
      if (url) {
        const newProfile = { ...profile, avatarUrl: url };
        setProfile(newProfile);
        localStorage.setItem(`profile_${phoneNumber}`, JSON.stringify(newProfile));
      }
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.MESSAGES).select('*').eq('target_phone', phoneNumber).order('created_at', { ascending: false });
      setMessages(data || []);
      await supabase.from(TABLES.MESSAGES).update({ is_read: true }).eq('target_phone', phoneNumber).eq('is_read', false);
      onCheckNotifications();
    } catch (e) {} finally { setIsLoading(false); }
  };

  const fetchUserChats = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.USER_CHATS).select('*').or(`sender_phone.eq.${phoneNumber},receiver_phone.eq.${phoneNumber}`).order('created_at', { ascending: false });
      const conversationsMap: Record<string, UserChat> = {};
      data?.forEach((msg: UserChat) => {
        const otherPhone = msg.sender_phone === phoneNumber ? msg.receiver_phone : msg.sender_phone;
        const key = `${otherPhone}_${msg.ad_id}`;
        if (!conversationsMap[key]) conversationsMap[key] = msg;
      });
      setUserConversations(Object.values(conversationsMap));
    } catch (e) {} finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (view === 'messages' && phoneNumber) fetchMessages();
    if (view === 'user_chats' && phoneNumber) fetchUserChats();
  }, [view, phoneNumber]);

  if (view === 'login') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-[#a62626] mb-4">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-black text-center">{t.login_title}</h2>
          <p className="text-xs text-gray-400 mt-2 font-bold">ورود مستقیم به حساب کاربری</p>
        </div>
        <div className="space-y-6">
          <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} maxLength={10} placeholder="07XXXXXXXX" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-5 px-6 text-2xl font-black text-left dir-ltr outline-none focus:border-[#a62626]" />
          <button onClick={handleQuickLogin} disabled={isLoading} className="w-full bg-[#a62626] text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-50">
            {isLoading ? <Loader2 className="animate-spin m-auto" /> : 'ورود به برنامه'}
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'messages') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full max-h-[85vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-black">{t.notifications}</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#a62626]" /></div> : messages.length === 0 ? <div className="text-center py-10 text-gray-400 font-bold">پیامی ندارید.</div> : messages.map(msg => <div key={msg.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 font-bold text-gray-700 leading-7">{msg.text}</div>)}
        </div>
      </div>
    </div>
  );

  if (view === 'user_chats') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-full max-h-[85vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-black">گفتگوهای من</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#a62626]" /></div> : userConversations.length === 0 ? <div className="text-center py-10 text-gray-400 font-bold">هنوز گفتگویی ندارید.</div> : userConversations.map((conv, i) => {
            const otherPhone = conv.sender_phone === phoneNumber ? conv.receiver_phone : conv.sender_phone;
            return (
              <div key={i} onClick={() => setActiveChat({ phone: otherPhone, id: conv.ad_id, title: conv.ad_title })} className="bg-gray-50 p-4 rounded-2xl border flex items-center justify-between cursor-pointer hover:bg-white transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm border"><User size={24} /></div>
                  <div className="max-w-[180px]"><h4 className="font-black text-sm text-gray-800">{otherPhone}</h4><p className="text-[10px] text-gray-400 font-bold truncate">{conv.ad_title}</p></div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            );
          })}
        </div>
        {activeChat && <ChatWindow receiverPhone={activeChat.phone} adId={activeChat.id} adTitle={activeChat.title} onClose={() => { setActiveChat(null); fetchUserChats(); onCheckNotifications(); }} />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-xs md:max-w-sm max-h-[90vh] rounded-[3rem] p-8 shadow-2xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
            <div className="flex flex-col items-center gap-4 mb-8">
               <div className="relative">
                  <div className="w-24 h-24 bg-gray-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                     {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300" />}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#a62626] text-white p-2 rounded-xl shadow-lg border-2 border-white active:scale-90 transition-transform"><Camera size={16} /></button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
               </div>
               <div className="w-full space-y-3 text-center">
                  <div className="grid grid-cols-2 gap-2">
                     <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} placeholder="نام" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-center font-bold text-sm outline-none" />
                     <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} placeholder="تخلص" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-center font-bold text-sm outline-none" />
                  </div>
                  <button onClick={saveProfileToLocal} disabled={isLoading} className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${showSaveSuccess ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-700'}`}>
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : showSaveSuccess ? <><CheckCircle2 size={16} /> ذخیره شد</> : 'ذخیره تغییرات'}
                  </button>
                  <div className="flex items-center justify-center gap-2 text-gray-400 font-black text-lg bg-gray-50 py-2 rounded-xl border border-dashed mt-2">
                    <Phone size={16} /> <span dir="ltr">{phoneNumber}</span>
                  </div>
               </div>
            </div>
            <div className="space-y-3 pb-4">
              <button onClick={() => setView('user_chats')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black transition-all">
                <div className="flex items-center gap-3"><MessageSquare size={20} /> گفتگوهای من</div>
                <div className="flex items-center gap-2">{hasUnreadChats && <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></div>}<ChevronRight size={18} /></div>
              </button>
              <button onClick={() => setView('messages')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold transition-all">
                <div className="flex items-center gap-3"><Bell size={20} /> {t.notifications}</div>
                <div className="flex items-center gap-2">{hasUnreadAdmin && <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></div>}<ChevronRight size={18} /></div>
              </button>
              <button onClick={onShowMyAds} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold transition-all"><div className="flex items-center gap-3"><List size={20} /> {t.my_ads}</div><ChevronRight size={18} /></button>
              <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold transition-all"><div className="flex items-center gap-3"><Heart size={20} /> {t.saved}</div><ChevronRight size={18} /></button>
              <div className="pt-4 border-t space-y-2">
                <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all"><ArrowLeft size={18} /> بازگشت</button>
                <button onClick={handleLogout} className="w-full p-4 text-red-600 font-bold flex items-center justify-center gap-2 transition-all"><LogOut size={18} /> خروج از حساب</button>
              </div>
              <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 font-bold mt-2 text-center pb-4">پنل ادمین</button>
            </div>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
