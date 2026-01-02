
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { User, Briefcase, Building2, Wrench, Plus, List, Map as MapIcon, Loader2, Languages, Search, RefreshCcw, Sparkles } from 'lucide-react';
import MapView from './components/MapView';
import PropertyCard from './components/PropertyCard';
import PropertyDetails from './components/PropertyDetails.tsx';
import JobCard from './components/JobCard';
import JobDetails from './components/JobDetails.tsx';
import ServiceCard from './components/ServiceCard';
import ServiceDetails from './components/ServiceDetails.tsx';
import AddPropertyModal from './components/AddPropertyModal';
import AddJobModal from './components/AddJobModal';
import AddServiceModal from './components/AddServiceModal';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { Property, Job, Service, AppMode, Language, DealType } from './types';
import { translations } from './services/translations';
import { supabase, TABLES, isSupabaseReady } from './services/supabaseClient';

type FilterCategory = 'ALL' | 'MY_ADS' | 'SAVED';

function App() {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'dari');
  const t = translations[lang];

  const toggleLanguage = () => {
    const newLang = lang === 'dari' ? 'pashto' : 'dari';
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
    document.documentElement.lang = newLang === 'dari' ? 'fa' : 'ps';
    document.documentElement.dir = 'rtl';
  };

  const [appMode, setAppMode] = useState<AppMode>('ESTATE');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedItem, setSelectedItem] = useState<Property | Job | Service | null>(null);
  const [editingItem, setEditingItem] = useState<Property | Job | Service | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState(t.provinces[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeDealFilter] = useState<'ALL' | DealType>('ALL');
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');
  const [displayLimit, setDisplayLimit] = useState(20);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTouchY = useRef(0);

  const [hasNewUserChats, setHasNewUserChats] = useState(false);
  const [hasNewAdminMessages, setHasNewAdminMessages] = useState(false);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const refreshData = useCallback(async () => {
    if (!isSupabaseReady()) return;
    try {
      const [pRes, jRes, sRes] = await Promise.all([
        supabase.from(TABLES.PROPERTIES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.JOBS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.SERVICES).select('*').order('created_at', { ascending: false })
      ]);

      const mapStatus = (item: any) => ({
        ...item,
        ownerId: item.owner_id || 'guest',
        dealType: item.deal_type,
        phoneNumber: item.phone_number,
        showPhoneNumber: item.show_phone ?? true,
        status: item.status || 'PENDING',
        date: item.created_at,
        mortgageAmount: item.mortgage_amount,
        deposit: item.deposit,
        hasStorage: item.has_storage ?? false,
        providerName: item.provider_name,
        address: item.address || '',
        area: item.area || 0,
        bedrooms: item.bedrooms || 0
      });

      setProperties(pRes.data?.map(mapStatus) || []);
      setJobs(jRes.data?.map(mapStatus) || []);
      setServices(sRes.data?.map(mapStatus) || []);
    } catch (e) {
      console.error("Data fetch error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setPullProgress(0);
    }
  }, []);

  const handleDeleteAd = async (id: string, mode: AppMode) => {
    if (!window.confirm(lang === 'dari' ? "آیا از حذف این آگهی مطمئن هستید؟" : "ایا تاسو ډاډه یاست چې دا اعلان حذف کړئ؟")) return;
    
    const table = mode === 'ESTATE' ? TABLES.PROPERTIES : mode === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
      alert(lang === 'dari' ? "آگهی با موفقیت حذف شد." : "اعلان په بریالیتوب سره حذف شو.");
      refreshData();
    } else {
      alert("Error deleting ad.");
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startTouchY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startTouchY.current > 0 && !isRefreshing) {
      const diff = e.touches[0].clientY - startTouchY.current;
      if (diff > 0 && scrollRef.current?.scrollTop === 0) {
        const progress = Math.min(diff / 150, 1);
        setPullProgress(progress);
        if (diff > 120) {
          setIsRefreshing(true);
          refreshData();
        }
      }
    }
  };

  const handleTouchEnd = () => {
    startTouchY.current = 0;
    if (!isRefreshing) setPullProgress(0);
  };

  useEffect(() => {
    const saved = localStorage.getItem('saved_items');
    if (saved) {
      try {
        setSavedIds(new Set(JSON.parse(saved)));
      } catch (e) { console.error(e); }
    }
  }, []);

  const checkUnreadNotifications = useCallback(async () => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone || !isSupabaseReady()) return;

    const [chatsRes, adminRes] = await Promise.all([
      supabase.from(TABLES.USER_CHATS).select('id', { count: 'exact', head: true }).eq('receiver_phone', userPhone).eq('is_read', false),
      supabase.from(TABLES.MESSAGES).select('id', { count: 'exact', head: true }).eq('target_phone', userPhone).eq('is_read', false)
    ]);

    setHasNewUserChats((chatsRes.count || 0) > 0);
    setHasNewAdminMessages((adminRes.count || 0) > 0);
  }, []);

  useEffect(() => { 
    refreshData(); 
    checkUnreadNotifications();
    
    if (!isSupabaseReady()) return;

    const channel = supabase.channel('app_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PROPERTIES }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.JOBS }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SERVICES }, () => refreshData())
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.MESSAGES }, () => checkUnreadNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.USER_CHATS }, () => checkUnreadNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshData, checkUnreadNotifications]);

  const filteredItems = useMemo(() => {
    const userPhone = localStorage.getItem('user_phone') || null;
    let base = appMode === 'ESTATE' ? properties : appMode === 'JOBS' ? jobs : services;
    
    return base.filter(item => {
      if (filterCategory === 'MY_ADS') {
        if (!userPhone || item.ownerId !== userPhone) return false;
        return true;
      } 
      if (filterCategory === 'SAVED') {
        if (!savedIds.has(item.id)) return false;
      }
      const isApproved = item.status === 'APPROVED';
      const isOwner = userPhone && item.ownerId === userPhone;
      
      if (!isApproved && !isOwner) return false;

      const titleMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const isAllCity = selectedProvince === translations.dari.provinces[0] || selectedProvince === translations.pashto.provinces[0];
      const cityMatch = isAllCity || item.city === selectedProvince;
      if (!titleMatch || !cityMatch) return false;

      if (appMode === 'ESTATE') {
        const p = item as Property;
        return activeDealFilter === 'ALL' || p.dealType === activeDealFilter;
      }
      return true;
    });
  }, [appMode, searchTerm, activeDealFilter, selectedProvince, properties, jobs, services, filterCategory, savedIds]);

  const displayedItems = useMemo(() => filteredItems.slice(0, displayLimit), [filteredItems, displayLimit]);

  const handleSelectItem = (item: Property | Job | Service) => {
    setVisitedIds(prev => new Set(prev).add(item.id));
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    setSelectedItem(null);
    setIsDetailOpen(false);
    setViewMode('list');
    setFilterCategory('ALL');
    setDisplayLimit(20);
  };

  if (isAdminMode) {
    return (
      <AdminPanel 
        properties={properties} setProperties={setProperties} 
        jobs={jobs} setJobs={setJobs}
        services={services} setServices={setServices}
        onExit={() => { setIsAdminMode(false); refreshData(); }} 
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white font-[Vazirmatn] overflow-hidden" dir="rtl">
      <header className="h-[65px] bg-white border-b flex items-center justify-between px-4 z-[3000] shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="bg-gray-900 text-white px-3 py-2 rounded-xl font-black text-[10px] md:hidden flex items-center gap-1 active:scale-95 transition-transform">
            {viewMode === 'list' ? ( <><MapIcon size={14} /> <span>{t.map}</span></> ) : ( <><List size={14} /> <span>{t.list}</span></> )}
          </button>
          <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 hover:bg-gray-100">
            <Languages size={14} className="text-[#a62626]" />
            <span>{lang === 'dari' ? 'پشتو' : 'دری'}</span>
          </button>
        </div>
        <div className="flex flex-col items-end">
          <h1 className="font-black text-[#a62626] text-base md:text-lg leading-none">خانه افغانستان</h1>
          <span className="text-[8px] md:text-[9px] text-gray-400 font-bold uppercase tracking-tighter">ESTATE & JOBS & SERVICES</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className={`w-full md:w-[420px] h-full flex flex-col bg-white z-20 shrink-0 border-l ${viewMode === 'map' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 bg-gray-50 shrink-0">
            <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative flex items-center">
                  <input type="text" placeholder={appMode === 'ESTATE' ? t.search_estate : appMode === 'JOBS' ? t.search_jobs : t.search_services} className="w-full bg-gray-100 rounded-xl pr-4 pl-10 py-2.5 text-xs font-bold outline-none border border-transparent focus:border-[#a62626]/20 transition-all" value={displaySearch} onChange={(e) => setDisplaySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(displaySearch)} />
                  <button onClick={() => setSearchTerm(displaySearch)} className="absolute left-2 p-1.5 bg-[#a62626] text-white rounded-lg active:scale-90 transition-transform"> <Search size={14} /> </button>
                </div>
                <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setDisplayLimit(20); }} className="bg-gray-100 rounded-xl px-2 py-2.5 text-[10px] font-black outline-none border border-transparent focus:border-[#a62626]/20 max-w-[100px]">
                  {t.provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div 
            ref={scrollRef} 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 overflow-y-auto px-3 pb-24 no-scrollbar space-y-3 pt-3 relative"
          >
            {(pullProgress > 0 || isRefreshing) && (
              <div className="flex justify-center py-2 transition-all" style={{ opacity: pullProgress, transform: `scale(${pullProgress})` }}>
                 <div className="bg-white p-3 rounded-full shadow-lg border border-red-50">
                    <RefreshCcw className={`text-red-600 ${isRefreshing ? 'animate-spin' : ''}`} size={24} style={{ transform: `rotate(${pullProgress * 360}deg)` }} />
                 </div>
              </div>
            )}

            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-24 gap-4">
                 <Loader2 className="animate-spin text-[#a62626]" size={40} />
                 <p className="text-[10px] font-black text-gray-400">{lang === 'dari' ? 'در حال دریافت اطلاعات...' : 'د معلوماتو ترلاسه کول...'}</p>
               </div>
            ) : (
              <>
                {displayedItems.map(item => (
                  <div key={item.id} className="relative">
                    {item.status === 'PENDING' && (
                      <div className="absolute top-2 right-2 z-10 bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm">{lang === 'dari' ? 'در انتظار تایید' : 'تایید ته انتظار'}</div>
                    )}
                    {item.status === 'REJECTED' && (
                      <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm">{lang === 'dari' ? 'رد شده' : 'رد شوی'}</div>
                    )}
                    {appMode === 'ESTATE' ? 
                      <PropertyCard 
                        property={item as Property} 
                        onClick={() => handleSelectItem(item)} 
                        isVisited={visitedIds.has(item.id)} 
                        isSaved={savedIds.has(item.id)} 
                        onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} 
                        lang={lang} 
                        onDelete={filterCategory === 'MY_ADS' ? () => handleDeleteAd(item.id, 'ESTATE') : undefined}
                        onEdit={filterCategory === 'MY_ADS' ? () => { setEditingItem(item); setShowAddModal(true); } : undefined}
                      /> :
                     appMode === 'JOBS' ? 
                      <JobCard 
                        job={item as Job} 
                        onClick={() => handleSelectItem(item)} 
                        isVisited={visitedIds.has(item.id)} 
                        isSaved={savedIds.has(item.id)} 
                        onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} 
                        lang={lang} 
                        onDelete={filterCategory === 'MY_ADS' ? () => handleDeleteAd(item.id, 'JOBS') : undefined}
                        onEdit={filterCategory === 'MY_ADS' ? () => { setEditingItem(item); setShowAddModal(true); } : undefined}
                      /> :
                      <ServiceCard 
                        service={item as Service} 
                        onClick={() => handleSelectItem(item)} 
                        isVisited={visitedIds.has(item.id)} 
                        isSaved={savedIds.has(item.id)} 
                        onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} 
                        lang={lang} 
                        onDelete={filterCategory === 'MY_ADS' ? () => handleDeleteAd(item.id, 'SERVICES') : undefined}
                        onEdit={filterCategory === 'MY_ADS' ? () => { setEditingItem(item); setShowAddModal(true); } : undefined}
                      />
                    }
                  </div>
                ))}
                
                {filteredItems.length > displayLimit && (
                  <button onClick={() => setDisplayLimit(prev => prev + 20)} className="w-full py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black text-gray-500 mb-4 transition-colors hover:bg-gray-100">
                    {lang === 'dari' ? 'مشاهده آگهی‌های بیشتر' : 'نور اعلانونه وګورئ'}
                  </button>
                )}
              </>
            )}
            {!isLoading && filteredItems.length === 0 && (
              <div className="text-center py-24 flex flex-col items-center gap-4 opacity-70 px-8">
                <div className="w-24 h-24 bg-red-50 text-red-600 rounded-[3rem] flex items-center justify-center mb-2">
                  <Sparkles size={48} className="animate-pulse" />
                </div>
                <h3 className="font-black text-gray-800 text-lg">{t.no_results}</h3>
                <p className="text-[11px] font-bold text-gray-400 leading-7">
                  {lang === 'dari' 
                    ? 'هنوز آگهی تایید شده‌ای در این بخش وجود ندارد. اگر به تازگی آگهی ثبت کرده‌اید، پس از تایید مدیریت در اینجا نمایش داده می‌شود.' 
                    : 'په دې برخه کې لا تر اوسه تایید شوی اعلان نشته. که تاسو نوی اعلان ثبت کړی وي، د مدیریت له تایید وروسته به دلته ښکاره شي.'}
                </p>
                {filterCategory === 'ALL' && (
                  <button 
                    onClick={() => { if(!localStorage.getItem('user_phone')) setShowAuthModal(true); else setShowAddModal(true); }}
                    className="mt-4 bg-[#a62626] text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                  >
                    اولین آگهی را ثبت کنید
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`flex-1 h-full relative ${viewMode === 'list' ? 'hidden md:block' : 'block'}`}>
          <MapView items={filteredItems} selectedItem={selectedItem} onSelectItem={handleSelectItem} mode={appMode} visitedIds={visitedIds} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 h-[70px] bg-white/95 backdrop-blur-md border-t flex items-center justify-around z-[4000] px-2 shadow-[0_-5px_25px_rgba(0,0,0,0.05)] pb-env">
          <button onClick={() => handleModeChange('ESTATE')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'ESTATE' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Building2 size={20} /><span className="text-[9px] font-black">{t.estate}</span></button>
          <button onClick={() => handleModeChange('JOBS')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'JOBS' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Briefcase size={20} /><span className="text-[9px] font-black">{t.jobs}</span></button>
          <button onClick={() => { if(!localStorage.getItem('user_phone')) setShowAuthModal(true); else setShowAddModal(true); }} className="w-14 h-14 bg-[#a62626] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/30 -top-6 relative active:scale-90 transition-all border-4 border-white"><Plus size={32} /></button>
          <button onClick={() => handleModeChange('SERVICES')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'SERVICES' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Wrench size={20} /><span className="text-[9px] font-black">{t.services}</span></button>
          <button onClick={() => setShowAuthModal(true)} className={`flex flex-col items-center flex-1 gap-1 transition-all relative ${showAuthModal ? 'text-[#a62626]' : 'text-gray-300'}`}>
            <User size={20} />
            <span className="text-[9px] font-black">{t.account}</span>
            {(hasNewUserChats || hasNewAdminMessages) && <div className="absolute top-0 right-1/2 translate-x-3 w-2 h-2 bg-red-600 rounded-full border border-white"></div>}
          </button>
        </div>
      </main>

      {selectedItem && isDetailOpen && (
        <div className="z-[5000] fixed inset-0 animate-in slide-in-from-bottom duration-300">
          {appMode === 'ESTATE' && <PropertyDetails property={selectedItem as Property} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(selectedItem.id) ? n.delete(selectedItem.id) : n.add(selectedItem.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} t={t} />}
          {appMode === 'JOBS' && <JobDetails job={selectedItem as Job} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(selectedItem.id) ? n.delete(selectedItem.id) : n.add(selectedItem.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} t={t} />}
          {appMode === 'SERVICES' && <ServiceDetails service={selectedItem as Service} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(selectedItem.id) ? n.delete(selectedItem.id) : n.add(selectedItem.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} t={t} />}
        </div>
      )}

      {showAddModal && (
        <div className="z-[6000] fixed inset-0">
          {appMode === 'ESTATE' && <AddPropertyModal editData={editingItem as Property} onClose={() => { setShowAddModal(false); refreshData(); setEditingItem(null); }} t={t} lang={lang} />}
          {appMode === 'JOBS' && <AddJobModal editData={editingItem as Job} onClose={() => { setShowAddModal(false); refreshData(); setEditingItem(null); }} t={t} lang={lang} />}
          {appMode === 'SERVICES' && <AddServiceModal editData={editingItem as Service} onClose={() => { setShowAddModal(false); refreshData(); setEditingItem(null); }} t={t} lang={lang} />}
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} lang={lang} hasUnreadChats={hasNewUserChats} onShowMyAds={() => { setFilterCategory('MY_ADS'); setShowAuthModal(false); }} onShowSaved={() => { setFilterCategory('SAVED'); setShowAuthModal(false); }} onAdminClick={() => { setShowAuthModal(false); setShowAdminLogin(true); }} onCheckNotifications={checkUnreadNotifications} />}
      {showAdminLogin && <AdminLogin onLogin={() => { setShowAdminLogin(false); setIsAdminMode(true); }} onCancel={() => setShowAdminLogin(false)} />}
    </div>
  );
}

export default App;
