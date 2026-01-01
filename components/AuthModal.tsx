
import React, { useState, useEffect, useRef } from 'react';
import { List, Heart, LogOut, User, Loader2, Bell, ChevronRight, Camera, ArrowLeft, CheckCircle2, MessageSquare } from 'lucide-react';
import { translations } from '../services/translations';
import { supabase, TABLES, uploadImage } from '../services/supabaseClient';
import { AdminMessage } from '../types';
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

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onShowMyAds, onShowSaved, onAdminClick, lang, hasUnreadChats, hasUnreadAdmin, onCheckNotifications }) => {
  const t = translations[lang];
  const [view, setView] = useState<'login' | 'otp' | 'profile' | 'messages' | 'user_chats'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ firstName: '', lastName: '', avatarUrl: '' });
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      setView('profile');
      setPhoneNumber(savedPhone);
      const savedProfile = localStorage.getItem(`profile_${savedPhone}`);
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setProfile({
            firstName: parsed.firstName || '',
            lastName: parsed.lastName || '',
            avatarUrl: parsed.avatarUrl || ''
          });
        } catch (e) {}
      }
    }
  }, []);

  const markAdminMessagesAsRead = async () => {
    if (!phoneNumber) return;
    try {
      await supabase
        .from(TABLES.MESSAGES)
        .update({ is_read: true })
        .eq('target_phone', phoneNumber)
        .eq('is_read', false);
      onCheckNotifications(); // بروزرسانی آنی نقطه قرمز در هدر
    } catch (e) {
      console.error("Error marking admin messages as read:", e);
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .select('*')
        .eq('target_phone', phoneNumber)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMessages(data || []);
      markAdminMessagesAsRead();
    } catch (e: any) {
      console.error("Error fetching admin messages:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserChats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_CHATS)
        .select('*')
        .or(`sender_phone.eq.${phoneNumber},receiver_phone.eq.${phoneNumber}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const conversationsMap: Record<string, any> = {};
      data?.forEach(msg => {
        const otherPhone = msg.sender_phone === phoneNumber ? msg.receiver_phone : msg.sender_phone;
        const key = `${otherPhone}_${msg.ad_id}`;
        if (!conversationsMap[key]) {
          conversationsMap[key] = msg;
        }
      });
      
      setUserConversations(Object.values(conversationsMap));
    } catch (e) {
      console.error("User chats fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'messages' && phoneNumber) fetchMessages();
    if (view === 'user_chats' && phoneNumber) fetchUserChats();
  }, [view, phoneNumber]);

  const handleProfileUpdate = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const saveProfileToLocal = () => {
    setIsLoading(true);
    localStorage.setItem(`profile_${phoneNumber}`, JSON.stringify(profile));
    setTimeout(() => {
      setIsLoading(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    }, 1000);
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

  const handleSendOtp = () => {
    if (phoneNumber.length < 9) return alert("شماره معتبر نیست");
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setView('otp'); }, 1000);
  };

  const handleVerifyOtp = () => {
    if (otp.length === 4) {
      localStorage.setItem('user_phone', phoneNumber);
      setView('profile');
    }
  };

  if (view === 'login') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-8">{t.login_title}</h2>
        <div className="space-y-6">
          <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="07XXXXXXXX" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-xl font-black text-left dir-ltr outline-none focus:border-[#a62626]" />
          <button onClick={handleSendOtp} disabled={isLoading} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black text-lg">
            {isLoading ? <Loader2 className="animate-spin m-auto" /> : t.get_code}
          </button>
        </div>
      </div>
    </div>
  );

  if (view === 'otp') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-sm:max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-8">{t.enter_otp}</h2>
        <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={4} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-6 text-4xl font-black text-center tracking-[0.5em] outline-none" />
        <button onClick={handleVerifyOtp} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black mt-6">تایید و ورود</button>
      </div>
    </div>
  );

  if (view === 'messages') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full max-h-[85vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} className={lang === 'dari' ? '' : 'rotate-180'} /></button>
          <h2 className="text-xl font-black">{t.notifications}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#a62626]" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold">هیچ پیامی یافت نشد.</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 mb-2 font-black">{msg.date}</p>
                <p className="text-sm font-medium leading-7 text-gray-700">{msg.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  if (view === 'user_chats') return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-md:max-w-md h-full max-h-[85vh] rounded-[3rem] p-8 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6 shrink-0">
          <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} className={lang === 'dari' ? '' : 'rotate-180'} /></button>
          <h2 className="text-xl font-black">گفتگوهای من</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#a62626]" /></div>
          ) : userConversations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold">هنوز گفتگویی ندارید.</div>
          ) : (
            userConversations.map((conv, i) => {
              const otherPhone = conv.sender_phone === phoneNumber ? conv.receiver_phone : conv.sender_phone;
              return (
                <div key={i} onClick={() => setActiveChat({ phone: otherPhone, id: conv.ad_id, title: conv.ad_title })} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-white hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-600 shadow-sm border"><User size={24} /></div>
                     <div>
                        <h4 className="font-black text-sm text-gray-800">{otherPhone}</h4>
                        <p className="text-[10px] text-gray-400 font-bold truncate max-w-[180px]">{conv.ad_title}</p>
                        <p className="text-[9px] text-gray-500 mt-1 line-clamp-1 italic">{conv.text}</p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              );
            })
          )}
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
               <div className="relative group">
                  <div className="w-24 h-24 bg-gray-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                     {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300" />}
                     {isLoading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#a62626] text-white p-2 rounded-xl shadow-lg border-2 border-white active:scale-90 transition-transform"><Camera size={16} /></button>
                  <input type="file" ref={fileInputRef} hidden accept=".heic,.HEIC,image/*" onChange={handleAvatarUpload} />
               </div>
               
               <div className="w-full space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 pr-2">نام</label>
                        <input type="text" value={profile.firstName} onChange={e => handleProfileUpdate('firstName', e.target.value)} placeholder="نام" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-center font-bold text-sm outline-none focus:border-red-200" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 pr-2">تخلص</label>
                        <input type="text" value={profile.lastName} onChange={e => handleProfileUpdate('lastName', e.target.value)} placeholder="تخلص" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-center font-bold text-sm outline-none focus:border-red-200" />
                     </div>
                  </div>
                  
                  <button 
                    onClick={saveProfileToLocal} 
                    disabled={isLoading}
                    className={`w-full py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${showSaveSuccess ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'}`}
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : showSaveSuccess ? <><CheckCircle2 size={16} /> ذخیره شد</> : 'ذخیره تغییرات'}
                  </button>
               </div>
               
               <h3 className="font-black text-lg text-gray-800 tracking-tighter mt-2">{phoneNumber}</h3>
            </div>

            <div className="space-y-3 pb-4">
              <button onClick={() => setView('user_chats')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black group relative transition-all">
                <div className="flex items-center gap-3"><MessageSquare size={20} /> گفتگوهای من</div>
                <div className="flex items-center gap-2">
                   {hasUnreadChats && <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></div>}
                   <ChevronRight className={`transition-transform ${lang === 'dari' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
                </div>
              </button>
              
              <button onClick={() => setView('messages')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold group relative transition-all">
                <div className="flex items-center gap-3"><Bell size={20} /> {t.notifications}</div>
                <div className="flex items-center gap-2">
                   {hasUnreadAdmin && <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white"></div>}
                   <ChevronRight className={`text-gray-300 transition-transform ${lang === 'dari' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
                </div>
              </button>
              
              <button onClick={onShowMyAds} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold group transition-all">
                <div className="flex items-center gap-3"><List size={20} /> {t.my_ads}</div>
                <ChevronRight className={`text-gray-300 transition-transform ${lang === 'dari' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
              </button>
              
              <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold group transition-all">
                <div className="flex items-center gap-3"><Heart size={20} /> {t.saved}</div>
                <ChevronRight className={`text-gray-300 transition-transform ${lang === 'dari' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
              </button>
              
              <div className="pt-4 border-t space-y-2">
                <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
                   <ArrowLeft size={18} className={lang === 'dari' ? '' : 'rotate-180'} /> بازگشت به برنامه
                </button>
                <button onClick={() => { localStorage.removeItem('user_phone'); window.location.reload(); }} className="w-full p-4 text-red-600 font-bold flex items-center justify-center gap-2 transition-all">
                   <LogOut size={18} /> خروج از حساب
                </button>
              </div>
              
              <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 font-bold mt-2 text-center pb-4">ورود به پنل مدیریت</button>
            </div>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
