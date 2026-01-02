
import { useState, useEffect, useCallback } from 'react';
import { Property, Job, Service } from '../types';
import { Trash2, Home, Shield, FileText, LayoutDashboard, Key, Briefcase, Wrench, CheckCircle, XCircle, MessageSquare, Eye, Plus, Users, Phone, BarChart3, ShieldCheck, MapPin, Loader2, Send, Clock, AlertCircle } from 'lucide-react';
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
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', fullName: '', role: 'NORMAL' });
  const [changePwd, setChangePwd] = useState({ old: '', new: '', confirm: '' });

  const currentAdmin = JSON.parse(localStorage.getItem('current_admin_user') || '{}');

  const fetchData = useCallback(async () => {
    try {
      const { data: profiles, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userError) console.error("Error profiles:", userError);
      setAllUsers(profiles || []);
      setTotalUsersCount(profiles?.length || 0);

      const { data: admins } = await supabase.from('system_admins').select('*');
      setSystemAdmins(admins || []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const fetchChatHistory = async (phone: string) => {
    if (!phone) return;
    const { data } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('target_phone', phone)
      .order('date', { ascending: true });
    setChatHistory(data || []);
  };

  const handleUpdateStatus = async (id: string, type: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    const table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    
    try {
      const { error: updateError } = await supabase
        .from(table)
        .update({ status: status })
        .eq('id', id)
        .select();

      if (updateError) throw updateError;

      const ownerPhone = selectedItem?.owner_id || selectedItem?.phone_number;
      if (adminMsg.trim() && ownerPhone) {
        await handleSendAdminMessage(ownerPhone, `وضعیت آگهی "${selectedItem.title}" تغییر کرد: ${status === 'APPROVED' ? 'تایید شد' : 'رد شد'}. دلیل: ${adminMsg}`);
      }

      const updateFn = (prev: any[]) => prev.map(item => item.id === id ? { ...item, status } : item);
      if (type === 'ESTATE') setProperties(updateFn);
      if (type === 'JOBS') setJobs(updateFn);
      if (type === 'SERVICES') setServices(updateFn);
      
      alert("تغییرات با موفقیت در دیتابیس ثبت شد.");
      setSelectedItem(null);
      setAdminMsg('');
      fetchData();
    } catch (err: any) {
      alert("خطا در تایید: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteItem = async (id: string, type: string) => {
    if (!window.confirm("آیا از حذف دائمی این آگهی مطمئن هستید؟")) return;
    setIsProcessing(true);
    const table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    
    try {
      // اضافه کردن count: 'exact' برای چک کردن حذف واقعی
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;

      if (count === 0) {
        alert("خطا: ردیفی در دیتابیس حذف نشد. لطفاً تنظیمات RLS دیتابیس را برای اجازه DELETE چک کنید.");
      } else {
        const filterFn = (prev: any[]) => prev.filter(item => item.id !== id);
        if (type === 'ESTATE') setProperties(filterFn);
        if (type === 'JOBS') setJobs(filterFn);
        if (type === 'SERVICES') setServices(filterFn);
        alert("آگهی با موفقیت از دیتابیس حذف شد.");
        setSelectedItem(null);
      }
    } catch (e: any) { 
      alert("خطا در حذف: " + e.message); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleSendAdminMessage = async (targetPhone: string, textOverride?: string) => {
    const text = textOverride || adminMsg;
    if (!text.trim()) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(TABLES.MESSAGES).insert([{
        target_phone: targetPhone,
        text: text,
        is_read: false,
        date: new Date().toISOString()
      }]);
      if (error) throw error;
      if (!textOverride) {
        setAdminMsg('');
        fetchChatHistory(targetPhone);
      }
    } catch(e: any) {
      alert("خطا در ارسال پیام: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) return alert("فیلدها را پر کنید");
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('system_admins').insert([{ 
        username: newAdmin.username.toLowerCase(), 
        password: newAdmin.password, 
        full_name: newAdmin.fullName, 
        role: newAdmin.role 
      }]);
      if (error) throw error;
      setNewAdmin({ username: '', password: '', fullName: '', role: 'NORMAL' });
      fetchData();
      alert("مدیر جدید اضافه شد.");
    } catch (e) { alert("خطا در افزودن مدیر."); }
    finally { setIsProcessing(false); }
  };

  const renderList = (items: any[], type: string) => (
    <div className="grid grid-cols-1 gap-4">
      {items.length === 0 ? (
        <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-gray-200">
          <AlertCircle size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400 font-black">هیچ آگهی در این بخش وجود ندارد.</p>
        </div>
      ) : items.map(item => (
        <div key={item.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4">
            <img src={item.images?.[0]} className="w-16 h-16 rounded-2xl object-cover bg-gray-100" alt="" />
            <div>
              <h4 className="font-black text-sm text-gray-800">{item.title}</h4>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {item.status === 'PENDING' ? 'در انتظار تایید' : item.status === 'APPROVED' ? 'تایید شده' : 'رد شده'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { 
              setSelectedItem({ ...item, type }); 
              setActiveImgIdx(0); 
              fetchChatHistory(item.owner_id || item.phone_number); 
            }} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100"><Eye size={18}/></button>
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
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-left ml-4">
              <p className="text-[10px] text-gray-400 font-black">مدیر سیستم:</p>
              <p className="text-xs font-black">{currentAdmin.full_name}</p>
          </div>
          <button onClick={onExit} className="bg-red-600 px-6 py-2 rounded-2xl text-xs font-black shadow-lg hover:bg-red-700 transition-colors">خروج</button>
        </div>
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
           <button onClick={() => setActiveTab('PROFILE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'PROFILE' ? 'bg-gray-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Key size={20}/> امنیت پنل</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
          {activeTab === 'DASHBOARD' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
                <div className="flex items-center gap-3 mb-2">
                   <BarChart3 size={28} className="text-red-600" />
                   <h2 className="text-2xl font-black text-gray-800">وضعیت کل سیستم</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4"><Users size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">کاربران ثبت‌نام شده</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{totalUsersCount}</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><FileText size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">کل آگهی‌ها</span>
                      <span className="text-4xl font-black text-gray-800 block mt-1">{properties.length + jobs.length + services.length}</span>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="max-w-5xl mx-auto space-y-6">
               <h2 className="text-xl font-black">لیست کاربران سیستم</h2>
               <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b">
                       <tr>
                         <th className="px-6 py-4 text-xs font-black">نام کامل</th>
                         <th className="px-6 py-4 text-xs font-black">شماره تماس</th>
                         <th className="px-6 py-4 text-xs font-black">تاریخ عضویت</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y">
                       {allUsers.length === 0 ? (
                         <tr><td colSpan={3} className="py-10 text-center text-gray-400 font-black">هیچ کاربری یافت نشد</td></tr>
                       ) : allUsers.map((user, i) => (
                         <tr key={i} className="hover:bg-gray-50">
                           <td className="px-6 py-4 font-black text-sm">{user.full_name}</td>
                           <td className="px-6 py-4 font-bold text-sm text-blue-600" dir="ltr">{user.phone}</td>
                           <td className="px-6 py-4 text-xs text-gray-400 font-bold">{new Date(user.created_at).toLocaleDateString('fa-AF')}</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-xl font-black">مدیریت آگهی‌های {activeTab === 'ESTATE' ? 'املاک' : activeTab === 'JOBS' ? 'مشاغل' : 'خدمات'}</h2>
              {renderList(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services, activeTab)}
            </div>
          )}

          {activeTab === 'ADMINS' && (
            <div className="max-w-4xl mx-auto space-y-8">
               <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-purple-600"><Plus size={20}/> افزودن مدیر جدید</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} placeholder="نام کامل مدیر" className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none" />
                    <input type="text" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} placeholder="نام کاربری (انگلیسی)" className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none dir-ltr" />
                    <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} placeholder="رمز عبور" className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none dir-ltr" />
                    <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none">
                       <option value="NORMAL">مدیر معمولی</option>
                       <option value="SUPER">مدیر ارشد</option>
                    </select>
                  </div>
                  <button onClick={handleAddAdmin} disabled={isProcessing} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black mt-6 shadow-lg active:scale-95 transition-all">تایید و افزودن مدیر</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemAdmins.map((admin, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black text-lg">{admin.full_name?.[0]}</div>
                          <div>
                            <h4 className="font-black text-sm">{admin.full_name}</h4>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{admin.role}</span>
                          </div>
                       </div>
                       <Shield size={20} className="text-gray-200" />
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-xl mx-auto mt-10">
               <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                  <div className="w-20 h-20 bg-gray-900 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl"><Key size={40} /></div>
                  <h3 className="text-xl font-black mb-2">تغییر رمز عبور پنل</h3>
                  <p className="text-xs text-gray-400 mb-8 font-bold">برای امنیت بیشتر، رمز خود را به صورت دوره‌ای تغییر دهید.</p>
                  <div className="space-y-4">
                    <input type="password" value={changePwd.old} onChange={e => setChangePwd({...changePwd, old: e.target.value})} placeholder="رمز عبور فعلی" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none dir-ltr" />
                    <input type="password" value={changePwd.new} onChange={e => setChangePwd({...changePwd, new: e.target.value})} placeholder="رمز عبور جدید" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none dir-ltr" />
                    <input type="password" value={changePwd.confirm} onChange={e => setChangePwd({...changePwd, confirm: e.target.value})} placeholder="تکرار رمز عبور جدید" className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl font-bold outline-none dir-ltr" />
                  </div>
                  <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black mt-8 shadow-xl active:scale-95 transition-all">به‌روزرسانی رمز عبور</button>
               </div>
            </div>
          )}
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden" onClick={() => setSelectedItem(null)}>
           <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              
              <div className="flex-1 overflow-y-auto p-8 border-l no-scrollbar bg-gray-50">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900">{selectedItem.title}</h2>
                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XCircle size={32} className="text-gray-400"/></button>
                 </div>

                 <div className="relative aspect-video rounded-[2rem] overflow-hidden mb-6 shadow-lg bg-gray-200">
                    <img src={selectedItem.images?.[activeImgIdx]} className="w-full h-full object-cover" alt="" />
                    {selectedItem.images?.length > 1 && (
                      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                        {selectedItem.images.map((_: any, i: number) => (
                          <button key={i} onClick={() => setActiveImgIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === activeImgIdx ? 'bg-white w-6' : 'bg-white/40'}`}></button>
                        ))}
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                       <span className="text-[10px] font-black text-gray-400 uppercase">موقعیت آگهی</span>
                       <p className="font-black text-sm flex items-center gap-1 mt-1 text-red-600"><MapPin size={14}/> {selectedItem.city}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                       <span className="text-[10px] font-black text-gray-400 uppercase">شماره تماس کاربر</span>
                       <p className="font-black text-sm flex items-center gap-1 mt-1 text-blue-600" dir="ltr"><Phone size={14}/> {selectedItem.phone_number}</p>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-3xl border border-gray-100 mb-8">
                    <h4 className="text-xs font-black text-gray-400 mb-3">توضیحات آگهی:</h4>
                    <p className="text-sm font-bold text-gray-600 leading-8 text-justify">{selectedItem.description}</p>
                 </div>
                 
                 <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 mb-6">
                    <h4 className="text-sm font-black text-amber-700 mb-3 flex items-center gap-2">
                       <MessageSquare size={18} /> پیام ادمین به کاربر (دلیل رد یا تایید)
                    </h4>
                    <textarea 
                       value={adminMsg} 
                       onChange={e => setAdminMsg(e.target.value)}
                       placeholder="نکته یا دلیل رد/تایید آگهی را بنویسید..." 
                       className="w-full bg-white border border-amber-200 rounded-2xl p-4 text-xs font-bold outline-none focus:border-amber-400 h-24 resize-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type, 'APPROVED')} disabled={isProcessing} className="bg-green-600 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-900/20">
                       <CheckCircle size={22}/> تایید و انتشار
                    </button>
                    <button onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type, 'REJECTED')} disabled={isProcessing} className="bg-red-600 text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-900/20">
                       <XCircle size={22}/> رد آگهی
                    </button>
                 </div>
              </div>

              <div className="w-full md:w-[380px] flex flex-col bg-white border-r">
                 <div className="p-6 border-b bg-gray-50 flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-black text-lg">M</div>
                    <div>
                       <h3 className="font-black text-sm">چت مستقیم با آگهی‌دهنده</h3>
                       <p className="text-[10px] text-gray-400 font-bold" dir="ltr">{selectedItem.owner_id || selectedItem.phone_number}</p>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gray-50/50">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-20 opacity-20 flex flex-col items-center">
                         <MessageSquare size={48} />
                         <span className="text-xs font-black mt-2">هیچ پیامی ارسال نشده است</span>
                      </div>
                    ) : chatHistory.map((msg, i) => (
                      <div key={i} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                         <p className="text-[12px] font-bold text-gray-700 leading-6">{msg.text}</p>
                         <div className="flex justify-between items-center mt-3 text-[9px] text-gray-400 font-black">
                            <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-red-600">ادمین</span>
                            <span className="flex items-center gap-1"><Clock size={10}/> {new Date(msg.date).toLocaleTimeString('fa-AF')}</span>
                         </div>
                      </div>
                    ))}
                 </div>

                 <div className="p-4 border-t bg-white relative">
                    <textarea 
                       value={adminMsg} 
                       onChange={e => setAdminMsg(e.target.value)}
                       placeholder="پیام خود را تایپ کنید..." 
                       className="w-full bg-gray-100 border-none rounded-[2rem] p-5 pr-14 text-xs font-bold outline-none resize-none h-28 focus:ring-2 ring-red-500/10"
                    />
                    <button 
                       onClick={() => handleSendAdminMessage(selectedItem.owner_id || selectedItem.phone_number)}
                       disabled={isProcessing || !adminMsg.trim()}
                       className="absolute bottom-10 left-8 bg-red-600 text-white p-3 rounded-2xl shadow-xl active:scale-90 transition-transform disabled:opacity-50 disabled:scale-100"
                       title="ارسال پیام"
                    >
                       {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                 </div>
              </div>

           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
