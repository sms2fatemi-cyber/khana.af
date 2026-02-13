
import { useState, useEffect } from 'react';
import { List, Heart, LogOut, User, Loader2, ChevronRight, ArrowLeft, X, Package, Globe, MessageSquare } from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface AuthModalProps {
  onClose: () => void;
  onAdminClick: () => void;
  lang: 'dari' | 'pashto';
  onLanguageChange: (lang: 'dari' | 'pashto') => void;
  onCheckNotifications: () => void;
  onSelectAd?: (ad: any) => void;
  onShowSaved?: () => void; 
  onShowChats?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAdminClick, lang, onLanguageChange, onSelectAd, onShowChats }) => {
  const userPhone = localStorage.getItem('user_phone');
  const [view, setView] = useState<'login' | 'profile' | 'my_ads' | 'saved_ads'>(userPhone ? 'profile' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [myAds, setMyAds] = useState<any[]>([]);
  const [savedAds, setSavedAds] = useState<any[]>([]);
  const [hasUnreadAdmin, setHasUnreadAdmin] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const fetchMyAds = async () => {
    if (!userPhone) return;
    setIsLoading(true);
    try {
      const [p, j, s, g] = await Promise.all([
        supabase.from(TABLES.PROPERTIES).select('*').eq('owner_id', userPhone),
        supabase.from(TABLES.JOBS).select('*').eq('owner_id', userPhone),
        supabase.from(TABLES.SERVICES).select('*').eq('owner_id', userPhone),
        supabase.from(TABLES.GENERAL_ADS).select('*').eq('owner_id', userPhone),
      ]);
      const all = [
        ...(p.data || []).map((x: any) => ({ ...x, adType: 'ESTATE' })),
        ...(j.data || []).map((x: any) => ({ ...x, adType: 'JOBS' })),
        ...(s.data || []).map((x: any) => ({ ...x, adType: 'SERVICES' })),
        ...(g.data || []).map((x: any) => ({ ...x, adType: 'GENERAL' })),
      ].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      setMyAds(all);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  const checkAdminMessages = async () => {
    if (!userPhone) return;
    const { count } = await supabase
      .from(TABLES.USER_CHATS)
      .select('*', { count: 'exact', head: true })
      .match({ receiver_phone: userPhone, sender_phone: 'ADMIN', is_read: false });
    setHasUnreadAdmin((count || 0) > 0);
  };

  const fetchSavedAdsInternal = async () => {
    if (!userPhone) return;
    setIsLoading(true);
    setSavedAds([]);
    try {
      const { data: savedEntries } = await supabase
        .from(TABLES.SAVED_ADS)
        .select('*')
        .eq('user_phone', userPhone);
      
      if (!savedEntries || savedEntries.length === 0) {
        setIsLoading(false);
        return;
      }

      const results = [];
      for (const entry of savedEntries) {
        const { data } = await supabase.from(entry.ad_table).select('*').eq('id', entry.ad_id).maybeSingle();
        if (data) {
          const typeMap: any = { [TABLES.PROPERTIES]: 'ESTATE', [TABLES.JOBS]: 'JOBS', [TABLES.SERVICES]: 'SERVICES', [TABLES.GENERAL_ADS]: 'GENERAL' };
          results.push({ ...data, adType: typeMap[entry.ad_table] });
        }
      }
      setSavedAds(results);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { 
    if (view === 'profile') checkAdminMessages();
    if (view === 'my_ads') fetchMyAds(); 
    if (view === 'saved_ads') fetchSavedAdsInternal();
  }, [view]);

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'profile' && view !== 'login' && <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={20} /></button>}
            <h2 className="font-black text-lg">
               {view === 'login' ? 'ورود به خانه' : view === 'profile' ? 'خانه من' : view === 'my_ads' ? 'آگهی‌های من' : 'نشان شده‌ها'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {view === 'login' ? (
            <div className="space-y-4 text-right">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="نام و نام خانوادگی" className="w-full bg-gray-50 border rounded-2xl py-4 px-5 font-bold outline-none" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="شماره موبایل" className="w-full bg-gray-50 border rounded-2xl py-4 px-5 font-black text-left outline-none" dir="ltr" />
              <button onClick={() => {
                if (phone.length >= 10 && name) {
                  localStorage.setItem('user_phone', phone);
                  window.location.reload();
                } else {
                  alert("لطفاً نام و شماره معتبر وارد کنید.");
                }
              }} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-lg">تایید و ورود</button>
            </div>
          ) : view === 'profile' ? (
            <div className="space-y-3">
              <div className="flex flex-col items-center gap-3 mb-6">
                 <div className="w-20 h-20 bg-gray-100 rounded-[2.2rem] flex items-center justify-center border-4 border-white shadow-xl">
                    <User size={40} className="text-gray-300" />
                 </div>
                 <h3 className="font-black text-gray-800" dir="ltr">{userPhone}</h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-gray-700 font-black text-xs">
                    <Globe size={20} className="text-blue-600" /> زبان برنامه
                  </div>
                  <div className="flex bg-white rounded-xl p-1 border shadow-inner">
                    <button 
                      onClick={() => onLanguageChange('dari')} 
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'dari' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-400'}`}
                    >دری</button>
                    <button 
                      onClick={() => onLanguageChange('pashto')} 
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${lang === 'pashto' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-400'}`}
                    >پشتو</button>
                  </div>
                </div>
              </div>

              <button onClick={onShowChats} className="w-full flex items-center justify-between p-5 bg-red-50 rounded-2xl font-black text-xs hover:bg-red-100 border border-red-100 transition-all relative">
                 <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-red-600" /> پیام‌های پشتیبانی
                    {hasUnreadAdmin && <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />}
                 </div>
                 <ChevronRight size={18} />
              </button>

              <button onClick={() => setView('my_ads')} className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl font-black text-xs hover:bg-red-50 border border-transparent hover:border-red-100 transition-all">
                 <div className="flex items-center gap-3"><List size={20} className="text-red-600" /> آگهی‌های من</div>
                 <ChevronRight size={18} />
              </button>
              <button onClick={() => setView('saved_ads')} className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl font-black text-xs hover:bg-red-50 border border-transparent hover:border-red-100 transition-all">
                 <div className="flex items-center gap-3"><Heart size={20} className="text-red-600 fill-red-600" /> نشان شده‌ها</div>
                 <ChevronRight size={18} />
              </button>
              <button onClick={() => { localStorage.removeItem('user_phone'); window.location.reload(); }} className="w-full p-5 text-red-600 font-black flex items-center justify-center gap-2 mt-4 hover:bg-red-50 rounded-2xl transition-all"> <LogOut size={18} /> خروج از حساب </button>
              <button onClick={onAdminClick} className="w-full text-[10px] text-gray-300 mt-4 text-center">ورود مدیریت سیستم</button>
            </div>
          ) : (
            <div className="space-y-3">
              {isLoading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div> : 
               (view === 'my_ads' ? myAds : savedAds).length === 0 ? <div className="text-center py-24 text-gray-300 font-black">موردی یافت نشد.</div> :
               (view === 'my_ads' ? myAds : savedAds).map((item, i) => (
                 <div key={i} onClick={() => onSelectAd?.(item)} className="p-3 bg-gray-50 rounded-2xl border flex items-center gap-3 cursor-pointer hover:bg-white group text-right">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                       {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" alt="" /> : <Package className="w-full h-full p-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                       <h4 className="font-black text-[11px] text-gray-800 truncate">{item.title}</h4>
                       <span className="text-[14px] text-red-600 font-black block mt-1">{Number(item.price || 0).toLocaleString()} <small className="text-[9px]">AFN</small></span>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-red-600" />
                 </div>
               ))
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
