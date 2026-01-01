
import React, { useState, useEffect } from 'react';
import { Property, Job, Service } from '../types';
import { Trash2, Home, Shield, FileText, LayoutDashboard, Plus, Key, Briefcase, Wrench } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  const handleDeleteItem = async (id: string, type: 'ESTATE' | 'JOBS' | 'SERVICES') => {
    if (!window.confirm("حذف دائمی این مورد؟")) return;
    setIsProcessing(true);
    try {
      let table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (!error) {
        if (type === 'ESTATE') setProperties(prev => prev.filter(p => p.id !== id));
        if (type === 'JOBS') setJobs(prev => prev.filter(j => j.id !== id));
        if (type === 'SERVICES') setServices(prev => prev.filter(s => s.id !== id));
        alert("حذف شد");
      }
    } catch (e) {} finally { setIsProcessing(false); }
  };

  return (
    <div className="fixed inset-0 z-[9000] bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden" dir="rtl">
      <header className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-red-500" />
          <h1 className="text-sm font-black uppercase">پنل مدیریت</h1>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-bold text-gray-400">{currentAdmin.fullName}</span>
           <button onClick={onExit} className="bg-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black">خروج</button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-l p-4 flex md:flex-col gap-2 overflow-x-auto shrink-0 shadow-sm">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black shrink-0 ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><LayoutDashboard size={18}/> داشبورد</button>
           <button onClick={() => setActiveTab('ESTATE')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black shrink-0 ${activeTab === 'ESTATE' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><Home size={18}/> املاک</button>
           <button onClick={() => setActiveTab('JOBS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black shrink-0 ${activeTab === 'JOBS' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><Briefcase size={18}/> مشاغل</button>
           <button onClick={() => setActiveTab('SERVICES')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black shrink-0 ${activeTab === 'SERVICES' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><Wrench size={18}/> خدمات</button>
           {currentAdmin.role === 'SUPER' && <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black shrink-0 ${activeTab === 'ADMINS' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><Shield size={18}/> مدیریت ادمین</button>}
           <button onClick={() => setActiveTab('PROFILE')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-black shrink-0 ${activeTab === 'PROFILE' ? 'bg-red-600 text-white' : 'text-gray-400'}`}><Key size={18}/> تنظیمات رمز</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar">
          {activeTab === 'ADMINS' && (
            <div className="max-w-4xl mx-auto space-y-8">
               <div className="bg-white p-6 rounded-3xl border shadow-sm">
                  <h3 className="font-black mb-4 flex items-center gap-2"><Plus className="text-green-600" /> افزودن ادمین</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                     <input type="text" placeholder="نام" value={newAdmin.fullName} onChange={e => setNewAdmin({...newAdmin, fullName: e.target.value})} className="bg-gray-50 border p-3 rounded-xl text-sm font-bold" />
                     <input type="text" placeholder="یوزرنیم" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="bg-gray-50 border p-3 rounded-xl text-sm font-bold dir-ltr" />
                     <input type="password" placeholder="رمز" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="bg-gray-50 border p-3 rounded-xl text-sm font-bold dir-ltr" />
                     <button onClick={handleAddAdmin} disabled={isProcessing} className="bg-gray-900 text-white p-3 rounded-xl font-black text-sm">ثبت</button>
                  </div>
               </div>
               <div className="bg-white rounded-3xl border shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-right">
                     <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400">
                        <tr><th className="p-4">نام</th><th className="p-4">یوزرنیم</th><th className="p-4">نقش</th><th className="p-4">عملیات</th></tr>
                     </thead>
                     <tbody className="divide-y text-sm font-bold">
                        {systemAdmins.map((adm, i) => (
                          <tr key={i}>
                            <td className="p-4">{adm.fullName}</td>
                            <td className="p-4 dir-ltr">{adm.username}</td>
                            <td className="p-4">{adm.role}</td>
                            <td className="p-4"><button className="text-red-600"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'ESTATE' && (
             <div className="space-y-4">
               <h2 className="text-xl font-black mb-6">لیست کل املاک</h2>
               {properties.map(p => (
                 <div key={p.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover" />
                     <div>
                       <h4 className="font-black text-sm">{p.title}</h4>
                       <p className="text-[10px] text-gray-400">{p.phoneNumber}</p>
                     </div>
                   </div>
                   <button onClick={() => handleDeleteItem(p.id, 'ESTATE')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'JOBS' && (
             <div className="space-y-4">
               <h2 className="text-xl font-black mb-6">لیست کل آگهی‌های شغلی</h2>
               {jobs.map(j => (
                 <div key={j.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <img src={j.images[0]} className="w-12 h-12 rounded-lg object-cover" />
                     <div>
                       <h4 className="font-black text-sm">{j.title}</h4>
                       <p className="text-[10px] text-gray-400">{j.company}</p>
                     </div>
                   </div>
                   <button onClick={() => handleDeleteItem(j.id, 'JOBS')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'SERVICES' && (
             <div className="space-y-4">
               <h2 className="text-xl font-black mb-6">لیست کل خدمات</h2>
               {services.map(s => (
                 <div key={s.id} className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <img src={s.images[0]} className="w-12 h-12 rounded-lg object-cover" />
                     <div>
                       <h4 className="font-black text-sm">{s.title}</h4>
                       <p className="text-[10px] text-gray-400">{s.providerName}</p>
                     </div>
                   </div>
                   <button onClick={() => handleDeleteItem(s.id, 'SERVICES')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                 </div>
               ))}
             </div>
          )}

          {activeTab === 'PROFILE' && (
            <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-6">
               <h3 className="font-black text-xl text-center">تغییر رمز عبور</h3>
               <div className="space-y-4">
                  <input type="password" placeholder="رمز فعلی" value={changePwd.old} onChange={e => setChangePwd({...changePwd, old: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-bold dir-ltr" />
                  <input type="password" placeholder="رمز جدید" value={changePwd.new} onChange={e => setChangePwd({...changePwd, new: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-bold dir-ltr" />
                  <input type="password" placeholder="تکرار رمز جدید" value={changePwd.confirm} onChange={e => setChangePwd({...changePwd, confirm: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-sm font-bold dir-ltr" />
                  <button onClick={handleChangePassword} disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">بروزرسانی</button>
               </div>
            </div>
          )}

          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center">
                  <FileText className="text-blue-500 mx-auto mb-2" size={32} />
                  <span className="text-gray-400 text-[10px] font-black block uppercase">املاک</span>
                  <span className="text-3xl font-black">{properties.length}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center">
                  <Briefcase className="text-green-500 mx-auto mb-2" size={32} />
                  <span className="text-gray-400 text-[10px] font-black block uppercase">مشاغل</span>
                  <span className="text-3xl font-black">{jobs.length}</span>
                </div>
                <div className="bg-white p-8 rounded-[2rem] border shadow-sm text-center">
                  <Wrench className="text-orange-500 mx-auto mb-2" size={32} />
                  <span className="text-gray-400 text-[10px] font-black block uppercase">خدمات</span>
                  <span className="text-3xl font-black">{services.length}</span>
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default AdminPanel;
