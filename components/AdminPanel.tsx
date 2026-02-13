
import React, { useState, useEffect, useCallback } from 'react';
import { Property, Job, Service } from '../types';
import { 
  Home, Briefcase, Wrench, 
  Eye, ShieldCheck,
  X, MessageSquare, Send, Loader2, Package,
  Car, Smartphone, Sofa, ShoppingBag, HardHat,
  MapPin, Phone, Calendar, Layers, CheckCircle, Settings, UserPlus, Key, History, Clock
} from 'lucide-react';
import { supabase, TABLES } from '../services/supabaseClient';

interface AdminPanelProps {
  properties: Property[];
  jobs: Job[];
  services: Service[];
  onExit: () => void;
  currentAdmin?: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onExit, currentAdmin }) => {
  const [activeTab, setActiveTab] = useState<any>('ESTATE');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [data, setData] = useState<any>({ properties: [], jobs: [], services: [], general: [], users: [] });
  const [loading, setLoading] = useState(true);

  const [newAdminUser, setNewAdminUser] = useState({ username: '', password: '', full_name: '' });
  const [changePass, setChangePass] = useState({ old: '', new: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const isExpired = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    return diff > (60 * 24 * 60 * 60 * 1000); // 60 days
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles, props, jobRes, servRes, genRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from(TABLES.PROPERTIES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.JOBS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.SERVICES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.GENERAL_ADS).select('*').order('created_at', { ascending: false }),
      ]);
      setData({ 
        users: profiles.data || [], 
        properties: (props.data || []).map(x => ({ ...x, adType: 'ESTATE' })), 
        jobs: (jobRes.data || []).map(x => ({ ...x, adType: 'JOBS' })), 
        services: (servRes.data || []).map(x => ({ ...x, adType: 'SERVICES' })), 
        general: (genRes.data || []).map(x => ({ ...x, adType: 'GENERAL' })) 
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddAdmin = async () => {
    if (!newAdminUser.username || !newAdminUser.password) return alert("فیلدها را پر کنید.");
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('system_admins').insert([newAdminUser]);
      if (error) throw error;
      alert("مدیر جدید با موفقیت اضافه شد.");
      setNewAdminUser({ username: '', password: '', full_name: '' });
    } catch (e: any) { alert("خطا: " + e.message); } finally { setIsActionLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!changePass.new) return alert("رمز جدید را وارد کنید.");
    setIsActionLoading(true);
    try {
      const { error } = await supabase.from('system_admins')
        .update({ password: changePass.new })
        .eq('username', currentAdmin?.username || 'admin');
      if (error) throw error;
      alert("رمز عبور با موفقیت تغییر کرد.");
      setChangePass({ old: '', new: '' });
    } catch (e: any) { alert("خطا در تغییر رمز"); } finally { setIsActionLoading(false); }
  };

  const getItemsForTab = () => {
    if (activeTab === 'SETTINGS') return [];
    
    // منطق آگهی‌های منقضی
    if (activeTab === 'EXPIRED') {
      const allAds = [
        ...data.properties,
        ...data.jobs,
        ...data.services,
        ...data.general
      ];
      return allAds.filter(ad => isExpired(ad.created_at));
    }

    if (activeTab === 'ESTATE') return data.properties.filter((x:any) => !isExpired(x.created_at));
    if (activeTab === 'JOBS') return data.jobs.filter((x:any) => !isExpired(x.created_at));
    if (activeTab === 'SERVICES') return data.services.filter((x:any) => !isExpired(x.created_at));
    
    return data.general.filter((x: any) => x.mode === activeTab && !isExpired(x.created_at));
  };

  const menuItems = [
    { id: 'ESTATE', label: 'املاک', icon: Home },
    { id: 'VEHICLES', label: 'وسایل نقلیه', icon: Car },
    { id: 'DIGITAL', label: 'کالای دیجیتال', icon: Smartphone },
    { id: 'HOME_KITCHEN', label: 'خانه و آشپزخانه', icon: Sofa },
    { id: 'SERVICES', label: 'خدمات', icon: Wrench },
    { id: 'JOBS', label: 'استخدام', icon: Briefcase },
    { id: 'PERSONAL', label: 'وسایل شخصی', icon: ShoppingBag },
    { id: 'INDUSTRIAL', label: 'تجهیزات صنعتی', icon: HardHat },
    { id: 'OTHERS', label: 'سایر موارد', icon: Package },
    { id: 'EXPIRED', label: 'آگهی‌های منقضی', icon: History },
    { id: 'SETTINGS', label: 'تنظیمات سیستم', icon: Settings },
  ];

  const handleRenew = async (item: any) => {
    const table = item.adType === 'ESTATE' ? TABLES.PROPERTIES : item.adType === 'JOBS' ? TABLES.JOBS : item.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
    try {
      const { error } = await supabase.from(table).update({ 
        created_at: new Date().toISOString(),
        status: 'APPROVED' 
      }).eq('id', item.id);
      if (error) throw error;
      alert("آگهی با موفقیت تمدید و منتشر شد.");
      setSelectedItem(null);
      fetchData();
    } catch (e) { alert("خطا در تمدید آگهی"); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-[Vazirmatn] md:flex-row" dir="rtl">
       <aside className="w-full md:w-64 bg-gray-900 text-white p-6 space-y-1 md:h-full overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-3 mb-10"><ShieldCheck className="text-red-500" /><span className="font-black text-lg">پنل مدیریت</span></div>
          {menuItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)} 
              className={`w-full text-right p-3 rounded-xl flex items-center justify-between transition-all ${activeTab === item.id ? 'bg-red-600 shadow-lg shadow-red-900/20' : 'hover:bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18}/> 
                <span className="text-xs font-black">{item.label}</span>
              </div>
              {item.id === 'EXPIRED' && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-lg text-[10px]">
                  {[...data.properties, ...data.jobs, ...data.services, ...data.general].filter(x => isExpired(x.created_at)).length}
                </span>
              )}
            </button>
          ))}
          <div className="pt-8 mt-4 border-t border-gray-800">
            <button onClick={onExit} className="w-full text-center p-3 text-red-400 hover:bg-red-500/10 rounded-xl border border-red-900/50 transition-all font-black text-xs">خروج از پنل</button>
          </div>
       </aside>

       <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-black text-gray-800">
                {activeTab === 'SETTINGS' ? 'تنظیمات و مدیریت مدیران' : activeTab === 'EXPIRED' ? 'آگهی‌های منقضی شده (بالای ۶۰ روز)' : `مدیریت آگهی‌های ${menuItems.find(m => m.id === activeTab)?.label}`}
            </h1>
            {activeTab !== 'SETTINGS' && (
               <button onClick={fetchData} className="p-2 bg-white rounded-xl border text-gray-400 hover:text-red-600 transition-colors shadow-sm">
                 <Loader2 size={18} className={loading ? "animate-spin" : ""} />
               </button>
            )}
          </div>

          {activeTab === 'SETTINGS' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-6">
                  <div className="flex items-center gap-3 text-red-600 font-black mb-4">
                     <Key size={24} /> <h3>تغییر رمز عبور مدیر</h3>
                  </div>
                  <input type="password" placeholder="رمز عبور جدید" value={changePass.new} onChange={e => setChangePass({...changePass, new: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-black outline-none" />
                  <button onClick={handleChangePassword} disabled={isActionLoading} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg">بروزرسانی رمز</button>
               </div>
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-4">
                  <div className="flex items-center gap-3 text-blue-600 font-black mb-4">
                     <UserPlus size={24} /> <h3>افزودن مدیر جدید</h3>
                  </div>
                  <input type="text" placeholder="نام نمایشی" value={newAdminUser.full_name} onChange={e => setNewAdminUser({...newAdminUser, full_name: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-black outline-none" />
                  <input type="text" placeholder="نام کاربری (انگلیسی)" value={newAdminUser.username} onChange={e => setNewAdminUser({...newAdminUser, username: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-black outline-none" />
                  <input type="password" placeholder="رمز عبور" value={newAdminUser.password} onChange={e => setNewAdminUser({...newAdminUser, password: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-black outline-none" />
                  <button onClick={handleAddAdmin} disabled={isActionLoading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg">ثبت مدیر جدید</button>
               </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={48} className="animate-spin text-red-600" />
              <span className="font-black text-gray-400">در حال دریافت داده‌ها...</span>
            </div>
          ) : (
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-right text-[10px] font-black uppercase text-gray-400">
                    <th className="p-4">عنوان آگهی</th>
                    <th className="p-4">وضعیت</th>
                    <th className="p-4 hidden md:table-cell">تاریخ انقضا</th>
                    <th className="p-4 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {getItemsForTab().length === 0 ? (
                    <tr><td colSpan={4} className="p-12 text-center text-gray-300 font-black">آگهی یافت نشد.</td></tr>
                  ) : getItemsForTab().map((item: any) => {
                    const expired = isExpired(item.created_at);
                    return (
                      <tr key={item.id} className={`border-b transition-colors ${expired ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-black text-xs text-gray-800">{item.title}</span>
                            <span className="text-[9px] text-gray-400 mt-1">{item.phone_number || item.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black w-fit ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {item.status === 'APPROVED' ? 'تایید شده' : 'در انتظار'}
                             </span>
                             {expired && <span className="text-[7px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md w-fit">منقضی شده</span>}
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell text-[10px] font-bold text-gray-500">
                           {new Date(new Date(item.created_at).getTime() + (60 * 24 * 60 * 60 * 1000)).toLocaleDateString('fa-AF')}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => setSelectedItem(item)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"><Eye size={18}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
       </main>

       {selectedItem && (
         <div className="fixed inset-0 z-[12000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="bg-white w-full max-w-2xl h-[90vh] rounded-[2.5rem] flex flex-col overflow-hidden animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-5 border-b flex justify-between items-center bg-gray-50 shrink-0">
                  <h3 className="font-black text-sm">بررسی کامل جزئیات آگهی</h3>
                  <button onClick={() => {setSelectedItem(null); setAdminNote('');}} className="p-2 bg-white rounded-full hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"><X size={20}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                  <div className="flex flex-col md:flex-row gap-6 p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                     <div className="w-full md:w-48 h-48 bg-gray-200 rounded-2xl overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        {selectedItem.images?.[0] ? <img src={selectedItem.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-black">بدون تصویر</div>}
                     </div>
                     <div className="text-right space-y-3 flex-1">
                        <div className="flex justify-between items-start">
                           <h4 className="font-black text-lg text-gray-900">{selectedItem.title}</h4>
                           {isExpired(selectedItem.created_at) && <span className="bg-red-600 text-white text-[9px] px-2 py-1 rounded-md font-black">منقضی</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                           <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1"><MapPin size={10}/> {selectedItem.city}</span>
                           <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1"><Phone size={10}/> {selectedItem.phone_number || selectedItem.phoneNumber}</span>
                           <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1"><CheckCircle size={10}/> {Number(selectedItem.price || selectedItem.salary || 0).toLocaleString()} AFN</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-6 font-medium bg-white/50 p-3 rounded-xl border border-gray-100">{selectedItem.description}</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {selectedItem.adType === 'ESTATE' && (
                        <>
                           <div className="bg-white p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-sm"><Layers size={16} className="text-red-600"/><span className="text-[9px] text-gray-400 font-black uppercase">مساحت</span><span className="text-xs font-black">{selectedItem.area} متر</span></div>
                           <div className="bg-white p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-sm"><Home size={16} className="text-red-600"/><span className="text-[9px] text-gray-400 font-black uppercase">اتاق</span><span className="text-xs font-black">{selectedItem.bedrooms}</span></div>
                           <div className="bg-white p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-sm"><Calendar size={16} className="text-red-600"/><span className="text-[9px] text-gray-400 font-black uppercase">سال ساخت</span><span className="text-xs font-black">{selectedItem.build_year || 'نامشخص'}</span></div>
                        </>
                     )}
                     {selectedItem.adType === 'JOBS' && (
                        <div className="col-span-full bg-white p-4 rounded-2xl border flex items-center gap-4 shadow-sm"><Briefcase size={20} className="text-blue-600"/><div><span className="text-[9px] text-gray-400 font-black uppercase block">شرکت / کارفرما</span><span className="text-xs font-black">{selectedItem.company}</span></div></div>
                     )}
                     {selectedItem.adType === 'SERVICES' && (
                        <>
                           <div className="bg-white p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-sm"><Wrench size={16} className="text-orange-600"/><span className="text-[9px] text-gray-400 font-black uppercase">نام متخصص</span><span className="text-xs font-black">{selectedItem.providerName || selectedItem.provider_name}</span></div>
                           <div className="bg-white p-4 rounded-2xl border flex flex-col items-center gap-1 shadow-sm"><CheckCircle size={16} className="text-orange-600"/><span className="text-[9px] text-gray-400 font-black uppercase">سابقه</span><span className="text-xs font-black">{selectedItem.experience}</span></div>
                        </>
                     )}
                  </div>
                  <div className="space-y-3 bg-red-50/50 p-6 rounded-[2.5rem] border border-red-100">
                     <label className="text-[10px] font-black text-red-900 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14}/> ارسال بازخورد به کاربر</label>
                     <div className="flex gap-2">
                        <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="دلیل رد یا اصلاح..." className="flex-1 bg-white border rounded-2xl p-4 text-xs font-bold resize-none h-24 outline-none focus:border-red-500 transition-all"></textarea>
                        <button onClick={async () => {
                          if (!adminNote.trim()) return;
                          setIsSendingNote(true);
                          await supabase.from(TABLES.USER_CHATS).insert([{
                            sender_phone: 'ADMIN',
                            receiver_phone: selectedItem.owner_id || selectedItem.ownerId || selectedItem.phone_number,
                            ad_id: selectedItem.id, ad_title: selectedItem.title, text: `بازخورد ادمین: ${adminNote}`, is_read: false
                          }]);
                          setAdminNote(''); setIsSendingNote(false); alert("ارسال شد.");
                        }} disabled={isSendingNote} className="bg-red-600 text-white w-14 rounded-2xl flex items-center justify-center shadow-lg"><Send size={20} className="rotate-180" /></button>
                     </div>
                  </div>

                  <div className={`grid ${isExpired(selectedItem.created_at) ? 'grid-cols-3' : 'grid-cols-2'} gap-4 pt-4 shrink-0 pb-6`}>
                    {isExpired(selectedItem.created_at) && (
                      <button onClick={() => handleRenew(selectedItem)} className="bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2">
                        <Clock size={18}/> تمدید (۶۰ روز)
                      </button>
                    )}
                    <button onClick={async () => {
                      const table = selectedItem.adType === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.adType === 'JOBS' ? TABLES.JOBS : selectedItem.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
                      await supabase.from(table).update({ status: 'APPROVED' }).eq('id', selectedItem.id);
                      setSelectedItem(null); fetchData();
                    }} className="bg-green-600 text-white py-4 rounded-2xl font-black shadow-lg">تایید انتشار</button>
                    <button onClick={async () => {
                      if(confirm('حذف دائمی؟')) {
                        const table = selectedItem.adType === 'ESTATE' ? TABLES.PROPERTIES : selectedItem.adType === 'JOBS' ? TABLES.JOBS : selectedItem.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
                        await supabase.from(table).delete().eq('id', selectedItem.id);
                        setSelectedItem(null); fetchData();
                      }
                    }} className="bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">حذف دائمی</button>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
export default AdminPanel;
