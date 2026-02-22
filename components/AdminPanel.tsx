
import { useState, useEffect, useCallback } from 'react';
import { Property, Job, Service } from '../types';
import { 
  Home, Briefcase, Wrench, ShieldCheck, X, MessageSquare, Users, Settings, User as UserIcon, ArrowRight, PhoneCall, Key, UserPlus, Package, Car, Smartphone, Sofa, ShoppingBag, HardHat, MapPin, Loader2, Instagram, Send, AlertCircle, History, Trophy, Facebook, RefreshCcw, CheckSquare, Square, SendHorizontal, LayoutGrid, Info, Flag, Trash2, ExternalLink
} from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface AdminPanelProps {
  properties: Property[];
  jobs: Job[];
  services: Service[];
  onExit: () => void;
  currentAdmin?: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit, currentAdmin }) => {
  const [activeTab, setActiveTab] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');
  const [data, setData] = useState<any>({ properties: [], jobs: [], services: [], general: [], users: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem('app_settings_cache');
    return cached ? JSON.parse(cached) : { contact_phone: '', instagram: '', telegram: '', facebook: '', about_text: '' };
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const [changePass, setChangePass] = useState({ new: '', confirm: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', fullName: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // States for Broadcast feature
  const [selectedUserPhones, setSelectedUserPhones] = useState<Set<string>>(new Set());
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
      if (pErr) console.error("Profiles Error:", pErr);

      const [propsRes, jobsRes, servRes, genRes, reportsRes, settingsRes] = await Promise.all([
        supabase.from(TABLES.PROPERTIES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.JOBS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.SERVICES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.GENERAL_ADS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.REPORTS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.APP_SETTINGS).select('*').maybeSingle()
      ]);

      setData({ 
        users: profiles || [], 
        properties: (propsRes.data || []).map(x => ({ ...x, adType: 'ESTATE' })), 
        jobs: (jobsRes.data || []).map(x => ({ ...x, adType: 'JOBS' })), 
        services: (servRes.data || []).map(x => ({ ...x, adType: 'SERVICES' })), 
        general: (genRes.data || []).map(x => ({ ...x, adType: 'GENERAL' })),
        reports: reportsRes.data || []
      });

      if (settingsRes.data) {
        const sData = {
          contact_phone: settingsRes.data.contact_phone || '',
          instagram: settingsRes.data.instagram || '',
          telegram: settingsRes.data.telegram || '',
          facebook: settingsRes.data.facebook || '',
          about_text: settingsRes.data.about_text || ''
        };
        setSettings(sData);
        localStorage.setItem('app_settings_cache', JSON.stringify(sData));
      }
    } catch (e) { 
      console.error("Fetch error:", e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
    if (window.innerWidth >= 768) setActiveTab('PENDING_APPROVAL');
  }, [fetchData]);

  const toggleUserSelection = (phone: string) => {
    const next = new Set(selectedUserPhones);
    if (next.has(phone)) next.delete(phone);
    else next.add(phone);
    setSelectedUserPhones(next);
  };

  const selectAllUsers = () => {
    if (selectedUserPhones.size === data.users.length) {
      setSelectedUserPhones(new Set());
    } else {
      setSelectedUserPhones(new Set(data.users.map((u: any) => u.phone)));
    }
  };

  const handleBroadcastSend = async () => {
    if (!broadcastText.trim() || selectedUserPhones.size === 0) return;
    setIsSendingBroadcast(true);
    try {
      const phones = Array.from(selectedUserPhones);
      const messages = phones.map(phone => ({
        sender_phone: 'ADMIN',
        receiver_phone: phone,
        ad_id: 'SYSTEM',
        ad_title: 'اطلاعیه سیستم',
        text: broadcastText.trim(),
        is_read: false
      }));

      const { error } = await supabase.from(TABLES.USER_CHATS).insert(messages);
      if (error) throw error;

      alert(`پیام با موفقیت به ${phones.length} کاربر ارسال شد.`);
      setBroadcastText('');
      setIsBroadcastModalOpen(false);
      setSelectedUserPhones(new Set());
    } catch (e) {
      alert("خطا در ارسال پیام گروهی.");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase.from(TABLES.APP_SETTINGS).upsert({ id: 1, ...settings });
      if (error) throw error;
      alert("تنظیمات با موفقیت ذخیره شد.");
      localStorage.setItem('app_settings_cache', JSON.stringify(settings));
    } catch (e: any) { 
      console.error("Settings Error:", e);
      alert(`خطا در ذخیره تنظیمات: ${e.message || 'خطای ناشناخته'}`); 
    } finally { 
      setIsSavingSettings(false); 
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password || !newAdmin.fullName) {
      alert("لطفاً تمامی فیلدها را پر کنید.");
      return;
    }
    setIsAddingAdmin(true);
    try {
      const { error } = await supabase.from('system_admins').insert([{
        username: newAdmin.username.trim(),
        password: newAdmin.password.trim(),
        full_name: newAdmin.fullName.trim()
      }]);
      if (error) throw error;
      alert("ادمین جدید با موفقیت اضافه شد.");
      setNewAdmin({ username: '', password: '', fullName: '' });
    } catch (e: any) {
      alert("خطا در ثبت ادمین.");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleChangePassword = async () => {
    if (!changePass.new || !changePass.confirm) return alert("هر دو فیلد رمز را وارد کنید.");
    if (changePass.new !== changePass.confirm) return alert("رمز عبور جدید و تکرار آن مطابقت ندارند.");
    
    setIsChangingPass(true);
    try {
      const { error } = await supabase
        .from('system_admins')
        .update({ password: changePass.new })
        .eq('username', currentAdmin?.username);
      
      if (error) throw error;
      alert("رمز عبور با موفقیت تغییر کرد.");
      setChangePass({ new: '', confirm: '' });
    } catch (e) {
      alert("خطا در تغییر رمز عبور.");
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("آیا از حذف این گزارش مطمئن هستید؟")) return;
    try {
      const { error } = await supabase.from(TABLES.REPORTS).delete().eq('id', reportId);
      if (error) throw error;
      setData({ ...data, reports: data.reports.filter((r: any) => r.id !== reportId) });
    } catch (e) {
      alert("خطا در حذف گزارش.");
    }
  };

  const menuItems = [
    { id: 'PENDING_APPROVAL', label: 'تایید آگهی‌ها', icon: AlertCircle, color: 'bg-red-600', badge: 0 },
    { id: 'REPORTS', label: 'گزارشات تخلف', icon: Flag, color: 'bg-orange-600', badge: 0 },
    { id: 'EXPIRED_ADS', label: 'آگهی‌های قدیمی', icon: History, color: 'bg-gray-700' },
    { id: 'ESTATE', label: 'املاک', icon: Home, color: 'bg-blue-600' },
    { id: 'VEHICLES', label: 'وسایل نقلیه', icon: Car, color: 'bg-green-600' },
    { id: 'DIGITAL', label: 'دیجیتال', icon: Smartphone, color: 'bg-purple-600' },
    { id: 'HOME_KITCHEN', label: 'خانه', icon: Sofa, color: 'bg-orange-600' },
    { id: 'SERVICES', label: 'خدمات', icon: Wrench, color: 'bg-amber-600' },
    { id: 'JOBS', label: 'استخدام', icon: Briefcase, color: 'bg-cyan-600' },
    { id: 'ENTERTAINMENT', label: 'سرگرمی', icon: Trophy, color: 'bg-yellow-600' },
    { id: 'PERSONAL', label: 'شخصی', icon: ShoppingBag, color: 'bg-pink-600' },
    { id: 'INDUSTRIAL', label: 'صنعتی', icon: HardHat, color: 'bg-slate-600' },
    { id: 'OTHERS', label: 'سایر', icon: Package, color: 'bg-gray-600' },
    { id: 'USERS', label: 'کاربران', icon: Users, badge: data.users.length, color: 'bg-indigo-600' },
    { id: 'SETTINGS', label: 'تنظیمات', icon: Settings, color: 'bg-zinc-800' },
  ];

  const getFilteredAds = () => {
    const allAds = [...data.properties, ...data.jobs, ...data.services, ...data.general];
    if (activeTab === 'PENDING_APPROVAL') return allAds.filter(ad => ad.status === 'PENDING');
    if (activeTab === 'EXPIRED_ADS') {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      return allAds.filter(ad => new Date(ad.created_at || ad.date) < sixtyDaysAgo);
    }
    if (activeTab === 'ESTATE') return data.properties;
    if (activeTab === 'JOBS') return data.jobs;
    if (activeTab === 'SERVICES') return data.services;
    if (activeTab === 'USERS' || activeTab === 'SETTINGS' || activeTab === 'REPORTS') return [];
    return data.general.filter((x: any) => x.mode === activeTab);
  };

  const pendingCount = [...data.properties, ...data.jobs, ...data.services, ...data.general].filter(a => a.status === 'PENDING').length;
  const reportsCount = data.reports.length;
  
  const pendingItem = menuItems.find(i => i.id === 'PENDING_APPROVAL');
  if (pendingItem) pendingItem.badge = pendingCount;
  
  const reportsItem = menuItems.find(i => i.id === 'REPORTS');
  if (reportsItem) reportsItem.badge = reportsCount;

  const getAdvertiserName = (phone: string) => {
    const user = data.users.find((u: any) => u.phone === phone);
    return user ? user.full_name : 'کاربر ناشناس';
  };

  const openReportedAd = (report: any) => {
    const allAds = [...data.properties, ...data.jobs, ...data.services, ...data.general];
    const ad = allAds.find(a => a.id === report.ad_id);
    if (ad) setSelectedItem(ad);
    else alert("آگهی مورد نظر یافت نشد (احتمالاً حذف شده است).");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-[Vazirmatn] overflow-hidden" dir="rtl">
       <header className="bg-gray-900 text-white p-4 shrink-0 flex items-center justify-between shadow-lg z-[100]">
          <div className="flex items-center gap-3">
             {activeTab && <button onClick={() => setActiveTab(null)} className="md:hidden p-1.5 bg-white/10 rounded-lg"><ArrowRight size={20}/></button>}
             <ShieldCheck className="text-red-500" size={24} />
             <div className="flex flex-col">
                <span className="font-black text-xs md:text-lg">مدیریت Khana</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase">{currentAdmin?.full_name || 'مدیر ارشد'}</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={fetchData} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
             </button>
             <button onClick={onExit} className="bg-red-600 text-white px-4 py-1.5 rounded-lg font-black text-[10px]">خروج</button>
          </div>
       </header>

       <div className="flex-1 flex overflow-hidden">
          <aside className="hidden md:block bg-gray-800 text-white shrink-0 w-64 h-full overflow-y-auto no-scrollbar border-l border-gray-700">
             <nav className="flex flex-col p-4 gap-1">
                {menuItems.map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-2 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}>
                    <item.icon size={18} /> <span className="text-xs font-black">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && <span className="mr-auto bg-white/10 text-white px-1.5 py-0.5 rounded-md text-[8px]">{item.badge}</span>}
                  </button>
                ))}
             </nav>
          </aside>

          <main className="flex-1 overflow-y-auto bg-white relative no-scrollbar">
             {!activeTab ? (
               <div className="md:hidden p-6 grid grid-cols-2 gap-4 pb-40">
                  {menuItems.map(item => (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 rounded-[2.5rem] border active:scale-95 shadow-sm">
                       <div className={`p-4 ${item.color} text-white rounded-2xl shadow-md`}><item.icon size={28} /></div>
                       <span className="text-[11px] font-black text-gray-700">{item.label}</span>
                       {item.badge !== undefined && item.badge > 0 && <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">{item.badge}</span>}
                    </button>
                  ))}
               </div>
             ) : (
               <div className="p-4 md:p-8 animate-in fade-in pb-40">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                      {menuItems.find(m => m.id === activeTab)?.label}
                    </h2>
                    {loading && <div className="flex items-center gap-2 text-gray-400 text-xs font-bold"><Loader2 className="animate-spin" size={14}/> در حال دریافت داده‌ها...</div>}
                  </div>

                  {activeTab === 'REPORTS' ? (
                    <div className="space-y-4">
                       {data.reports.length === 0 && !loading ? (
                         <div className="py-20 text-center text-gray-400 font-black">هیچ گزارش تخلفی ثبت نشده است.</div>
                       ) : data.reports.map((report: any) => (
                         <div key={report.id} className="bg-white border-2 border-orange-100 rounded-[1.8rem] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                               <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><Flag size={24}/></div>
                               <div>
                                  <h4 className="font-black text-sm text-gray-800">{report.ad_title}</h4>
                                  <div className="flex items-center gap-3 mt-1">
                                     <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{report.reason}</span>
                                     <span className="text-[9px] text-gray-400 font-bold" dir="ltr">{new Date(report.created_at).toLocaleString('fa-AF')}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                               <button onClick={() => openReportedAd(report)} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all">
                                  <ExternalLink size={14}/> مشاهده آگهی
                               </button>
                               <button onClick={() => handleDeleteReport(report.id)} className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-xl font-black text-[10px] hover:bg-red-600 hover:text-white transition-all">
                                  <Trash2 size={14}/> حذف گزارش
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : activeTab === 'USERS' ? (
                     <div className="space-y-6">
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                           <div className="flex items-center gap-4">
                              <button 
                                onClick={selectAllUsers} 
                                className="flex items-center gap-2 text-[10px] font-black text-gray-600 bg-white border px-3 py-2 rounded-xl hover:bg-gray-100 transition-all"
                              >
                                {selectedUserPhones.size === data.users.length ? <CheckSquare size={16} className="text-red-600" /> : <Square size={16} />}
                                انتخاب همه ({data.users.length})
                              </button>
                              {selectedUserPhones.size > 0 && (
                                <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100 animate-pulse">
                                  {selectedUserPhones.size} کاربر انتخاب شده
                                </span>
                              )}
                           </div>
                           
                           {selectedUserPhones.size > 0 && (
                             <button 
                               onClick={() => setIsBroadcastModalOpen(true)}
                               className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                             >
                               <SendHorizontal size={16} /> ارسال پیام گروهی
                             </button>
                           )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {data.users.length === 0 && !loading ? (
                              <div className="col-span-full py-20 text-center">
                                 <UserIcon className="mx-auto text-gray-200 mb-4" size={48} />
                                 <p className="text-gray-400 font-black">هنوز کاربری در سیستم ثبت نشده است.</p>
                              </div>
                           ) : data.users.map((u: any) => (
                              <div 
                                key={u.phone} 
                                onClick={() => toggleUserSelection(u.phone)}
                                className={`bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all cursor-pointer ${selectedUserPhones.has(u.phone) ? 'border-red-500 bg-red-50/30' : 'hover:border-red-200'}`}
                              >
                                 <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative shrink-0">
                                       <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-gray-300"/>}
                                       </div>
                                       {selectedUserPhones.has(u.phone) && (
                                         <div className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 border-2 border-white">
                                           <CheckSquare size={10} />
                                         </div>
                                       )}
                                    </div>
                                    <div className="text-right truncate">
                                       <h4 className="font-black text-xs text-gray-800 truncate">{u.full_name || 'کاربر خانه'}</h4>
                                       <p className="text-[10px] text-gray-400 font-bold" dir="ltr">{u.phone}</p>
                                    </div>
                                 </div>
                                 <button 
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     setSelectedItem({ ad_id: 'SYSTEM', ad_title: 'پشتیبانی', phone_number: u.phone, adType: 'MESSAGE' });
                                   }} 
                                   className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shrink-0"
                                 >
                                   <MessageSquare size={18}/>
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                  ) : activeTab === 'SETTINGS' ? (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-50 p-6 rounded-[2.5rem] border space-y-4 shadow-sm h-fit">
                           <h3 className="font-black text-sm flex items-center gap-2 text-red-600"><PhoneCall size={18}/> تنظیمات عمومی</h3>
                           <div className="space-y-4">
                              <input type="tel" value={settings.contact_phone} onChange={e => setSettings({...settings, contact_phone: e.target.value})} className="w-full bg-white border rounded-2xl p-4 font-black outline-none focus:border-red-500" placeholder="شماره تماس پشتیبانی" />
                              <div className="relative">
                                 <Instagram size={18} className="absolute right-4 top-4 text-pink-500" />
                                 <input type="text" value={settings.instagram} onChange={e => setSettings({...settings, instagram: e.target.value})} className="w-full bg-white border rounded-2xl p-4 pr-12 font-bold outline-none focus:border-red-500" placeholder="لینک اینستاگرام" />
                              </div>
                              <div className="relative">
                                 <Send size={18} className="absolute right-4 top-4 text-blue-500" />
                                 <input type="text" value={settings.telegram} onChange={e => setSettings({...settings, telegram: e.target.value})} className="w-full bg-white border rounded-2xl p-4 pr-12 font-bold outline-none focus:border-red-500" placeholder="لینک تلگرام" />
                              </div>
                              <div className="relative">
                                 <Facebook size={18} className="absolute right-4 top-4 text-blue-800" />
                                 <input type="text" value={settings.facebook} onChange={e => setSettings({...settings, facebook: e.target.value})} className="w-full bg-white border rounded-2xl p-4 pr-12 font-bold outline-none focus:border-red-500" placeholder="لینک فیس‌بوک" />
                              </div>
                              <textarea value={settings.about_text} onChange={e => setSettings({...settings, about_text: e.target.value})} className="w-full bg-white border rounded-2xl p-4 font-bold outline-none h-32 focus:border-red-500 resize-none" placeholder="متن درباره ما..." />
                           </div>
                           <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg">
                              {isSavingSettings ? <Loader2 className="animate-spin mx-auto"/> : 'ذخیره تنظیمات'}
                           </button>
                        </div>

                        <div className="space-y-6">
                           <div className="bg-gray-50 p-6 rounded-[2.5rem] border space-y-4 shadow-sm">
                              <h3 className="font-black text-sm flex items-center gap-2 text-blue-600"><Key size={18}/> امنیت و تغییر رمز</h3>
                              <div className="space-y-3">
                                <input 
                                  type="password" 
                                  value={changePass.new} 
                                  onChange={e => setChangePass({...changePass, new: e.target.value})} 
                                  placeholder="رمز عبور جدید" 
                                  className="w-full bg-white border rounded-2xl p-4 font-black outline-none focus:border-blue-500" 
                                />
                                <input 
                                  type="password" 
                                  value={changePass.confirm} 
                                  onChange={e => setChangePass({...changePass, confirm: e.target.value})} 
                                  placeholder="تکرار رمز عبور جدید" 
                                  className="w-full bg-white border rounded-2xl p-4 font-black outline-none focus:border-blue-500" 
                                />
                              </div>
                              <button onClick={handleChangePassword} disabled={isChangingPass} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">
                                {isChangingPass ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'بروزرسانی رمز'}
                              </button>
                           </div>

                           <div className="bg-gray-50 p-6 rounded-[2.5rem] border space-y-4 shadow-sm">
                              <h3 className="font-black text-sm flex items-center gap-2 text-indigo-600"><UserPlus size={18}/> افزودن مدیر جدید</h3>
                              <div className="space-y-3">
                                 <input type="text" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} placeholder="نام کامل مدیر" className="w-full bg-white border rounded-2xl p-4 font-black outline-none focus:border-indigo-500" />
                                 <input type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} placeholder="نام کاربری" className="w-full bg-white border rounded-2xl p-4 font-black outline-none focus:border-indigo-500" />
                                 <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="رمز عبور" className="w-full bg-white border rounded-2xl p-4 font-black outline-none focus:border-indigo-500" />
                              </div>
                              <button onClick={handleAddAdmin} disabled={isAddingAdmin} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">
                                 {isAddingAdmin ? <Loader2 className="animate-spin mx-auto"/> : 'ثبت مدیر جدید'}
                              </button>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getFilteredAds().length === 0 && !loading ? (
                           <div className="col-span-full py-32 text-center text-gray-300 font-black">موردی یافت نشد.</div>
                        ) : getFilteredAds().map((item: any) => (
                           <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white border rounded-[2rem] p-4 flex gap-4 cursor-pointer hover:border-red-500 shadow-sm group">
                              <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border">
                                 {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-4 text-gray-300"/>}
                              </div>
                              <div className="flex-1 text-right flex flex-col justify-between overflow-hidden">
                                 <div>
                                    <h4 className="text-[11px] font-black text-gray-800 truncate">{item.title}</h4>
                                    <div className="flex gap-1 mt-1">
                                       <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.status === 'APPROVED' ? 'تایید شده' : 'در انتظار'}</span>
                                    </div>
                                 </div>
                                 <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1 justify-end mt-2"><MapPin size={10}/> {item.city}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
             )}
          </main>
       </div>

       {/* Broadcast Modal */}
       {isBroadcastModalOpen && (
         <div className="fixed inset-0 z-[600] bg-black/70 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setIsBroadcastModalOpen(false)}>
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
               <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <SendHorizontal size={20} /> ارسال پیام انبوه
                    </h3>
                    <p className="text-[10px] opacity-80 mt-1">در حال ارسال به {selectedUserPhones.size} کاربر انتخاب شده</p>
                  </div>
                  <button onClick={() => setIsBroadcastModalOpen(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X size={20}/></button>
               </div>
               <div className="p-6 space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
                    <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-[10px] text-indigo-800 leading-5 font-black">
                      این پیام برای تمامی کاربران انتخاب شده به صورت پیام سیستمی ارسال خواهد شد. لطفاً در محتوا دقت فرمایید.
                    </p>
                  </div>
                  <textarea 
                    value={broadcastText} 
                    onChange={e => setBroadcastText(e.target.value)} 
                    placeholder="متن اطلاعیه یا پیام خود را اینجا بنویسید..." 
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-5 text-xs font-bold h-48 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
                  ></textarea>
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={handleBroadcastSend} 
                      disabled={isSendingBroadcast || !broadcastText.trim()} 
                      className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:bg-gray-300 transition-all"
                    >
                      {isSendingBroadcast ? <Loader2 className="animate-spin" size={20} /> : <><SendHorizontal size={18} /> تایید و ارسال نهایی</>}
                    </button>
                    <button 
                      onClick={() => setIsBroadcastModalOpen(false)} 
                      className="px-6 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all"
                    >
                      انصراف
                    </button>
                  </div>
               </div>
            </div>
         </div>
       )}

       {selectedItem && (
         <div className="fixed inset-0 z-[500] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="bg-white w-full max-w-2xl max-h-[95vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
               <div className="p-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
                  <h3 className="font-black text-sm">{selectedItem.adType === 'MESSAGE' ? 'ارسال پیام مستقیم' : 'بررسی کامل جزئیات آگهی'}</h3>
                  <button onClick={() => setSelectedItem(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-600 transition-colors shadow-sm"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 text-right no-scrollbar">
                  {selectedItem.adType === 'MESSAGE' ? (
                     <div className="space-y-6">
                        <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="پیام خود را بنویسید..." className="w-full bg-gray-50 border rounded-2xl p-5 text-xs font-bold h-40 outline-none focus:border-blue-500 shadow-inner"></textarea>
                        <button onClick={async () => {
                           if(!adminNote.trim()) return;
                           await supabase.from(TABLES.USER_CHATS).insert([{ sender_phone: 'ADMIN', receiver_phone: selectedItem.phone_number, ad_id: 'SYSTEM', ad_title: 'پشتیبانی', text: adminNote }]);
                           setAdminNote(''); setSelectedItem(null); alert("پیام ارسال شد.");
                        }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">ارسال پیام</button>
                     </div>
                  ) : (
                    <div className="space-y-6 pb-20">
                      
                      <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-[2rem] flex items-center gap-4">
                         <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                            <UserIcon size={32} />
                         </div>
                         <div className="flex-1">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">اطلاعات آگهی‌دهنده</span>
                            <h4 className="font-black text-lg text-indigo-900">{getAdvertiserName(selectedItem.owner_id || selectedItem.phone_number)}</h4>
                            <p className="text-xs text-indigo-600 font-bold" dir="ltr">{selectedItem.owner_id || selectedItem.phone_number}</p>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center gap-2 text-gray-400">
                            <LayoutGrid size={18} />
                            <span className="text-[10px] font-black">گالری تصاویر ({selectedItem.images?.length || 0})</span>
                         </div>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedItem.images?.map((img: string, idx: number) => (
                               <div key={idx} className="aspect-square bg-gray-100 rounded-3xl overflow-hidden border shadow-sm group relative">
                                  <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="ad-image" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                               </div>
                            ))}
                            {(!selectedItem.images || selectedItem.images.length === 0) && (
                               <div className="col-span-full h-32 bg-gray-50 border-2 border-dashed rounded-3xl flex items-center justify-center text-gray-300 font-black">تصویری موجود نیست</div>
                            )}
                         </div>
                      </div>

                      <div className="text-right space-y-2 border-b pb-6">
                           <div className="flex items-center gap-2 text-red-600 mb-1">
                              <Info size={18} />
                              <span className="text-[10px] font-black uppercase tracking-widest">اطلاعات پایه</span>
                           </div>
                           <h4 className="font-black text-2xl text-gray-800 leading-tight">{selectedItem.title}</h4>
                           <div className="flex items-center gap-3">
                              <span className="text-red-600 font-black text-2xl">{Number(selectedItem.price || selectedItem.salary || 0).toLocaleString()} <small className="text-sm">AFN</small></span>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${selectedItem.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                 {selectedItem.status === 'APPROVED' ? 'تایید شده' : 'در انتظار بررسی'}
                              </span>
                           </div>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-[2.5rem] border space-y-5">
                         <h4 className="text-xs font-black text-gray-400 flex items-center gap-2 border-b pb-3 mb-2"><LayoutGrid size={16} /> مشخصات فنی و سیستمی:</h4>
                         
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border"><span className="text-gray-400 text-[10px] font-bold">شناسه آگهی:</span><span className="text-gray-700 text-[10px] font-black">{selectedItem.id}</span></div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border"><span className="text-gray-400 text-[10px] font-bold">تاریخ ثبت:</span><span className="text-gray-700 text-[10px] font-black" dir="ltr">{new Date(selectedItem.created_at || selectedItem.date).toLocaleString('fa-AF')}</span></div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border"><span className="text-gray-400 text-[10px] font-bold">ولایت:</span><span className="text-gray-700 text-[10px] font-black">{selectedItem.city}</span></div>
                            
                            {selectedItem.adType === 'ESTATE' && (
                               <>
                                  <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100"><span className="text-blue-400 text-[10px] font-bold">متراژ:</span><span className="text-blue-700 text-xs font-black">{selectedItem.area} متر</span></div>
                                  <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100"><span className="text-blue-400 text-[10px] font-bold">تعداد اتاق:</span><span className="text-blue-700 text-xs font-black">{selectedItem.bedrooms}</span></div>
                                  <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100"><span className="text-blue-400 text-[10px] font-bold">نوع ملک:</span><span className="text-blue-700 text-xs font-black">{selectedItem.type}</span></div>
                                  <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100"><span className="text-blue-400 text-[10px] font-bold">نوع معامله:</span><span className="text-blue-700 text-xs font-black">{selectedItem.deal_type}</span></div>
                               </>
                            )}

                            {selectedItem.adType === 'JOBS' && (
                               <>
                                  <div className="flex justify-between items-center bg-cyan-50/50 p-3 rounded-xl border border-cyan-100"><span className="text-cyan-400 text-[10px] font-bold">نام شرکت:</span><span className="text-cyan-700 text-xs font-black">{selectedItem.company}</span></div>
                                  <div className="flex justify-between items-center bg-cyan-50/50 p-3 rounded-xl border border-cyan-100"><span className="text-cyan-400 text-[10px] font-bold">معاش:</span><span className="text-cyan-700 text-xs font-black">{Number(selectedItem.salary).toLocaleString()} AFN</span></div>
                               </>
                            )}

                            {selectedItem.adType === 'SERVICES' && (
                               <>
                                  <div className="flex justify-between items-center bg-amber-50/50 p-3 rounded-xl border border-amber-100"><span className="text-amber-400 text-[10px] font-bold">سابقه:</span><span className="text-amber-700 text-xs font-black">{selectedItem.experience}</span></div>
                               </>
                            )}
                         </div>

                         <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border">
                            <MapPin size={20} className="text-red-600 shrink-0 mt-0.5"/>
                            <div>
                               <span className="text-[10px] font-black text-gray-400 block mb-1">آدرس ثبت شده:</span>
                               <span className="text-xs font-bold text-gray-700 leading-6">{selectedItem.address}</span>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-400">
                           <MessageSquare size={18} />
                           <span className="text-[10px] font-black">توضیحات تکمیلی آگهی‌دهنده:</span>
                        </div>
                        <p className="bg-gray-50 p-5 rounded-3xl border text-[13px] leading-8 text-gray-600 font-bold whitespace-pre-wrap shadow-inner">{selectedItem.description}</p>
                      </div>

                      <div className="bg-gray-900 p-6 rounded-[2.5rem] space-y-4 shadow-xl border border-gray-800">
                         <div className="flex items-center gap-2">
                           <Send className="text-blue-500" size={18} />
                           <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">پاسخ سریع و یادداشت ادمین</span>
                         </div>
                         <div className="flex gap-2">
                            <input 
                               type="text" 
                               value={adminNote} 
                               onChange={e => setAdminNote(e.target.value)} 
                               placeholder="دلیل تایید، رد یا پیام راهنما برای کاربر..." 
                               className="flex-1 bg-white/5 text-white rounded-2xl px-5 text-xs font-bold outline-none focus:bg-white/10 border border-white/10 transition-all h-14"
                            />
                            <button 
                               onClick={async () => {
                                  if(!adminNote.trim()) return;
                                  await supabase.from(TABLES.USER_CHATS).insert([{ sender_phone: 'ADMIN', receiver_phone: selectedItem.owner_id || selectedItem.phone_number, ad_id: selectedItem.id, ad_title: selectedItem.title, text: adminNote }]);
                                  setAdminNote(''); alert("پیام ادمین ارسال شد.");
                               }}
                               className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center active:scale-90 hover:bg-blue-700 transition-all shadow-lg"
                            >
                               <Send size={24} className="rotate-180" />
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 shrink-0 mt-4">
                        <button onClick={async () => {
                           const table = selectedItem.adType === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.adType === 'JOBS' ? TABLES.JOBS : selectedItem.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
                           await supabase.from(table).update({ status: 'APPROVED', created_at: new Date().toISOString() }).eq('id', selectedItem.id); 
                           setSelectedItem(null); fetchData();
                        }} className="bg-green-600 text-white py-5 rounded-[1.8rem] font-black shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all text-sm">تایید و انتشار نهایی</button>
                        
                        <button onClick={async () => {
                           if(confirm('آیا از حذف کامل و دائمی این آگهی مطمئن هستید؟')) {
                             const table = selectedItem.adType === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.adType === 'JOBS' ? TABLES.JOBS : selectedItem.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
                             await supabase.from(table).delete().eq('id', selectedItem.id); 
                             setSelectedItem(null); fetchData();
                           }
                        }} className="bg-red-600 text-white py-5 rounded-[1.8rem] font-black shadow-xl shadow-red-100 hover:bg-red-700 active:scale-95 transition-all text-sm">رد و حذف آگهی</button>
                      </div>
                    </div>
                  )}
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
export default AdminPanel;
