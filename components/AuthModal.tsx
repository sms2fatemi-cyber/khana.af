import React, { useState, useEffect, useRef } from 'react';
import { List, Heart, LogOut, User, Loader2, ChevronRight, Camera, ArrowLeft, MessageSquare, UserCircle, Bell, CheckCheck, Edit2, Check } from 'lucide-react';
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

const toEnglishDigits = (str: any) => {
  if (str === null || str === undefined) return '';
  return str.toString().replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
                       .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onShowMyAds, onShowSaved, onAdminClick, lang, hasUnreadChats, onCheckNotifications }) => {
  const t = translations[lang];
  const [view, setView] = useState<'login' | 'profile' | 'user_chats' | 'admin_notifications'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({ fullName: '', avatarUrl: '' });
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) { loadProfile(savedPhone); }
  }, []);

  const loadProfile = async (phone: string) => {
    setPhoneNumber(phone);
    setIsLoading(true);
    try {
      const { data } = await supabase.from('profiles').select('*').eq('phone', phone).single();
      if (data) {
        setProfile({ fullName: data.full_name || '', avatarUrl: data.avatar_url || '' });
        setFullName(data.full_name || '');
        setView('profile');
      } else { setView('login'); }
    } catch (e) { setView('login'); } finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    const cleanPhone = toEnglishDigits(phoneNumber.trim());
    const phoneRegex = /^07\d{8}$/;
    if (!phoneRegex.test(cleanPhone) || fullName.trim().length < 2) {
      alert("اطلاعات را درست وارد کنید."); return;
    }
    setIsLoading(true);
    try {
      await supabase.from('profiles').upsert({ phone: cleanPhone, full_name: fullName.trim(), updated_at: new Date() }, { onConflict: 'phone' });
      localStorage.setItem('user_phone', cleanPhone);
      setProfile({ fullName: fullName.trim(), avatarUrl: '' });
      setView('profile');
      onCheckNotifications();
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleUpdateName = async () => {
    if (fullName.trim().length < 2) return;
    setIsLoading(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('phone', phoneNumber);
      setProfile(prev => ({ ...prev, fullName: fullName.trim() }));
      setIsEditingName(false);
    } catch (e) { alert("خطا"); } finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_phone');
    setView('login');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      try {
        const url = await uploadImage(e.target.files[0]);
        if (url) {
          await supabase.from('profiles').update({ avatar_url: url }).eq('phone', phoneNumber);
          setProfile(prev => ({ ...prev, avatarUrl: url }));
        }
      } catch (err) { alert("خطا"); } finally { setIsLoading(false); }
    }
  };

  const fetchUserChats = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.USER_CHATS).select('*').or(`sender_phone.eq.${phoneNumber},receiver_phone.eq.${phoneNumber}`).order('created_at', { ascending: false });
      const map: Record<string, any> = {};
      for (const msg of (data || [])) {
        const other = msg.sender_phone === phoneNumber ? msg.receiver_phone : msg.sender_phone;
        const key = `${other}_${msg.ad_id}`;
        if (!map[key]) {
          const { data: p } = await supabase.from('profiles').select('full_name').eq('phone', other).maybeSingle();
          map[key] = { ...msg, otherName: p?.full_name || other, otherPhone: other };
        }
      }
      setUserConversations(Object.values(map));
    } finally { setIsLoading(false); }
  };

  const fetchAdminMessages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.MESSAGES).select('*').eq('target_phone', phoneNumber).order('date', { ascending: false });
      setAdminMessages(data || []);
      if (data?.some(m => !m.is_read)) {
        await supabase.from(TABLES.MESSAGES).update({ is_read: true }).eq('target_phone', phoneNumber);
        onCheckNotifications();
      }
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (view === 'user_chats') fetchUserChats();
    if (view === 'admin_notifications') fetchAdminMessages();
  }, [view]);

  if (view === 'login') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#a62626] mb-3"> <UserCircle size={40} /> </div>
          <h2 className="text-xl font-black">{t.login_title}</h2>
        </div>
        <div className="space-y-4">
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="نام و تخلص" className="w-full bg-gray-50 border rounded-2xl py-3.5 px-5 font-bold outline-none" />
          <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(toEnglishDigits(e.target.value))} placeholder="07XXXXXXXX" className="w-full bg-gray-50 border rounded-2xl py-3.5 px-5 font-black text-left outline-none" />
          <button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black">{isLoading ? <Loader2 className="animate-spin m-auto" /> : 'ورود / ثبت‌نام'}</button>
        </div>
      </div>
    </div>
  );

  if (view === 'admin_notifications') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-[80vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('profile')} className="p-2"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-black">{t.notifications}</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
          {adminMessages.map((msg, i) => (
            <div key={i} className="p-5 bg-red-50 rounded-3xl relative border-r-4 border-red-600">
               <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-2"> <span>سیستم</span> <span>{getRelativeTime(msg.date, lang)}</span> </div>
               <p className="text-sm font-bold leading-7">{msg.text}</p>
               <div className="mt-2 text-blue-500"><CheckCheck size={14} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (view === 'user_chats') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-[80vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('profile')} className="p-2"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-black">گفتگوها</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          {userConversations.map((c, i) => (
            <div key={i} onClick={() => setActiveChat({ phone: c.otherPhone, name: c.otherName, id: c.ad_id, title: c.ad_title })} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer">
              <div>
                <h4 className="font-black text-sm">{c.otherName}</h4>
                <p className="text-[10px] text-gray-400">{c.ad_title}</p>
              </div>
              <ChevronRight size={18} />
            </div>
          ))}
        </div>
        {activeChat && <ChatWindow receiverPhone={activeChat.phone} receiverName={activeChat.name} adId={activeChat.id} adTitle={activeChat.title} onClose={() => setActiveChat(null)} />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-xs md:max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col relative" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-4 mb-8">
           <div className="relative">
              <div className="w-24 h-24 bg-gray-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl">
                 {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300 m-auto mt-6" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#a62626] text-white p-2 rounded-xl"><Camera size={16} /></button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
           </div>
           <div className="text-center w-full">
              {isEditingName ? (
                <div className="flex gap-2">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="flex-1 border rounded-lg px-2 py-1 text-sm font-black" />
                  <button onClick={handleUpdateName} className="p-1 bg-green-500 text-white rounded"><Check size={16}/></button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-black">{profile.fullName || phoneNumber}</h3>
                  <button onClick={() => setIsEditingName(true)} className="text-gray-400"><Edit2 size={14}/></button>
                </div>
              )}
              <div className="text-gray-400 text-xs mt-1" dir="ltr">{phoneNumber}</div>
           </div>
        </div>
        <div className="space-y-3">
          <button onClick={() => setView('admin_notifications')} className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl text-blue-700 font-black">
            <div className="flex items-center gap-3"><Bell size={20} /> {t.notifications}</div>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setView('user_chats')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black relative">
            <div className="flex items-center gap-3"><MessageSquare size={20} /> گفتگوهای من</div>
            <div className="flex items-center gap-1">
              {hasUnreadChats && <div className="w-2 h-2 bg-red-600 rounded-full"></div>}
              <ChevronRight size={18} />
            </div>
          </button>
          <button onClick={onShowMyAds} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold"> <div className="flex items-center gap-3"><List size={20} /> {t.my_ads}</div> <ChevronRight size={18} /> </button>
          <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold"> <div className="flex items-center gap-3"><Heart size={20} /> {t.saved}</div> <ChevronRight size={18} /> </button>
          <div className="pt-4 border-t">
            <button onClick={handleLogout} className="w-full p-2 text-red-600 font-bold flex items-center justify-center gap-2"> <LogOut size={18} /> خروج </button>
          </div>
          <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 mt-2">پنل مدیریت</button>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;