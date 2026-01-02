
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Property, Job, Service } from '../types';
import { 
  Trash2, Home, FileText, LayoutDashboard, Briefcase, Wrench, 
  CheckCircle, XCircle, MessageSquare, Eye, Users, Phone, 
  ShieldCheck, Loader2, Send, Clock, ChevronRight, 
  ChevronLeft, Search, Lock, UserPlus, Key, ShieldAlert, RefreshCw,
  User, MapPin, Building2, MapPinned
} from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface AdminPanelProps {
  properties: Property[];
  jobs: Job[];
  services: Service[];
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  properties, 
  jobs, 
  services,
  onExit 
}) => {
  // --- States ---
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'USERS' | 'ADMINS'>('DASHBOARD');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  
  // States for Admin Management
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', full_name: '', role: 'NORMAL' });
  const [newPassword, setNewPassword] = useState('');
  const [systemAdmins, setSystemAdmins] = useState<any[]>([]);

  // User Management States
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchType, setUserSearchType] = useState<'NAME' | 'PHONE'>('NAME');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  
  const touchStart = useRef<number | null>(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    try {
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
      if (pErr) throw pErr;
      setAllUsers(profiles || []);

      const { data: admins, error: aErr } = await supabase.from('system_admins').select('*');
      if (aErr) throw aErr;
      setSystemAdmins(admins || []);
      
    } catch (e) {
      console.error("Fetch error in Admin Panel:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password || !newAdmin.full_name) {
      return alert("لطفاً تمام فیلدها را برای ادمین جدید پر کنید.");
    }
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('system_admins').insert([newAdmin]);
      if (error) throw error;
      
      alert("ادمین جدید با موفقیت به سیستم اضافه شد.");
      setNewAdmin({ username: '', password: '', full_name: '', role: 'NORMAL' });
      fetchData();
    } catch (e: any) {
      alert("خطا در ثبت ادمین: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert("رمز عبور جدید نمی‌تواند خالی باشد.");
    
    const adminDataString = localStorage.getItem('current_admin_user');
    const adminData = adminDataString ? JSON.parse(adminDataString) : null;
    if (!adminData || !adminData.id) return alert("خطا در شناسایی ادمین فعلی.");

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('system_admins')
        .update({ password: newPassword })
        .eq('id', adminData.id);
      
      if (error) throw error;
      
      alert("رمز عبور شما با موفقیت تغییر کرد.");
      setNewPassword('');
    } catch (e: any) {
      alert("خطا در تغییر رمز: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchChatHistory = async (phone: string) => {
    if (!phone) return;
    const { data } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('target_phone', phone)
      .order('date', { ascending: true });
    setChatHistory(data || []);
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const term = userSearch.toLowerCase();
      if (userSearchType === 'NAME') {
        return (u.full_name || '').toLowerCase().includes(term);
      } else {
        return (u.phone || '').includes(term);
      }
    });
  }, [allUsers, userSearch, userSearchType]);

  const handleUpdateStatus = async (id: string, type: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    const table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    try {
      await supabase.from(table).update({ status }).eq('id', id);
      const ownerPhone = selectedItem?.owner_id || selectedItem?.phone_number;
      
      if (adminMsg.trim() && ownerPhone) {
        await handleSendAdminMessage(ownerPhone, `پیام مدیریت: آگهی شما با عنوان "${selectedItem.title}" ${status === 'APPROVED' ? 'تایید' : 'رد'} شد. ${adminMsg}`);
      }
      
      alert("وضعیت آگهی بروزرسانی شد.");
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      alert("خطا: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendAdminMessage = async (targetPhone: string, textOverride?: string) => {
    const text = textOverride || adminMsg;
    if (!text.trim()) return;
    try {
      await supabase.from(TABLES.MESSAGES).insert([{ 
        target_phone: targetPhone, 
        text, 
        is_read: false, 
        date: new Date().toISOString() 
      }]);
      if (!textOverride) {
        setAdminMsg('');
        fetchChatHistory(targetPhone);
      }
    } catch (e) {
      console.error("Error sending admin message:", e);
    }
  };

  const handleDeleteItem = async (id: string, type: string) => {
    if (!window.confirm("آیا از حذف دائمی این آگهی اطمینان دارید؟ این عمل غیرقابل بازگشت است.")) return;
    const table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    try {
      await supabase.from(table).delete().eq('id', id);
      alert("آگهی با موفقیت حذف شد.");
      fetchData();
    } catch (e: any) {
      alert("خطا در حذف: " + e.message);
    }
  };

  const nextImage = useCallback(() => {
    if (selectedItem?.images && selectedItem.images.length > 1) {
      setActiveImgIdx(prev => (prev < selectedItem.images.length - 1 ? prev + 1 : 0));
    }
  }, [selectedItem]);

  const prevImage = useCallback(() => {
    if (selectedItem?.images && selectedItem.images.length > 1) {
      setActiveImgIdx(prev => (prev > 0 ? prev - 1 : selectedItem.images.length - 1));
    }
  }, [selectedItem]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const touchEndPos = e.changedTouches[0].clientX;
    const distance = touchStart.current - touchEndPos;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) nextImage();
    else if (distance < -minSwipeDistance) prevImage();
    touchStart.current = null;
  };

  const renderList = (items: any[], type: string) => (
    <div className="grid grid-cols-1 gap-4 text-right">
      {items.map(item => (
        <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
               <img src={item.images?.[0]} className="w-full h-full object-contain" alt="" />
            </div>
            <div className="text-right">
              <h4 className="font-black text-sm text-gray-800 line-clamp-1">{item.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] px-3 py-1 rounded-full font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-600' : item.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  {item.status === 'APPROVED' ? 'تایید شده' : item.status === 'REJECTED' ? 'رد شده' : 'در انتظار'}
                </span>
                <span className="text-[9px] text-gray-400 font-bold">{item.city}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedItem({...item, type}); setActiveImgIdx(0); fetchChatHistory(item.owner_id || item.phone_number); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Eye size={20}/></button>
            <button onClick={() => handleDeleteItem(item.id, type)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9000] bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden text-right" dir="rtl">
      {/* Header */}
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shrink-0 z-20 shadow-xl border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-900/40 animate-pulse"><ShieldCheck size={24} className="text-white" /></div>
          <div>
            <h1 className="text-sm md:text-xl font-black tracking-tight">پنل مدیریت خانه افغانستان</h1>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Master Admin Dashboard</p>
          </div>
        </div>
        <button onClick={onExit} className="bg-red-600/10 text-red-500 border border-red-500/20 px-6 py-2.5 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all active:scale-95">خروج از پنل</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full md:w-72 bg-white border-l p-4 flex md:flex-col gap-1.5 overflow-x-auto shrink-0 z-10 no-scrollbar shadow-sm">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'DASHBOARD' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutDashboard size={22}/> پیشخوان</button>
           <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={22}/> مدیریت کاربران</button>
           <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ADMINS' ? 'bg-red-600 text-white shadow-xl shadow-red-900/20' : 'text-gray-400 hover:bg-gray-50'}`}><Lock size={22}/> مدیریت ادمین‌ها</button>
           
           <div className="h-px bg-gray-100 my-4 hidden md:block" />
           <p className="hidden md:block text-[10px] text-gray-400 font-black px-6 mb-2 uppercase tracking-widest">بخش‌های آگهی</p>
           
           <button onClick={() => setActiveTab('ESTATE')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ESTATE' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={22}/> املاک</button>
           <button onClick={() => setActiveTab('JOBS')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'JOBS' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Briefcase size={22}/> مشاغل</button>
           <button onClick={() => setActiveTab('SERVICES')} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'SERVICES' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Wrench size={22}/> خدمات</button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-gray-50/50 no-scrollbar">
          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm text-center group hover:border-blue-200 transition-all">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner"><Users size={36} /></div>
                <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">کاربران فعال</span>
                <span className="text-5xl font-black block mt-2 text-gray-800 tracking-tighter">{allUsers.length}</span>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm text-center group hover:border-red-200 transition-all">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner"><FileText size={36} /></div>
                <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">کل آگهی‌ها</span>
                <span className="text-5xl font-black block mt-2 text-gray-800 tracking-tighter">{properties.length + jobs.length + services.length}</span>
              </div>
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm text-center group hover:border-amber-200 transition-all">
                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner"><Clock size={36} /></div>
                <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">در انتظار تایید</span>
                <span className="text-5xl font-black block mt-2 text-gray-800 tracking-tighter">
                  {properties.filter(p => p.status === 'PENDING').length + jobs.filter(j => j.status === 'PENDING').length + services.filter(s => s.status === 'PENDING').length}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'ADMINS' && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-red-600" />
                    <h3 className="font-black text-xl mb-8 flex items-center gap-3 text-gray-800"><UserPlus size={26} className="text-red-600"/> افزودن ادمین جدید</h3>
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">نام کاربری (انگلیسی)</label>
                          <input type="text" placeholder="Username" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value.toLowerCase()})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:border-red-500 font-black dir-ltr text-sm" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">رمز عبور</label>
                          <input type="password" placeholder="Password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:border-red-500 font-black dir-ltr text-sm" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">نام کامل ادمین</label>
                          <input type="text" placeholder="مثلاً: محمد علی" value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 outline-none focus:border-red-500 font-black text-sm" />
                       </div>
                       <button onClick={handleAddAdmin} disabled={isProcessing} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4">
                          {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> ثبت ادمین جدید</>}
                       </button>
                    </div>
                 </div>

                 <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-blue-600" />
                    <h3 className="font-black text-xl mb-8 flex items-center gap-3 text-gray-800"><Key size={26} className="text-blue-600"/> تغییر رمز عبور من</h3>
                    <div className="space-y-6">
                       <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-4">
                          <p className="text-[11px] text-blue-700 font-bold leading-6">
                             پس از تغییر رمز، دفعه بعد باید با رمز جدید وارد شوید. لطفاً رمز خود را در جای امنی یادداشت کنید.
                          </p>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-gray-400 mr-2 uppercase">رمز عبور جدید</label>
                          <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 outline-none focus:border-blue-500 font-black dir-ltr text-sm shadow-inner" />
                       </div>
                       <button onClick={handleChangePassword} disabled={isProcessing} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                          {isProcessing ? <Loader2 className="animate-spin" /> : <><RefreshCw size={20} /> بروزرسانی رمز عبور</>}
                       </button>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                 <div className="flex justify-between items-center mb-6 px-4">
                    <h3 className="font-black text-lg text-gray-800 flex items-center gap-3"><ShieldAlert size={22} className="text-amber-500" /> لیست ادمین‌های فعال سیستم</h3>
                    <span className="text-[10px] bg-gray-100 px-4 py-1.5 rounded-full font-black text-gray-400">{systemAdmins.length} نفر</span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemAdmins.map((adm, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-gray-50 rounded-[1.8rem] border border-gray-100 group hover:border-red-200 transition-colors">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-red-600 border shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all">{adm.username[0].toUpperCase()}</div>
                            <div className="text-right">
                               <span className="font-black text-sm text-gray-700 block">{adm.full_name || adm.username}</span>
                               <span className="text-[10px] text-gray-400 font-bold dir-ltr block">{adm.username}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest ${adm.role === 'SUPER' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>{adm.role}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 text-right">
               <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                    <input 
                      type="text" 
                      placeholder={userSearchType === 'NAME' ? "جستجوی نام کاربر..." : "جستجوی شماره موبایل..."}
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-3xl py-4 pr-14 pl-6 text-sm font-black outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex bg-gray-100 p-2 rounded-3xl w-full md:w-auto shrink-0 shadow-inner">
                    <button onClick={() => setUserSearchType('NAME')} className={`flex-1 md:px-10 py-3 rounded-2xl text-xs font-black transition-all ${userSearchType === 'NAME' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400'}`}>نام</button>
                    <button onClick={() => setUserSearchType('PHONE')} className={`flex-1 md:px-10 py-3 rounded-2xl text-xs font-black transition-all ${userSearchType === 'PHONE' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-400'}`}>شماره</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {filteredUsers.map((u, i) => (
                   <div key={i} onClick={() => { setSelectedUser(u); fetchChatHistory(u.phone); }} className="bg-white p-7 rounded-[3rem] border border-gray-50 flex items-center justify-between hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/5 cursor-pointer transition-all group active:scale-[0.98]">
                     <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-gray-50 rounded-[2.2rem] flex items-center justify-center text-blue-600 font-black text-3xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-gray-100 overflow-hidden">
                           {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-contain" alt="" /> : (u.full_name?.[0] || 'U')}
                        </div>
                        <div className="text-right">
                           <h4 className="font-black text-gray-800 text-xl group-hover:text-blue-600 transition-colors">{u.full_name || 'کاربر سیستم'}</h4>
                           <div className="flex items-center gap-2 mt-2 text-gray-500 font-bold text-sm" dir="ltr">
                              <Phone size={16} className="text-blue-600" /> {u.phone}
                           </div>
                        </div>
                     </div>
                     <div className="p-4 bg-gray-50 text-gray-400 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <ChevronLeft size={28} />
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
               <h2 className="text-2xl font-black text-gray-800 px-4 flex items-center gap-4 mb-6">
                  {activeTab === 'ESTATE' && <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><Home size={28} /></div>}
                  {activeTab === 'JOBS' && <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Briefcase size={28} /></div>}
                  {activeTab === 'SERVICES' && <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Wrench size={28} /></div>}
                  {activeTab === 'ESTATE' ? 'مدیریت کل آگهی‌های املاک' : activeTab === 'JOBS' ? 'مدیریت کل آگهی‌های مشاغل' : 'مدیریت کل آگهی‌های خدمات'}
               </h2>
               {renderList(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services, activeTab)}
            </div>
          )}
        </main>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 overflow-hidden" onClick={() => setSelectedUser(null)}>
           <div className="bg-white w-full h-full md:max-w-6xl md:rounded-[4rem] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex-1 overflow-y-auto p-8 md:p-16 border-l no-scrollbar bg-gray-50 pb-32 text-right">
                 <div className="flex justify-between items-center mb-12">
                    <h2 className="text-3xl font-black text-gray-900">مشخصات و فعالیت‌ها</h2>
                    <button onClick={() => setSelectedUser(null)} className="p-3 bg-gray-100 rounded-full hover:bg-red-100 hover:text-red-600 transition-all shadow-sm"><XCircle size={36} /></button>
                 </div>
                 <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm flex flex-col items-center mb-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-32 bg-blue-50/50 -z-10" />
                    <div className="w-32 h-32 bg-gray-100 rounded-[3rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-2xl mb-8">
                       {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" /> : <User size={48} className="text-gray-300" />}
                    </div>
                    <h3 className="text-3xl font-black text-gray-800 mb-2">{selectedUser.full_name}</h3>
                    <div className="flex items-center gap-3 text-blue-600 font-black text-lg bg-blue-50 px-8 py-3 rounded-3xl border border-blue-100 shadow-sm" dir="ltr">
                       <Phone size={24} /> {selectedUser.phone}
                    </div>
                 </div>
              </div>
              <div className="w-full md:w-[450px] flex flex-col bg-white border-r border-gray-100">
                 <ChatSubSection targetPhone={selectedUser.phone} chatHistory={chatHistory} adminMsg={adminMsg} setAdminMsg={setAdminMsg} onSendMessage={() => handleSendAdminMessage(selectedUser.phone)} isProcessing={isProcessing} />
              </div>
           </div>
        </div>
      )}

      {/* Item Details Modal - Expanded for Admin */}
      {selectedItem && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 overflow-hidden" onClick={() => setSelectedItem(null)}>
           <div className="bg-white w-full h-full md:h-[95vh] md:max-w-6xl md:rounded-[4rem] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-slide-up text-right" onClick={e => e.stopPropagation()}>
              <div className="flex-1 overflow-y-auto p-8 md:p-12 border-l no-scrollbar bg-gray-50 pb-40">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedItem.title}</h2>
                      <span className={`text-xs px-4 py-1.5 rounded-full font-black ${selectedItem.status === 'APPROVED' ? 'bg-green-100 text-green-600' : selectedItem.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        وضعیت فعلی: {selectedItem.status === 'APPROVED' ? 'تایید شده' : selectedItem.status === 'REJECTED' ? 'رد شده' : 'در انتظار بررسی'}
                      </span>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-sm"><XCircle size={32} className="text-gray-400"/></button>
                 </div>

                 {/* Photo Swiper */}
                 <div className="relative aspect-video rounded-[3rem] overflow-hidden mb-8 shadow-2xl bg-gray-200" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    <img src={selectedItem.images?.[activeImgIdx]} className="w-full h-full object-contain" alt="" />
                    {selectedItem.images?.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/40 text-white p-4 rounded-full backdrop-blur-md active:scale-90 transition-transform shadow-xl"><ChevronLeft size={32}/></button>
                        <button onClick={nextImage} className="absolute right-5 top-1/2 -translate-y-1/2 bg-black/40 text-white p-4 rounded-full backdrop-blur-md active:scale-90 transition-transform shadow-xl"><ChevronRight size={32}/></button>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                          {selectedItem.images.map((_:any, i:number) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeImgIdx ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`} />
                          ))}
                        </div>
                      </>
                    )}
                 </div>

                 {/* Detailed Grid Info */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                       <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">ولایت</span>
                       <p className="font-black text-sm text-red-600 flex items-center justify-center gap-1"><MapPin size={14}/> {selectedItem.city}</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                       <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">شماره تماس کاربر</span>
                       <p className="font-black text-sm text-blue-600" dir="ltr">{selectedItem.phone_number}</p>
                    </div>
                    {selectedItem.price !== undefined && (
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">قیمت / معاش</span>
                        <p className="font-black text-sm text-green-600">{selectedItem.price.toLocaleString()} AFN</p>
                      </div>
                    )}
                    {selectedItem.area !== undefined && (
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">مساحت</span>
                        <p className="font-black text-sm text-gray-700">{selectedItem.area} متر</p>
                      </div>
                    )}
                    {selectedItem.bedrooms !== undefined && (
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">اتاق خواب</span>
                        <p className="font-black text-sm text-gray-700">{selectedItem.bedrooms} عدد</p>
                      </div>
                    )}
                    {selectedItem.company && (
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">نام شرکت/نهاد</span>
                        <p className="font-black text-sm text-gray-700 flex items-center justify-center gap-1"><Building2 size={14}/> {selectedItem.company}</p>
                      </div>
                    )}
                    {selectedItem.experience && (
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">سابقه کاری</span>
                        <p className="font-black text-sm text-gray-700">{selectedItem.experience}</p>
                      </div>
                    )}
                 </div>

                 {/* Full Content */}
                 <div className="space-y-8 mb-12">
                    <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                       <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-3"><MapPinned size={20} className="text-red-600"/> آدرس دقیق</h3>
                       <p className="text-gray-600 font-bold leading-8">{selectedItem.address || 'آدرس ثبت نشده است'}</p>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                       <h3 className="text-lg font-black text-gray-800 mb-4">توضیحات تکمیلی</h3>
                       <p className="text-gray-600 font-medium leading-9 text-justify">{selectedItem.description}</p>
                    </div>
                 </div>

                 {/* Admin Actions Footer for Modal */}
                 <div className="flex flex-col md:flex-row gap-4 pt-10 border-t sticky bottom-0 bg-gray-50/95 backdrop-blur-md pb-4">
                    <button 
                      onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type, 'APPROVED')} 
                      disabled={isProcessing}
                      className="flex-1 bg-green-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-green-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isProcessing ? <Loader2 className="animate-spin"/> : <><CheckCircle size={24}/> تایید و انتشار آگهی</>}
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type, 'REJECTED')} 
                      disabled={isProcessing}
                      className="flex-1 bg-red-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {isProcessing ? <Loader2 className="animate-spin"/> : <><XCircle size={24}/> رد کردن آگهی</>}
                    </button>
                    <button onClick={() => handleDeleteItem(selectedItem.id, selectedItem.type)} className="p-5 bg-gray-200 text-gray-600 rounded-3xl active:scale-90 transition-all">
                      <Trash2 size={24}/>
                    </button>
                 </div>
              </div>

              {/* Chat Sidebar for Detail View */}
              <div className="hidden lg:flex w-[450px] flex-col bg-white border-r border-gray-100">
                 <ChatSubSection 
                   targetPhone={selectedItem.owner_id || selectedItem.phone_number} 
                   chatHistory={chatHistory} 
                   adminMsg={adminMsg} 
                   setAdminMsg={setAdminMsg} 
                   onSendMessage={() => handleSendAdminMessage(selectedItem.owner_id || selectedItem.phone_number)} 
                   isProcessing={isProcessing} 
                 />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ChatSubSection = ({ targetPhone, chatHistory, adminMsg, setAdminMsg, onSendMessage, isProcessing }: any) => (
  <div className="flex flex-col h-full bg-gray-50/20 text-right">
      <div className="p-8 border-b bg-white flex items-center gap-5 shadow-sm">
        <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-white">A</div>
        <div className="text-right">
            <h3 className="font-black text-base text-gray-800">گفتگو با کاربر</h3>
            <p className="text-[11px] text-gray-400 font-black tracking-widest mt-1" dir="ltr">{targetPhone}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-5 no-scrollbar">
        {chatHistory.length === 0 ? (
          <div className="text-center py-28 opacity-10 flex flex-col items-center gap-4">
              <MessageSquare size={80} />
              <span className="text-sm font-black">هنوز هیچ پیامی رد و بدل نشده است</span>
          </div>
        ) : chatHistory.map((msg: any, i: number) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm animate-in slide-in-from-right-3 duration-300">
              <p className="text-[13px] font-bold text-gray-700 leading-8">{msg.text}</p>
              <div className="flex justify-between items-center mt-4 text-[10px] text-gray-400 font-black border-t pt-3 border-gray-50">
                <span className="text-red-600 bg-red-50 px-4 py-1.5 rounded-xl uppercase tracking-widest">پشتیبانی مدیریت</span>
                <span className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl"><Clock size={14}/> {new Date(msg.date).toLocaleTimeString('fa-AF')}</span>
              </div>
          </div>
        ))}
      </div>
      <div className="p-8 border-t bg-white relative mt-auto shadow-inner">
        <textarea 
          value={adminMsg} 
          onChange={e => setAdminMsg(e.target.value)} 
          placeholder="توضیحات رد آگهی یا پیام به کاربر..." 
          className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[2.5rem] p-6 pr-16 text-sm font-bold outline-none resize-none h-40 transition-all shadow-inner text-right" 
        />
        <button 
          onClick={onSendMessage} 
          disabled={isProcessing || !adminMsg.trim()} 
          className="absolute bottom-12 left-12 bg-blue-600 text-white p-5 rounded-2xl shadow-2xl active:scale-90 disabled:opacity-50 transition-all hover:bg-blue-700 hover:rotate-2 shadow-blue-900/20"
        >
            {isProcessing ? <Loader2 size={28} className="animate-spin" /> : <Send size={28} className="rotate-180" />}
        </button>
      </div>
  </div>
);

export default AdminPanel;
