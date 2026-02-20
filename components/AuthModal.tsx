
import { useState, useEffect, useRef } from 'react';
import { List, Heart, User, Loader2, ChevronRight, ArrowLeft, X, Package, Globe, MessageSquare, Camera, AlertCircle, Clock, CheckCircle2, Timer, Ban } from 'lucide-react';
import { supabase, TABLES, uploadImage } from '../services/supabaseClient';

interface AuthModalProps {
  onClose: () => void;
  onAdminClick: () => void;
  lang: 'dari' | 'pashto';
  onLanguageChange: (lang: 'dari' | 'pashto') => void;
  onCheckNotifications: () => void;
  onSelectAd?: (ad: any) => void;
  onShowSaved: () => void;
  onShowChats: () => void;
  t: any;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAdminClick, lang, onLanguageChange, onShowChats, onSelectAd, t }) => {
  const initialPhone = localStorage.getItem('user_phone') || '';

  const [view, setView] = useState<'login' | 'profile' | 'my_ads' | 'saved_ads' | 'edit_profile'>(initialPhone ? 'profile' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [myAds, setMyAds] = useState<any[]>([]);
  const [savedAds, setSavedAds] = useState<any[]>([]);
  const [hasUnreadAdmin, setHasUnreadAdmin] = useState(false);
  
  // States for form
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = async () => {
    const currentPhone = localStorage.getItem('user_phone');
    if (!currentPhone) return;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('phone', currentPhone).maybeSingle();
      if (data) {
        setName(data.full_name || '');
        setAvatarUrl(data.avatar_url || null);
        setPhone(data.phone || currentPhone);
      }
    } catch (e) { console.error(e); }
  };

  const checkUnreadMessages = async () => {
    const currentPhone = localStorage.getItem('user_phone');
    if (!currentPhone) return;
    const { count } = await supabase
      .from(TABLES.USER_CHATS)
      .select('*', { count: 'exact', head: true })
      .match({ receiver_phone: currentPhone, sender_phone: 'ADMIN', is_read: false });
    setHasUnreadAdmin((count || 0) > 0);
  };

  const fetchMyAds = async () => {
    const currentPhone = localStorage.getItem('user_phone');
    if (!currentPhone) return;
    setIsLoading(true);
    try {
      const [p, j, s, g] = await Promise.all([
        supabase.from(TABLES.PROPERTIES).select('*').eq('owner_id', currentPhone),
        supabase.from(TABLES.JOBS).select('*').eq('owner_id', currentPhone),
        supabase.from(TABLES.SERVICES).select('*').eq('owner_id', currentPhone),
        supabase.from(TABLES.GENERAL_ADS).select('*').eq('owner_id', currentPhone),
      ]);
      const freshAds = [
        ...(p.data || []).map((x: any) => ({ ...x, adType: 'ESTATE' })),
        ...(j.data || []).map((x: any) => ({ ...x, adType: 'JOBS' })),
        ...(s.data || []).map((x: any) => ({ ...x, adType: 'SERVICES' })),
        ...(g.data || []).map((x: any) => ({ ...x, adType: 'GENERAL' })),
      ].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      setMyAds(freshAds);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  const fetchSavedAds = async () => {
    const savedIdsRaw = localStorage.getItem('saved_ads_ids');
    if (!savedIdsRaw) { setSavedAds([]); return; }
    const savedIds = JSON.parse(savedIdsRaw);
    if (savedIds.length === 0) { setSavedAds([]); return; }

    setIsLoading(true);
    try {
      const results: any[] = [];
      for (const table of [TABLES.PROPERTIES, TABLES.JOBS, TABLES.SERVICES, TABLES.GENERAL_ADS]) {
        const { data } = await supabase.from(table).select('*').in('id', savedIds);
        if (data) {
          const typeMap: any = { [TABLES.PROPERTIES]: 'ESTATE', [TABLES.JOBS]: 'JOBS', [TABLES.SERVICES]: 'SERVICES', [TABLES.GENERAL_ADS]: 'GENERAL' };
          results.push(...data.map(d => ({ ...d, adType: typeMap[table] })));
        }
      }
      setSavedAds(results.sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()));
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    checkUnreadMessages();
    if (initialPhone) fetchProfile();
    
    // Live listeners for My Ads
    if (initialPhone) {
        const channels = [TABLES.PROPERTIES, TABLES.JOBS, TABLES.SERVICES, TABLES.GENERAL_ADS].map(table => 
            supabase.channel(`my_ads_${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: table, filter: `owner_id=eq.${initialPhone}` }, () => fetchMyAds())
                .subscribe()
        );

        const chatListener = supabase.channel('my_chats_unread')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.USER_CHATS }, () => checkUnreadMessages())
            .subscribe();

        return () => {
            channels.forEach(ch => supabase.removeChannel(ch));
            supabase.removeChannel(chatListener);
        };
    }
  }, [initialPhone]);

  useEffect(() => {
    if (view === 'profile' || view === 'edit_profile') fetchProfile();
    if (view === 'my_ads') fetchMyAds();
    if (view === 'saved_ads') fetchSavedAds();
  }, [view]);

  const validatePhone = (p: string) => {
    return /^07\d{8}$/.test(p);
  };

  const handleUpdateProfile = async () => {
    const currentPhone = localStorage.getItem('user_phone');
    if (!currentPhone) return;
    setErrorMsg('');

    if (name.trim().length < 3) {
      setErrorMsg(lang === 'dari' ? 'نام و تخلص باید حداقل ۳ حرف باشد.' : 'نوم باید لږترلږه ۳ توري وي.');
      return;
    }

    if (!validatePhone(phone)) {
      setErrorMsg(lang === 'dari' ? 'شماره تماس باید ۱۰ رقم و با ۰۷ شروع شود.' : 'شماره باید ۱۰ عدده او په ۰۷ پیل شي.');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ 
        phone: phone, 
        full_name: name.trim(), 
        avatar_url: avatarUrl 
      }, { onConflict: 'phone' });

      if (error) throw error;

      if (phone !== currentPhone) {
        localStorage.setItem('user_phone', phone);
      }
      
      alert(lang === 'dari' ? 'پروفایل با موفقیت بروزرسانی شد.' : 'پروفایل په بریالیتوب سره نوی شو.');
      setView('profile');
    } catch (e) { 
      setErrorMsg('خطا در بروزرسانی دیتابیس');
    } finally { 
      setIsUpdating(false); 
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUpdating(true);
      const url = await uploadImage(e.target.files[0]);
      if (url) {
        setAvatarUrl(url);
      }
      setIsUpdating(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    if (name.trim().length < 3) {
      setErrorMsg(lang === 'dari' ? 'لطفاً نام و تخلص خود را کامل وارد کنید.' : 'مهرباني وکړئ خپل بشپړ نوم دننه کړئ.');
      return;
    }
    if (!validatePhone(phone)) {
      setErrorMsg(lang === 'dari' ? 'شماره تماس اشتباه است. (مثال: 07XXXXXXXX)' : 'شماره غلطه ده.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ phone: phone, full_name: name.trim() }, { onConflict: 'phone' });
      if (error) throw error;
      localStorage.setItem('user_phone', phone);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg('خطا در ثبت نام. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'APPROVED': return { label: 'تایید شده', color: 'text-green-600 bg-green-50 border-green-100', icon: CheckCircle2 };
      case 'PENDING': return { label: 'در انتظار تایید', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Timer };
      case 'REJECTED': return { label: 'رد شده', color: 'text-red-600 bg-red-50 border-red-100', icon: Ban };
      default: return { label: 'نامشخص', color: 'text-gray-400 bg-gray-50', icon: Clock };
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full h-full md:max-w-md md:h-[90vh] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative animate-slide-up" onClick={e => e.stopPropagation()}>
        
        <div className="p-5 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'login' && view !== 'profile' && (
              <button onClick={() => setView('profile')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="font-black text-lg">
              {view === 'login' ? t.login_title : view === 'profile' ? t.profile : view === 'edit_profile' ? t.edit_profile : view === 'my_ads' ? t.my_ads : t.saved}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
          {view === 'login' ? (
            <div className="space-y-6 text-right">
              <div className="text-center mb-4">
                 <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-lg">
                    <User size={40} />
                 </div>
                 <h3 className="font-black text-gray-800 text-lg">{t.login_title}</h3>
                 <p className="text-[10px] text-gray-400 font-black mt-1">برای ثبت آگهی و استفاده از امکانات، ابتدا ثبت‌نام کنید.</p>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-black flex items-center gap-3 animate-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 mr-4">نام و تخلص (اجباری)</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder={t.name_placeholder} 
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-red-200 rounded-2xl py-4 px-5 font-bold outline-none transition-all placeholder:text-gray-300" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 mr-4">شماره تماس (۱۰ رقم - با ۰۷ شروع شود)</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setPhone(val);
                    }} 
                    placeholder={t.phone_placeholder} 
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-red-200 rounded-2xl py-4 px-5 font-black text-left outline-none transition-all placeholder:text-gray-300 tracking-[2px]" 
                    dir="ltr" 
                  />
                </div>
              </div>

              <button 
                onClick={handleLogin} 
                disabled={isLoading}
                className="w-full bg-[#a62626] text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={24} className="animate-spin" /> : t.login_btn}
              </button>
            </div>
          ) : view === 'profile' ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 mb-6">
                 <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden relative">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <User size={48} className="text-gray-300" />}
                 </div>
                 <div className="text-center">
                    <h3 className="font-black text-gray-900 text-lg">{name || 'کاربر جدید'}</h3>
                    <p className="font-bold text-gray-400 text-xs" dir="ltr">{phone}</p>
                 </div>
                 <button onClick={() => setView('edit_profile')} className="px-6 py-2 bg-gray-100 rounded-xl text-[10px] font-black hover:bg-gray-200 transition-all">{t.edit_profile}</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button onClick={onShowChats} className="flex flex-col items-center justify-center gap-3 p-5 bg-red-50 text-red-600 rounded-3xl border border-red-100 transition-all relative">
                    <MessageSquare size={24} />
                    <span className="text-[10px] font-black">{t.notifications}</span>
                    {hasUnreadAdmin && <div className="absolute top-4 left-4 w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse border-2 border-white shadow-md" />}
                 </button>
                 <button onClick={() => onLanguageChange(lang === 'dari' ? 'pashto' : 'dari')} className="flex flex-col items-center justify-center gap-3 p-5 bg-gray-50 text-gray-700 rounded-3xl border border-gray-100">
                    <Globe size={24} />
                    <span className="text-[10px] font-black">{lang === 'dari' ? 'زبان: دری' : 'ژبه: پښتو'}</span>
                 </button>
              </div>

              <button onClick={() => setView('my_ads')} className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl font-black text-xs hover:bg-white transition-all border border-transparent hover:border-gray-100">
                 <div className="flex items-center gap-3"><List size={20} className="text-red-600" /> {t.my_ads}</div>
                 <ChevronRight size={18} className="text-gray-300" />
              </button>

              <button onClick={() => setView('saved_ads')} className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl font-black text-xs hover:bg-white transition-all border border-transparent hover:border-gray-100">
                 <div className="flex items-center gap-3"><Heart size={20} className="text-red-600" /> {t.saved}</div>
                 <ChevronRight size={18} className="text-gray-300" />
              </button>

              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-5 text-red-600 font-black flex items-center justify-center gap-2 mt-2">{t.logout}</button>
              
              <div className="pt-4 text-center">
                 <button onClick={onAdminClick} className="text-[9px] text-gray-300 font-black uppercase tracking-widest">Panel Access</button>
              </div>
            </div>
          ) : view === 'edit_profile' ? (
            <div className="space-y-6 text-right">
              <div className="relative w-32 h-32 mx-auto mb-8">
                 <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-100 flex items-center justify-center">
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" alt="avatar" /> : <User size={64} className="text-gray-300" />}
                 </div>
                 <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-[#a62626] text-white p-3 rounded-full shadow-lg border-4 border-white active:scale-90 transition-all">
                   <Camera size={20} />
                 </button>
                 <input type="file" ref={fileInputRef} hidden onChange={handleAvatarUpload} accept="image/*" />
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-black flex items-center gap-3">
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 mr-4">نام و تخلص جدید</label>
                   <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-red-200 rounded-2xl py-4 px-5 font-bold outline-none transition-all" 
                   />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 mr-4">شماره تماس جدید</label>
                   <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) setPhone(val);
                    }} 
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-red-200 rounded-2xl py-4 px-5 font-black text-left outline-none transition-all tracking-[2px]" 
                    dir="ltr" 
                   />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                  onClick={handleUpdateProfile} 
                  disabled={isUpdating} 
                  className="flex-[2] bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                 >
                   {isUpdating ? <Loader2 size={24} className="animate-spin" /> : (lang === 'dari' ? 'ذخیره تغییرات' : 'خوندي کول')}
                 </button>
                 <button onClick={() => setView('profile')} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {isLoading ? (
                <div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" size={32} /></div>
              ) : (view === 'my_ads' ? myAds : savedAds).length === 0 ? (
                <div className="text-center py-32 text-gray-300 font-black">{t.no_results}</div>
              ) : (view === 'my_ads' ? myAds : savedAds).map((item, i) => {
                 const status = getStatusInfo(item.status);
                 return (
                   <div 
                    key={item.id || i} 
                    onClick={() => onSelectAd?.(item)}
                    className="p-4 bg-white rounded-3xl border border-gray-100 flex items-center gap-4 text-right shadow-sm hover:border-red-500 transition-all cursor-pointer group active:scale-[0.98]"
                   >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 shadow-inner">
                         {item.images?.[0] ? (
                            <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="ad" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={24} /></div>
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-black text-sm text-gray-800 truncate mb-1">{item.title}</h4>
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-red-600 font-black text-sm">{Number(item.price || item.salary || 0).toLocaleString()} <small className="text-[10px] text-gray-400">{t.currency}</small></span>
                            <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Clock size={10} /> {new Date(item.created_at || item.date).toLocaleDateString('fa-AF')}</span>
                         </div>
                         <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${status.color}`}>
                            <status.icon size={12} />
                            {status.label}
                         </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-red-500 transition-colors" />
                   </div>
                 );
               })
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AuthModal;
