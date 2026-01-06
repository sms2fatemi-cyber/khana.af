
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Property, Job, Service } from '../types';
import { 
  Trash2, Home, LayoutDashboard, Briefcase, Wrench, 
  CheckCircle, MessageSquare, Eye, Users, Phone, 
  ShieldCheck, Loader2, Send, Clock, ChevronRight, 
  Search, UserCircle, BadgeCheck, Key, X,
  ShieldAlert, MapPin, ChevronLeft, Info,
  TrendingUp, FileText, RefreshCw, Box, Car, Layers, UserPlus, Lock
} from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface AdminPanelProps {
  properties: Property[];
  jobs: Job[];
  services: Service[];
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  onExit 
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'USERS' | 'ADMINS' | 'PASSWORD'>('DASHBOARD');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // استیت‌های داخلی برای ذخیره آگهی‌ها
  const [adminProperties, setAdminProperties] = useState<Property[]>([]);
  const [adminJobs, setAdminJobs] = useState<Job[]>([]);
  const [adminServices, setAdminServices] = useState<Service[]>([]);

  const touchStartX = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatHistory.length > 0) {
      scrollToBottom();
    }
  }, [chatHistory]);

  const fetchData = useCallback(async () => {
    setIsRefreshingData(true);
    try {
      // دریافت لیست کاربران
      const { data: profiles } = await supabase.from('profiles').select('*');
      setAllUsers(profiles || []);

      // دریافت تمام آگهی‌ها بدون فیلتر برای ادمین
      const [propRes, jobRes, servRes] = await Promise.all([
        supabase.from(TABLES.PROPERTIES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.JOBS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.SERVICES).select('*').order('created_at', { ascending: false })
      ]);

      const mapDbItem = (i: any) => ({ ...i, ownerId: i.owner_id || i.ownerId || 'guest' });

      setAdminProperties((propRes.data || []).map(mapDbItem));
      setAdminJobs((jobRes.data || []).map(mapDbItem));
      setAdminServices((servRes.data || []).map(mapDbItem));

    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsRefreshingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const nextImg = useCallback(() => {
    if (!selectedItem?.images || selectedItem.images.length <= 1) return;
    setActiveImgIdx(prev => (prev + 1) % selectedItem.images.length);
  }, [selectedItem]);

  const prevImg = useCallback(() => {
    if (!selectedItem?.images || selectedItem.images.length <= 1) return;
    setActiveImgIdx(prev => (prev - 1 + selectedItem.images.length) % selectedItem.images.length);
  }, [selectedItem]);

  const stats = useMemo(() => {
    const totalUsers = allUsers.length;
    const totalAds = adminProperties.length + adminJobs.length + adminServices.length;
    const pendingAds = adminProperties.filter(p => p.status === 'PENDING').length + 
                     adminJobs.filter(j => j.status === 'PENDING').length + 
                     adminServices.filter(s => s.status === 'PENDING').length;
    
    const activeUserPhones = new Set([
      ...adminProperties.map(p => p.ownerId),
      ...adminJobs.map(j => j.ownerId),
      ...adminServices.map(s => s.ownerId)
    ]);
    const activeUsersCount = allUsers.filter(u => activeUserPhones.has(u.phone)).length;

    return { totalUsers, totalAds, pendingAds, activeUsers: activeUsersCount };
  }, [allUsers, adminProperties, adminJobs, adminServices]);

  const handleStatusUpdate = async (id: string, table: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
      setSelectedItem(null);
      fetchData(); 
    } catch (e: any) { alert("خطا: " + e.message); } finally { setIsProcessing(false); }
  };

  const handleDeleteItem = async (id: string, table: string) => {
    if (!window.confirm("آیا از حذف دائمی این آگهی مطمئن هستید؟")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setSelectedItem(null);
      fetchData();
    } catch (e: any) { alert("خطا: " + e.message); } finally { setIsProcessing(false); }
  };

  const handleSendAdminMessage = async (targetPhone: string) => {
    if (!adminMsg.trim()) return;
    setIsProcessing(true);
    try {
      await supabase.from(TABLES.MESSAGES).insert([{ 
        target_phone: targetPhone, 
        text: adminMsg.trim(), 
        is_read: false, 
        date: new Date().toISOString() 
      }]);
      setChatHistory(prev => [...prev, { text: adminMsg.trim(), date: new Date().toISOString() }]);
      setAdminMsg('');
      alert("پیام ارسال شد.");
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const fetchChatHistory = async (phone: string) => {
    const { data } = await supabase.from(TABLES.MESSAGES).select('*').eq('target_phone', phone).order('date', { ascending: true });
    setChatHistory(data || []);
  };

  const getUserAdsCount = (phone: string) => {
    return adminProperties.filter(p => p.ownerId === phone).length + 
           adminJobs.filter(j => j.ownerId === phone).length + 
           adminServices.filter(s => s.ownerId === phone).length;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-[Vazirmatn] overflow-hidden md:flex-row" dir="rtl">
       
       <div className="z-[100] flex w-full flex-col bg-gray-900 text-white shrink-0 md:h-full md:w-72">
         <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0 md:justify-start md:gap-3 md:p-8">
           <div className="flex items-center gap-3"><ShieldCheck className="text-red-500" size={32} /><span className="text-lg font-black">پنل مدیریت</span></div>
           <button onClick={onExit} className="px-3 py-1.5 rounded-lg bg-red-600 text-xs font-black md:hidden">خروج</button>
         </div>
         <nav className="flex flex-1 space-x-2 overflow-x-auto no-scrollbar p-4 md:flex-col md:space-x-0 md:space-y-3 md:p-6 md:overflow-y-auto">
           <button onClick={() => {setActiveTab('DASHBOARD'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><LayoutDashboard size={20} /> پیشخوان</button>
           <button onClick={() => {setActiveTab('ESTATE'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'ESTATE' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Home size={20} /> املاک</button>
           <button onClick={() => {setActiveTab('JOBS'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'JOBS' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Briefcase size={20} /> کاریابی</button>
           <button onClick={() => {setActiveTab('SERVICES'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'SERVICES' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Wrench size={20} /> خدمات</button>
           <button onClick={() => {setActiveTab('USERS'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'USERS' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Users size={20} /> کاربران</button>
           <button onClick={() => {setActiveTab('ADMINS'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'ADMINS' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><ShieldAlert size={20} /> ادمین‌ها</button>
           <button onClick={() => {setActiveTab('PASSWORD'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'PASSWORD' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Key size={20} /> تغییر رمز</button>
         </nav>
       </div>

       <div className="relative flex flex-1 flex-col overflow-hidden">
         <div className="flex items-center justify-between border-b bg-white px-8 py-4 shadow-sm shrink-0">
            <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-3 shrink-0"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Users size={18}/></div><div className="text-xs font-black text-gray-500">کل کاربران: <span className="text-gray-900">{stats.totalUsers}</span></div></div>
                <div className="flex items-center gap-3 shrink-0"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600"><TrendingUp size={18}/></div><div className="text-xs font-black text-gray-500">فعال: <span className="text-gray-900">{stats.activeUsers}</span></div></div>
                <div className="flex items-center gap-3 shrink-0"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600"><FileText size={18}/></div><div className="text-xs font-black text-gray-500">کل آگهی‌ها: <span className="text-gray-900">{stats.totalAds}</span></div></div>
                <div className="flex items-center gap-3 shrink-0"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Clock size={18}/></div><div className="text-xs font-black text-gray-500">در انتظار تایید: <span className="font-black text-gray-900">{stats.pendingAds}</span></div></div>
            </div>
            <button onClick={fetchData} className={`p-2 bg-gray-100 rounded-xl text-gray-600 transition-all ${isRefreshingData ? 'animate-spin' : ''}`}>
               <RefreshCw size={20} />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto bg-gray-50 p-4 no-scrollbar pb-32 md:p-8">
           {activeTab === 'DASHBOARD' && (
             <div className="grid grid-cols-1 gap-6 animate-in zoom-in-95 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col items-center border bg-white p-8 text-center rounded-[2.5rem] shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BadgeCheck size={32}/></div>
                  <h3 className="text-[10px] font-black uppercase text-gray-400">کاربران کل</h3>
                  <p className="text-3xl font-black text-gray-800">{String(stats.totalUsers)}</p>
                </div>
                <div className="flex flex-col items-center border bg-white p-8 text-center rounded-[2.5rem] shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Home size={32}/></div>
                  <h3 className="text-[10px] font-black uppercase text-gray-400">املاک</h3>
                  <p className="text-3xl font-black text-gray-800">{String(adminProperties.length)}</p>
                </div>
                <div className="flex flex-col items-center border bg-white p-8 text-center rounded-[2.5rem] shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Briefcase size={32}/></div>
                  <h3 className="text-[10px] font-black uppercase text-gray-400">مشاغل</h3>
                  <p className="text-3xl font-black text-gray-800">{String(adminJobs.length)}</p>
                </div>
                <div className="flex flex-col items-center border bg-white p-8 text-center rounded-[2.5rem] shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Wrench size={32}/></div>
                  <h3 className="text-[10px] font-black uppercase text-gray-400">خدمات</h3>
                  <p className="text-3xl font-black text-gray-800">{String(adminServices.length)}</p>
                </div>
             </div>
           )}

           {activeTab === 'USERS' && !selectedUser && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="relative">
                  <Search className="absolute right-6 top-5 text-gray-300"/>
                  <input type="text" placeholder="جستجوی نام یا شماره تماس..." className="w-full rounded-3xl border-2 border-transparent bg-white py-5 pl-6 pr-14 font-bold outline-none shadow-sm transition-all focus:border-red-500" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {allUsers.filter(u => String(u.phone).includes(userSearch) || String(u.full_name || '').includes(userSearch)).map(user => (
                    <div key={String(user.id)} onClick={() => {setSelectedUser(user); fetchChatHistory(user.phone);}} className="group flex items-center gap-5 cursor-pointer border border-gray-100 bg-white p-6 transition-all rounded-[2.5rem] hover:border-red-100 hover:shadow-xl">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center border bg-gray-100 rounded-2xl">
                          {user.avatar_url ? <img src={String(user.avatar_url)} className="h-full w-full rounded-2xl object-cover" alt="avatar"/> : <UserCircle size={32} className="text-gray-300"/>}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate text-base font-black text-gray-900">{String(user.full_name || 'بدون نام')}</div>
                          <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-gray-500" dir="ltr"><span className="text-red-500"><Phone size={12}/></span>{String(user.phone)}</div>
                        </div>
                        <div className="flex flex-col items-center border bg-gray-50 px-3 py-2 rounded-xl"><span className="text-[10px] font-black text-gray-400">ADS</span><span className="text-sm font-black text-red-600">{String(getUserAdsCount(user.phone))}</span></div>
                    </div>
                  ))}
                </div>
              </div>
           )}

           {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
              <div className="overflow-x-auto no-scrollbar border bg-white shadow-sm animate-in slide-in-from-bottom-4 rounded-[3rem]">
                 <table className="w-full min-w-[700px] text-right">
                    <thead className="border-b bg-gray-50"><tr className="text-[10px] font-black uppercase tracking-widest text-gray-400"><th className="px-8 py-6">عنوان آگهی</th><th className="px-8 py-6">ولایت</th><th className="px-8 py-6">وضعیت</th><th className="px-8 py-6 text-center">عملیات</th></tr></thead>
                    <tbody className="divide-y">
                      {(activeTab === 'ESTATE' ? adminProperties : activeTab === 'JOBS' ? adminJobs : adminServices).length === 0 ? (
                        <tr><td colSpan={4} className="py-20 text-center font-black text-gray-300">هیچ موردی یافت نشد.</td></tr>
                      ) : (
                        (activeTab === 'ESTATE' ? adminProperties : activeTab === 'JOBS' ? adminJobs : adminServices).map(item => (
                          <tr key={String(item.id)} className="transition-colors hover:bg-gray-50">
                            <td className="px-8 py-5 text-sm font-black text-gray-800">{String(item.title)}</td>
                            <td className="px-8 py-5 text-xs font-bold text-gray-500"><MapPin size={12} className="inline ml-1 text-gray-300"/> {String(item.city)}</td>
                            <td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{String(item.status)}</span></td>
                            <td className="px-8 py-5 text-center"><button onClick={() => {setSelectedItem(item); setActiveImgIdx(0);}} className="rounded-2xl bg-red-50 p-3.5 text-red-600 shadow-sm transition-all active:scale-90 hover:bg-red-600 hover:text-white"><Eye size={22}/></button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                 </table>
              </div>
           )}

           {activeTab === 'USERS' && selectedUser && (
             <div className="animate-in slide-in-from-left-4 max-w-2xl mx-auto bg-white p-8 rounded-[3rem] border shadow-sm">
                <button onClick={() => setSelectedUser(null)} className="mb-6 flex items-center gap-2 text-gray-400 font-bold hover:text-red-600"><ChevronRight size={20}/> بازگشت به لیست</button>
                <div className="flex items-center gap-6 mb-10 border-b pb-8">
                  <div className="w-24 h-24 rounded-[2rem] bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 border-4 border-white shadow-lg">
                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover"/> : <UserCircle size={48} className="text-gray-300"/>}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{selectedUser.full_name || 'بدون نام'}</h2>
                    <p className="text-gray-400 font-bold mt-1" dir="ltr">{selectedUser.phone}</p>
                  </div>
                </div>
                <div className="space-y-6">
                   <h3 className="text-lg font-black text-gray-800 flex items-center gap-2"><MessageSquare size={20} className="text-red-600"/> پیام‌های ارسال شده</h3>
                   <div className="bg-gray-50 rounded-[2.5rem] p-6 h-64 overflow-y-auto no-scrollbar space-y-4 shadow-inner">
                      {chatHistory.length === 0 ? <p className="text-center text-gray-300 py-20 font-bold">هیچ پیامی برای این کاربر ارسال نشده است.</p> : (
                        chatHistory.map((msg, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl border shadow-sm">
                             <p className="text-sm font-bold text-gray-700">{msg.text}</p>
                             <span className="text-[9px] text-gray-400 font-bold mt-2 block">{new Date(msg.date).toLocaleString('fa-AF')}</span>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef}/>
                   </div>
                   <div className="flex gap-2 bg-red-50 p-4 rounded-[2.5rem]">
                      <input type="text" placeholder="نوشتن پیام جدید..." className="flex-1 bg-white rounded-2xl px-5 py-4 text-sm font-bold outline-none shadow-sm" value={adminMsg} onChange={e => setAdminMsg(e.target.value)}/>
                      <button onClick={() => handleSendAdminMessage(selectedUser.phone)} disabled={!adminMsg.trim() || isProcessing} className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center active:scale-90 disabled:opacity-50"><Send size={24} className="rotate-180"/></button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'ADMINS' && (
             <div className="bg-white p-10 rounded-[3rem] text-center border shadow-sm max-w-xl mx-auto">
                <ShieldAlert size={64} className="mx-auto text-red-600 mb-6"/>
                <h2 className="text-2xl font-black mb-4">مدیریت ادمین‌ها</h2>
                <div className="flex flex-col items-center gap-2 mb-6">
                    <UserPlus className="text-blue-500" />
                    <Layers className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold leading-8">این بخش برای افزودن ادمین‌های جدید و مدیریت سطوح دسترسی است. در حال حاضر فقط مدیر اصلی سیستم (Super Admin) مجاز به تغییرات در این بخش می‌باشد.</p>
                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <p className="text-xs font-black text-gray-400">به زودی در نسخه‌های بعدی فعال می‌شود...</p>
                </div>
             </div>
           )}

           {activeTab === 'PASSWORD' && (
             <div className="bg-white p-10 rounded-[3rem] border shadow-sm max-w-md mx-auto">
                <h2 className="text-2xl font-black mb-6 text-center">تغییر رمز عبور</h2>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest"><Lock size={12} className="inline ml-1"/> رمز فعلی</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-gray-50 border rounded-2xl py-4 px-5 font-black outline-none focus:border-red-500 transition-all"/>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">رمز جدید</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-gray-50 border rounded-2xl py-4 px-5 font-black outline-none focus:border-red-500 transition-all"/>
                   </div>
                   <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg mt-4 active:scale-95">بروزرسانی رمز عبور</button>
                </div>
             </div>
           )}
         </div>
       </div>

       {selectedItem && (
         <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
           <div className="flex h-[95vh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl animate-slide-up rounded-[3rem]">
              <div className="flex items-center justify-between border-b p-6 bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2"><Info className="text-red-600"/><h3 className="text-lg font-black text-gray-800">بررسی کامل جزئیات آگهی</h3></div>
                <button onClick={() => setSelectedItem(null)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                 <div className="relative aspect-video w-full overflow-hidden bg-black select-none shrink-0" onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={(e) => {
                      if (touchStartX.current === null) return;
                      const diff = touchStartX.current - e.changedTouches[0].clientX;
                      if (Math.abs(diff) > 40) diff > 0 ? nextImg() : prevImg();
                      touchStartX.current = null;
                   }}>
                    {selectedItem.images && selectedItem.images.length > 0 ? (
                      <>
                        <img key={activeImgIdx} src={String(selectedItem.images[activeImgIdx])} className="h-full w-full object-contain animate-in fade-in" alt="preview" />
                        <button onClick={prevImg} className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-white/20 p-4 text-white"><ChevronRight size={32}/></button>
                        <button onClick={nextImg} className="absolute top-1/2 left-4 -translate-y-1/2 rounded-full bg-white/20 p-4 text-white"><ChevronLeft size={32}/></button>
                      </>
                    ) : <div className="flex h-full items-center justify-center font-black text-gray-500">بدون عکس</div>}
                 </div>

                 <div className="space-y-8 p-8 text-right">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-gray-800 leading-tight">{String(selectedItem.title)}</h2>
                      <div className="flex items-center justify-end gap-3 text-gray-400 font-bold text-[10px] uppercase">
                        <Clock size={12}/> {new Date(selectedItem.created_at).toLocaleDateString('fa-AF')} در {selectedItem.city}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex items-center justify-end gap-3 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                         <span className="text-gray-800 font-black text-lg" dir="ltr">{String(selectedItem.phone_number)}</span>
                         <Phone size={20} className="text-green-600" />
                       </div>
                       <div className="flex items-center justify-end gap-3 bg-red-50 p-5 rounded-2xl border border-red-100">
                         <span className="text-red-600 font-black text-lg">{Number(selectedItem.price || selectedItem.salary || 0).toLocaleString()}</span>
                         <span className="text-[10px] text-red-400 font-black">AFN</span>
                       </div>
                    </div>

                    <div className="bg-white p-6 border-2 border-dashed border-gray-100 rounded-[2.5rem] space-y-6">
                       <h3 className="text-[10px] font-black text-gray-400 flex items-center justify-end gap-2 uppercase tracking-widest border-b pb-3"><Info size={14}/> مشخصات فنی ثبت شده</h3>
                       <div className="grid grid-cols-2 gap-y-4 text-xs font-bold text-gray-700">
                          {activeTab === 'ESTATE' && (
                            <>
                              <div>مساحت: <span className="font-black text-gray-900">{String(selectedItem.area)} متر</span></div>
                              <div>تعداد اتاق: <span className="font-black text-gray-900">{String(selectedItem.bedrooms)} خواب</span></div>
                              <div>نوع معامله: <span className="font-black text-red-600">{String(selectedItem.deal_type)}</span></div>
                              <div>نوع ملک: <span className="font-black text-gray-900">{String(selectedItem.type)}</span></div>
                              {selectedItem.deposit > 0 && <div>پول ضمانت: <span className="font-black text-blue-600">{Number(selectedItem.deposit).toLocaleString()} AFN</span></div>}
                              {selectedItem.mortgage_amount > 0 && <div>مبلغ گروی: <span className="font-black text-orange-600">{Number(selectedItem.mortgage_amount).toLocaleString()} AFN</span></div>}
                              <div className="flex items-center gap-1">پارکینگ: {selectedItem.has_parking ? <Car size={14} className="text-green-500"/> : <X size={14} className="text-red-400"/>}</div>
                              <div className="flex items-center gap-1">انباری: {selectedItem.has_storage ? <Box size={14} className="text-green-500"/> : <X size={14} className="text-red-400"/>}</div>
                            </>
                          )}
                          {activeTab === 'JOBS' && (
                            <>
                              <div>نام شرکت: <span className="font-black text-gray-900">{String(selectedItem.company)}</span></div>
                              <div>معاش: <span className="font-black text-blue-600">{Number(selectedItem.salary || 0).toLocaleString()} AFN</span></div>
                              <div>ولایت: <span className="font-black text-gray-900">{String(selectedItem.city)}</span></div>
                            </>
                          )}
                          {activeTab === 'SERVICES' && (
                            <>
                              <div>ارائه‌دهنده: <span className="font-black text-gray-900">{String(selectedItem.provider_name)}</span></div>
                              <div>دسته‌بندی: <span className="font-black text-orange-600">{String(selectedItem.category)}</span></div>
                              <div>سابقه کار: <span className="font-black text-gray-900">{String(selectedItem.experience)}</span></div>
                            </>
                          )}
                       </div>
                       <div className="border-t pt-4">
                         <h4 className="text-[10px] font-black text-gray-400 mb-2 flex items-center justify-end gap-2"><MapPin size={12}/> آدرس دقیق</h4>
                         <p className="text-sm font-black text-gray-800">{String(selectedItem.address)}</p>
                       </div>
                       <div className="border-t pt-4">
                         <h4 className="text-[10px] font-black text-gray-400 mb-2 flex items-center justify-end gap-2"><FileText size={12}/> توضیحات آگهی</h4>
                         <p className="whitespace-pre-wrap text-sm font-bold text-gray-600 leading-7 text-justify">{String(selectedItem.description)}</p>
                       </div>
                    </div>

                    <div className="flex gap-2 bg-red-50 p-6 rounded-[2.5rem] border border-red-100">
                       <div className="flex-1 flex flex-col gap-2">
                          <label className="text-[9px] font-black text-red-400 mr-3">ارسال پیام یا علت رد آگهی</label>
                          <input type="text" placeholder="علت تایید یا رد را بنویسید..." className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold outline-none border-2 border-transparent focus:border-red-300 shadow-sm" value={adminMsg} onChange={e => setAdminMsg(e.target.value)} />
                       </div>
                       <button onClick={() => handleSendAdminMessage(selectedItem.phone_number)} disabled={!adminMsg.trim() || isProcessing} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg self-end mb-1 disabled:opacity-50">
                          {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={24} className="rotate-180"/>}
                       </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3 px-8 pb-10">
                    <button onClick={() => handleStatusUpdate(selectedItem.id, activeTab === 'ESTATE' ? TABLES.PROPERTIES : activeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES, 'APPROVED')} className="bg-green-600 py-4 rounded-2xl text-white font-black text-[11px] shadow-lg shadow-green-100 transition-all active:scale-95"><CheckCircle size={18} className="inline ml-1"/> تایید آگهی</button>
                    <button onClick={() => handleStatusUpdate(selectedItem.id, activeTab === 'ESTATE' ? TABLES.PROPERTIES : activeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES, 'REJECTED')} className="bg-amber-600 py-4 rounded-2xl text-white font-black text-[11px] shadow-lg shadow-amber-100 transition-all active:scale-95"><ShieldAlert size={18} className="inline ml-1"/> رد موقت</button>
                    <button onClick={() => handleDeleteItem(selectedItem.id, activeTab === 'ESTATE' ? TABLES.PROPERTIES : activeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES)} className="bg-red-600 py-4 rounded-2xl text-white font-black text-[11px] shadow-lg shadow-red-100 transition-all active:scale-95"><Trash2 size={18} className="inline ml-1"/> حذف کامل</button>
                 </div>
              </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default AdminPanel;
