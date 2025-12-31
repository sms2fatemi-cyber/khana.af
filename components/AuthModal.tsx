
import React, { useState, useEffect, useRef } from 'react';
import { List, Heart, LogOut, User, Loader2, Bell, ChevronRight, Camera, ArrowLeft } from 'lucide-react';
import { translations } from '../services/translations';
import { uploadImage } from '../services/supabaseClient';

interface AuthModalProps {
  onClose: () => void;
  onShowMyAds: () => void;
  onShowSaved: () => void;
  onAdminClick: () => void;
  lang: 'dari' | 'pashto';
}

interface UserProfile {
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onShowMyAds, onShowSaved, onAdminClick, lang }) => {
  const t = translations[lang];
  const [view, setView] = useState<'login' | 'otp' | 'profile' | 'messages'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({ firstName: '', lastName: '', avatarUrl: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
      setView('profile');
      setPhoneNumber(savedPhone);
      const savedProfile = localStorage.getItem(`profile_${savedPhone}`);
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const saveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem(`profile_${phoneNumber}`, JSON.stringify(newProfile));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
      const url = await uploadImage(e.target.files[0]);
      if (url) saveProfile({ ...profile, avatarUrl: url });
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
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
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
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-8">{t.enter_otp}</h2>
        <input type="text" value={otp} onChange={e => setOtp(e.target.value)} maxLength={4} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-6 text-4xl font-black text-center tracking-[0.5em] outline-none" />
        <button onClick={handleVerifyOtp} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black mt-6">تایید و ورود</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm max-h-[90vh] rounded-[3rem] p-8 shadow-2xl flex flex-col overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-4 mb-8">
           <div className="relative group">
              <div className="w-24 h-24 bg-gray-100 rounded-[2.5rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                 {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-300" />}
                 {isLoading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 bg-[#a62626] text-white p-2 rounded-xl shadow-lg border-2 border-white"><Camera size={16} /></button>
              <input type="file" ref={fileInputRef} hidden accept=".heic,.HEIC,image/*" onChange={handleAvatarUpload} />
           </div>
           <div className="w-full grid grid-cols-2 gap-2">
              <input type="text" value={profile.firstName} onChange={e => saveProfile({...profile, firstName: e.target.value})} placeholder="نام" className="bg-gray-50 border rounded-xl px-4 py-2 text-center font-bold text-sm outline-none" />
              <input type="text" value={profile.lastName} onChange={e => saveProfile({...profile, lastName: e.target.value})} placeholder="تخلص" className="bg-gray-50 border rounded-xl px-4 py-2 text-center font-bold text-sm outline-none" />
           </div>
           <h3 className="font-black text-lg text-gray-800 tracking-tighter">{phoneNumber}</h3>
        </div>

        <div className="space-y-3">
          <button onClick={() => setView('messages')} className="w-full flex items-center justify-between p-4 bg-red-50 rounded-2xl text-[#a62626] font-black">
            <div className="flex items-center gap-3"><Bell size={20} /> اعلان‌ها و پیام‌ها</div>
            <ChevronRight className="rotate-180" />
          </button>
          <button onClick={onShowMyAds} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold">
            <div className="flex items-center gap-3"><List size={20} /> {t.my_ads}</div>
            <ChevronRight className="rotate-180 text-gray-300" />
          </button>
          <button onClick={onShowSaved} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl font-bold">
            <div className="flex items-center gap-3"><Heart size={20} /> {t.saved}</div>
            <ChevronRight className="rotate-180 text-gray-300" />
          </button>
          
          <div className="pt-4 border-t space-y-2">
            <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
               <ArrowLeft size={18} /> بازگشت به برنامه
            </button>
            <button onClick={() => { localStorage.removeItem('user_phone'); window.location.reload(); }} className="w-full p-4 text-red-600 font-bold flex items-center justify-center gap-2">
               <LogOut size={18} /> خروج از حساب
            </button>
          </div>
          
          <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 font-bold mt-2">ورود به پنل مدیریت</button>
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
