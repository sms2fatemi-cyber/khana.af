
import { useState, useEffect } from 'react';
import { Property, Job, Service } from '../types';
import { Trash2, Home, Shield, FileText, LayoutDashboard, Key, Briefcase, Wrench, CheckCircle, XCircle, MessageSquare, Eye, Plus, ChevronLeft, ChevronRight, Users, Phone, BarChart3 } from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface AdminPanelProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  onExit: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  properties, setProperties, 
  jobs, setJobs,
  services, setServices,
  onExit 
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'ADMINS' | 'USERS' | 'PROFILE'>('DASHBOARD');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  
  const [systemAdmins, setSystemAdmins] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', fullName: '', role: 'NORMAL' });
  const [changePwd, setChangePwd] = useState({ old: '', new: '', confirm: '' });

  const currentAdmin = JSON.parse(localStorage.getItem('current_admin_user') || '{}');

  const fetchData = async () => {
    try {
      const { data: admins } = await supabase.from('system_admins').select('*');
      setSystemAdmins(admins || []);

      const { data: profiles, count } = await supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      setAllUsers(profiles || []);
      setTotalUsersCount(count || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (selectedItem) setActiveImgIdx(0);
  }, [selectedItem]);

  const handleUpdateStatus = async (id: string, table: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (!error) {
      const updateList = (list: any[]) => list.map(item => item.id === id ? { ...item, status } : item);
      if (table === TABLES.PROPERTIES) setProperties(prev => updateList(prev));
      if (table === TABLES.JOBS) setJobs(prev => updateList(prev));
      if (table === TABLES.SERVICES) setServices(prev => updateList(prev));
      
      alert(status === 'APPROVED' ? "آگهی تایید و منتشر شد" : "آگهی رد شد");
      setSelectedItem(null);
    }
    setIsProcessing(false);
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) return alert("نام کاربری و رمز الزامی است");
    setIsProcessing(true);
    const { error } = await supabase.from('system_admins').insert([{ 
      username: newAdmin.username.trim().toLowerCase(), 
      password: newAdmin.password, 
      full_name: newAdmin.fullName, 
      role: newAdmin.role 
    }]);
    
    if (!error) {
      alert("ادمین با موفقیت اضافه شد");
      setNewAdmin({ username: '', password: '', fullName: '', role: 'NORMAL' });
      fetchData();
    } else {
      console.error("Add Admin Error:", error);
      alert(`خطا در ثبت: ${error.message}\n\nنکته: حتماً کد SQL جدید را در Supabase اجرا کنید.`);
    }
    setIsProcessing(false);
  };

  const handleDeleteAdmin = async (id: string) => {
    if (id === currentAdmin.id) return alert("شما نمی‌توانید خودتان را حذف کنید!");
    if (!window.confirm("آیا از حذف این ادمین مطمئن هستید؟")) return;
    
    const { error } = await supabase.from('system_admins').delete().eq('id', id);
    if (!error) fetchData();
  };

  const handleChangePassword = async () => {
    if (changePwd.new !== changePwd.confirm) return alert("رمز جدید با تاییدیه مطابقت ندارد");
    setIsProcessing(true);
    const { data } = await supabase.from('system_admins').select('*').eq('id', currentAdmin.id).eq('password', changePwd.old).single();
    if (data) {
      const { error } = await supabase.from('system_admins').update({ password: changePwd.new }).eq('id', currentAdmin.id);
      if (!error) {
        alert("رمز عبور تغییر کرد. لطفاً دوباره وارد شوید.");
        localStorage.removeItem('current_admin_user');
        onExit();
      }
    } else {
      alert("رمز عبور فعلی اشتباه است");
    }
    setIsProcessing(false);
  };

  const handleSendAdminMessage = async (targetPhone: string) => {
    if (!adminMsg.trim()) return;
    setIsProcessing(true);
    const { error } = await supabase.from(TABLES.MESSAGES).insert([{
      target_phone: targetPhone,
      text: adminMsg,
      is_read: false,
      date: new Date().toISOString()
    }]);
    if (!error) {
      alert("پیام به مرکز اعلانات کاربر ارسال شد");
      setAdminMsg('');
    }
    setIsProcessing(false);
  };

  const handleDeleteItem = async (id: string, type: string) => {
    if (!window.confirm("آیا از حذف دائمی این آگهی اطمینان دارید؟")) return;
    setIsProcessing(true);
    let table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      if (type === 'ESTATE') setProperties(prev => prev.filter(p => p.id !== id));
      if (type === 'JOBS') setJobs(prev => prev.filter(j => j.id !== id));
      if (type === 'SERVICES') setServices(prev => prev.filter(s => s.id !== id));
      alert("آگهی کاملاً پاک شد");
      setSelectedItem(null);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[9000] bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden text-right" dir="rtl">
      <header className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0 shadow-lg border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-red-500 animate-pulse" />
          <h1 className="text-sm font-black uppercase tracking-wider">مدیریت خانه افغانستان</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-white">{currentAdmin.full_name || currentAdmin.username}</span>
              <span className="text-[8px] text-gray-500 uppercase">{currentAdmin.role} ADMIN</span>
           </div>
           <button onClick={onExit} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-[10px] font-black transition-colors shadow-lg active:scale-95">خروج از پنل</button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-l p-4 flex md:flex-col gap-1 overflow-x-auto shrink-0 shadow-sm z-10 no-scrollbar">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutDashboard size={20}/> داشبورد آمار</button>
           <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={20}/> آمار کاربران ({totalUsersCount})</button>
           <div className="h-px bg-gray-100 my-2 hidden md:block" />
           <button onClick={() => setActiveTab('ESTATE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ESTATE' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={20}/> مدیریت املاک</button>
           <button onClick={() => setActiveTab('JOBS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'JOBS' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Briefcase size={20}/> مدیریت مشاغل</button>
           <button onClick={() => setActiveTab('SERVICES')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'SERVICES' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Wrench size={20}/> مدیریت خدمات</button>
           <div className="h-px bg-gray-100 my-2 hidden md:block" />
           {currentAdmin.role === 'SUPER' && <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ADMINS' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Shield size={20}/> مدیریت تیم</button>}
           <button onClick={() => setActiveTab('PROFILE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'PROFILE' ? 'bg-gray-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Key size={20}/> امنیت و رمز</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-gray-50/50">
          {activeTab === 'DASHBOARD' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
                <div className="flex items-center gap-3 mb-2">
                   <BarChart3 size={28} className="text-red-600" />
                   <h2 className="text-2xl font-black text-gray-800">آمار کلی پلتفرم</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <button onClick={() => setActiveTab('USERS')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center hover:scale-105 transition-transform active:scale-95 group">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">کل کاربران</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{totalUsersCount}</span>
                    </button>
                    <button onClick={() => setActiveTab('ESTATE')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center hover:scale-105 transition-transform group">
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors"><FileText size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">آگهی‌های املاک</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{properties.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('JOBS')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center hover:scale-105 transition-transform group">
                      <div className="w-16 h-16 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><Briefcase size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">فرصت‌های شغلی</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{jobs.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('SERVICES')} className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center hover:scale-105 transition-transform group">
                      <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Wrench size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">لیست خدمات</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{services.length}</span>
                    </button>
                </div>
                
                <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                   <h3 className="font-black text-xl mb-4">گزارش وضعیت سیستم</h3>
                   <p className="text-gray-500 text-sm font-bold leading-8 max-w-2xl mx-auto">
                     در حال حاضر سیستم با ثبات کامل در حال فعالیت است. آمار فوق به صورت لحظه‌ای از پایگاه داده دریافت می‌شود. برای مشاهده جزئیات هر بخش، از منوی کناری استفاده کنید.
                   </p>
                </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black flex items-center gap-3"><Users size={28} className="text-blue-600" /> لیست و آمار کاربران</h2>
                  <div className="bg-blue-100 text-blue-700 px-5 py-2.5 rounded-2xl font-black text-xs shadow-sm border border-blue-200">جمع کل کاربران: {totalUsersCount} نفر</div>
               </div>
               
               <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                     <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                          <th className="p-6">تصویر</th>
                          <th className="p-6">نام و تخلص</th>
                          <th className="p-6">شماره تماس</th>
                          <th className="p-6">تاریخ عضویت</th>
                          <th className="p-6">عملیات</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y text-sm font-bold">
                        {allUsers.length > 0 ? allUsers.map((user, i) => (
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-4">
                               <div className="w-12 h-12 bg-gray-100 rounded-2xl overflow-hidden border flex items-center justify-center">
                                  {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <Users size={20} className="text-gray-300" />}
                               </div>
                            </td>
                            <td className="p-4 text-gray-800 font-black">{user.full_name || 'کاربر بدون نام'}</td>
                            <td className="p-4 text-blue-600 font-black" dir="ltr">{user.phone}</td>
                            <td className="p-4 text-gray-400 text-xs">
                               {new Date(user.created_at).toLocaleDateString('fa-AF')}
                            </td>
                            <td className="p-4">
                               <button 
                                 onClick={() => {
                                    const msg = prompt(`ارسال پیام به ${user.full_name || user.phone}:`);
                                    if(msg) { setAdminMsg(msg); handleSendAdminMessage(user.phone); }
                                 }} 
                                 className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-colors"
                               >
                                  <MessageSquare size={14} /> ارسال پیام
                               </button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} className="p-10 text-center text-gray-400">هنوز هیچ کاربری در سیستم ثبت‌نام نکرده است.</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'ADMINS' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
               <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                  <h3 className="font-black mb-4 flex items-center gap-2 text-purple-600"><Plus className="text-purple-600" /> تعریف ادمین جدید برای سیستم</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                     <input type="text" placeholder="نام و تخلص کامل" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="bg-gray-50 border-2 border-gray-100 p-3.5 rounded-2xl text-sm font-bold outline-none focus:border-purple-400" />
                     <input type="text" placeholder="نام کاربری (انگلیسی)" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="bg-gray-50 border-2 border-gray-100 p-3.5 rounded-2xl text-sm font-bold dir-ltr outline-none focus:border-purple-400" />
                     <input type="password" placeholder="رمز عبور" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="bg-gray-50 border-2 border-gray-100 p-3.5 rounded-2xl text-sm font-bold dir-ltr outline-none focus:border-purple-400" />
                     <button onClick={handleAddAdmin} disabled={isProcessing} className="bg-purple-600 text-white p-3.5 rounded-2xl font-black text-sm active:scale-95 transition-transform shadow-lg shadow-purple-100">افزودن عضو</button>
                  </div>
               </div>
               <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                     <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                        <tr><th className="p-4">نام کامل</th><th className="p-4">نام کاربری</th><th className="p-4">سطح دسترسی</th><th className="p-4">عملیات</th></tr>
                     </thead>
                     <tbody className="divide-y text-sm font-bold">
                        {systemAdmins.map((adm, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">{adm.full_name || adm.fullName}</td>
                            <td className="p-4 dir-ltr">{adm.username}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded-lg text-[9px] font-black ${adm.role === 'SUPER' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{adm.role}</span></td>
                            <td className="p-4">
                               <button onClick={() => handleDeleteAdmin(adm.id)} className="text-red-600 p-2.5 hover:bg-red-50 rounded-xl transition-colors">
                                  <Trash2 size={16} />
                               </button>
                            </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] border shadow-sm space-y-8 animate-in fade-in mt-10">
               <div className="text-center">
                  <div className="w-20 h-20 bg-gray-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl"><Key size={32} /></div>
                  <h3 className="font-black text-xl">تغییر رمز عبور مدیریت</h3>
               </div>
               <div className="space-y-4">
                  <input type="password" placeholder="رمز عبور فعلی" value={changePwd.old} onChange={e => setChangePwd({...changePwd, old: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold dir-ltr outline-none focus:border-red-500" />
                  <input type="password" placeholder="رمز عبور جدید" value={changePwd.new} onChange={e => setChangePwd({...changePwd, new: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold dir-ltr outline-none focus:border-red-500" />
                  <input type="password" placeholder="تکرار رمز عبور جدید" value={changePwd.confirm} onChange={e => setChangePwd({...changePwd, confirm: e.target.value})} className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold dir-ltr outline-none focus:border-red-500" />
                  <button onClick={handleChangePassword} disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-100 active:scale-95 transition-transform mt-4">بروزرسانی امنیت حساب</button>
               </div>
            </div>
          )}

          {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
            <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in pb-10">
               <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                 <div className="p-2 bg-gray-900 text-white rounded-xl">
                   {activeTab === 'ESTATE' ? <Home size={20}/> : activeTab === 'JOBS' ? <Briefcase size={20}/> : <Wrench size={20}/>}
                 </div>
                 بررسی آگهی‌های {activeTab === 'ESTATE' ? 'بخش املاک' : activeTab === 'JOBS' ? 'بخش مشاغل' : 'بخش خدمات'}
               </h2>
               
               {(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services).length > 0 ? (activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services).map((item: any) => (
                 <div key={item.id} onClick={() => setSelectedItem({...item, typeTab: activeTab})} className="bg-white p-5 rounded-[2.5rem] border shadow-sm flex items-center justify-between cursor-pointer transition-all hover:shadow-md hover:border-gray-300 active:scale-[0.98]">
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border shadow-inner">
                          {item.images && item.images[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <Eye className="text-gray-300" />}
                       </div>
                       <div>
                          <h4 className="font-black text-base text-gray-800 line-clamp-1">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[9px] px-3 py-1 rounded-xl font-black ${item.status === 'PENDING' ? 'bg-amber-100 text-amber-600 border border-amber-200' : item.status === 'REJECTED' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                                {item.status === 'PENDING' ? 'در انتظار تایید' : item.status === 'REJECTED' ? 'رد شده' : 'تایید شده'}
                             </span>
                             <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Phone size={10} /> {item.phoneNumber}</span>
                          </div>
                       </div>
                    </div>
                    <ChevronLeft size={20} className="text-gray-300" />
                 </div>
               )) : (
                 <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-300 text-gray-400 font-bold">هیچ آگهی در این دسته‌بندی وجود ندارد.</div>
               )}
            </div>
          )}
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[9500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedItem(null)}>
           <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                 <h3 className="font-black text-lg">بازبینی و تایید محتوا</h3>
                 <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><XCircle size={28} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                 <div className="space-y-4">
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-900 shadow-xl border-4 border-white">
                        {selectedItem.images && selectedItem.images.length > 0 ? (
                          <img 
                            src={selectedItem.images[activeImgIdx]} 
                            className="w-full h-full object-contain" 
                            alt="Ad" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">این آگهی فاقد تصویر است</div>
                        )}
                        {selectedItem.images && selectedItem.images.length > 1 && (
                          <>
                            <button onClick={() => setActiveImgIdx(prev => (prev > 0 ? prev - 1 : selectedItem.images.length - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full transition-all">
                                <ChevronLeft size={24} />
                            </button>
                            <button onClick={() => setActiveImgIdx(prev => (prev < selectedItem.images.length - 1 ? prev + 1 : 0))} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full transition-all">
                                <ChevronRight size={24} />
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 px-3 py-1 rounded-full text-[10px] text-white font-black">
                                {activeImgIdx + 1} از {selectedItem.images.length}
                            </div>
                          </>
                        )}
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                       {selectedItem.images && selectedItem.images.map((img:string, idx:number) => (
                          <div 
                            key={idx} 
                            onClick={() => setActiveImgIdx(idx)}
                            className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${activeImgIdx === idx ? 'border-red-600 scale-105 shadow-md' : 'border-transparent opacity-60'}`}
                          >
                             <img src={img} className="w-full h-full object-cover" />
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-2xl font-black text-gray-900">{selectedItem.title}</h4>
                       <p className="text-sm text-gray-500 leading-8 font-medium text-justify">{selectedItem.description}</p>
                       <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-1">
                          <span className="text-[10px] font-black text-gray-400">اطلاعات مالک آگهی</span>
                          <span className="text-lg font-black text-gray-800" dir="ltr">{selectedItem.phoneNumber}</span>
                          <span className="text-[11px] font-bold text-gray-500">{selectedItem.city} - {selectedItem.address}</span>
                       </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 space-y-4 shadow-inner self-start">
                       <h5 className="text-sm font-black flex items-center gap-2 text-blue-700"><MessageSquare size={18}/> پیام مدیریت به کاربر</h5>
                       <textarea 
                         value={adminMsg} 
                         onChange={e => setAdminMsg(e.target.value)} 
                         placeholder="دلیل رد آگهی یا نکات لازم جهت اصلاح..." 
                         className="w-full p-5 rounded-2xl border-2 border-blue-100 text-sm font-bold h-32 resize-none outline-none focus:border-blue-400 bg-white shadow-sm" 
                       />
                       <button 
                         onClick={() => handleSendAdminMessage(selectedItem.phoneNumber)} 
                         disabled={isProcessing || !adminMsg.trim()}
                         className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                       >
                         ارسال پیام ادمین
                       </button>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t bg-gray-50/80 flex flex-wrap md:flex-nowrap gap-3 shrink-0">
                 <button 
                    onClick={() => handleUpdateStatus(String(selectedItem.id), String(selectedItem.typeTab === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.typeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES), 'APPROVED')} 
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all"
                 >
                    <CheckCircle size={22}/> تایید و انتشار آگهی
                 </button>
                 <button 
                    onClick={() => handleUpdateStatus(String(selectedItem.id), String(selectedItem.typeTab === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.typeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES), 'REJECTED')} 
                    disabled={isProcessing}
                    className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-200 active:scale-95 transition-all"
                 >
                    <XCircle size={22}/> رد محتوا
                 </button>
                 <button 
                    onClick={() => handleDeleteItem(selectedItem.id, selectedItem.typeTab)} 
                    disabled={isProcessing}
                    className="bg-red-100 text-red-600 px-6 py-4 rounded-2xl font-black hover:bg-red-200 transition-colors"
                    title="حذف دائمی از دیتابیس"
                 >
                    <Trash2 size={24}/>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
export default AdminPanel;
