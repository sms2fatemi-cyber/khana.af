import React, { useState, useEffect, useRef } from 'react';
import { List, Heart, LogOut, User, Loader2, ChevronRight, Camera, ArrowLeft, MessageSquare, UserCircle, Bell, CheckCheck, Edit2, Check, X } from 'lucide-react';
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

// تابع تبدیل اعداد به انگلیسی
const toEnglishDigits = (str: string): string => {
  if (!str) return '';
  return str.toString()
    .replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

// پاکسازی شماره برای دیتابیس
const cleanPhoneNumber = (str: string): string => {
  let digits = toEnglishDigits(str).replace(/\D/g, '');
  if (digits.startsWith('93')) {
    digits = '0' + digits.substring(2);
  }
  return digits;
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

  // مانیتور کردن شماره تلفن برای تبدیل آنی (حل مشکل اندروید)
  useEffect(() => {
    const converted = toEnglishDigits(phoneNumber);
    if (converted !== phoneNumber) {
      setPhoneNumber(converted);
    }
  }, [phoneNumber]);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      loadProfile(savedPhone);
    }
  }, []);

  const loadProfile = async (phone: string) => {
    const cleanPhone = cleanPhoneNumber(phone);
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (data) {
        setProfile({ fullName: data.full_name || '', avatarUrl: data.avatar_url || '' });
        setFullName(data.full_name || '');
        setPhoneNumber(cleanPhone);
        setView('profile');
      } else {
        setView('login');
      }
    } catch (e) {
      setView('login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const cleanPhone = cleanPhoneNumber(phoneNumber);
    const finalName = fullName.trim();

    // اعتبارسنجی بسیار ساده برای رفع مشکل اندروید
    if (finalName.length < 1) {
      alert("لطفاً نام خود را وارد کنید.");
      return;
    }

    if (!cleanPhone.startsWith('07') || cleanPhone.length !== 10) {
      alert("شماره موبایل باید ۱۰ رقم و با 07 شروع شود.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          phone: cleanPhone, 
          full_name: finalName,
          updated_at: new Date()
        }, { onConflict: 'phone' });

      if (error) throw error;

      localStorage.setItem('user_phone', cleanPhone);
      setProfile({ fullName: finalName, avatarUrl: '' });
      setPhoneNumber(cleanPhone);
      setView('profile');
      onCheckNotifications();
    } catch (e: any) {
      alert("خطا: " + (e.message || "ورود ناموفق بود."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!fullName.trim()) return;
    setIsLoading(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('phone', phoneNumber);
      setProfile(prev => ({ ...prev, fullName: fullName.trim() }));
      setIsEditingName(false);
    } catch (e) {
      alert("خطا در بروزرسانی نام");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_phone');
    setView('login');
    setPhoneNumber('');
    setFullName('');
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
      } catch (err) {
        alert("خطا در آپلود عکس");
      } finally {
        setIsLoading(false);
      }
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
    } finally {
      setIsLoading(false);
    }
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
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-[10px] text-gray-400 mt-1 font-bold">برای ثبت آگهی یا چت وارد شوید</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">نام و تخلص</label>
            <input 
              type="text" 
              value={fullName} 
              onInput={(e: any) => setFullName(e.target.value)}
              placeholder="نام شما" 
              className="w-full bg-gray-50 border rounded-2xl py-3.5 px-5 font-bold outline-none focus:border-red-200 transition-all text-right" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">شماره موبایل</label>
            <input 
              type="tel" 
              inputMode="numeric"
              value={phoneNumber} 
              onInput={(e: any) => setPhoneNumber(e.target.value)}
              placeholder="07XXXXXXXX" 
              className="w-full bg-gray-50 border rounded-2xl py-3.5 px-5 font-black text-left outline-none focus:border-red-200 transition-all" 
              dir="ltr" 
            />
          </div>
          <button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all mt-2 flex items-center justify-center">
            {isLoading ? <Loader2 className="animate-spin" /> : 'ورود / ثبت‌نام'}
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'admin_notifications') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-[80vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-black">{t.notifications}</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
          {adminMessages.length === 0 ? (
            <div className="text-center py-20 text-gray-300 font-bold">پیامی ندارید</div>
          ) : (
            adminMessages.map((msg, i) => (
              <div key={i} className="p-5 bg-red-50 rounded-3xl relative border-r-4 border-red-600">
                 <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-2"> <span>سیستم</span> <span>{getRelativeTime(msg.date, lang)}</span> </div>
                 <p className="text-sm font-bold leading-7 text-gray-800">{msg.text}</p>
                 <div className="mt-2 text-blue-500"><CheckCheck size={14} /></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (view === 'user_chats') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-[80vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} /></button>
          <h2 className="text-xl font-black">گفتگوها</h2>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
          {userConversations.length === 0 ? (
            <div className="text-center py-20 text-gray-300 font-bold">گفتگویی ندارید</div>
          ) : (
            userConversations.map((c, i) => (
              <div key={i} onClick={() => setActiveChat({ phone: c.otherPhone, name: c.otherName, id: c.ad_id, title: c.ad_title })} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors">
                <div>
                  <h4 className="font-black text-sm text-gray-800">{c.otherName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">{c.ad_title}</p>
                </div>
                <div className="flex items-center gap-2">
                   {!c.is_read && c.receiver_phone === phoneNumber && <div className="w-2 h-2 bg-red-600 rounded-full"></div>}
                   <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
            ))
          )}
        </div>
        {activeChat && <ChatWindow receiverPhone={activeChat.phone} receiverName={activeChat.name} adId={activeChat.id} adTitle={activeChat.title} onClose={() => setActiveChat(null)} />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-xs md:max-w-sm rounded-[3rem] p-8 shadow-2xl flex flex-col relative animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-4 mb-8">
           <div className="relative">
              <div className="w-24 h-24 bg-gray-100 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl">
                 {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300 m-auto mt-6" />}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#a62626] text-white p-2 rounded-xl shadow-lg active:scale-90 transition-transform"><Camera size={16} /></button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarUpload} />
           </div>
           <div className="text-center w-full">
              {isEditingName ? (
                <div className="flex gap-2 animate-in fade-in zoom-in-95">
                  <input type="text" value={fullName} onInput={(e: any) => setFullName(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm font-black outline-none focus:border-red-400" />
                  <button onClick={handleUpdateName} className="p-2 bg-green-500 text-white rounded-xl shadow-md"><Check size={18}/></button>
                  <button onClick={() => setIsEditingName(false)} className="p-2 bg-gray-200 text-gray-500 rounded-xl shadow-md"><X size={18}/></button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-black text-gray-800">{profile.fullName || phoneNumber}</h3>
                  <button onClick={() => setIsEditingName(true)} className="text-gray-300 hover:text-red-600 transition-colors"><Edit2 size={14}/></button>
                </div>
              )}
              <div className="text-gray-400 text-xs mt-1 font-black" dir="ltr">{phoneNumber}</div>
           </div>
        </div>
        <div className="space-y-3">
          <button onClick={() => setView('admin_notifications')} className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl text-blue-700 font-black hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-3"><Bell size={20} /> {t.notifications}</div>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setView('user_chats')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black relative hover:bg-red-100 transition-colors">
            <div className="flex items-center gap-3"><MessageSquare size={20} /> گفتگوهای من</div>
            <div className="flex items-center gap-1">
              {hasUnreadChats && <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse border-2 border-white"></div>}
              <ChevronRight size={18} />
            </div>
          </button>
          <button onClick={onShowMyAds} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-black text-gray-700 transition-colors"> <div className="flex items-center gap-3"><List size={20} /> {t.my_ads}</div> <ChevronRight size={18} /> </button>
          <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-black text-gray-700 transition-colors"> <div className="flex items-center gap-3"><Heart size={20} /> {t.saved}</div> <ChevronRight size={18} /> </button>
          <div className="pt-4 border-t">
            <button onClick={handleLogout} className="w-full p-3 text-red-600 font-black flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-colors"> <LogOut size={18} /> خروج از حساب </button>
          </div>
          <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 mt-2 font-bold hover:text-gray-400 transition-colors">ورود به پنل مدیریت</button>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;