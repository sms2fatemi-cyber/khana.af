
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
  hasUnreadAdmin?: boolean;
  onCheckNotifications: () => void;
}

const forceEnglishDigits = (str: string): string => {
  if (!str) return '';
  return str.toString()
    .replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

const cleanPhoneNumber = (str: string): string => {
  let digits = forceEnglishDigits(str).replace(/\D/g, '');
  if (digits.startsWith('93')) {
    digits = '0' + digits.substring(2);
  }
  return digits;
};

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onShowMyAds, onShowSaved, onAdminClick, lang, hasUnreadChats, hasUnreadAdmin, onCheckNotifications }) => {
  const t = translations[lang];
  const hasSavedPhone = !!localStorage.getItem('user_phone');
  
  // لود کردن پروفایل از کاشه در صورت وجود
  const [profile, setProfile] = useState(() => {
    const cached = localStorage.getItem('user_profile');
    return cached ? JSON.parse(cached) : { fullName: '', avatarUrl: '' };
  });

  const [view, setView] = useState<'checking' | 'login' | 'profile' | 'user_chats' | 'admin_notifications'>(() => {
    if (!hasSavedPhone) return 'login';
    return 'profile'; // اگر شماره داشتیم، مستقیم به پروفایل برو (اطلاعات از استیت اولیه بالا میاد)
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayPhone, setDisplayPhone] = useState(() => localStorage.getItem('user_phone') || '');
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      loadProfileFromDB(savedPhone);
    }
  }, []);

  // بارگذاری و همگام‌سازی با دیتابیس در پس‌زمینه
  const loadProfileFromDB = async (phone: string) => {
    const cleanPhone = cleanPhoneNumber(phone);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (data) {
        const profileData = { 
          fullName: data.full_name || '', 
          avatarUrl: data.avatar_url || '' 
        };
        setProfile(profileData);
        localStorage.setItem('user_profile', JSON.stringify(profileData));
        setDisplayPhone(cleanPhone);
      } else if (error) {
        console.error("Profile sync error:", error);
      } else {
        // اگر کاربر در دیتابیس نبود، لاگ‌اوت کن
        handleLogout();
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  };

  const handleLogin = async () => {
    const rawPhone = phoneInputRef.current?.value || '';
    const rawName = nameInputRef.current?.value || '';
    const cleanPhone = cleanPhoneNumber(rawPhone);
    const finalName = rawName.trim();

    if (finalName.length < 1) { alert("لطفاً نام خود را وارد کنید."); return; }
    if (!cleanPhone.startsWith('07') || cleanPhone.length !== 10) { alert("شماره موبایل باید ۱۰ رقم و با 07 شروع شود."); return; }

    setIsLoading(true);
    try {
      const profileData = { fullName: finalName, avatarUrl: '' };
      await supabase.from('profiles').upsert({ phone: cleanPhone, full_name: finalName, updated_at: new Date() }, { onConflict: 'phone' });
      
      localStorage.setItem('user_phone', cleanPhone);
      localStorage.setItem('user_profile', JSON.stringify(profileData));
      
      setProfile(profileData);
      setDisplayPhone(cleanPhone);
      setView('profile');
      onCheckNotifications();
    } catch (e: any) {
      alert("خطا: " + (e.message || "ورود ناموفق بود."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    const newName = editNameInputRef.current?.value || '';
    if (!newName.trim()) return;
    setIsLoading(true);
    try {
      await supabase.from('profiles').update({ full_name: newName.trim() }).eq('phone', displayPhone);
      const updatedProfile = { ...profile, fullName: newName.trim() };
      setProfile(updatedProfile);
      localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      setIsEditingName(false);
    } catch (e) { alert("خطا در بروزرسانی نام"); } finally { setIsLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user_profile');
    setView('login');
    setDisplayPhone('');
    setProfile({ fullName: '', avatarUrl: '' });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      try {
        const url = await uploadImage(e.target.files[0]);
        if (url) {
          await supabase.from('profiles').update({ avatar_url: url }).eq('phone', displayPhone);
          const updatedProfile = { ...profile, avatarUrl: url };
          setProfile(updatedProfile);
          localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
        }
      } catch (err) { alert("خطا در آپلود عکس"); } finally { setIsLoading(false); }
    }
  };

  const fetchUserChats = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.USER_CHATS)
        .select('*')
        .or(`sender_phone.eq.${displayPhone},receiver_phone.eq.${displayPhone}`)
        .order('created_at', { ascending: false });
      
      const map: Record<string, any> = {};
      
      for (const msg of (data || [])) {
        const other = msg.sender_phone === displayPhone ? msg.receiver_phone : msg.sender_phone;
        const key = `${other}_${msg.ad_id}`;
        if (!map[key]) {
          map[key] = { ...msg, otherPhone: other, hasUnread: false };
        }
        if (!msg.is_read && msg.receiver_phone === displayPhone) {
          map[key].hasUnread = true;
        }
      }
      const conversations = Object.values(map);
      for (let conv of conversations) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('phone', conv.otherPhone).maybeSingle();
        conv.otherName = p?.full_name || conv.otherPhone;
      }
      setUserConversations(conversations);
    } catch (e) {
      console.error("Fetch chats error:", e);
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchAdminMessages = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from(TABLES.MESSAGES).select('*').eq('target_phone', displayPhone).order('date', { ascending: false });
      setAdminMessages(data || []);
      if (data?.some(m => !m.is_read)) {
        await supabase.from(TABLES.MESSAGES).update({ is_read: true }).eq('target_phone', displayPhone);
        onCheckNotifications();
      }
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (view === 'user_chats') fetchUserChats();
    if (view === 'admin_notifications') fetchAdminMessages();
  }, [view]);

  const ModalContainer = ({ children, title, onBack }: { children: React.ReactNode, title?: string, onBack?: () => void }) => (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-sm md:max-w-md h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col relative animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onBack && <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={22} /></button>}
            <h2 className="font-black text-lg">{title}</h2>
          </div>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} 
            className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {children}
        </div>
      </div>
    </div>
  );

  if (view === 'login') return (
    <ModalContainer title={String(t.login_title)}>
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#a62626] mb-3"> <UserCircle size={40} /> </div>
        <p className="text-[10px] text-gray-400 mt-1 font-bold">برای ثبت آگهی یا چت وارد شوید</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">نام و تخلص</label>
          <input type="text" ref={nameInputRef} placeholder="نام شما" className="w-full bg-gray-50 border rounded-2xl py-3.5 px-5 font-bold outline-none focus:border-red-200 transition-all text-right" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">شماره موبایل</label>
          <input type="tel" inputMode="numeric" ref={phoneInputRef} placeholder="07XXXXXXXX" className="w-full bg-gray-50 border rounded-2xl py-3.5 px-5 font-black text-left outline-none focus:border-red-200 transition-all" dir="ltr" />
        </div>
        <button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all mt-2 flex items-center justify-center">
          {isLoading ? <Loader2 className="animate-spin" /> : 'ورود / ثبت‌نام'}
        </button>
      </div>
    </ModalContainer>
  );

  if (view === 'admin_notifications') return (
    <ModalContainer title={String(t.notifications)} onBack={() => setView('profile')}>
      <div className="space-y-4">
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
    </ModalContainer>
  );

  if (view === 'user_chats') return (
    <ModalContainer title="گفتگوها" onBack={() => { setView('profile'); onCheckNotifications(); }}>
      <div className="space-y-2">
        {userConversations.length === 0 ? (
          <div className="text-center py-20 text-gray-300 font-bold">گفتگویی ندارید</div>
        ) : (
          userConversations.map((c, i) => (
            <div key={i} onClick={() => setActiveChat({ phone: c.otherPhone, name: c.otherName, id: c.ad_id, title: c.ad_title })} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <h4 className="font-black text-sm text-gray-800">{c.otherName}</h4>
                <p className="text-[10px] text-gray-400 font-bold truncate max-w-[180px]">{c.ad_title}</p>
              </div>
              <div className="flex items-center gap-2">
                 {c.hasUnread && <div className="w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-sm animate-pulse"></div>}
                 <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          ))
        )}
      </div>
      {activeChat && <ChatWindow receiverPhone={activeChat.phone} receiverName={activeChat.name} adId={activeChat.id} adTitle={activeChat.title} onClose={() => {
          setActiveChat(null);
          fetchUserChats();
          onCheckNotifications();
      }} />}
    </ModalContainer>
  );

  return (
    <ModalContainer title={String(t.account)}>
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
                <input type="text" ref={editNameInputRef} defaultValue={profile.fullName} className="flex-1 border rounded-xl px-3 py-2 text-sm font-black outline-none focus:border-red-400" />
                <button onClick={handleUpdateName} className="p-2 bg-green-500 text-white rounded-xl shadow-md"><Check size={18}/></button>
                <button onClick={() => setIsEditingName(false)} className="p-2 bg-gray-200 text-gray-500 rounded-xl shadow-md"><X size={18}/></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-black text-gray-800">{profile.fullName || displayPhone}</h3>
                <button onClick={() => setIsEditingName(true)} className="text-gray-300 hover:text-red-600 transition-colors"><Edit2 size={14}/></button>
              </div>
            )}
            <div className="text-gray-400 text-xs mt-1 font-black" dir="ltr">{displayPhone}</div>
         </div>
      </div>
      <div className="space-y-3">
        <button onClick={() => setView('admin_notifications')} className="w-full flex items-center justify-between p-4 bg-blue-50 rounded-2xl text-blue-700 font-black hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3"><Bell size={20} /> {t.notifications}</div>
          <div className="flex items-center gap-2">
            {hasUnreadAdmin && <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse border-2 border-white shadow-sm"></div>}
            <ChevronRight size={18} />
          </div>
        </button>
        <button onClick={() => setView('user_chats')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black relative hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-3"><MessageSquare size={20} /> گفتگوهای من</div>
          <div className="flex items-center gap-1">
            {hasUnreadChats && <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse border-2 border-white shadow-sm"></div>}
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
    </ModalContainer>
  );
};
export default AuthModal;
