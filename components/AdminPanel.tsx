
import React, { useState, useEffect } from 'react';
import { Property, Job, Service } from '../types';
import { Trash2, Home, Shield, FileText, LayoutDashboard, Key, Briefcase, Wrench, CheckCircle, XCircle, MessageSquare, Eye, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'ADMINS' | 'PROFILE'>('DASHBOARD');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  
  const [systemAdmins, setSystemAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', fullName: '', role: 'NORMAL' });
  const [changePwd, setChangePwd] = useState({ old: '', new: '', confirm: '' });

  const currentAdmin = JSON.parse(localStorage.getItem('current_admin_user') || '{}');

  const fetchAdmins = async () => {
    const { data } = await supabase.from('system_admins').select('*');
    setSystemAdmins(data || []);
  };

  useEffect(() => {
    if (activeTab === 'ADMINS') fetchAdmins();
  }, [activeTab]);

  useEffect(() => {
    // Reset image index when selecting a new item
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
    const { error } = await supabase.from('system_admins').insert([newAdmin]);
    if (!error) {
      alert("ادمین اضافه شد");
      setNewAdmin({ username: '', password: '', fullName: '', role: 'NORMAL' });
      fetchAdmins();
    } else {
      alert("خطا: احتمالا نام کاربری تکراری است");
    }
    setIsProcessing(false);
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
      <header className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0 shadow-lg">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-red-500 animate-pulse" />
          <h1 className="text-sm font-black uppercase tracking-wider">مدیریت خانه افغانستان</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-white">{currentAdmin.fullName}</span>
              <span className="text-[8px] text-gray-500 uppercase">{currentAdmin.role} ADMIN</span>
           </div>
           <button onClick={onExit} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-[10px] font-black transition-colors">خروج از پنل</button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-l p-4 flex md:flex-col gap-2 overflow-x-auto shrink-0 shadow-sm z-10">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400'}`}><LayoutDashboard size={20}/> داشبورد آمار</button>
           <button onClick={() => setActiveTab('ESTATE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ESTATE' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400'}`}><Home size={20}/> املاک ({properties.length})</button>
           <button onClick={() => setActiveTab('JOBS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'JOBS' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400'}`}><Briefcase size={20}/> مشاغل ({jobs.length})</button>
           <button onClick={() => setActiveTab('SERVICES')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'SERVICES' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400'}`}><Wrench size={20}/> خدمات ({services.length})</button>
           {currentAdmin.role === 'SUPER' && <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ADMINS' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400'}`}><Shield size={20}/> مدیریت تیم</button>}
           <button onClick={() => setActiveTab('PROFILE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'PROFILE' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400'}`}><Key size={20}/> تغییر رمز</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-gray-50/50">
          {activeTab === 'DASHBOARD' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><FileText size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">آگهی‌های املاک</span>
                      <span className="text-4xl font-black text-gray-800">{properties.length}</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><Briefcase size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">فرصت‌های شغلی</span>
                      <span className="text-4xl font-black text-gray-800">{jobs.length}</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center">
                      <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4"><Wrench size={32} /></div>
                      <span className="text-gray-400 text-[10px] font-black uppercase">لیست خدمات</span>
                      <span className="text-4xl font-black text-gray-800">{services.length}</span>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'ADMINS' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
               <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
                  <h3 className="font-black mb-4 flex items-center gap-2"><Plus className="text-green-600" /> افزودن ادمین جدید</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                     <input type="text" placeholder="نام کامل" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="bg-gray-50 border p-3 rounded-xl text-sm font-bold" />
                     <input type="text" placeholder="نام کاربری" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="bg-gray-50 border p-3 rounded-xl text-sm font-bold dir-ltr" />
                     <input type="password" placeholder="رمز عبور" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="bg-gray-50 border p-3 rounded-xl text-sm font-bold dir-ltr" />
                     <button onClick={handleAddAdmin} disabled={isProcessing} className="bg-gray-900 text-white p-3 rounded-xl font-black text-sm">ثبت ادمین</button>
                  </div>
               </div>
               <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                     <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase">
                        <tr><th className="p-4">نام</th><th className="p-4">یوزرنیم</th><th className="p-4">نقش</th><th className="p-4">عملیات</th></tr>
                     </thead>
                     <tbody className="divide-y text-sm font-bold">
                        {systemAdmins.map((adm, i) => (
                          <tr key={i}>
                            <td className="p-4">{adm.fullName}</td>
                            <td className="p-4 dir-ltr">{adm.username}</td>
                            <td className="p-4">{adm.role}</td>
                            <td className="p-4 text-red-600"><Trash2 size={16} /></td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-6 animate-in fade-in">
               <h3 className="font-black text-xl text-center">تنظیمات امنیت و رمز</h3>
               <div className="space-y-4">
                  <input type="password" placeholder="رمز فعلی" value={changePwd.old} onChange={e => setChangePwd({...changePwd, old: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-bold dir-ltr" />
                  <input type="password" placeholder="رمز جدید" value={changePwd.new} onChange={e => setChangePwd({...changePwd, new: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-bold dir-ltr" />
                  <input type="password" placeholder="تایید رمز جدید" value={changePwd.confirm} onChange={e => setChangePwd({...changePwd, confirm: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-bold dir-ltr" />
                  <button onClick={handleChangePassword} disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform">بروزرسانی رمز</button>
               </div>
            </div>
          )}

          {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
            <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
               {(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services).map((item: any) => (
                 <div key={item.id} onClick={() => setSelectedItem({...item, typeTab: activeTab})} className="bg-white p-5 rounded-[2rem] border shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-5">
                       <img src={item.images[0]} className="w-16 h-16 rounded-2xl object-cover" />
                       <div>
                          <h4 className="font-black text-base text-gray-800">{item.title}</h4>
                          <span className={`text-[10px] px-3 py-1 rounded-xl font-black ${item.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : item.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {item.status}
                          </span>
                       </div>
                    </div>
                    <Eye size={20} className="text-gray-300" />
                 </div>
               ))}
            </div>
          )}
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[9500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedItem(null)}>
           <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                 <h3 className="font-black text-lg">بررسی جزئیات آگهی</h3>
                 <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"><XCircle size={28} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 no-scrollbar">
                 {/* بخش تصاویر اصلاح شده */}
                 <div className="space-y-4">
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-900 shadow-xl border-4 border-white">
                        <img 
                          src={selectedItem.images[activeImgIdx]} 
                          className="w-full h-full object-contain" // نمایش کامل عکس بدون برش
                          alt="Ad" 
                        />
                        {selectedItem.images.length > 1 && (
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
                    
                    {/* گالری تصاویر کوچک */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                       {selectedItem.images.map((img:string, idx:number) => (
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
                       <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-1">
                          <span className="text-[10px] font-black text-gray-400">اطلاعات تماس مالک</span>
                          <span className="text-lg font-black text-gray-800" dir="ltr">{selectedItem.phoneNumber}</span>
                          <span className="text-[11px] font-bold text-gray-500">{selectedItem.city} - {selectedItem.address}</span>
                       </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-100 space-y-4 shadow-inner self-start">
                       <h5 className="text-sm font-black flex items-center gap-2 text-blue-700"><MessageSquare size={18}/> ارسال پیام سیستمی به کاربر</h5>
                       <textarea 
                         value={adminMsg} 
                         onChange={e => setAdminMsg(e.target.value)} 
                         placeholder="دلیل رد یا پیام راهنما..." 
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
                    // @ts-ignore - Explicitly cast arguments from 'any' state to string to prevent type mismatch errors
                    onClick={() => handleUpdateStatus(String(selectedItem.id), String(selectedItem.typeTab === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.typeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES), 'APPROVED')} 
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-all"
                 >
                    <CheckCircle size={22}/> تایید و انتشار
                 </button>
                 <button 
                    // @ts-ignore - Explicitly cast arguments from 'any' state to string to prevent type mismatch errors
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
                    title="حذف دائمی"
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
