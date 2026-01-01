
import React, { useState, useEffect, useMemo } from 'react';
import { Property, Job, Service, AdminUser } from '../types';
import { Check, Trash2, Home, Briefcase, Wrench, Shield, X, FileText, AlertCircle, LayoutDashboard, ChevronLeft, Loader2, Users, Phone, MapPin, User, Search, Send, MessageSquare } from 'lucide-react';
import { ADMINS as initialAdmins } from '../services/mockData';
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

const stringifyError = (err: any): string => {
  if (!err) return "Unknown error";
  if (typeof err === 'string') return err;
  if (err.message) return String(err.message);
  try {
    const json = JSON.stringify(err);
    if (json === '{}') return String(err);
    return json;
  } catch {
    return String(err);
  }
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  properties, setProperties, 
  jobs, setJobs, 
  services, setServices,
  onExit 
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'ADMINS' | 'PROFILE' | 'USERS'>('DASHBOARD');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('admins_list');
    return saved ? JSON.parse(saved) : initialAdmins;
  });
  
  const [currentAdmin] = useState<AdminUser>(() => {
    const saved = localStorage.getItem('current_admin_user');
    return saved ? JSON.parse(saved) : admins[0];
  });

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', fullName: '', role: 'NORMAL' as any });

  useEffect(() => {
    localStorage.setItem('admins_list', JSON.stringify(admins));
  }, [admins]);

  const stats = useMemo(() => {
    const all = [...properties, ...jobs, ...services];
    return {
      totalPosts: all.length,
      pendingPosts: all.filter(it => it.status === 'PENDING').length,
      approvedCount: all.filter(it => it.status === 'APPROVED').length,
    };
  }, [properties, jobs, services]);

  const allUsersList = useMemo(() => {
    const allItems = [...properties, ...jobs, ...services];
    const usersMap: Record<string, any> = {};
    
    allItems.forEach(item => {
      const phone = item.phoneNumber || 'نامشخص';
      if (!usersMap[phone]) {
        const localProfile = localStorage.getItem(`profile_${phone}`);
        let profileData = { firstName: 'کاربر', lastName: 'افغان', avatarUrl: '' };
        if (localProfile && localProfile !== "[object Object]") {
          try {
            profileData = JSON.parse(localProfile);
          } catch (e) {
            console.error("Failed to parse user profile", e);
          }
        }
        usersMap[phone] = { phone, propertyCount: 0, jobCount: 0, serviceCount: 0, total: 0, ...profileData };
      }
      if (properties.some(p => p.id === item.id)) usersMap[phone].propertyCount++;
      else if (jobs.some(j => j.id === item.id)) usersMap[phone].jobCount++;
      else if (services.some(s => s.id === item.id)) usersMap[phone].serviceCount++;
      usersMap[phone].total++;
    });

    return Object.values(usersMap).filter(u => u.phone.includes(userSearchTerm));
  }, [properties, jobs, services, userSearchTerm]);

  const handleAction = async (id: string, action: 'APPROVE' | 'DELETE' | 'MESSAGE') => {
    if (action === 'MESSAGE' && !adminMessage) {
      alert("لطفاً متن پیام را بنویسید.");
      return;
    }
    setIsProcessing(true);
    try {
      let tableName = '';
      if (properties.some(p => p.id === id || (selectedItem && selectedItem.id === id))) tableName = TABLES.PROPERTIES;
      else if (jobs.some(j => j.id === id || (selectedItem && selectedItem.id === id))) tableName = TABLES.JOBS;
      else if (services.some(s => s.id === id || (selectedItem && selectedItem.id === id))) tableName = TABLES.SERVICES;

      if (action === 'DELETE') {
        const confirmDelete = window.confirm("آیا از حذف دائمی این آگهی اطمینان دارید؟");
        if (!confirmDelete) { setIsProcessing(false); return; }
        
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;

        setProperties(prev => prev.filter(it => it.id !== id));
        setJobs(prev => prev.filter(it => it.id !== id));
        setServices(prev => prev.filter(it => it.id !== id));
        setSelectedItem(null);
        alert("آگهی با موفقیت حذف شد.");
      } else if (action === 'APPROVE') {
        const { error } = await supabase.from(tableName).update({ status: 'APPROVED' }).eq('id', id);
        if (error) throw error;

        const updateState = (list: any[]) => list.map(it => it.id === id ? { ...it, status: 'APPROVED' } : it);
        setProperties(updateState(properties));
        setJobs(updateState(jobs));
        setServices(updateState(services));
        setSelectedItem(null);
        alert("آگهی تایید و منتشر شد.");
      } else if (action === 'MESSAGE') {
        const phone = selectedUserDetail?.phone || selectedItem?.phoneNumber;
        if (!phone) throw new Error("شماره پیدا نشد");
        
        const { error } = await supabase.from(TABLES.MESSAGES).insert([{ 
          target_phone: phone, 
          text: adminMessage, 
          date: new Date().toLocaleDateString('fa-AF'), 
          is_read: false 
        }]);
        
        if (error) {
          if (error.message.includes("not found")) {
            throw new Error("جدول پیام‌ها در دیتابیس یافت نشد. لطفاً کد SQL را در پنل Supabase اجرا کنید.");
          }
          throw error;
        }

        alert("پیام به کاربر ارسال شد.");
        setAdminMessage('');
      }
    } catch (err: any) {
      const errorMsg = stringifyError(err);
      console.error("Admin action error:", err);
      alert("خطا در عملیات: " + errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'ESTATE', label: 'املاک', icon: Home },
    { id: 'JOBS', label: 'استخدام', icon: Briefcase },
    { id: 'SERVICES', label: 'خدمات', icon: Wrench },
    { id: 'USERS', label: 'کاربران', icon: Users },
    { id: 'ADMINS', label: 'ادمین‌ها', icon: Shield, superOnly: true },
    { id: 'PROFILE', label: 'تنظیمات', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-[9000] bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden" dir="rtl">
      <header className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center z-50 shadow-xl shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-red-500" />
          <h1 className="text-sm font-black uppercase tracking-widest">پنل مدیریت</h1>
        </div>
        <button onClick={onExit} className="bg-red-600 px-4 py-2 rounded-xl text-xs font-black active:scale-95">خروج</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="flex md:flex-col overflow-x-auto md:overflow-y-auto w-full md:w-64 bg-white border-b md:border-l p-2 md:p-4 gap-2 shrink-0 shadow-md">
           {navItems.map((item) => (
             (!item.superOnly || currentAdmin.role === 'SUPER') && (
               <button 
                 key={item.id} 
                 onClick={() => setActiveTab(item.id as any)} 
                 className={`flex-none flex items-center justify-start gap-3 px-5 py-3 md:py-4 rounded-xl font-black transition-all ${activeTab === item.id ? 'bg-[#a62626] text-white' : 'text-gray-400 hover:bg-gray-50'}`}
               >
                 <item.icon size={18} /> 
                 <span className="text-[11px] md:text-sm">{item.label}</span>
               </button>
             )
           ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#FDFEFF]">
          <div className="max-w-4xl mx-auto pb-24">
            {activeTab === 'DASHBOARD' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in">
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center">
                  <FileText className="text-blue-500 mx-auto mb-2" size={32} />
                  <span className="text-gray-400 text-[10px] font-black block uppercase">کل آگهی‌ها</span>
                  <span className="text-3xl font-black">{stats.totalPosts}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center">
                  <AlertCircle className="text-amber-500 mx-auto mb-2" size={32} />
                  <span className="text-gray-400 text-[10px] font-black block uppercase">در انتظار تایید</span>
                  <span className="text-3xl font-black text-amber-600">{stats.pendingPosts}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center">
                  <Users className="text-green-500 mx-auto mb-2" size={32} />
                  <span className="text-gray-400 text-[10px] font-black block uppercase">کاربران فعال</span>
                  <span className="text-3xl font-black text-green-600">{allUsersList.length}</span>
                </div>
              </div>
            )}

            {activeTab === 'USERS' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-black">لیست کاربران</h2>
                    <div className="relative w-64">
                       <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <input type="text" placeholder="جستجوی شماره..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className="w-full bg-gray-100 rounded-xl pr-10 pl-4 py-2 text-xs font-black outline-none" />
                    </div>
                 </div>
                 <div className="bg-white rounded-3xl border shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 border-b">
                          <tr className="text-xs font-black text-gray-400">
                             <th className="p-4">کاربر</th>
                             <th className="p-4">شماره تماس</th>
                             <th className="p-4 text-center">تعداد آگهی</th>
                             <th className="p-4"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {allUsersList.map((user, idx) => (
                             <tr key={idx} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedUserDetail(user)}>
                                <td className="p-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                                         {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <User size={18} className="text-gray-300" />}
                                      </div>
                                      <span className="font-black text-gray-800 whitespace-nowrap">{user.firstName} {user.lastName}</span>
                                   </div>
                                </td>
                                <td className="p-4 font-black text-gray-500 whitespace-nowrap">{user.phone}</td>
                                <td className="p-4 text-center"><span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-black">{user.total}</span></td>
                                <td className="p-4 text-left"><ChevronLeft size={18} className="text-gray-300" /></td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {['ESTATE', 'JOBS', 'SERVICES'].includes(activeTab) && (
              <div className="space-y-6 pb-12">
                 <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-black">مدیریت آگهی‌ها</h2>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setStatusFilter('PENDING')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'PENDING' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-500'}`}>در انتظار</button>
                      <button onClick={() => setStatusFilter('APPROVED')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'APPROVED' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>تایید شده</button>
                    </div>
                 </div>
                 <div className="grid gap-3">
                   {(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services)
                     .filter(it => it.status === statusFilter)
                     .map(item => (
                       <div key={item.id} onClick={() => { setSelectedItem(item); setActiveImageIdx(0); setAdminMessage(''); }} className="bg-white rounded-2xl p-4 border flex items-center gap-4 transition-all hover:border-[#a62626]/30 cursor-pointer shadow-sm">
                          <img src={item.images?.[0]} className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" />
                          <div className="flex-1">
                             <h3 className="font-black text-sm text-gray-800 truncate">{item.title}</h3>
                             <p className="text-[10px] text-gray-400 font-bold">{item.city} | {item.phoneNumber}</p>
                          </div>
                          <ChevronLeft size={18} className="text-gray-300 shrink-0" />
                       </div>
                     ))}
                 </div>
              </div>
            )}
            
            {activeTab === 'ADMINS' && currentAdmin.role === 'SUPER' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-gray-800"><Shield size={20} className="text-red-600" /> ثبت ادمین جدید</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!newAdmin.username || !newAdmin.password) return;
                    const admin: AdminUser = { id: Date.now().toString(), ...newAdmin };
                    setAdmins([...admins, admin]);
                    setNewAdmin({ username: '', password: '', fullName: '', role: 'NORMAL' });
                    alert("ادمین جدید با موفقیت اضافه شد.");
                  }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="نام کامل" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-5 py-4 font-bold outline-none focus:border-red-600/20" required />
                    <input type="text" placeholder="نام کاربری" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-5 py-4 font-bold outline-none focus:border-red-600/20" required />
                    <input type="password" placeholder="رمز عبور" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-5 py-4 font-bold outline-none focus:border-red-600/20" required />
                    <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value as any})} className="w-full bg-gray-50 border rounded-xl px-5 py-4 font-bold outline-none">
                      <option value="NORMAL">ادمین معمولی</option>
                      <option value="SUPER">سوپر ادمین</option>
                    </select>
                    <button type="submit" className="md:col-span-2 bg-red-600 text-white py-4 rounded-xl font-black text-lg active:scale-95 shadow-lg shadow-red-900/20 transition-all">ایجاد حساب مدیریت</button>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'PROFILE' && (
              <div className="bg-white p-8 rounded-[2rem] border shadow-sm max-w-lg">
                 <h3 className="text-lg font-black mb-6">تنظیمات ادمین</h3>
                 <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-xl border">
                       <span className="text-[10px] font-black text-gray-400 block mb-1">نام کاربر مدیریت</span>
                       <span className="font-black text-gray-800">{currentAdmin.fullName}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border">
                       <span className="text-[10px] font-black text-gray-400 block mb-1">سطح دسترسی</span>
                       <span className={`font-black ${currentAdmin.role === 'SUPER' ? 'text-red-600' : 'text-blue-600'}`}>
                         {currentAdmin.role === 'SUPER' ? 'سوپر ادمین' : 'ادمین معمولی'}
                       </span>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[12000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => !isProcessing && setSelectedItem(null)}>
          <div className="bg-white w-full max-w-4xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            <div className="w-full md:w-1/2 h-[30vh] md:h-full bg-black shrink-0 relative flex items-center justify-center">
               <img src={selectedItem.images?.[activeImageIdx]} className="w-full h-full object-contain" />
               {selectedItem.images?.length > 1 && (
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto no-scrollbar">
                   {selectedItem.images.map((img: string, idx: number) => (
                     <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`w-10 h-10 rounded-lg border-2 shrink-0 transition-all ${idx === activeImageIdx ? 'border-red-500 scale-110 shadow-lg' : 'border-white/20'}`}>
                       <img src={img} className="w-full h-full object-cover rounded-md" />
                     </button>
                   ))}
                 </div>
               )}
            </div>

            <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
               <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#a62626]" />
                    <h2 className="font-black text-xs md:text-sm text-gray-800">بررسی کامل جزئیات</h2>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 bg-white rounded-full hover:bg-gray-100 transition-all shadow-sm"><X size={24} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">{selectedItem.title}</h3>
                    <div className="flex gap-2 text-[10px] font-black">
                      <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg flex items-center gap-1"><MapPin size={10} /> {selectedItem.city}</span>
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg">{selectedItem.type || 'آگهی'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <span className="text-[9px] font-black text-gray-400 block uppercase mb-1">قیمت / عاید</span>
                       <span className="text-lg font-black text-red-600">{selectedItem.price?.toLocaleString() || selectedItem.salary?.toLocaleString() || 'توافقی'} AFN</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                       <span className="text-[9px] font-black text-gray-400 block uppercase mb-1">شماره تماس کاربر</span>
                       <div className="flex items-center gap-2">
                          <Phone size={12} className="text-green-600" />
                          <span className="text-lg font-black text-gray-800">{selectedItem.phoneNumber}</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">توضیحات آگهی:</span>
                    <p className="text-xs md:text-sm font-medium text-gray-700 leading-7 bg-gray-50 p-4 rounded-2xl border border-gray-100 whitespace-pre-wrap">{selectedItem.description || 'توضیحاتی ندارد.'}</p>
                  </div>

                  <div className="pt-6 border-t space-y-3 pb-8">
                    <div className="flex items-center gap-2 text-[#a62626] font-black text-xs">
                      <MessageSquare size={16} />
                      <span>ارسال پیام مستقیم به پنل کاربر:</span>
                    </div>
                    <textarea 
                      value={adminMessage} onChange={e => setAdminMessage(e.target.value)}
                      placeholder="دلیل رد آگهی یا پیام راهنما را اینجا بنویسید..."
                      className="w-full bg-gray-50 border rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-300 resize-none h-24"
                    />
                    <button 
                      onClick={() => handleAction(selectedItem.id, 'MESSAGE')}
                      disabled={isProcessing || !adminMessage}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      <Send size={18} /> ارسال پیام به کاربر
                    </button>
                  </div>
               </div>

               <div className="p-4 md:p-6 border-t bg-gray-50 flex gap-4 shrink-0 shadow-inner">
                  {selectedItem.status === 'PENDING' ? (
                    <>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'APPROVE')} className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-900/10 transition-all text-xs md:text-base">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Check size={20} />} تایید آگهی
                      </button>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'DELETE')} className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2 border border-red-100 transition-all active:scale-95 text-xs md:text-base">
                        <Trash2 size={20} /> حذف
                      </button>
                    </>
                  ) : (
                    <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'DELETE')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                      <Trash2 size={20} /> حذف دائمی از سیستم
                    </button>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
