
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Property, Job, Service } from '../types';
import { Trash2, Home, FileText, LayoutDashboard, Briefcase, Wrench, CheckCircle, XCircle, MessageSquare, Eye, Users, Phone, ShieldCheck, MapPin, Loader2, Send, Clock, ChevronRight, ChevronLeft, Search, User, UserCheck, Calendar, Box } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ESTATE' | 'JOBS' | 'SERVICES' | 'USERS'>('DASHBOARD');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchType, setUserSearchType] = useState<'NAME' | 'PHONE'>('NAME');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  
  const touchStart = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: profiles, error: userError } = await supabase
        .from('profiles')
        .select('*');
      
      if (userError) console.error("Error profiles:", userError);
      setAllUsers(profiles || []);
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

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const term = userSearch.toLowerCase();
      if (userSearchType === 'NAME') {
        return (u.full_name || '').toLowerCase().includes(term);
      } else {
        return (u.phone || '').includes(term);
      }
    });
  }, [allUsers, userSearch, userSearchType]);

  const getUserStats = (phone: string) => {
    return {
      estates: properties.filter(p => p.ownerId === phone).length,
      jobs: jobs.filter(j => j.ownerId === phone).length,
      services: services.filter(s => s.phoneNumber === phone).length
    };
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedItem?.images?.length > 1) {
      setActiveImgIdx(prev => (prev < selectedItem.images.length - 1 ? prev + 1 : 0));
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedItem?.images?.length > 1) {
      setActiveImgIdx(prev => (prev > 0 ? prev - 1 : selectedItem.images.length - 1));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextImage();
      else prevImage();
    }
    touchStart.current = null;
  };

  const handleUpdateStatus = async (id: string, type: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    const table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    try {
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;

      const ownerPhone = selectedItem?.owner_id || selectedItem?.phone_number;
      if (adminMsg.trim() && ownerPhone) {
        await handleSendAdminMessage(ownerPhone, `پیام مدیریت: آگهی شما ${status === 'APPROVED' ? 'تایید' : 'رد'} شد. ${adminMsg}`);
      }

      alert("انجام شد.");
      setSelectedItem(null);
      fetchData();
    } catch (err: any) { alert("خطا: " + err.message); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteItem = async (id: string, type: string) => {
    if (!window.confirm("حذف دائمی؟")) return;
    const table = type === 'ESTATE' ? TABLES.PROPERTIES : type === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      alert("حذف شد.");
      fetchData();
    } catch (e: any) { alert("خطا: " + e.message); }
  };

  const handleSendAdminMessage = async (targetPhone: string, textOverride?: string) => {
    const text = textOverride || adminMsg;
    if (!text.trim()) return;
    try {
      await supabase.from(TABLES.MESSAGES).insert([{ target_phone: targetPhone, text, is_read: false, date: new Date().toISOString() }]);
      if (!textOverride) { setAdminMsg(''); fetchChatHistory(targetPhone); }
    } catch (e) {}
  };

  const renderList = (items: any[], type: string) => (
    <div className="grid grid-cols-1 gap-3">
      {items.map(item => (
        <div key={item.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <img src={item.images?.[0]} className="w-14 h-14 rounded-xl object-contain bg-gray-100" alt="" />
            <div>
              <h4 className="font-black text-xs text-gray-800 line-clamp-1">{item.title}</h4>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${item.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {item.status}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setSelectedItem({...item, type}); setActiveImgIdx(0); fetchChatHistory(item.owner_id || item.phone_number); }} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"><Eye size={18}/></button>
            <button onClick={() => handleDeleteItem(item.id, type)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"><Trash2 size={18}/></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9000] bg-[#F8F9FA] font-[Vazirmatn] flex flex-col h-screen overflow-hidden text-right" dir="rtl">
      <header className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shrink-0 z-20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-900/40"><ShieldCheck size={20} className="text-white" /></div>
          <h1 className="text-sm md:text-lg font-black tracking-tight">پنل مدیریت هوشمند</h1>
        </div>
        <button onClick={onExit} className="bg-red-600/10 text-red-500 border border-red-500/20 px-5 py-2 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all">خروج از پنل</button>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-64 bg-white border-l p-4 flex md:flex-col gap-1 overflow-x-auto shrink-0 z-10 no-scrollbar shadow-sm">
           <button onClick={() => setActiveTab('DASHBOARD')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'DASHBOARD' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutDashboard size={20}/> پیشخوان</button>
           <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={20}/> مدیریت کاربران</button>
           <div className="h-px bg-gray-100 my-2 hidden md:block" />
           <button onClick={() => setActiveTab('ESTATE')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'ESTATE' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Home size={20}/> املاک</button>
           <button onClick={() => setActiveTab('JOBS')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'JOBS' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Briefcase size={20}/> مشاغل</button>
           <button onClick={() => setActiveTab('SERVICES')} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black shrink-0 transition-all ${activeTab === 'SERVICES' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Wrench size={20}/> خدمات</button>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center group hover:border-blue-200 transition-colors">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><Users size={32} /></div>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">تعداد کل کاربران</span>
                <span className="text-4xl font-black block mt-1 text-gray-800">{allUsers.length}</span>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center group hover:border-red-200 transition-colors">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><FileText size={32} /></div>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">کل آگهی‌های ثبت شده</span>
                <span className="text-4xl font-black block mt-1 text-gray-800">{properties.length + jobs.length + services.length}</span>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm text-center group hover:border-amber-200 transition-colors">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"><Clock size={32} /></div>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">در انتظار تایید مدیریت</span>
                <span className="text-4xl font-black block mt-1 text-gray-800">
                  {properties.filter(p => p.status === 'PENDING').length + jobs.filter(j => j.status === 'PENDING').length + services.filter(s => s.status === 'PENDING').length}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
               <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text" 
                      placeholder={userSearchType === 'NAME' ? "جستجوی نام کاربر..." : "جستجوی شماره تلفن..."}
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto shrink-0 shadow-inner">
                    <button 
                      onClick={() => setUserSearchType('NAME')} 
                      className={`flex-1 md:px-8 py-2.5 rounded-xl text-xs font-black transition-all ${userSearchType === 'NAME' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >جستجو با نام</button>
                    <button 
                      onClick={() => setUserSearchType('PHONE')} 
                      className={`flex-1 md:px-8 py-2.5 rounded-xl text-xs font-black transition-all ${userSearchType === 'PHONE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                    >جستجو با شماره</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {filteredUsers.length === 0 ? (
                   <div className="col-span-full py-24 text-center opacity-30 flex flex-col items-center">
                      <Users size={80} className="mb-4" />
                      <p className="font-black text-lg">هیچ کاربری با این مشخصات یافت نشد</p>
                   </div>
                 ) : filteredUsers.map((u, i) => (
                   <div 
                    key={i} 
                    onClick={() => { setSelectedUser(u); fetchChatHistory(u.phone); }}
                    className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5 cursor-pointer transition-all group active:scale-[0.98] animate-in slide-in-from-bottom-2"
                   >
                     <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gray-50 rounded-[1.8rem] flex items-center justify-center text-blue-600 font-black text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner overflow-hidden border border-gray-100">
                           {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-contain" alt="" /> : (u.full_name?.[0] || 'U')}
                        </div>
                        <div>
                           <h4 className="font-black text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{u.full_name || 'کاربر سیستم'}</h4>
                           <div className="flex items-center gap-2 mt-1 text-gray-500 font-bold text-sm bg-gray-100 px-3 py-1 rounded-full group-hover:bg-blue-50 transition-colors" dir="ltr">
                              <Phone size={14} className="text-blue-600" /> {u.phone}
                           </div>
                        </div>
                     </div>
                     <div className="p-3 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <ChevronLeft size={24} />
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {(activeTab === 'ESTATE' || activeTab === 'JOBS' || activeTab === 'SERVICES') && (
            <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in">
               <h2 className="text-xl font-black text-gray-800 px-2 flex items-center gap-2 mb-4">
                  {activeTab === 'ESTATE' && <><Home size={24} className="text-red-600" /> مدیریت آگهی‌های املاک</>}
                  {activeTab === 'JOBS' && <><Briefcase size={24} className="text-blue-600" /> مدیریت آگهی‌های مشاغل</>}
                  {activeTab === 'SERVICES' && <><Wrench size={24} className="text-amber-600" /> مدیریت آگهی‌های خدمات</>}
               </h2>
               {renderList(activeTab === 'ESTATE' ? properties : activeTab === 'JOBS' ? jobs : services, activeTab)}
            </div>
          )}
        </main>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-0 md:p-6 overflow-hidden" onClick={() => setSelectedUser(null)}>
           <div className="bg-white w-full h-full md:h-[90vh] md:max-w-6xl md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              {/* بخش اسکرول‌شونده یکپارچه در موبایل */}
              <div className="flex-1 overflow-y-auto p-6 md:p-12 border-l no-scrollbar bg-gray-50">
                 <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                       <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl shadow-sm"><User size={28} /></div>
                       <h2 className="text-2xl font-black text-gray-900">پروفایل و گفتگو</h2>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors shadow-sm"><XCircle size={32} className="text-gray-400"/></button>
                 </div>

                 <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-24 bg-blue-50/50 -z-10" />
                    <div className="w-28 h-28 bg-gray-100 rounded-[2.8rem] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl mb-6">
                       {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} className="w-full h-full object-contain" alt="" /> : <User size={56} className="text-gray-300" />}
                    </div>
                    <h3 className="text-2xl font-black text-gray-800">{selectedUser.full_name || 'کاربر بدون نام'}</h3>
                    <div className="flex items-center gap-3 text-blue-600 font-black mt-3 bg-blue-50 px-6 py-2 rounded-2xl shadow-sm border border-blue-100" dir="ltr">
                       <Phone size={20} /> {selectedUser.phone}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 font-bold text-xs mt-6 bg-gray-50 px-4 py-1.5 rounded-full border">
                       <Calendar size={14} /> تاریخ ثبت‌نام: {new Date(selectedUser.created_at).toLocaleDateString('fa-AF')}
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10">
                    {(() => {
                      const stats = getUserStats(selectedUser.phone);
                      return (
                        <>
                          <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 text-center shadow-sm">
                            <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase block mb-1">املاک</span>
                            <p className="text-xl md:text-2xl font-black text-red-600">{stats.estates}</p>
                          </div>
                          <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 text-center shadow-sm">
                            <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase block mb-1">مشاغل</span>
                            <p className="text-xl md:text-2xl font-black text-blue-600">{stats.jobs}</p>
                          </div>
                          <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 text-center shadow-sm">
                            <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase block mb-1">خدمات</span>
                            <p className="text-xl md:text-2xl font-black text-amber-600">{stats.services}</p>
                          </div>
                        </>
                      );
                    })()}
                 </div>

                 <div className="space-y-6 mb-12">
                    <h4 className="font-black text-gray-800 mr-2 flex items-center gap-3"><UserCheck size={24} className="text-blue-600"/> آگهی‌های ثبت شده:</h4>
                    {(() => {
                      const userAds = [
                        ...properties.filter(p => p.ownerId === selectedUser.phone).map(x => ({...x, type: 'ESTATE'})),
                        ...jobs.filter(j => j.ownerId === selectedUser.phone).map(x => ({...x, type: 'JOBS'})),
                        ...services.filter(s => s.phoneNumber === selectedUser.phone).map(x => ({...x, type: 'SERVICES'}))
                      ];
                      
                      return userAds.length === 0 ? (
                        <div className="bg-white p-14 rounded-[2.5rem] border border-dashed border-gray-200 text-center text-gray-400 font-bold">هیچ آگهی ثبت نشده است.</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                           {userAds.map((ad: any, i) => (
                             <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between group hover:border-blue-300 transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className={`w-3 h-3 rounded-full shadow-sm ${ad.type === 'ESTATE' ? 'bg-red-500' : ad.type === 'JOBS' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                                  <span className="font-black text-sm text-gray-700">{ad.title}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                   <button onClick={() => { setSelectedItem({...ad, type: ad.type}); setSelectedUser(null); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Eye size={20} /></button>
                                </div>
                             </div>
                           ))}
                        </div>
                      );
                    })()}
                 </div>

                 {/* در موبایل، بخش چت مستقیم زیر اطلاعات کاربر می‌آید */}
                 <div className="md:hidden mt-8">
                    <ChatSubSection 
                      targetPhone={selectedUser.phone} 
                      chatHistory={chatHistory} 
                      adminMsg={adminMsg} 
                      setAdminMsg={setAdminMsg} 
                      onSendMessage={() => handleSendAdminMessage(selectedUser.phone)}
                      isProcessing={isProcessing}
                    />
                 </div>
              </div>

              {/* در دسکتاپ، چت در سمت راست است */}
              <div className="hidden md:flex w-full md:w-[420px] flex-col bg-white border-r">
                 <ChatSubSection 
                    targetPhone={selectedUser.phone} 
                    chatHistory={chatHistory} 
                    adminMsg={adminMsg} 
                    setAdminMsg={setAdminMsg} 
                    onSendMessage={() => handleSendAdminMessage(selectedUser.phone)}
                    isProcessing={isProcessing}
                  />
              </div>
           </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-0 md:p-4 overflow-hidden" onClick={() => setSelectedItem(null)}>
           <div className="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 border-l no-scrollbar bg-gray-50 pb-32 md:pb-8 text-right">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-gray-900">{selectedItem.title}</h2>
                    <button onClick={() => setSelectedItem(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><XCircle size={24} className="text-gray-400"/></button>
                 </div>

                 <div className="relative aspect-video rounded-[2rem] overflow-hidden mb-6 shadow-xl bg-gray-200 group touch-pan-y" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    <img src={selectedItem.images?.[activeImgIdx]} className="w-full h-full object-contain" alt="" />
                    {selectedItem.images?.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full backdrop-blur-md active:scale-90 transition-transform"><ChevronLeft size={24}/></button>
                        <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full backdrop-blur-md active:scale-90 transition-transform"><ChevronRight size={24}/></button>
                      </>
                    )}
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white p-4 rounded-2xl border text-center shadow-sm">
                       <span className="text-[9px] font-black text-gray-400 uppercase block">ولایت</span>
                       <p className="font-black text-xs text-red-600">{selectedItem.city}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border text-center shadow-sm">
                       <span className="text-[9px] font-black text-gray-400 uppercase block">تماس</span>
                       <p className="font-black text-xs text-blue-600" dir="ltr">{selectedItem.phone_number}</p>
                    </div>
                    {selectedItem.type === 'ESTATE' && (
                      <div className="bg-white p-4 rounded-2xl border text-center shadow-sm">
                         <span className="text-[9px] font-black text-gray-400 uppercase block flex items-center justify-center gap-1"><Box size={10} className="text-green-600" /> انباری</span>
                         <p className={`font-black text-xs ${selectedItem.hasStorage ? 'text-green-600' : 'text-gray-400'}`}>
                            {selectedItem.hasStorage ? 'دارد' : 'ندارد'}
                         </p>
                      </div>
                    )}
                    <div className="bg-white p-4 rounded-2xl border text-center shadow-sm">
                       <span className="text-[9px] font-black text-gray-400 uppercase block">متراژ</span>
                       <p className="font-black text-xs">{selectedItem.area || '---'} م</p>
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-3xl border mb-6 shadow-sm">
                    <h4 className="text-[11px] font-black text-gray-400 mb-3 flex items-center gap-2"><MapPin size={18} className="text-red-600" /> آدرس دقیق برای مشاهده:</h4>
                    <p className="text-sm font-black text-gray-800 leading-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">{selectedItem.address || 'ثبت نشده'}</p>
                 </div>

                 <div className="bg-white p-6 rounded-3xl border mb-8 shadow-sm">
                    <h4 className="text-[11px] font-black text-gray-400 mb-3">توضیحات آگهی:</h4>
                    <p className="text-sm font-bold text-gray-700 leading-8 text-justify">{selectedItem.description}</p>
                 </div>
                 
                 <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 mb-6">
                    <h4 className="text-sm font-black text-amber-700 mb-3 flex items-center gap-2"><MessageSquare size={18} /> پیام ادمین:</h4>
                    <textarea value={adminMsg} onChange={e => setAdminMsg(e.target.value)} placeholder="دلیل رد یا تایید..." className="w-full bg-white border border-amber-200 rounded-2xl p-4 text-xs font-bold outline-none h-28 resize-none shadow-sm" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type, 'APPROVED')} disabled={isProcessing} className="bg-green-600 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl transition-all"><CheckCircle size={24}/> تایید و انتشار</button>
                    <button onClick={() => handleUpdateStatus(selectedItem.id, selectedItem.type, 'REJECTED')} disabled={isProcessing} className="bg-red-600 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl transition-all"><XCircle size={24}/> رد آگهی</button>
                 </div>
              </div>

              <div className="hidden md:flex w-[380px] flex-col bg-white border-r">
                 <ChatSubSection 
                    targetPhone={selectedItem.owner_id || selectedItem.phone_number} 
                    chatHistory={chatHistory} 
                    adminMsg={adminMsg} 
                    setAdminMsg={setAdminMsg} 
                    onSendMessage={() => handleSendAdminMessage(selectedItem.owner_id || selectedItem.phone_number)}
                    isProcessing={isProcessing}
                  />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ChatSubSection = ({ targetPhone, chatHistory, adminMsg, setAdminMsg, onSendMessage, isProcessing }: any) => (
  <div className="flex flex-col h-full min-h-[500px] md:min-h-0 bg-gray-50/30 text-right">
      <div className="p-6 border-b bg-white flex items-center gap-3 shadow-sm">
        <div className="w-12 h-12 bg-gray-900 text-white rounded-[1.2rem] flex items-center justify-center font-black text-xl shadow-lg border-2 border-white">A</div>
        <div>
            <h3 className="font-black text-sm text-gray-800">گفتگو با کاربر</h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-widest" dir="ltr">{targetPhone}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {chatHistory.length === 0 ? (
          <div className="text-center py-20 opacity-10 flex flex-col items-center gap-2">
              <MessageSquare size={64} />
              <span className="text-xs font-black">هیچ پیامی ارسال نشده است</span>
          </div>
        ) : chatHistory.map((msg: any, i: number) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-right-2">
              <p className="text-[12px] font-bold text-gray-700 leading-7">{msg.text}</p>
              <div className="flex justify-between items-center mt-3 text-[9px] text-gray-400 font-black border-t pt-2 border-gray-50">
                <span className="text-red-600 bg-red-50 px-3 py-1 rounded-lg">مدیریت کل</span>
                <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(msg.date).toLocaleTimeString('fa-AF')}</span>
              </div>
          </div>
        ))}
      </div>
      <div className="p-5 border-t bg-white relative mt-auto shadow-inner">
        <textarea 
          value={adminMsg} 
          onChange={e => setAdminMsg(e.target.value)} 
          placeholder="پیام مستقیم به کاربر..." 
          className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-[2rem] p-5 pr-14 text-xs font-bold outline-none resize-none h-32 transition-all shadow-inner" 
        />
        <button 
          onClick={onSendMessage} 
          disabled={isProcessing || !adminMsg.trim()} 
          className="absolute bottom-10 left-10 bg-blue-600 text-white p-4 rounded-2xl shadow-xl active:scale-90 disabled:opacity-50 transition-all hover:bg-blue-700"
        >
            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="rotate-180" />}
        </button>
      </div>
  </div>
);

export default AdminPanel;
