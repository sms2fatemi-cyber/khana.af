
import React, { useState, useEffect, useMemo } from 'react';
import { Property, Job, Service, AdminUser } from '../types';
import { Check, Trash2, Home, Briefcase, Wrench, Shield, X, Key, FileText, AlertCircle, LayoutDashboard, ChevronLeft, Loader2, Users, UserPlus, Lock, MessageSquare, Phone, MapPin, Eye, User, Search, Send } from 'lucide-react';
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
  
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('admins_list');
    return saved ? JSON.parse(saved) : initialAdmins;
  });
  
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser>(() => {
    const saved = localStorage.getItem('current_admin_user');
    return saved ? JSON.parse(saved) : admins[0];
  });

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', fullName: '' });
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '' });

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

  // استخراج لیست کاربران از روی شماره تماس آگهی‌ها
  const userStats = useMemo(() => {
    const allItems = [...properties, ...jobs, ...services];
    const usersMap: Record<string, { phone: string, propertyCount: number, jobCount: number, serviceCount: number, total: number }> = {};
    
    allItems.forEach(item => {
      const phone = item.phoneNumber || 'نامشخص';
      if (!usersMap[phone]) {
        usersMap[phone] = { phone, propertyCount: 0, jobCount: 0, serviceCount: 0, total: 0 };
      }
      
      if (properties.some(p => p.id === item.id)) usersMap[phone].propertyCount++;
      else if (jobs.some(j => j.id === item.id)) usersMap[phone].jobCount++;
      else if (services.some(s => s.id === item.id)) usersMap[phone].serviceCount++;
      
      usersMap[phone].total++;
    });

    return Object.values(usersMap).filter(u => u.phone.includes(userSearchTerm));
  }, [properties, jobs, services, userSearchTerm]);

  const sendMessageToUser = async (targetPhone: string, text: string) => {
    try {
      await supabase.from(TABLES.MESSAGES).insert([{
        targetPhone,
        text,
        date: new Date().toLocaleDateString('fa-AF'),
        isRead: false
      }]);
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'DELETE' | 'MESSAGE') => {
    if (action === 'MESSAGE' && !adminMessage) {
      alert("لطفاً متن پیام را بنویسید.");
      return;
    }

    setIsProcessing(true);
    try {
      let tableName = '';
      if (activeTab === 'ESTATE') tableName = TABLES.PROPERTIES;
      else if (activeTab === 'JOBS') tableName = TABLES.JOBS;
      else if (activeTab === 'SERVICES') tableName = TABLES.SERVICES;
      else if (selectedItem) {
          // اگر در حالت مودال هستیم و تب عوض شده، جدول را از روی نوع آیتم پیدا کن
          if (properties.some(p => p.id === id)) tableName = TABLES.PROPERTIES;
          else if (jobs.some(j => j.id === id)) tableName = TABLES.JOBS;
          else if (services.some(s => s.id === id)) tableName = TABLES.SERVICES;
      }

      if (action === 'DELETE') {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        
        if (adminMessage) {
          await sendMessageToUser(selectedItem.phoneNumber, `آگهی شما با عنوان "${selectedItem.title}" به دلیل زیر رد شد: ${adminMessage}`);
        }

        setProperties(prev => prev.filter(it => it.id !== id));
        setJobs(prev => prev.filter(it => it.id !== id));
        setServices(prev => prev.filter(it => it.id !== id));
        
        alert("آگهی حذف شد.");
        setSelectedItem(null);
      } else if (action === 'APPROVE') {
        const { error } = await supabase.from(tableName).update({ status: 'APPROVED' }).eq('id', id);
        if (error) throw error;
        
        await sendMessageToUser(selectedItem.phoneNumber, `تبریک! آگهی شما با عنوان "${selectedItem.title}" تایید و منتشر شد.`);

        const updateState = (list: any[]) => list.map(it => it.id === id ? { ...it, status: 'APPROVED' } : it);
        setProperties(updateState(properties));
        setJobs(updateState(jobs));
        setServices(updateState(services));
        
        alert("آگهی تایید شد.");
        setSelectedItem(null);
      } else if (action === 'MESSAGE') {
        await sendMessageToUser(selectedItem.phoneNumber, adminMessage);
        alert("پیام با موفقیت برای کاربر ارسال شد.");
        setAdminMessage('');
      }
    } catch (err) {
      alert("خطا در عملیات.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username || !newAdmin.password) return;
    const admin: AdminUser = {
      id: 'admin_' + Date.now(),
      username: newAdmin.username,
      password: newAdmin.password,
      fullName: newAdmin.fullName,
      role: 'NORMAL'
    };
    setAdmins([...admins, admin]);
    setNewAdmin({ username: '', password: '', fullName: '' });
    alert("ادمین جدید با موفقیت اضافه شد.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.old !== currentAdmin.password) {
      alert("رمز عبور فعلی اشتباه است.");
      return;
    }
    const updated = { ...currentAdmin, password: passwordForm.new };
    setCurrentAdmin(updated);
    setAdmins(admins.map(a => a.id === currentAdmin.id ? updated : a));
    setPasswordForm({ old: '', new: '' });
    alert("رمز عبور با موفقیت تغییر یافت.");
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'ESTATE', label: 'املاک', icon: Home },
    { id: 'JOBS', label: 'استخدام', icon: Briefcase },
    { id: 'SERVICES', label: 'خدمات', icon: Wrench },
    { id: 'USERS', label: 'کاربران', icon: Users },
    { id: 'ADMINS', label: 'ادمین‌ها', icon: Shield, superOnly: true },
    { id: 'PROFILE', label: 'تنظیمات', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden" dir="rtl">
      <header className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center z-50 shadow-xl shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-red-500" />
          <h1 className="text-sm font-black uppercase tracking-widest">پنل مدیریت Khana</h1>
        </div>
        <button onClick={onExit} className="bg-red-600 px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-red-900/40 active:scale-95 transition-all">خروج</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar w-full md:w-64 bg-white border-b md:border-l p-2 md:p-4 gap-2 shrink-0 shadow-md md:shadow-xl scroll-smooth flex-nowrap">
           {navItems.map((item) => (
             (!item.superOnly || currentAdmin.role === 'SUPER') && (
               <button 
                 key={item.id} 
                 onClick={() => setActiveTab(item.id as any)} 
                 className={`flex-none md:flex-none flex items-center justify-center md:justify-start gap-3 px-6 md:px-5 py-3 md:py-4 rounded-xl md:rounded-[1.2rem] font-black transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-[#a62626] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
               >
                 <item.icon size={18} /> 
                 <span className="text-[11px] md:text-sm">{item.label}</span>
               </button>
             )
           ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar bg-[#FDFEFF] pb-24">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'DASHBOARD' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border shadow-sm text-center">
                    <FileText className="text-blue-500 mx-auto mb-2" size={28} />
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">کل آگهی‌ها</span>
                    <span className="text-2xl md:text-3xl font-black">{stats.totalPosts}</span>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border shadow-sm text-center">
                    <AlertCircle className="text-amber-500 mx-auto mb-2" size={28} />
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">در انتظار تایید</span>
                    <span className="text-2xl md:text-3xl font-black text-amber-600">{stats.pendingPosts}</span>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border shadow-sm text-center">
                    <Check className="text-green-500 mx-auto mb-2" size={28} />
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">تایید شده</span>
                    <span className="text-2xl md:text-3xl font-black text-green-600">{stats.approvedCount}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'USERS' && (
              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <h2 className="text-lg md:text-xl font-black">آمار و مدیریت کاربران</h2>
                    <div className="relative">
                       <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                       <input 
                         type="text" 
                         placeholder="جستجوی شماره تلفن..." 
                         value={userSearchTerm}
                         onChange={(e) => setUserSearchTerm(e.target.value)}
                         className="bg-gray-100 border-none rounded-xl pr-10 pl-4 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#a62626] transition-all w-full md:w-64"
                       />
                    </div>
                 </div>
                 <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <table className="w-full text-right text-xs">
                       <thead className="bg-gray-50 border-b">
                          <tr>
                             <th className="px-4 py-4 font-black text-gray-400 uppercase">شماره تماس</th>
                             <th className="px-4 py-4 font-black text-gray-400 uppercase text-center">املاک</th>
                             <th className="px-4 py-4 font-black text-gray-400 uppercase text-center">استخدام</th>
                             <th className="px-4 py-4 font-black text-gray-400 uppercase text-center">خدمات</th>
                             <th className="px-4 py-4 font-black text-gray-400 uppercase text-center">مجموع آگهی</th>
                             <th className="px-4 py-4 font-black text-gray-400 uppercase"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {userStats.length > 0 ? userStats.map((user, idx) => (
                             <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-4 font-black text-gray-800">{user.phone}</td>
                                <td className="px-4 py-4 text-center font-bold text-gray-500">{user.propertyCount}</td>
                                <td className="px-4 py-4 text-center font-bold text-gray-500">{user.jobCount}</td>
                                <td className="px-4 py-4 text-center font-bold text-gray-500">{user.serviceCount}</td>
                                <td className="px-4 py-4 text-center">
                                   <span className="bg-red-50 text-[#a62626] px-2 py-1 rounded-lg font-black">{user.total}</span>
                                </td>
                                <td className="px-4 py-4 text-left">
                                   <button 
                                     onClick={() => {
                                         // جستجوی شماره در بخش‌های دیگر
                                         alert(`کاربر ${user.phone} دارای ${user.total} آگهی است.`);
                                     }}
                                     className="text-gray-300 hover:text-[#a62626]"
                                   >
                                      <ChevronLeft size={18} />
                                   </button>
                                </td>
                             </tr>
                          )) : (
                             <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-gray-300 font-bold">هیچ کاربری یافت نشد</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}

            {['ESTATE', 'JOBS', 'SERVICES'].includes(activeTab) && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-lg md:text-xl font-black">مدیریت {activeTab === 'ESTATE' ? 'املاک' : activeTab === 'JOBS' ? 'استخدام' : 'خدمات'}</h2>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setStatusFilter('PENDING')} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black transition-all ${statusFilter === 'PENDING' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-500'}`}>در انتظار</button>
                      <button onClick={() => setStatusFilter('APPROVED')} className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-[10px] font-black transition-all ${statusFilter === 'APPROVED' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>تایید شده</button>
                    </div>
                 </div>
                 <div className="grid gap-3">
                   {(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services)
                     .filter(it => it.status === statusFilter)
                     .map(item => (
                       <div key={item.id} onClick={() => { setSelectedItem(item); setActiveImageIdx(0); setAdminMessage(''); }} className="bg-white rounded-2xl p-3 md:p-4 border flex items-center gap-3 md:gap-4 transition-all hover:border-[#a62626]/30 cursor-pointer group shadow-sm">
                          <img src={item.images?.[0]} className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover bg-gray-100 group-hover:scale-105 transition-transform" />
                          <div className="flex-1">
                             <h3 className="font-black text-xs md:text-sm truncate text-gray-800">{item.title}</h3>
                             <p className="text-[9px] md:text-[10px] text-gray-400 font-bold">{item.city} | {item.phoneNumber}</p>
                          </div>
                          <ChevronLeft size={18} className="text-gray-300 group-hover:text-[#a62626] transition-colors" />
                       </div>
                     ))}
                 </div>
              </div>
            )}

            {activeTab === 'ADMINS' && currentAdmin.role === 'SUPER' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm">
                   <div className="flex items-center gap-3 mb-6">
                      <UserPlus className="text-red-600" size={24} />
                      <h2 className="text-xl font-black">افزودن مدیر جدید</h2>
                   </div>
                   <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="نام و نام خانوادگی" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="bg-gray-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
                      <input type="text" placeholder="نام کاربری" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="bg-gray-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
                      <input type="password" placeholder="رمز عبور" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="bg-gray-50 border rounded-xl px-4 py-3 text-sm font-bold outline-none" required />
                      <button type="submit" className="bg-[#a62626] text-white py-3 rounded-xl font-black text-sm shadow-lg">ثبت مدیر</button>
                   </form>
                </div>

                <div className="space-y-4">
                   <h2 className="text-xl font-black px-2">لیست مدیران سیستم</h2>
                   <div className="grid gap-3">
                      {admins.map(admin => (
                        <div key={admin.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
                           <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${admin.role === 'SUPER' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}><User size={24} /></div>
                              <div>
                                 <h3 className="font-black text-sm">{admin.fullName}</h3>
                                 <span className="text-[10px] text-gray-400 font-bold uppercase">{admin.username} | {admin.role}</span>
                              </div>
                           </div>
                           {admin.id !== currentAdmin.id && admin.role !== 'SUPER' && (
                              <button onClick={() => setAdmins(admins.filter(a => a.id !== admin.id))} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                           )}
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'PROFILE' && (
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm max-w-xl mx-auto animate-in fade-in slide-in-from-bottom duration-300">
                 <div className="flex items-center gap-3 mb-8">
                    <Lock className="text-[#a62626]" size={24} />
                    <h2 className="text-xl font-black">تغییر رمز عبور</h2>
                 </div>
                 <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                       <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">رمز عبور فعلی</label>
                       <input type="password" value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-4 py-4 text-sm font-bold outline-none" required />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">رمز عبور جدید</label>
                       <input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-gray-50 border rounded-xl px-4 py-4 text-sm font-bold outline-none" required />
                    </div>
                    <button type="submit" className="w-full bg-[#a62626] text-white py-4 rounded-xl font-black text-sm shadow-xl shadow-red-900/10">بروزرسانی رمز عبور</button>
                 </form>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[12000] bg-black/90 flex items-center justify-center p-0 md:p-6 backdrop-blur-md animate-in fade-in duration-200" onClick={() => !isProcessing && setSelectedItem(null)}>
          <div className="bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] md:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            <div className="w-full md:w-1/2 h-[35vh] md:h-full bg-black relative flex items-center justify-center shrink-0">
               {selectedItem.images && selectedItem.images.length > 0 ? (
                 <>
                   <img src={selectedItem.images[activeImageIdx]} className="w-full h-full object-contain" />
                   {selectedItem.images.length > 1 && (
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4 no-scrollbar">
                       {selectedItem.images.map((img: string, idx: number) => (
                         <button key={idx} onClick={() => setActiveImageIdx(idx)} className={`w-10 h-10 md:w-12 md:h-12 rounded-lg border-2 shrink-0 transition-all ${idx === activeImageIdx ? 'border-red-500 scale-110 shadow-lg' : 'border-white/20'}`}>
                           <img src={img} className="w-full h-full object-cover rounded-md" />
                         </button>
                       ))}
                     </div>
                   )}
                   <span className="absolute top-4 right-4 bg-black/50 text-white text-[9px] font-black px-3 py-1.5 rounded-full backdrop-blur-md">
                     تصویر {activeImageIdx + 1} از {selectedItem.images.length}
                   </span>
                 </>
               ) : (
                 <div className="text-gray-500 flex flex-col items-center gap-2"><Eye size={48} /><span>تصویری ندارد</span></div>
               )}
            </div>

            <div className="flex-1 flex flex-col h-full bg-white relative">
               <div className="p-4 md:p-6 border-b flex justify-between items-center bg-gray-50">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-[#a62626]" />
                    <h2 className="font-black text-xs md:text-sm text-gray-800">بررسی کامل جزئیات</h2>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 bg-white rounded-full hover:bg-gray-100 shadow-sm transition-all"><X size={24} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar space-y-5 md:space-y-6">
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-gray-900 leading-tight mb-2">{selectedItem.title}</h3>
                    <div className="flex gap-2 text-[10px] font-black">
                      <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg flex items-center gap-1"><MapPin size={10} /> {selectedItem.city}</span>
                      <span className="bg-gray-50 text-gray-500 px-3 py-1 rounded-lg">{selectedItem.type || 'بدون نوع'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-gray-50 p-3 md:p-4 rounded-2xl border border-gray-100">
                       <span className="text-[9px] md:text-[10px] font-black text-gray-400 block uppercase mb-1">قیمت / حقوق</span>
                       <span className="text-sm md:text-lg font-black text-[#a62626]">{selectedItem.price?.toLocaleString() || selectedItem.salary?.toLocaleString() || 'توافقی'} AFN</span>
                    </div>
                    <div className="bg-gray-50 p-3 md:p-4 rounded-2xl border border-gray-100">
                       <span className="text-[9px] md:text-[10px] font-black text-gray-400 block uppercase mb-1">شماره کاربر</span>
                       <div className="flex items-center gap-2">
                          <Phone size={12} className="text-green-600" />
                          <span className="text-sm md:text-lg font-black text-gray-800 tracking-wider">{selectedItem.phoneNumber}</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">توضیحات کاربر:</span>
                    <p className="text-xs md:text-sm font-medium text-gray-700 leading-7 bg-amber-50/30 p-3 md:p-4 rounded-2xl border border-amber-100/50">{selectedItem.description || 'توضیحاتی ندارد.'}</p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-dashed border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-blue-500" />
                          <span className="text-[10px] font-black text-gray-800">ارسال پیام / دلیل رد آگهی</span>
                       </div>
                       <button 
                         onClick={() => handleAction(selectedItem.id, 'MESSAGE')}
                         disabled={isProcessing || !adminMessage}
                         className="flex items-center gap-1.5 text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                       >
                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          ارسال پیام
                       </button>
                    </div>
                    <textarea 
                      value={adminMessage} 
                      onChange={e => setAdminMessage(e.target.value)}
                      placeholder="پیامی برای کاربر بنویسید..."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-3 md:p-4 text-xs md:text-sm font-bold outline-none focus:border-blue-300 transition-all resize-none"
                      rows={3}
                    />
                  </div>
               </div>

               <div className="p-4 md:p-6 border-t bg-gray-50 flex gap-3 md:gap-4 shrink-0">
                  {selectedItem.status === 'PENDING' ? (
                    <>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'APPROVE')} className="flex-[2] bg-green-600 text-white py-3 md:py-4.5 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 md:gap-3 active:scale-95 text-sm md:text-base">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Check size={20} />} تایید
                      </button>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'DELETE')} className="flex-1 bg-red-50 text-red-600 py-3 md:py-4.5 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 md:gap-3 border border-red-100 text-sm md:text-base">
                        <Trash2 size={20} /> رد
                      </button>
                    </>
                  ) : (
                    <>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'MESSAGE')} className="flex-[2] bg-blue-600 text-white py-3 md:py-4.5 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 md:gap-3 shadow-lg text-sm md:text-base">
                        <MessageSquare size={20} /> ارسال پیام نهایی
                      </button>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'DELETE')} className="flex-1 bg-red-50 text-red-600 py-3 md:py-4.5 rounded-xl md:rounded-2xl font-black flex items-center justify-center border border-red-100 text-sm md:text-base">
                        <Trash2 size={20} /> حذف
                      </button>
                    </>
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
