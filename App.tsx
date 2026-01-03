import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { User, Briefcase, Building2, Wrench, Plus, List, Map as MapIcon, Loader2, Languages, Search, RefreshCcw, Sparkles } from 'lucide-react';
import MapView from './components/MapView';
import PropertyCard from './components/PropertyCard';
import PropertyDetails from './components/PropertyDetails';
import JobCard from './components/JobCard';
import JobDetails from './components/JobDetails';
import ServiceCard from './components/ServiceCard';
import ServiceDetails from './components/ServiceDetails';
import AddPropertyModal from './components/AddPropertyModal';
import AddJobModal from './components/AddJobModal';
import AddServiceModal from './components/AddServiceModal';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { Property, Job, Service, AppMode, Language, DealType, Location } from './types';
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
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState(t.provinces[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeDealFilter, setActiveDealFilter] = useState<'ALL' | DealType>('ALL');
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');
  const [displayLimit, setDisplayLimit] = useState(20);
  
  const [mapFlyLocation, setMapFlyLocation] = useState<Location | null>(null);
  
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

  useEffect(() => {
    const prevProvinces = lang === 'dari' ? translations.pashto.provinces : translations.dari.provinces;
    if (prevProvinces.includes(selectedProvince)) {
      const idx = prevProvinces.indexOf(selectedProvince);
      setSelectedProvince(t.provinces[idx]);
    }
  }, [lang, selectedProvince, t.provinces]);

  const refreshData = useCallback(async () => {
    if (!isSupabaseReady()) return;
    try {
      const [pRes, jRes, sRes] = await Promise.all([
        supabase.from(TABLES.PROPERTIES).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.JOBS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.SERVICES).select('*').order('created_at', { ascending: false })
      ]);

      const mapItem = (item: any, type: AppMode) => ({
        ...item,
        itemType: type,
        ownerId: item.owner_id || 'guest',
        dealType: item.deal_type,
        phoneNumber: item.phone_number,
        showPhoneNumber: item.show_phone ?? true,
        status: item.status || 'PENDING',
        date: item.created_at,
        price: item.price || 0,
        salary: item.salary || 0,
        mortgageAmount: item.mortgage_amount || 0,
        deposit: item.deposit || 0,
        hasStorage: item.has_storage ?? false,
        hasParking: item.has_parking ?? false,
        providerName: item.provider_name,
        address: item.address || '',
        city: item.city || (lang === 'dari' ? 'نامشخص' : 'نامعلوم'), 
        area: item.area || 0,
        bedrooms: item.bedrooms || 0,
        images: Array.isArray(item.images) ? item.images : []
      });

      setProperties(pRes.data?.map(i => mapItem(i, 'ESTATE')) || []);
      setJobs(jRes.data?.map(i => mapItem(i, 'JOBS')) || []);
      setServices(sRes.data?.map(i => mapItem(i, 'SERVICES')) || []);
    } catch (e) {
      console.error("Data fetch error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setPullProgress(0);
    }
  }, [lang]);

  const handleDeleteAd = async (id: string, mode: AppMode) => {
    const confirmMsg = lang === 'dari' ? "آیا از حذف این آگهی مطمئن هستید؟" : "ایا تاسو ډاډه یاست چې دا اعلان حذف کړئ؟";
    if (!window.confirm(confirmMsg)) return;
    const table = mode === 'ESTATE' ? TABLES.PROPERTIES : mode === 'JOBS' ? TABLES.JOBS : TABLES.SERVICES;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      alert(lang === 'dari' ? "آگهی با موفقیت حذف شد." : "اعلان په بریالیتوب سره حذف شو.");
      refreshData();
    } catch (e: any) {
      alert("Error: " + e.message);
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
      try { setSavedIds(new Set(JSON.parse(saved))); } catch (e) {}
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
    if (filterCategory !== 'ALL') {
      const allCombined = [...properties, ...jobs, ...services];
      return allCombined.filter(item => {
        if (filterCategory === 'MY_ADS') return item.ownerId === userPhone;
        if (filterCategory === 'SAVED') return savedIds.has(item.id);
        return false;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    let base = appMode === 'ESTATE' ? properties : appMode === 'JOBS' ? jobs : services;
    return base.filter(item => {
      const isApproved = item.status === 'APPROVED';
      const isOwner = userPhone && item.ownerId === userPhone;
      if (!isApproved && !isOwner) return false;
      const titleMatch = String(item.title).toLowerCase().includes(searchTerm.toLowerCase());
      const isAllCity = selectedProvince === translations.dari.provinces[0] || selectedProvince === translations.pashto.provinces[0];
      const cityMatch = isAllCity || String(item.city) === selectedProvince;
      if (!titleMatch || !cityMatch) return false;
      if (appMode === 'ESTATE' && activeDealFilter !== 'ALL') {
        if ((item as Property).dealType !== activeDealFilter) return false;
      }
      return true;
    });
  }, [appMode, searchTerm, selectedProvince, properties, jobs, services, filterCategory, savedIds, activeDealFilter]);

  const displayedItems = useMemo(() => filteredItems.slice(0, displayLimit), [filteredItems, displayLimit]);

  const handleSelectItem = (item: any) => {
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
    setActiveDealFilter('ALL');
    setDisplayLimit(20);
    setMapFlyLocation(null);
  };

  // Fixed Show on Map Behavior
  const handleShowOnMap = (location: Location) => {
    setMapFlyLocation(location);
    setViewMode('map'); // Switch to map for all screen sizes
    setIsDetailOpen(false); // Close details immediately
  };

  if (isAdminMode) {
    return <AdminPanel properties={properties} jobs={jobs} services={services} onExit={() => { setIsAdminMode(false); refreshData(); }} />;
  }

  return (
    <div className="flex flex-col h-screen bg-white font-[Vazirmatn] overflow-hidden" dir="rtl">
      <header className="h-[65px] bg-white border-b flex items-center justify-between px-4 z-[3000] shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="bg-gray-900 text-white px-3 py-2 rounded-xl font-black text-[10px] md:hidden flex items-center gap-1 active:scale-95 transition-transform">
            {viewMode === 'list' ? ( <><MapIcon size={14} /> <span>{String(t.map)}</span></> ) : ( <><List size={14} /> <span>{String(t.list)}</span></> )}
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
                  <input type="text" placeholder={appMode === 'ESTATE' ? String(t.search_estate) : appMode === 'JOBS' ? String(t.search_jobs) : String(t.search_services)} className="w-full bg-gray-100 rounded-xl pr-4 pl-10 py-2.5 text-xs font-bold outline-none border border-transparent focus:border-[#a62626]/20 transition-all" value={displaySearch} onChange={(e) => setDisplaySearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchTerm(displaySearch)} />
                  <button onClick={() => setSearchTerm(displaySearch)} className="absolute left-2 p-1.5 bg-[#a62626] text-white rounded-lg active:scale-90 transition-transform"> <Search size={14} /> </button>
                </div>
                <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setDisplayLimit(20); }} className="bg-gray-100 rounded-xl px-2 py-2.5 text-[10px] font-black outline-none border border-transparent focus:border-[#a62626]/20 max-w-[100px]">
                  {t.provinces.map(p => <option key={String(p)} value={String(p)}>{String(p)}</option>)}
                </select>
              </div>
              
              {appMode === 'ESTATE' && filterCategory === 'ALL' && (
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                  <button onClick={() => setActiveDealFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeDealFilter === 'ALL' ? 'bg-[#a62626] text-white' : 'bg-gray-100 text-gray-400'}`}>{String(t.all)}</button>
                  <button onClick={() => setActiveDealFilter(DealType.SALE)} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeDealFilter === DealType.SALE ? 'bg-[#a62626] text-white' : 'bg-gray-100 text-gray-400'}`}>{String(t.sale)}</button>
                  <button onClick={() => setActiveDealFilter(DealType.RENT)} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeDealFilter === DealType.RENT ? 'bg-[#a62626] text-white' : 'bg-gray-100 text-gray-400'}`}>{String(t.rent)}</button>
                  <button onClick={() => setActiveDealFilter(DealType.MORTGAGE)} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeDealFilter === DealType.MORTGAGE ? 'bg-[#a62626] text-white' : 'bg-gray-100 text-gray-400'}`}>{String(t.mortgage)}</button>
                </div>
              )}
              {filterCategory !== 'ALL' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-500">{filterCategory === 'MY_ADS' ? 'آگهی‌های من' : 'نشان شده‌ها'}</span>
                  <button onClick={() => setFilterCategory('ALL')} className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full">بازگشت</button>
                </div>
              )}
            </div>
          </div>
          <div ref={scrollRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="flex-1 overflow-y-auto px-3 pb-24 no-scrollbar space-y-3 pt-3 relative">
            {(pullProgress > 0 || isRefreshing) && (
              <div className="flex justify-center py-2 transition-all" style={{ opacity: pullProgress, transform: `scale(${pullProgress})` }}>
                 <div className="bg-white p-3 rounded-full shadow-lg border border-red-50">
                    <RefreshCcw className={`text-red-600 ${isRefreshing ? 'animate-spin' : ''}`} size={24} style={{ transform: `rotate(${pullProgress * 360}deg)` }} />
                 </div>
              </div>
            )}
            {isLoading ? ( <div className="flex flex-col items-center justify-center py-24 gap-4"> <Loader2 className="animate-spin text-[#a62626]" size={40} /> </div> ) : (
              displayedItems.map(item => {
                const type = item.itemType;
                return (
                  <div key={item.id} className="relative">
                    {type === 'ESTATE' ? 
                      <PropertyCard property={item as Property} onClick={() => handleSelectItem(item)} isVisited={visitedIds.has(item.id)} isSaved={savedIds.has(item.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} lang={lang} onDelete={filterCategory === 'MY_ADS' ? () => handleDeleteAd(item.id, 'ESTATE') : undefined} onEdit={filterCategory === 'MY_ADS' ? () => { setEditingItem(item); setShowAddModal(true); } : undefined} /> :
                     type === 'JOBS' ? 
                      <JobCard job={item as Job} onClick={() => handleSelectItem(item)} isVisited={visitedIds.has(item.id)} isSaved={savedIds.has(item.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} lang={lang} onDelete={filterCategory === 'MY_ADS' ? () => handleDeleteAd(item.id, 'JOBS') : undefined} onEdit={filterCategory === 'MY_ADS' ? () => { setEditingItem(item); setShowAddModal(true); } : undefined} /> :
                      <ServiceCard service={item as Service} onClick={() => handleSelectItem(item)} isVisited={visitedIds.has(item.id)} isSaved={savedIds.has(item.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); localStorage.setItem('saved_items', JSON.stringify(Array.from(n))); return n; }); }} lang={lang} onDelete={filterCategory === 'MY_ADS' ? () => handleDeleteAd(item.id, 'SERVICES') : undefined} onEdit={filterCategory === 'MY_ADS' ? () => { setEditingItem(item); setShowAddModal(true); } : undefined} />
                    }
                  </div>
                );
              })
            )}
            {!isLoading && filteredItems.length === 0 && ( <div className="text-center py-24 flex flex-col items-center gap-4 opacity-70 px-8"> <Sparkles size={48} className="text-gray-200" /> <h3 className="font-black text-gray-800 text-lg">{String(t.no_results)}</h3> </div> )}
          </div>
        </div>
        <div className={`flex-1 h-full relative ${viewMode === 'list' ? 'hidden md:block' : 'block'}`}>
          <MapView 
            items={filteredItems} 
            selectedItem={selectedItem} 
            onSelectItem={handleSelectItem} 
            mode={appMode} 
            visitedIds={visitedIds} 
            flyToLocation={mapFlyLocation}
          />
        </div>
        <div className="fixed bottom-0 left-0 right-0 h-[70px] bg-white/95 backdrop-blur-md border-t flex items-center justify-around z-[4000] px-2 shadow-sm pb-env">
          <button onClick={() => handleModeChange('ESTATE')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'ESTATE' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Building2 size={20} /><span className="text-[9px] font-black">{String(t.estate)}</span></button>
          <button onClick={() => handleModeChange('JOBS')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'JOBS' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Briefcase size={20} /><span className="text-[9px] font-black">{String(t.jobs)}</span></button>
          <button onClick={() => { if(!localStorage.getItem('user_phone')) setShowAuthModal(true); else setShowAddModal(true); }} className="w-14 h-14 bg-[#a62626] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/30 -top-6 relative active:scale-90 transition-all border-4 border-white"><Plus size={32} /></button>
          <button onClick={() => handleModeChange('SERVICES')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'SERVICES' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Wrench size={20} /><span className="text-[9px] font-black">{String(t.services)}</span></button>
          <button onClick={() => setShowAuthModal(true)} className={`flex flex-col items-center flex-1 gap-1 transition-all relative ${showAuthModal ? 'text-[#a62626]' : 'text-gray-300'}`}>
            <User size={20} /> <span className="text-[9px] font-black">{String(t.account)}</span>
            {(hasNewUserChats || hasNewAdminMessages) && <div className="absolute top-0 right-1/2 translate-x-3 w-2 h-2 bg-red-600 rounded-full border border-white"></div>}
          </button>
        </div>
      </main>

      {selectedItem && isDetailOpen && (
        <div className="z-[5000] fixed inset-0">
          {selectedItem.itemType === 'ESTATE' ? 
            <PropertyDetails property={selectedItem as Property} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => handleShowOnMap(selectedItem.location)} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(selectedItem.id) ? n.delete(selectedItem.id) : n.add(selectedItem.id); return n; }); }} t={t} /> :
           selectedItem.itemType === 'JOBS' ? 
            <JobDetails job={selectedItem as Job} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => handleShowOnMap(selectedItem.location)} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(selectedItem.id) ? n.delete(selectedItem.id) : n.add(selectedItem.id); return n; }); }} t={t} /> :
           <ServiceDetails service={selectedItem as Service} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => handleShowOnMap(selectedItem.location)} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => { setSavedIds(prev => { const n = new Set(prev); n.has(selectedItem.id) ? n.delete(selectedItem.id) : n.add(selectedItem.id); return n; }); }} t={t} />
          }
        </div>
      )}

      {showAddModal && (
        <div className="z-[6000] fixed inset-0">
          {appMode === 'ESTATE' && <AddPropertyModal editData={editingItem as Property} onClose={() => { setShowAddModal(false); refreshData(); setEditingItem(null); }} t={t} />}
          {appMode === 'JOBS' && <AddJobModal editData={editingItem as Job} onClose={() => { setShowAddModal(false); refreshData(); setEditingItem(null); }} t={t} />}
          {appMode === 'SERVICES' && <AddServiceModal editData={editingItem as Service} onClose={() => { setShowAddModal(false); refreshData(); setEditingItem(null); }} t={t} lang={lang} />}
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} lang={lang} hasUnreadChats={hasNewUserChats} onShowMyAds={() => { setFilterCategory('MY_ADS'); setShowAuthModal(false); }} onShowSaved={() => { setFilterCategory('SAVED'); setShowAuthModal(false); }} onAdminClick={() => { setShowAuthModal(false); setShowAdminLogin(true); }} onCheckNotifications={checkUnreadNotifications} />}
      {showAdminLogin && <AdminLogin onLogin={() => { setShowAdminLogin(false); setIsAdminMode(true); }} onCancel={() => setShowAdminLogin(false)} />}
    </div>
  );
}
export default App;