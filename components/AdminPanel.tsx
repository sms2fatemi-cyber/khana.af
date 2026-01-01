
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Property, Job, Service, AdminUser } from '../types';
import { Check, Trash2, Home, Briefcase, Wrench, Shield, X, FileText, AlertCircle, LayoutDashboard, ChevronLeft, ChevronRight, Loader2, Users, Search, Send, MessageSquare } from 'lucide-react';
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
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [admins] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('admins_list');
    return saved ? JSON.parse(saved) : initialAdmins;
  });
  
  const [currentAdmin] = useState<AdminUser>(() => {
    const saved = localStorage.getItem('current_admin_user');
    return saved ? JSON.parse(saved) : admins[0];
  });

  const nextImage = useCallback(() => {
    if (selectedItem?.images?.length > 1) {
      setActiveImageIdx(prev => (prev < selectedItem.images.length - 1 ? prev + 1 : 0));
    }
  }, [selectedItem]);

  const prevImage = useCallback(() => {
    if (selectedItem?.images?.length > 1) {
      setActiveImageIdx(prev => (prev > 0 ? prev - 1 : selectedItem.images.length - 1));
    }
  }, [selectedItem]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!selectedItem) return;
      if (e.key === 'ArrowRight') (document.dir === 'rtl' ? prevImage() : nextImage());
      if (e.key === 'ArrowLeft') (document.dir === 'rtl' ? nextImage() : prevImage());
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedItem, nextImage, prevImage]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) nextImage();
    if (isRightSwipe) prevImage();
  };

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
        if (localProfile) {
          try { profileData = JSON.parse(localProfile); } catch (e) {}
        }
        usersMap[phone] = { phone, total: 0, ...profileData };
      }
      usersMap[phone].total++;
    });
    return Object.values(usersMap).filter(u => u.phone.includes(userSearchTerm));
  }, [properties, jobs, services, userSearchTerm]);

  const handleAction = async (id: string, action: 'APPROVE' | 'DELETE' | 'MESSAGE') => {
    if (action === 'MESSAGE' && !adminMessage) return alert("متن پیام الزامی است.");
    
    setIsProcessing(true);
    try {
      let tableName = '';
      if (activeTab === 'ESTATE' || properties.some(p => p.id === id)) tableName = TABLES.PROPERTIES;
      else if (activeTab === 'JOBS' || jobs.some(j => j.id === id)) tableName = TABLES.JOBS;
      else if (activeTab === 'SERVICES' || services.some(s => s.id === id)) tableName = TABLES.SERVICES;

      if (!tableName && action !== 'MESSAGE') throw new Error("آگهی در سیستم یافت نشد.");

      if (action === 'DELETE') {
        if (!window.confirm("آیا از حذف دائمی این آگهی اطمینان دارید؟")) { setIsProcessing(false); return; }
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) throw error;
        
        setProperties(prev => prev.filter(it => it.id !== id));
        setJobs(prev => prev.filter(it => it.id !== id));
        setServices(prev => prev.filter(it => it.id !== id));
        alert("آگهی با موفقیت حذف شد.");
      } 
      else if (action === 'APPROVE') {
        const { error } = await supabase.from(tableName).update({ status: 'APPROVED' }).eq('id', id);
        if (error) throw error;
        
        const updateFn = (list: any[]) => list.map(it => it.id === id ? { ...it, status: 'APPROVED' } : it);
        if (tableName === TABLES.PROPERTIES) setProperties(updateFn);
        if (tableName === TABLES.JOBS) setJobs(updateFn);
        if (tableName === TABLES.SERVICES) setServices(updateFn);
        
        alert("آگهی تایید شد و اکنون برای عموم قابل مشاهده است.");
      } 
      else if (action === 'MESSAGE') {
        const phone = selectedItem?.phoneNumber;
        const { error } = await supabase.from(TABLES.MESSAGES).insert([{ 
          target_phone: phone, 
          text: adminMessage, 
          date: new Date().toLocaleDateString('fa-AF'), 
          is_read: false 
        }]);
        if (error) throw error;
        alert("پیام شما برای کاربر ارسال شد.");
        setAdminMessage('');
        return; 
      }
      setSelectedItem(null);
    } catch (err: any) {
      alert("خطا در انجام عملیات: " + (err.message || "ناموفق"));
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
      <header className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-red-500" />
          <h1 className="text-sm font-black uppercase tracking-widest">پنل مدیریت</h1>
        </div>
        <button onClick={onExit} className="bg-red-600 px-4 py-2 rounded-xl text-xs font-black">خروج</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="flex md:flex-col overflow-x-auto md:overflow-y-auto w-full md:w-64 bg-white border-b md:border-l p-2 md:p-4 gap-2 shrink-0 shadow-sm">
           {navItems.map((item) => (
             (!item.superOnly || currentAdmin.role === 'SUPER') && (
               <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex-none flex items-center gap-3 px-5 py-3 md:py-4 rounded-xl font-black transition-all ${activeTab === item.id ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                 <item.icon size={18} /> <span className="text-[11px] md:text-sm">{item.label}</span>
               </button>
             )
           ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'DASHBOARD' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {['ESTATE', 'JOBS', 'SERVICES'].includes(activeTab) && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-black">مدیریت آگهی‌ها</h2>
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                      <button onClick={() => setStatusFilter('PENDING')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'PENDING' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-500'}`}>در انتظار</button>
                      <button onClick={() => setStatusFilter('APPROVED')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'APPROVED' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}>تایید شده</button>
                    </div>
                 </div>
                 <div className="grid gap-3">
                   {(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services)
                     .filter(it => it.status === statusFilter)
                     .map(item => (
                       <div key={item.id} onClick={() => { setSelectedItem(item); setActiveImageIdx(0); }} className="bg-white rounded-2xl p-4 border flex items-center gap-4 hover:border-[#a62626]/30 cursor-pointer shadow-sm transition-all hover:shadow-md">
                          <img src={item.images?.[0]} className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" alt="" />
                          <div className="flex-1">
                             <h3 className="font-black text-sm text-gray-800 truncate">{item.title}</h3>
                             <p className="text-[10px] text-gray-400 font-bold">{item.city} | {item.phoneNumber}</p>
                          </div>
                          <ChevronLeft size={18} className="text-gray-300" />
                       </div>
                     ))}
                 </div>
              </div>
            )}

            {activeTab === 'USERS' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-black">لیست کاربران</h2>
                    <div className="relative">
                      <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
                      <input type="text" placeholder="جستجوی شماره..." value={userSearchTerm} onChange={e => setUserSearchTerm(e.target.value)} className="bg-gray-100 rounded-xl pr-10 pl-4 py-2 text-xs font-black outline-none border border-transparent focus:border-red-200" />
                    </div>
                 </div>
                 <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                    <table className="w-full text-right text-sm">
                       <thead className="bg-gray-50 border-b text-xs font-black text-gray-400">
                          <tr><th className="p-4 text-right">کاربر</th><th className="p-4 text-right">شماره تماس</th><th className="p-4 text-center">آگهی</th><th className="p-4"></th></tr>
                       </thead>
                       <tbody className="divide-y">
                          {allUsersList.map((user, idx) => (
                             <tr key={idx} className="hover:bg-gray-50">
                                <td className="p-4 font-black">{user.firstName} {user.lastName}</td>
                                <td className="p-4 font-black text-gray-500">{user.phone}</td>
                                <td className="p-4 text-center"><span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-black">{user.total}</span></td>
                                <td className="p-4 text-left"><ChevronLeft size={18} className="text-gray-300" /></td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[12000] bg-black/95 flex items-center justify-center p-2 md:p-4 backdrop-blur-md" onClick={() => !isProcessing && setSelectedItem(null)}>
          <div className="bg-white w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-slide-up" onClick={e => e.stopPropagation()}>
            <div 
              className="w-full md:w-1/2 h-[35vh] md:h-full bg-black shrink-0 flex items-center justify-center relative group overflow-hidden select-none touch-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
               <img src={selectedItem.images?.[activeImageIdx]} className="w-full h-full object-contain pointer-events-none" alt="" />
               
               {/* Controls for Desktop */}
               {selectedItem.images?.length > 1 && (
                 <>
                   <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full hover:bg-black/60 z-50"><ChevronRight size={24} /></button>
                   <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full hover:bg-black/60 z-50"><ChevronLeft size={24} /></button>
                 </>
               )}

               {/* Indicator Dots */}
               {selectedItem.images?.length > 1 && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 p-2 rounded-full z-50">
                   {selectedItem.images.map((_: any, i: number) => (
                     <button key={i} onClick={() => setActiveImageIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === activeImageIdx ? 'bg-red-600 scale-125' : 'bg-white/40'}`} />
                   ))}
                 </div>
               )}
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 bg-white relative">
               <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                  <h2 className="font-black text-sm text-gray-700">بررسی جزئیات آگهی</h2>
                  <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 no-scrollbar">
                  <h3 className="text-lg md:text-xl font-black text-gray-900 leading-relaxed">{selectedItem.title}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-4 rounded-2xl border">
                       <span className="text-[9px] font-black text-gray-400 block mb-1 uppercase">قیمت / معاش</span>
                       <span className="text-lg font-black text-red-600">{(selectedItem.price || selectedItem.salary)?.toLocaleString() || 'توافقی'}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border">
                       <span className="text-[9px] font-black text-gray-400 block mb-1 uppercase">شماره تماس</span>
                       <span className="text-lg font-black text-gray-800">{selectedItem.phoneNumber}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">توضیحات آگهی</span>
                    <p className="text-sm font-medium text-gray-700 leading-7 bg-gray-50 p-5 rounded-2xl border border-gray-100 whitespace-pre-wrap">{selectedItem.description}</p>
                  </div>
                  
                  <div className="pt-6 border-t border-dashed space-y-4">
                    <span className="text-[#a62626] font-black text-xs flex items-center gap-2"><MessageSquare size={16}/> ارسال پیام مستقیم به کاربر:</span>
                    <textarea value={adminMessage} onChange={e => setAdminMessage(e.target.value)} placeholder="مثلاً: آگهی شما به دلیل نقص در تصاویر رد شد..." className="w-full bg-gray-50 border rounded-2xl p-4 text-sm font-bold resize-none h-24 outline-none focus:border-blue-400 transition-all shadow-inner" />
                    <button onClick={() => handleAction(selectedItem.id, 'MESSAGE')} disabled={isProcessing || !adminMessage} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg active:scale-95 transition-all text-sm"><Send size={18}/> ارسال پیام به کاربر</button>
                  </div>
               </div>
               
               <div className="p-6 border-t bg-gray-50 flex gap-4 shrink-0">
                  {selectedItem.status === 'PENDING' ? (
                    <>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'APPROVE')} className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm">
                        {isProcessing ? <Loader2 className="animate-spin" /> : <Check size={20} />} تایید و انتشار
                      </button>
                      <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'DELETE')} className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2 border border-red-100 active:scale-95 transition-all text-sm">
                        <Trash2 size={20} /> حذف
                      </button>
                    </>
                  ) : (
                    <button disabled={isProcessing} onClick={() => handleAction(selectedItem.id, 'DELETE')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm">
                      <Trash2 size={20} /> حذف دائمی این آگهی
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
