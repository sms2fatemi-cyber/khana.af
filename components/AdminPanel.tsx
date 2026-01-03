
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Property, Job, Service } from '../types';
import { 
  Trash2, Home, LayoutDashboard, Briefcase, Wrench, 
  CheckCircle, MessageSquare, Eye, Users, Phone, 
  ShieldCheck, Loader2, Send, Clock, ChevronRight, 
  Search, User, Layers, UserCircle, BadgeCheck, Key, X,
  UserPlus, ShieldAlert, MapPin, ChevronLeft, Lock, Info,
  TrendingUp, FileText
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
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'USERS' | 'ADMINS' | 'PASSWORD'>('DASHBOARD');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [systemAdmins, setSystemAdmins] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', full_name: '', role: 'NORMAL' });
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // اسکرول خودکار به انتهای پیام‌ها
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatHistory.length > 0) {
      scrollToBottom();
    }
  }, [chatHistory]);

  const fetchData = useCallback(async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('*');
      setAllUsers(profiles || []);
      const { data: admins } = await supabase.from('system_admins').select('*');
      setSystemAdmins(admins || []);
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, fetchData]);

  const nextImg = useCallback(() => {
    if (!selectedItem?.images || selectedItem.images.length <= 1) return;
    setActiveImgIdx(prev => (prev + 1) % selectedItem.images.length);
  }, [selectedItem]);

  const prevImg = useCallback(() => {
    if (!selectedItem?.images || selectedItem.images.length <= 1) return;
    setActiveImgIdx(prev => (prev - 1 + selectedItem.images.length) % selectedItem.images.length);
  }, [selectedItem]);

  const stats = useMemo(() => {
    const totalUsers = allUsers.length;
    const totalAds = properties.length + jobs.length + services.length;
    const pendingAds = properties.filter(p => p.status === 'PENDING').length + 
                     jobs.filter(j => j.status === 'PENDING').length + 
                     services.filter(s => s.status === 'PENDING').length;
    const activeUsers = allUsers.filter(u => {
      return properties.some(p => p.ownerId === u.phone) || 
             jobs.some(j => j.ownerId === u.phone) || 
             services.some(s => s.ownerId === u.phone);
    }).length;

    return { totalUsers, totalAds, pendingAds, activeUsers };
  }, [allUsers, properties, jobs, services]);

  const handleStatusUpdate = async (id: string, table: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
      setSelectedItem(null);
      fetchData();
    } catch (e: any) { alert("خطا: " + e.message); } finally { setIsProcessing(false); }
  };

  const handleDeleteItem = async (id: string, table: string) => {
    if (!window.confirm("آیا از حذف دائمی این آگهی مطمئن هستید؟")) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setSelectedItem(null);
      fetchData();
    } catch (e: any) { alert("خطا در حذف: " + e.message); } finally { setIsProcessing(false); }
  };

  const handleSendAdminMessage = async (targetPhone: string) => {
    if (!adminMsg.trim()) return;
    setIsProcessing(true);
    try {
      await supabase.from(TABLES.MESSAGES).insert([{ 
        target_phone: targetPhone, 
        text: adminMsg.trim(), 
        is_read: false, 
        date: new Date().toISOString() 
      }]);
      const newMsg = { text: adminMsg.trim(), date: new Date().toISOString() };
      setChatHistory(prev => [...prev, newMsg]);
      setAdminMsg('');
      alert("ارسال شد.");
    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
  };

  const fetchChatHistory = async (phone: string) => {
    setIsLoadingChats(true);
    const { data } = await supabase.from(TABLES.MESSAGES).select('*').eq('target_phone', phone).order('date', { ascending: true });
    setChatHistory(data || []);
    setIsLoadingChats(false);
  };

  const getUserAdsCount = (phone: string) => {
    return properties.filter(p => p.ownerId === phone).length + 
           jobs.filter(j => j.ownerId === phone).length + 
           services.filter(s => s.ownerId === phone).length;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 font-[Vazirmatn] overflow-hidden" dir="rtl">
       
       {/* Sidebar */}
       <div className="w-full md:w-72 bg-gray-900 text-white flex flex-col shrink-0 md:h-full z-[100]">
         <div className="p-6 md:p-8 border-b border-gray-800 flex items-center justify-between md:justify-start gap-3 shrink-0">
           <div className="flex items-center gap-3"><ShieldCheck className="text-red-500" size={32} /><span className="font-black text-lg">پنل مدیریت</span></div>
           <button onClick={onExit} className="md:hidden text-xs bg-red-600 px-3 py-1.5 rounded-lg font-black">خروج</button>
         </div>
         <nav className="flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar p-4 md:p-6 space-x-2 md:space-x-0 md:space-y-3 flex-1">
           <button onClick={() => {setActiveTab('DASHBOARD'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><LayoutDashboard size={20} /> پیشخوان</button>
           <button onClick={() => {setActiveTab('ESTATE'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'ESTATE' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Home size={20} /> املاک</button>
           <button onClick={() => {setActiveTab('JOBS'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'JOBS' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Briefcase size={20} /> کاریابی</button>
           <button onClick={() => {setActiveTab('SERVICES'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'SERVICES' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Wrench size={20} /> خدمات</button>
           <button onClick={() => {setActiveTab('USERS'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'USERS' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Users size={20} /> کاربران</button>
           <button onClick={() => {setActiveTab('ADMINS'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'ADMINS' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><ShieldAlert size={20} /> ادمین‌ها</button>
           <button onClick={() => {setActiveTab('PASSWORD'); setSelectedUser(null);}} className={`whitespace-nowrap flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === 'PASSWORD' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}><Key size={20} /> تغییر رمز</button>
         </nav>
       </div>

       {/* Main Area */}
       <div className="flex-1 flex flex-col overflow-hidden relative">
         <div className="bg-white border-b px-8 py-4 flex items-center gap-8 overflow-x-auto no-scrollbar shrink-0 shadow-sm">
            <div className="flex items-center gap-3 shrink-0"><div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={18}/></div><div className="font-black text-xs text-gray-500">کل کاربران: <span className="text-gray-900">{stats.totalUsers}</span></div></div>
            <div className="flex items-center gap-3 shrink-0"><div className="w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><TrendingUp size={18}/></div><div className="font-black text-xs text-gray-500">فعال: <span className="text-gray-900">{stats.activeUsers}</span></div></div>
            <div className="flex items-center gap-3 shrink-0"><div className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><FileText size={18}/></div><div className="font-black text-xs text-gray-500">کل آگهی‌ها: <span className="text-gray-900">{stats.totalAds}</span></div></div>
            <div className="flex items-center gap-3 shrink-0"><div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Clock size={18}/></div><div className="font-black text-xs text-gray-500">در انتظار تایید: <span className="text-gray-900 font-black">{stats.pendingAds}</span></div></div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-gray-50 pb-32">
           {activeTab === 'DASHBOARD' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in zoom-in-95">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><BadgeCheck size={32}/></div>
                  <h3 className="text-gray-400 font-black text-[10px] uppercase">کاربران کل</h3>
                  <p className="text-3xl font-black text-gray-800">{stats.totalUsers}</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4"><Home size={32}/></div>
                  <h3 className="text-gray-400 font-black text-[10px] uppercase">املاک</h3>
                  <p className="text-3xl font-black text-gray-800">{properties.length}</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><Briefcase size={32}/></div>
                  <h3 className="text-gray-400 font-black text-[10px] uppercase">مشاغل</h3>
                  <p className="text-3xl font-black text-gray-800">{jobs.length}</p>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4"><Wrench size={32}/></div>
                  <h3 className="text-gray-400 font-black text-[10px] uppercase">خدمات</h3>
                  <p className="text-3xl font-black text-gray-800">{services.length}</p>
                </div>
             </div>
           )}

           {activeTab === 'USERS' && !selectedUser && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="relative">
                  <Search className="absolute right-6 top-5 text-gray-300"/>
                  <input type="text" placeholder="جستجوی نام یا شماره تماس..." className="w-full bg-white border-2 border-transparent focus:border-red-500 rounded-3xl py-5 pr-14 pl-6 font-bold outline-none shadow-sm transition-all" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {allUsers.filter(u => u.phone.includes(userSearch) || u.full_name?.includes(userSearch)).map(user => (
                    <div key={user.id} onClick={() => {setSelectedUser(user); fetchChatHistory(user.phone);}} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center gap-5 cursor-pointer hover:shadow-xl hover:border-red-100 transition-all group">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center border shrink-0">
                          {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover rounded-2xl"/> : <UserCircle size={32} className="text-gray-300"/>}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="font-black text-gray-900 text-base truncate">{user.full_name || 'بدون نام'}</div>
                          <div className="flex items-center gap-2 text-gray-500 font-bold text-xs mt-1.5" dir="ltr"><span className="text-red-500"><Phone size={12}/></span>{user.phone}</div>
                        </div>
                        <div className="bg-gray-50 px-3 py-2 rounded-xl border flex flex-col items-center"><span className="text-[10px] font-black text-gray-400">ADS</span><span className="text-sm font-black text-red-600">{getUserAdsCount(user.phone)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
           )}

           {selectedUser && activeTab === 'USERS' && (
              <div className="bg-white rounded-[3rem] border shadow-xl flex flex-col md:flex-row h-[85vh] md:h-[75vh] overflow-hidden animate-in slide-in-from-left-4 relative">
                 {/* User Info Sidebar */}
                 <div className="w-full md:w-80 border-l bg-gray-50/50 p-6 md:p-8 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
                    <button onClick={() => setSelectedUser(null)} className="flex items-center gap-2 text-gray-400 font-black text-sm mb-6"><ChevronLeft /> بازگشت</button>
                    <div className="flex flex-col items-center text-center mb-6 shrink-0">
                        <div className="w-24 h-24 bg-white rounded-[2.5rem] border-4 border-white shadow-2xl overflow-hidden mb-4">
                          {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-200 m-auto mt-6" />}
                        </div>
                        <h2 className="font-black text-gray-900 text-lg">{selectedUser.full_name || 'بدون نام'}</h2>
                        <p className="text-gray-400 font-bold tracking-widest text-xs mt-1" dir="ltr">{selectedUser.phone}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border shadow-sm">
                       <h4 className="text-[10px] font-black text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-widest"><Layers size={14}/> آمار فعالیت</h4>
                       <div className="space-y-3 text-xs font-bold">
                          <div className="flex justify-between"><span>املاک:</span> <span className="text-red-600 font-black">{properties.filter(p => p.ownerId === selectedUser.phone).length}</span></div>
                          <div className="flex justify-between"><span>کاریابی:</span> <span className="text-blue-600 font-black">{jobs.filter(j => j.ownerId === selectedUser.phone).length}</span></div>
                          <div className="flex justify-between"><span>خدمات:</span> <span className="text-orange-600 font-black">{services.filter(s => s.ownerId === selectedUser.phone).length}</span></div>
                       </div>
                    </div>
                 </div>

                 {/* Chat History Section */}
                 <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    <div className="p-4 border-b flex items-center gap-3 font-black text-[10px] text-gray-500 bg-gray-50/50 uppercase tracking-widest">
                      <MessageSquare size={16} /> گفتگو با این کاربر
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-50/20">
                       {isLoadingChats ? (
                         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" /></div>
                       ) : chatHistory.length === 0 ? (
                         <div className="text-center py-20 text-gray-300 font-bold text-sm">هیچ پیامی ارسال نشده است.</div>
                       ) : (
                         <>
                           {chatHistory.map((msg, i) => (
                             <div key={i} className="flex justify-start">
                                <div className="max-w-[85%] p-4 rounded-[1.8rem] rounded-tr-none text-xs font-bold bg-red-600 text-white shadow-md leading-6">
                                  {msg.text}
                                </div>
                             </div>
                           ))}
                           <div ref={chatEndRef} />
                         </>
                       )}
                    </div>

                    {/* Fixed Chat Input Bar at Bottom */}
                    <div className="p-4 border-t bg-white flex gap-2 shrink-0">
                       <input 
                         type="text" 
                         placeholder="ارسال پیام سیستمی..." 
                         className="flex-1 bg-gray-100 rounded-2xl px-5 py-4 font-bold text-sm outline-none border-2 border-transparent focus:border-red-500 transition-all text-gray-800" 
                         value={adminMsg} 
                         onChange={e => setAdminMsg(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleSendAdminMessage(selectedUser.phone)}
                       />
                       <button 
                         onClick={() => handleSendAdminMessage(selectedUser.phone)} 
                         disabled={isProcessing || !adminMsg.trim()} 
                         className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-40 transition-all shrink-0"
                       >
                          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={22} className="rotate-180" />}
                       </button>
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'ADMINS' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black">تیم ادمین سیستم</h2>
                  <button onClick={() => setShowAddAdminModal(true)} className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 active:scale-95 shadow-lg shadow-red-100"><UserPlus size={18}/> ادمین جدید</button>
                </div>
                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b"><tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest"><th className="px-6 py-5">نام مدیر</th><th className="px-6 py-5">نام کاربری</th><th className="px-6 py-5">نقش</th></tr></thead>
                    <tbody className="divide-y">{systemAdmins.map(admin => (<tr key={admin.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-black text-gray-800">{admin.full_name}</td><td className="px-6 py-4 font-bold text-gray-500" dir="ltr">{admin.username}</td><td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[9px] font-black">{admin.role}</span></td></tr>))}</tbody>
                  </table>
                </div>
              </div>
           )}

           {activeTab === 'PASSWORD' && (
              <div className="max-w-md mx-auto bg-white p-10 rounded-[3.5rem] border shadow-xl animate-in zoom-in-95">
                 <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600"><Lock size={40} /></div>
                 <h2 className="text-2xl font-black text-center mb-8 text-gray-800">تغییر رمز ادمین</h2>
                 <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (pwdForm.new !== pwdForm.confirm) return alert("تکرار رمز مطابقت ندارد.");
                    setIsProcessing(true);
                    try {
                      const adminStr = localStorage.getItem('current_admin_user');
                      if (!adminStr) throw new Error("مدیر شناسایی نشد.");
                      const admin = JSON.parse(adminStr);
                      const { error } = await supabase.from('system_admins').update({ password: pwdForm.new }).eq('id', admin.id);
                      if (error) throw error;
                      alert("رمز با موفقیت تغییر کرد.");
                      setPwdForm({ current: '', new: '', confirm: '' });
                      setActiveTab('DASHBOARD');
                    } catch (e: any) { alert(e.message); } finally { setIsProcessing(false); }
                 }} className="space-y-4">
                    <input type="password" placeholder="رمز فعلی" value={pwdForm.current} onChange={e=>setPwdForm({...pwdForm, current: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-bold outline-none focus:border-red-500" required />
                    <input type="password" placeholder="رمز جدید" value={pwdForm.new} onChange={e=>setPwdForm({...pwdForm, new: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-bold outline-none focus:border-red-500" required />
                    <input type="password" placeholder="تکرار رمز جدید" value={pwdForm.confirm} onChange={e=>setPwdForm({...pwdForm, confirm: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-bold outline-none focus:border-red-500" required />
                    <button type="submit" disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95">{isProcessing ? <Loader2 className="animate-spin m-auto" /> : 'تایید و بروزرسانی'}</button>
                 </form>
              </div>
           )}

           {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
              <div className="bg-white rounded-[3rem] border shadow-sm overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-4">
                 <table className="w-full text-right min-w-[700px]">
                    <thead className="bg-gray-50 border-b"><tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest"><th className="px-8 py-6">عنوان آگهی</th><th className="px-8 py-6">ولایت</th><th className="px-8 py-6">وضعیت</th><th className="px-8 py-6 text-center">عملیات</th></tr></thead>
                    <tbody className="divide-y">{(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services).map(item => (<tr key={item.id} className="hover:bg-gray-50 transition-colors"><td className="px-8 py-5 font-black text-sm text-gray-800">{item.title}</td><td className="px-8 py-5 text-xs font-bold text-gray-500">{item.city}</td><td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td><td className="px-8 py-5 text-center"><button onClick={() => {setSelectedItem(item); setActiveImgIdx(0);}} className="p-3.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"><Eye size={22}/></button></td></tr>))}</tbody>
                 </table>
              </div>
           )}
         </div>
       </div>

       {/* REVIEW MODAL */}
       {selectedItem && (
         <div className="fixed inset-0 z-[11000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl h-[95vh] md:h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
              
              <div className="p-6 border-b flex justify-between items-center bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-2"><Info className="text-red-600"/><h3 className="font-black text-lg text-gray-800">بررسی کامل آگهی</h3></div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                 
                 <div 
                   className="aspect-video w-full bg-black relative shrink-0 overflow-hidden select-none" 
                   style={{ touchAction: 'pan-y' }}
                   onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} 
                   onTouchEnd={(e) => {
                      if (touchStartX.current === null) return;
                      const endX = e.changedTouches[0].clientX;
                      const diff = touchStartX.current - endX;
                      if (Math.abs(diff) > 40) { 
                        if (diff > 0) nextImg();
                        else prevImg();
                      }
                      touchStartX.current = null;
                   }}
                 >
                    {selectedItem.images && selectedItem.images.length > 0 ? (
                      <>
                        <img key={activeImgIdx} src={selectedItem.images[activeImgIdx]} className="w-full h-full object-contain animate-in fade-in duration-300" alt="ad-preview" />
                        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                            <button onClick={prevImg} className="p-4 bg-white/20 rounded-full text-white backdrop-blur-md pointer-events-auto active:scale-90"><ChevronRight size={32}/></button>
                            <button onClick={nextImg} className="p-4 bg-white/20 rounded-full text-white backdrop-blur-md pointer-events-auto active:scale-90"><ChevronLeft size={32}/></button>
                        </div>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 text-white px-3 py-1 rounded-full text-[10px] font-black">
                          {activeImgIdx + 1} از {selectedItem.images.length}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 font-black opacity-20 uppercase tracking-widest">بدون عکس</div>
                    )}
                 </div>

                 <div className="p-8 space-y-8 text-right">
                    <div className="space-y-3">
                      <h2 className="text-2xl font-black text-gray-800 leading-tight">{selectedItem.title}</h2>
                      <div className="flex items-center gap-4 justify-end">
                         <div className="flex items-center gap-1 text-gray-400 font-bold text-xs"><Clock size={14}/> {selectedItem.date ? new Date(selectedItem.date).toLocaleDateString('fa-AF') : '---'}</div>
                         <div className="flex items-center gap-1 text-gray-400 font-bold text-xs"><MapPin size={14}/> {selectedItem.city}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center gap-3 text-sm font-black justify-end shadow-sm">
                         <span className="text-gray-800" dir="ltr">{selectedItem.phoneNumber}</span>
                         <Phone size={18} className="text-green-600" />
                       </div>
                       <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center gap-3 text-sm font-black justify-end shadow-sm">
                         <span className="text-gray-800">{selectedItem.price?.toLocaleString() || '---'}</span>
                         <span className="text-[10px] text-gray-400">AFN</span>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border-2 border-dashed border-gray-100 space-y-6">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase border-b pb-3 tracking-widest flex items-center gap-2 justify-end"><Info size={14}/> جزییات ثبت شده</h4>
                       <div className="grid grid-cols-2 gap-y-4 text-xs font-bold text-gray-700">
                          {activeTab === 'ESTATE' && (
                            <>
                              <div>مساحت: <span className="text-gray-900 font-black">{selectedItem.area} متر</span></div>
                              <div>تعداد اتاق: <span className="text-gray-900 font-black">{selectedItem.bedrooms}</span></div>
                              <div>نوع واگذاری: <span className="text-red-600 font-black">{selectedItem.dealType}</span></div>
                              <div>پارکینگ: <span className="font-black">{selectedItem.hasParking ? 'دارد' : 'ندارد'}</span></div>
                            </>
                          )}
                          {activeTab === 'JOBS' && (
                            <>
                              <div>نوع کار: <span className="text-blue-600 font-black">{selectedItem.jobType}</span></div>
                              <div>شرکت: <span className="text-gray-900 font-black">{selectedItem.company}</span></div>
                            </>
                          )}
                       </div>
                       <div className="pt-6 border-t">
                         <h4 className="text-xs font-black text-gray-400 mb-2">توضیحات آگهی:</h4>
                         <p className="text-gray-600 font-bold text-sm leading-8 text-justify whitespace-pre-wrap">{selectedItem.description}</p>
                       </div>
                    </div>

                    <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 shadow-inner">
                       <h4 className="text-[10px] font-black text-red-700 mb-4 flex items-center gap-2 uppercase tracking-widest justify-end"><MessageSquare size={14}/> ارسال پیام مستقیم به مالک آگهی</h4>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="علت تایید یا رد را بنویسید..." 
                            className="flex-1 bg-white rounded-2xl px-5 py-4 font-bold text-sm outline-none border-2 border-transparent focus:border-red-500 shadow-sm transition-all" 
                            value={adminMsg} 
                            onChange={e => setAdminMsg(e.target.value)} 
                          />
                          <button 
                            onClick={() => handleSendAdminMessage(selectedItem.phoneNumber)} 
                            disabled={!adminMsg.trim() || isProcessing} 
                            className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-50 transition-all"
                          >
                             {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={24} className="rotate-180"/>}
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="px-8 pt-4 pb-20 grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => handleStatusUpdate(selectedItem.id, activeTab === 'ESTATE' ? TABLES.PROPERTIES : activeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES, 'APPROVED')} 
                      disabled={isProcessing} 
                      className="bg-green-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-100 transition-all"
                    >
                      <CheckCircle size={18}/> تایید نهایی
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(selectedItem.id, activeTab === 'ESTATE' ? TABLES.PROPERTIES : activeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES, 'REJECTED')} 
                      disabled={isProcessing} 
                      className="bg-amber-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-amber-100 transition-all"
                    >
                      <ShieldAlert size={18}/> رد موقت
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(selectedItem.id, activeTab === 'ESTATE' ? TABLES.PROPERTIES : activeTab === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES)} 
                      disabled={isProcessing} 
                      className="bg-red-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-red-100 transition-all"
                    >
                      <Trash2 size={18}/> حذف کامل
                    </button>
                 </div>
              </div>
           </div>
         </div>
       )}

       {showAddAdminModal && (
         <div className="fixed inset-0 z-[12000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-sm:max-w-sm rounded-[3rem] p-8 shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-gray-800">ادمین جدید</h3><button onClick={() => setShowAddAdminModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button></div>
              <form onSubmit={async (e) => { 
                  e.preventDefault(); 
                  setIsProcessing(true);
                  const { error } = await supabase.from('system_admins').insert([newAdmin]);
                  if (!error) { fetchData(); setShowAddAdminModal(false); setNewAdmin({ username: '', password: '', full_name: '', role: 'NORMAL' }); alert("ادمین اضافه شد."); }
                  setIsProcessing(false);
                }} className="space-y-4">
                 <input type="text" placeholder="نام کامل" value={newAdmin.full_name} onChange={e => setNewAdmin({...newAdmin, full_name: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-bold outline-none focus:border-red-500" required />
                 <input type="text" placeholder="نام کاربری" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-bold outline-none focus:border-red-500" required />
                 <input type="password" placeholder="رمز عبور" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full bg-gray-50 border rounded-2xl p-4 font-bold outline-none focus:border-red-500" required />
                 <button type="submit" disabled={isProcessing} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black active:scale-95">{isProcessing ? <Loader2 className="animate-spin m-auto" /> : 'ثبت مدیر سیستم'}</button>
              </form>
           </div>
         </div>
       )}
    </div>
  );
};

export default AdminPanel;
