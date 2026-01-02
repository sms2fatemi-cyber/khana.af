
import { useState, useEffect } from 'react';
import { Property, Job, Service } from '../types';
import { Trash2, Home, Shield, FileText, LayoutDashboard, Key, Briefcase, Wrench, CheckCircle, XCircle, MessageSquare, Eye, Plus, Users, Phone, BarChart3, ShieldCheck, MapPin, Loader2 } from 'lucide-react';
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

  const handleUpdateStatus = async (id: string, table: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;

      const updateList = (list: any[]) => list.map(item => item.id === id ? { ...item, status } : item);
      if (table === TABLES.PROPERTIES) setProperties(prev => updateList(prev));
      if (table === TABLES.JOBS) setJobs(prev => updateList(prev));
      if (table === TABLES.SERVICES) setServices(prev => updateList(prev));
      
      alert(status === 'APPROVED' ? "آگهی با موفقیت تایید شد." : "آگهی رد شد.");
      setSelectedItem(null);
    } catch (err: any) {
      alert("خطا در به روز رسانی: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = async (id: string, type: string) => {
    if (!window.confirm("آیا از حذف دائمی این آگهی مطمئن هستید؟")) return;
    setIsProcessing(true);
    let table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      if (type === 'ESTATE') setProperties(prev => prev.filter(p => p.id !== id));
      if (type === 'JOBS') setJobs(prev => prev.filter(j => j.id !== id));
      if (type === 'SERVICES') setServices(prev => prev.filter(s => s.id !== id));
      alert("آگهی با موفقیت حذف شد.");
      setSelectedItem(null);
    } catch(e) {
      alert("خطا در حذف.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendAdminMessage = async (targetPhone: string) => {
    if (!adminMsg.trim()) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(TABLES.MESSAGES).insert([{
        target_phone: targetPhone,
        text: adminMsg,
        is_read: false,
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      alert("پیام سیستم با موفقیت به کاربر ارسال شد.");
      setAdminMsg('');
    } catch(e) {
      alert("خطا در ارسال پیام.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) return alert("نام کاربری و رمز الزامی است");
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('system_admins').insert([{ 
        username: newAdmin.username.trim().toLowerCase(), 
        password: newAdmin.password, 
        full_name: newAdmin.fullName, 
        role: newAdmin.role 
      }]);
      if (error) throw error;
      alert("مدیر جدید با موفقیت اضافه شد.");
      setNewAdmin({ username: '', password: '', fullName: '', role: 'NORMAL' });
      fetchData();
    } catch(e) {
      alert("خطا در افزودن مدیر.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (id === currentAdmin.id) return alert("شما نمی‌توانید خودتان را حذف کنید!");
    if (!window.confirm("حذف ادمین؟")) return;
    const { error } = await supabase.from('system_admins').delete().eq('id', id);
    if (!error) fetchData();
  };

  const handleChangePassword = async () => {
    if (changePwd.new !== changePwd.confirm) return alert("رمز جدید با تاییدیه مطابقت ندارد");
    setIsProcessing(true);
    try {
      const { data } = await supabase.from('system_admins').select('*').eq('id', currentAdmin.id).eq('password', changePwd.old).single();
      if (!data) {
        alert("رمز عبور فعلی اشتباه است.");
        return;
      }
      const { error } = await supabase.from('system_admins').update({ password: changePwd.new }).eq('id', currentAdmin.id);
      if (error) throw error;
      alert("رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید.");
      localStorage.removeItem('current_admin_user');
      onExit();
    } catch(e) {
      alert("خطا در تغییر رمز.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderList = (items: any[], type: string) => (
    <div className="grid grid-cols-1 gap-4">
      {items.map(item => (
        <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <img src={item.images?.[0]} className="w-16 h-16 rounded-2xl object-cover bg-gray-100" />
            <div>
              <h4 className="font-black text-sm text-gray-800">{item.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-600' : item.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  {item.status === 'PENDING' ? 'در انتظار' : item.status === 'APPROVED' ? 'تایید شده' : 'رد شده'}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">{item.city}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedItem({ ...item, type }); setActiveImgIdx(0); }} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100"><Eye size={18}/></button>
            <button onClick={() => handleDeleteItem(item.id, type)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 size={18}/></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9000] bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden text-right" dir="rtl">
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shrink-0 shadow-xl z-20">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-red-500" />
          <h1 className="text-lg font-black tracking-tight">پنل مدیریت خانه افغانستان</h1>
        </div>
        <button onClick={onExit} className="bg-red-600 px-6 py-2 rounded-2xl text-xs font-black shadow-lg active:scale-95 transition-all">خروج از پنل</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-l p-4 flex md:flex-col gap-1 overflow-x-auto shrink-0 shadow-sm z-10 no-scrollbar">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutDashboard size={20}/> داشبورد</button>
           <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={20}/> کاربران ({totalUsersCount})</button>
           <div className="h-px bg-gray-100 my-2" />
           <button onClick={() => setActiveTab('ESTATE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ESTATE' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={20}/> املاک</button>
           <button onClick={() => setActiveTab('JOBS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'JOBS' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Briefcase size={20}/> مشاغل</button>
           <button onClick={() => setActiveTab('SERVICES')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'SERVICES' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Wrench size={20}/> خدمات</button>
           <div className="h-px bg-gray-100 my-2" />
           {currentAdmin.role === 'SUPER' && <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ADMINS' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Shield size={20}/> تیم مدیریت</button>}
           <button onClick={() => setActiveTab('PROFILE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'PROFILE' ? 'bg-gray-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Key size={20}/> امنیت</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-gray-50/30 relative">
          {activeTab === 'DASHBOARD' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
                <div className="flex items-center gap-3 mb-2">
                   <BarChart3 size={28} className="text-red-600" />
                   <h2 className="text-2xl font-black text-gray-800">آمار و عملکرد</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Users size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">کل کاربران</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{totalUsersCount}</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><FileText size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">آگهی املاک</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{properties.length}</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><Briefcase size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">آگهی مشاغل</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{jobs.length}</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><Wrench size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">آگهی خدمات</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{services.length}</span>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'ESTATE' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-xl font-black flex items-center gap-2"><Home size={24} className="text-red-600"/> مدیریت املاک</h2>
              {renderList(properties, 'ESTATE')}
            </div>
          )}

          {activeTab === 'JOBS' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-xl font-black flex items-center gap-2"><Briefcase size={24} className="text-blue-600"/> مدیریت مشاغل</h2>
              {renderList(jobs, 'JOBS')}
            </div>
          )}

          {activeTab === 'SERVICES' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-xl font-black flex items-center gap-2"><Wrench size={24} className="text-orange-600"/> مدیریت خدمات</h2>
              {renderList(services, 'SERVICES')}
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="max-w-5xl mx-auto space-y-6">
               <h2 className="text-xl font-black flex items-center gap-2"><Users size={24} className="text-blue-600"/> لیست کاربران سیستم</h2>
               <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b">
                       <tr>
                         <th className="px-6 py-4 text-xs font-black text-gray-400">نام کاربر</th>
                         <th className="px-6 py-4 text-xs font-black text-gray-400">شماره تماس</th>
                         <th className="px-6 py-4 text-xs font-black text-gray-400">تاریخ عضویت</th>
                         <th className="px-6 py-4 text-xs font-black text-gray-400">عملیات</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {allUsers.map((user, i) => (
                         <tr key={i} className="hover:bg-gray-50">
                           <td className="px-6 py-4 font-black text-sm">{user.full_name}</td>
                           <td className="px-6 py-4 font-bold text-sm text-blue-600" dir="ltr">{user.phone}</td>
                           <td className="px-6 py-4 text-xs text-gray-400 font-bold">{new Date(user.created_at).toLocaleDateString('fa-AF')}</td>
                           <td className="px-6 py-4">
                              <button onClick={() => { setAdminMsg(''); setSelectedItem({ ...user, type: 'USER_INFO' }); }} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1">
                                <MessageSquare size={14} /> ارسال پیام
                              </button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'ADMINS' && currentAdmin.role === 'SUPER' && (
            <div className="max-w-4xl mx-auto space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Plus size={20} className="text-purple-600"/> افزودن ادمین جدید</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} placeholder="نام کامل" className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none focus:border-purple-300" />
                    <input type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} placeholder="نام کاربری (انگلیسی)" className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none dir-ltr" />
                    <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="رمز عبور" className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none" />
                    <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none">
                       <option value="NORMAL">مدیر معمولی</option>
                       <option value="SUPER">مدیر ارشد (Super Admin)</option>
                    </select>
                  </div>
                  <button onClick={handleAddAdmin} disabled={isProcessing} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black mt-6 shadow-lg shadow-purple-900/20 active:scale-95 transition-all">افزودن مدیر سیستم</button>
               </div>

               <div className="space-y-4">
                  <h3 className="font-black text-gray-800">تیم مدیریت فعلی</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemAdmins.map((admin, i) => (
                      <div key={i} className="bg-white p-5 rounded-3xl border flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-black">{admin.full_name[0]}</div>
                            <div>
                               <h4 className="font-black text-sm">{admin.full_name}</h4>
                               <span className="text-[10px] text-gray-400 font-bold">نقش: {admin.role === 'SUPER' ? 'مدیر ارشد' : 'مدیر'}</span>
                            </div>
                         </div>
                         <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-xl mx-auto">
               <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Key size={20} className="text-gray-600"/> تغییر رمز عبور پنل</h3>
                  <div className="space-y-4">
                    <input type="password" value={changePwd.old} onChange={e => setChangePwd({...changePwd, old: e.target.value})} placeholder="رمز عبور فعلی" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" />
                    <input type="password" value={changePwd.new} onChange={e => setChangePwd({...changePwd, new: e.target.value})} placeholder="رمز عبور جدید" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" />
                    <input type="password" value={changePwd.confirm} onChange={e => setChangePwd({...changePwd, confirm: e.target.value})} placeholder="تکرار رمز عبور جدید" className="w-full bg-gray-50 border p-4 rounded-2xl font-bold" />
                  </div>
                  <button onClick={handleChangePassword} disabled={isProcessing} className="w-full bg-gray-800 text-white py-4 rounded-2xl font-black mt-6 active:scale-95 transition-all">به‌روزرسانی رمز عبور</button>
               </div>
            </div>
          )}
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
           <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-black text-lg text-gray-800">جزئیات {selectedItem.type === 'USER_INFO' ? 'کاربر' : 'آگهی'}</h3>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full"><XCircle size={24} className="text-gray-400"/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                {selectedItem.type === 'USER_INFO' ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 py-6 border-b">
                       <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black">{selectedItem.full_name[0]}</div>
                       <div className="text-center">
                          <h2 className="text-2xl font-black">{selectedItem.full_name}</h2>
                          <p dir="ltr" className="text-blue-600 font-black mt-1">{selectedItem.phone}</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-xs font-black text-gray-400 mr-2">ارسال پیام سیستمی به این کاربر</label>
                       <textarea value={adminMsg} onChange={e => setAdminMsg(e.target.value)} rows={4} placeholder="مثلاً: آگهی شما به دلیل نقص تصاویر رد شد. لطفاً دوباره تلاش کنید." className="w-full bg-gray-50 border border-gray-100 rounded-3xl p-5 font-bold outline-none focus:border-blue-300 resize-none"></textarea>
                       <button onClick={() => handleSendAdminMessage(selectedItem.phone)} disabled={isProcessing || !adminMsg.trim()} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                         {isProcessing ? <Loader2 className="animate-spin text-white"/> : <><MessageSquare size={18}/> ارسال پیام</>}
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-gray-100">
                       <img src={selectedItem.images?.[activeImgIdx]} className="w-full h-full object-cover" />
                       {selectedItem.images?.length > 1 && (
                         <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                           {selectedItem.images.map((_: any, i: number) => (
                             <button key={i} onClick={() => setActiveImgIdx(i)} className={`w-2 h-2 rounded-full ${i === activeImgIdx ? 'bg-white w-6' : 'bg-white/40'}`}></button>
                           ))}
                         </div>
                       )}
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-2xl font-black">{selectedItem.title}</h2>
                       <div className="flex gap-4">
                          <span className="bg-gray-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"><MapPin size={14}/> {selectedItem.city}</span>
                          <span className="bg-gray-100 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"><Phone size={14}/> {selectedItem.phone_number}</span>
                       </div>
                       <p className="text-sm font-bold text-gray-600 leading-8 text-justify">{selectedItem.description}</p>
                    </div>

                    <div className="pt-6 border-t flex gap-4">
                       <button onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES, 'APPROVED')} disabled={isProcessing} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-900/20">
                          <CheckCircle size={20}/> تایید آگهی
                       </button>
                       <button onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES, 'REJECTED')} disabled={isProcessing} className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-amber-900/20">
                          <XCircle size={20}/> رد آگهی
                       </button>
                    </div>
                    <button onClick={() => handleDeleteItem(selectedItem.id, selectedItem.type)} disabled={isProcessing} className="w-full text-red-600 py-3 font-black text-xs hover:bg-red-50 rounded-xl transition-all mt-2">حذف دائمی از پایگاه داده</button>
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
