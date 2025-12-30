
import { useState, useMemo, useEffect, useCallback } from 'react';
import { User, Briefcase, Building2, Wrench, Plus, List, Map as MapIcon, Loader2 } from 'lucide-react';
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
import { ADMINS } from './services/mockData';
import { Property, Job, Service, AppMode, Language, DealType } from './types';
import { translations } from './services/translations';
import { supabase, TABLES, isSupabaseReady } from './services/supabaseClient';

function App() {
  const [lang] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'dari');
  const t = translations[lang];

  const [appMode, setAppMode] = useState<AppMode>('ESTATE');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [selectedItem, setSelectedItem] = useState<Property | Job | Service | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState(t.provinces[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeDealFilter, setActiveDealFilter] = useState<'ALL' | DealType>('ALL');
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('saved_items');
    if (saved) {
      try {
        setSavedIds(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Error loading saved items", e);
      }
    }
  }, []);

  const handleToggleSave = (item: Property | Job | Service) => {
    setSavedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item.id)) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      localStorage.setItem('saved_items', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    if (!isSupabaseReady()) {
      setProperties([]);
      setJobs([]);
      setServices([]);
      setIsLoading(false);
      return;
    }
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
        status: item.status || 'APPROVED'
      });

      setProperties(pRes.data?.map(mapStatus) || []);
      setJobs(jRes.data?.map(mapStatus) || []);
      setServices(sRes.data?.map(mapStatus) || []);
    } catch (e) {
      console.error("Data fetch error:", e);
      setProperties([]);
      setJobs([]);
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const filteredItems = useMemo(() => {
    const userPhone = localStorage.getItem('user_phone') || null;
    let base = appMode === 'ESTATE' ? properties : appMode === 'JOBS' ? jobs : services;
    
    return base.filter(item => {
      const isApproved = item.status === 'APPROVED';
      const isOwner = userPhone && item.ownerId === userPhone;
      
      if (!isApproved && !isOwner) return false;

      const titleMatch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      const isAllCity = selectedProvince === t.provinces[0];
      const cityMatch = isAllCity || item.city === selectedProvince;
      
      if (!titleMatch || !cityMatch) return false;

      if (appMode === 'ESTATE') {
        const p = item as Property;
        return activeDealFilter === 'ALL' || p.dealType === activeDealFilter;
      }
      return true;
    });
  }, [appMode, searchTerm, activeDealFilter, selectedProvince, properties, jobs, services, t]);

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
      <header className="h-[60px] bg-white border-b flex items-center justify-between px-4 z-[3000] shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} 
            className="bg-gray-900 text-white px-4 py-2 rounded-xl font-black text-[11px] md:hidden flex items-center gap-2 active:scale-95 transition-transform"
          >
            {viewMode === 'list' ? (
              <><MapIcon size={16} /> <span>{t.map}</span></>
            ) : (
              <><List size={16} /> <span>{t.list}</span></>
            )}
          </button>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => setShowAddModal(true)} className="bg-[#a62626] text-white px-5 py-2 rounded-xl font-black text-xs shadow-lg shadow-red-900/20 active:scale-95">ثبت آگهی</button>
            <button onClick={() => setShowAuthModal(true)} className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"><User size={22} /></button>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <h1 className="font-black text-[#a62626] text-lg leading-none">خانه افغانستان</h1>
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Real Estate & Jobs</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className={`w-full md:w-[420px] h-full flex flex-col bg-white z-20 shrink-0 border-l ${viewMode === 'map' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 bg-gray-50 shrink-0">
            <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={appMode === 'ESTATE' ? t.search_estate : appMode === 'JOBS' ? t.search_jobs : t.search_services} 
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none border border-transparent focus:border-[#a62626]/20 transition-all" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <select 
                  value={selectedProvince} 
                  onChange={(e) => setSelectedProvince(e.target.value)} 
                  className="bg-gray-100 rounded-xl px-3 py-2.5 text-[11px] font-black outline-none border border-transparent focus:border-[#a62626]/20"
                >
                  {t.provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {appMode === 'ESTATE' && (
                 <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    <button onClick={() => setActiveDealFilter('ALL')} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeDealFilter === 'ALL' ? 'bg-[#a62626] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{t.all}</button>
                    {Object.values(DealType).map(type => (
                       <button key={type} onClick={() => setActiveDealFilter(type)} className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${activeDealFilter === type ? 'bg-[#a62626] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{type}</button>
                    ))}
                 </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-3 pb-24 no-scrollbar space-y-3 pt-3">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-24 gap-4">
                 <Loader2 className="animate-spin text-[#a62626]" size={40} />
                 <p className="text-[10px] font-black text-gray-400">در حال بروزرسانی لیست...</p>
               </div>
            ) : (
              filteredItems.map(item => (
                <div key={item.id} className="relative">
                  {item.status === 'PENDING' && (
                    <div className="absolute top-2 right-2 z-10 bg-amber-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black shadow-sm">در انتظار تایید</div>
                  )}
                  {appMode === 'ESTATE' ? 
                    <PropertyCard property={item as Property} onClick={() => handleSelectItem(item)} isVisited={visitedIds.has(item.id)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} /> :
                   appMode === 'JOBS' ? 
                    <JobCard job={item as Job} onClick={() => handleSelectItem(item)} isVisited={visitedIds.has(item.id)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} /> :
                    <ServiceCard service={item as Service} onClick={() => handleSelectItem(item)} isVisited={visitedIds.has(item.id)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} />
                  }
                </div>
              ))
            )}
            {!isLoading && filteredItems.length === 0 && (
              <div className="text-center py-24 flex flex-col items-center gap-4 opacity-40">
                <Building2 size={64} className="text-gray-300" />
                <p className="font-black text-xs">{t.no_results}</p>
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
          <button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-[#a62626] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/30 -top-6 relative active:scale-90 transition-all border-4 border-white"><Plus size={32} /></button>
          <button onClick={() => handleModeChange('SERVICES')} className={`flex flex-col items-center flex-1 gap-1 transition-all ${appMode === 'SERVICES' ? 'text-[#a62626] scale-110' : 'text-gray-300'}`}><Wrench size={20} /><span className="text-[9px] font-black">{t.services}</span></button>
          <button onClick={() => setShowAuthModal(true)} className="flex flex-col items-center flex-1 gap-1 text-gray-300 active:text-gray-600"><User size={20} /><span className="text-[9px] font-black">{t.account}</span></button>
        </div>
      </main>

      {selectedItem && isDetailOpen && (
        <div className="z-[5000] fixed inset-0">
          {appMode === 'ESTATE' && <PropertyDetails property={selectedItem as Property} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} />}
          {appMode === 'JOBS' && <JobDetails job={selectedItem as Job} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} />}
          {appMode === 'SERVICES' && <ServiceDetails service={selectedItem as Service} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} />}
        </div>
      )}

      {showAddModal && (
        <div className="z-[6000] fixed inset-0">
          {appMode === 'ESTATE' && <AddPropertyModal onClose={() => { setShowAddModal(false); refreshData(); }} t={t} />}
          {appMode === 'JOBS' && <AddJobModal onClose={() => { setShowAddModal(false); refreshData(); }} t={t} />}
          {appMode === 'SERVICES' && <AddServiceModal onClose={() => { setShowAddModal(false); refreshData(); }} t={t} />}
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} lang={lang} onShowMyAds={() => {}} onShowSaved={() => {}} onAdminClick={() => { setShowAuthModal(false); setShowAdminLogin(true); }} />}
      {showAdminLogin && <AdminLogin admins={ADMINS} onLogin={() => { setShowAdminLogin(false); setIsAdminMode(true); }} onCancel={() => setShowAdminLogin(false)} />}
    </div>
  );
}

export default App;
