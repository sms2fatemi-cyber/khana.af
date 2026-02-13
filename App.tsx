
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, User, 
  Home, PlusSquare, Menu,
  List as ListIcon, Map as MapIcon, Globe, MessageCircle,
  Briefcase, Wrench, Package, Car, Smartphone, Sofa, Heart,
  HardHat, ShoppingBag, Filter, X as CloseIcon
} from 'lucide-react';
import MapView from './components/MapView';
import PropertyCard from './components/PropertyCard';
import PropertyDetails from './components/PropertyDetails';
import JobCard from './components/JobCard';
import JobDetails from './components/JobDetails';
import ServiceCard from './components/ServiceCard';
import ServiceDetails from './components/ServiceDetails';
import GeneralAdCard from './components/GeneralAdCard';
import GeneralAdDetails from './components/GeneralAdDetails';
import AddPropertyModal from './components/AddPropertyModal';
import AddJobModal from './components/AddJobModal';
import AddServiceModal from './components/AddServiceModal';
import AddGeneralAdModal from './components/AddGeneralAdModal';
import AuthModal from './components/AuthModal';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import ChatList from './components/ChatList';
import SkeletonCard from './components/SkeletonCard';
import { AppMode, Language, Location, Ad } from './types';
import { translations } from './services/translations';
import { supabase, TABLES, isSupabaseReady } from './services/supabaseClient';

const PAGE_SIZE = 15;
const EXPIRY_DAYS = 60;

const PROVINCE_COORDS: Record<string, Location> = {
  'کابل': { lat: 34.5553, lng: 69.2075 },
  'هرات': { lat: 34.3419, lng: 62.2031 },
  'بلخ': { lat: 36.7061, lng: 67.1122 },
  'قندهار': { lat: 31.6289, lng: 65.7372 },
  'ننگرهار': { lat: 34.4261, lng: 70.4515 },
  'بامیان': { lat: 34.8100, lng: 67.8212 },
  'غزنی': { lat: 33.5450, lng: 68.4174 },
  'کندوز': { lat: 36.7289, lng: 68.8679 },
  'بدخشان': { lat: 37.1166, lng: 70.5800 },
  'تخار': { lat: 36.6666, lng: 69.4666 },
  'بغلان': { lat: 36.1779, lng: 68.7042 },
  'پروان': { lat: 35.0135, lng: 69.2152 },
  'کاپیسا': { lat: 34.9810, lng: 69.3845 },
  'پنجشیر': { lat: 35.3353, lng: 69.5444 },
  'میدان وردک': { lat: 34.3946, lng: 68.5144 },
  'لوگر': { lat: 33.9972, lng: 69.1121 },
  'پکتیا': { lat: 33.5239, lng: 69.2145 },
  'پکتیکا': { lat: 32.7914, lng: 68.7997 },
  'خوست': { lat: 33.3334, lng: 69.9167 },
  'لغمان': { lat: 34.6667, lng: 70.1667 },
  'کنر': { lat: 34.8465, lng: 71.1472 },
  'نورستان': { lat: 35.3400, lng: 70.8300 },
  'جوزجان': { lat: 36.6475, lng: 65.7501 },
  'فاریاب': { lat: 35.9312, lng: 64.7824 },
  'سرپل': { lat: 36.2206, lng: 65.9277 },
  'سمنگان': { lat: 36.2646, lng: 68.0151 },
  'بادغیس': { lat: 35.0000, lng: 63.5000 },
  'غور': { lat: 34.5000, lng: 64.5000 },
  'دایکندی': { lat: 33.6700, lng: 66.0700 },
  'اروزگان': { lat: 32.9274, lng: 65.8672 },
  'زابل': { lat: 32.1864, lng: 67.2343 },
  'هلمند': { lat: 31.3636, lng: 64.3662 },
  'فراه': { lat: 32.3421, lng: 62.1164 },
  'نیمروز': { lat: 31.0000, lng: 62.5000 }
};

const toEnglishDigits = (str: string): string => {
  return str.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
            .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'dari';
  });
  const t = (translations as any)[lang];

  const [userPhone] = useState<string | null>(localStorage.getItem('user_phone'));
  const [appMode, setAppMode] = useState<AppMode | 'ALL' | 'SAVED' | 'CHATS'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState(t.provinces[0]);
  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealTypeFilter, setDealTypeFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  const [unreadAdminCount, setUnreadAdminCount] = useState(0);
  const [unreadUserCount, setUnreadUserCount] = useState(0);
  
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const local = localStorage.getItem('saved_ads_ids');
    return local ? new Set(JSON.parse(local)) : new Set();
  });

  const [visitedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('visited_ads');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [showAddCategoryPicker, setShowAddCategoryPicker] = useState(false);
  const [showNavCategoryPicker, setShowNavCategoryPicker] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetAddMode, setTargetAddMode] = useState<AppMode | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loggedAdmin, setLoggedAdmin] = useState<any>(null);

  const mainScrollRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
    window.location.reload();
  };

  const fetchUnreadCounts = useCallback(async () => {
    if (!userPhone) return;
    try {
      const { count: adminCount } = await supabase.from(TABLES.USER_CHATS).select('*', { count: 'exact', head: true }).match({ receiver_phone: userPhone, sender_phone: 'ADMIN', is_read: false });
      const { count: userCount } = await supabase.from(TABLES.USER_CHATS).select('*', { count: 'exact', head: true }).eq('receiver_phone', userPhone).neq('sender_phone', 'ADMIN').eq('is_read', false);
      setUnreadAdminCount(adminCount || 0);
      setUnreadUserCount(userCount || 0);
    } catch (e) { console.error("Count Error:", e); }
  }, [userPhone]);

  useEffect(() => {
    fetchUnreadCounts();
    if (!userPhone) return;

    const channel = supabase.channel('global_unread_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: TABLES.USER_CHATS
      }, (payload: any) => { 
        if (payload.new.receiver_phone === userPhone || payload.old?.receiver_phone === userPhone) {
          fetchUnreadCounts(); 
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userPhone, fetchUnreadCounts]);

  const fetchSavedIdsFromDb = useCallback(async () => {
    if (!userPhone) return;
    try {
      const { data } = await supabase.from(TABLES.SAVED_ADS).select('ad_id').eq('user_phone', userPhone);
      if (data) {
        const dbIds = new Set(data.map((d: any) => d.ad_id)) as Set<string>;
        setSavedIds(prev => {
          const merged = new Set<string>([...Array.from(prev), ...Array.from(dbIds)]);
          localStorage.setItem('saved_ads_ids', JSON.stringify(Array.from(merged)));
          return merged;
        });
      }
    } catch (e) { console.error(e); }
  }, [userPhone]);

  useEffect(() => { fetchSavedIdsFromDb(); }, [fetchSavedIdsFromDb]);

  const fetchAds = useCallback(async (isReset = false) => {
    if (!isSupabaseReady() || (isLoading && !isReset)) return;
    if ((appMode as string) === 'CHATS') return;
    
    setIsLoading(true);
    const currentPage = isReset ? 0 : page;
    const expiryISO = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    try {
      if (appMode === 'SAVED') {
        const results = [];
        const idsArray = Array.from(savedIds);
        if (idsArray.length > 0) {
          for (const table of [TABLES.PROPERTIES, TABLES.JOBS, TABLES.SERVICES, TABLES.GENERAL_ADS]) {
            const { data } = await supabase.from(table).select('*').in('id', idsArray);
            if (data) {
              const typeMap: any = { [TABLES.PROPERTIES]: 'ESTATE', [TABLES.JOBS]: 'JOBS', [TABLES.SERVICES]: 'SERVICES', [TABLES.GENERAL_ADS]: 'GENERAL' };
              results.push(...data.map(d => ({ ...d, adType: typeMap[table] })));
            }
          }
        }
        setItems(results.sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()));
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      const applyFilters = (q: any, tableType: 'ESTATE' | 'JOBS' | 'SERVICES' | 'GENERAL') => {
        let query = q.eq('status', 'APPROVED').gte('created_at', expiryISO);
        if (ownerFilter) {
          query = query.eq('owner_id', ownerFilter);
        } else {
          if (selectedProvince !== t.provinces[0]) query = query.eq('city', selectedProvince);
          if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);
          if (tableType === 'ESTATE' && dealTypeFilter) query = query.eq('deal_type', dealTypeFilter);
          
          const engMin = minPrice ? parseInt(toEnglishDigits(minPrice.replace(/,/g, ''))) : null;
          const engMax = maxPrice ? parseInt(toEnglishDigits(maxPrice.replace(/,/g, ''))) : null;
          const priceCol = tableType === 'JOBS' ? 'salary' : 'price';
          if (engMin !== null && !isNaN(engMin)) query = query.gte(priceCol, engMin);
          if (engMax !== null && !isNaN(engMax)) query = query.lte(priceCol, engMax);
        }
        return query;
      };

      let normalizedResults: any[] = [];
      if (appMode === 'ALL') {
        const itemsPerTable = 5;
        const [p, j, s, g] = await Promise.all([
          applyFilters(supabase.from(TABLES.PROPERTIES).select('*'), 'ESTATE').order('created_at', { ascending: false }).range(currentPage * itemsPerTable, (currentPage + 1) * itemsPerTable - 1),
          applyFilters(supabase.from(TABLES.JOBS).select('*'), 'JOBS').order('created_at', { ascending: false }).range(currentPage * itemsPerTable, (currentPage + 1) * itemsPerTable - 1),
          applyFilters(supabase.from(TABLES.SERVICES).select('*'), 'SERVICES').order('created_at', { ascending: false }).range(currentPage * itemsPerTable, (currentPage + 1) * itemsPerTable - 1),
          applyFilters(supabase.from(TABLES.GENERAL_ADS).select('*'), 'GENERAL').order('created_at', { ascending: false }).range(currentPage * itemsPerTable, (currentPage + 1) * itemsPerTable - 1),
        ]);
        normalizedResults = [
          ...(p.data || []).map((x: Ad) => ({...x, adType: 'ESTATE'})),
          ...(j.data || []).map((x: Ad) => ({...x, adType: 'JOBS'})),
          ...(s.data || []).map((x: Ad) => ({...x, adType: 'SERVICES'})),
          ...(g.data || []).map((x: Ad) => ({...x, adType: 'GENERAL'})),
        ].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
      } else {
        const table = appMode === 'ESTATE' ? TABLES.PROPERTIES : appMode === 'JOBS' ? TABLES.JOBS : appMode === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
        const tableType = appMode === 'ESTATE' ? 'ESTATE' : appMode === 'JOBS' ? 'JOBS' : appMode === 'SERVICES' ? 'SERVICES' : 'GENERAL';
        let q = supabase.from(table).select('*');
        if (table === TABLES.GENERAL_ADS) q = q.eq('mode', appMode);
        q = applyFilters(q, tableType);
        const { data } = await q.order('created_at', { ascending: false }).range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
        normalizedResults = (data || []).map((item: any) => ({ ...item, adType: tableType }));
      }

      if (isReset) {
        setItems(normalizedResults);
        setPage(1);
        setHasMore(normalizedResults.length > 0); 
      } else {
        setItems(prev => [...prev, ...normalizedResults]);
        setPage(currentPage + 1);
        setHasMore(normalizedResults.length > 0);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [appMode, selectedProvince, searchTerm, dealTypeFilter, page, isLoading, userPhone, t, minPrice, maxPrice, savedIds, ownerFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchAds(true); }, 500);
    return () => clearTimeout(timer);
  }, [appMode, selectedProvince, searchTerm, dealTypeFilter, minPrice, maxPrice, ownerFilter]);

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    const coords = PROVINCE_COORDS[province];
    if (coords) setFlyToLocation(coords);
  };

  const handleToggleSave = async (item: any) => {
    const isSaved = savedIds.has(item.id);
    const next = new Set(savedIds);
    if (isSaved) next.delete(item.id); else next.add(item.id);
    setSavedIds(next);
    localStorage.setItem('saved_ads_ids', JSON.stringify(Array.from(next)));
    if (userPhone) {
      try {
        const table = item.adType === 'ESTATE' ? TABLES.PROPERTIES : item.adType === 'JOBS' ? TABLES.JOBS : item.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
        if (isSaved) await supabase.from(TABLES.SAVED_ADS).delete().match({ user_phone: userPhone, ad_id: item.id });
        else await supabase.from(TABLES.SAVED_ADS).insert([{ user_phone: userPhone, ad_id: item.id, ad_table: table }]);
      } catch (e) { console.error("Database sync failed."); }
    }
  };

  const handleShowOtherAds = (ownerId: string) => {
    setOwnerFilter(ownerId);
    setAppMode('ALL');
    setIsDetailOpen(false);
    setSelectedItem(null);
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !isLoading && appMode !== 'SAVED' && appMode !== 'CHATS') {
      fetchAds();
    }
  };

  if (isAdminMode) return <AdminPanel onExit={() => setIsAdminMode(false)} properties={[]} jobs={[]} services={[]} currentAdmin={loggedAdmin} />;

  return (
    <div className="flex flex-col h-screen bg-white font-[Vazirmatn] overflow-hidden text-gray-800" dir="rtl">
      {showAdminLogin && <AdminLogin onLogin={(adm) => { setLoggedAdmin(adm); setShowAdminLogin(false); setIsAdminMode(true); }} onCancel={() => setShowAdminLogin(false)} />}
      
      <header className={`bg-white border-b flex items-center justify-between px-4 lg:px-12 z-[3000] shrink-0 gap-2 transition-all ${viewMode === 'map' ? 'h-[45px] max-md:h-[40px] px-2' : 'h-[64px]'}`}>
        <div className="flex items-center gap-2 lg:gap-6 flex-1 overflow-hidden">
          <div className={`flex items-center cursor-pointer shrink-0 ${viewMode === 'map' ? 'max-md:hidden' : ''}`} onClick={() => {setAppMode('ALL'); setViewMode('list'); setDealTypeFilter(null); setOwnerFilter(null);}}>
             <span className="text-[#a62626] text-lg lg:text-2xl font-black">Khana</span>
          </div>
          <div className={`flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 shrink-0 border border-gray-200 ${viewMode === 'map' ? 'max-md:scale-90' : 'py-1.5'}`}>
            <Globe size={14} className="text-gray-400" />
            <select value={selectedProvince} onChange={(e) => handleProvinceChange(e.target.value)} className="bg-transparent text-[10px] lg:text-xs font-black outline-none border-none cursor-pointer">
              {t.provinces.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className={`flex items-center flex-1 max-w-md relative ${viewMode === 'map' ? 'max-md:scale-90' : ''}`}>
             <input type="text" placeholder={t.search_placeholder} className={`w-full bg-gray-50 rounded-md pr-8 pl-2 py-1.5 text-[10px] lg:text-xs font-black outline-none border border-gray-200 ${viewMode === 'map' ? 'max-md:py-1' : 'py-2'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <Search size={14} className="absolute right-2.5 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setAppMode('CHATS')} className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border relative ${appMode === 'CHATS' ? 'bg-red-50 text-red-600' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>
              <MessageCircle size={18}/>
              <span className="text-xs font-black">{t.chat}</span>
              {unreadUserCount > 0 && <div className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
           </button>
           <button onClick={() => userPhone ? setShowAddCategoryPicker(true) : setShowAuthModal(true)} className={`bg-[#a62626] text-white rounded-md font-black text-[10px] lg:text-xs shadow-md active:scale-95 transition-transform ${viewMode === 'map' ? 'px-2 py-1' : 'px-3 lg:px-6 py-2'}`}>{t.add_post}</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden lg:flex flex-col w-72 border-l overflow-y-auto p-5 shrink-0 no-scrollbar bg-white">
           <nav className="space-y-1 flex-1">
              {[
                { id: 'ESTATE', label: t.estate, icon: Home },
                { id: 'VEHICLES', label: t.vehicles, icon: Car },
                { id: 'DIGITAL', label: t.digital, icon: Smartphone },
                { id: 'HOME_KITCHEN', label: t.home_kitchen, icon: Sofa },
                { id: 'SERVICES', label: t.services, icon: Wrench },
                { id: 'JOBS', label: t.jobs, icon: Briefcase },
                { id: 'PERSONAL', label: t.personal, icon: ShoppingBag },
                { id: 'INDUSTRIAL', label: t.industrial, icon: HardHat },
                { id: 'OTHERS', label: t.others, icon: Package },
              ].map(cat => (
                <div key={cat.id} onClick={() => {setAppMode(cat.id as any); setDealTypeFilter(null); setOwnerFilter(null);}} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${appMode === cat.id ? 'bg-red-50 text-red-600 font-black border border-red-100' : 'text-gray-500 hover:bg-gray-50'}`}>
                   <cat.icon size={18} /> <span className="text-sm">{cat.label}</span>
                </div>
              ))}
           </nav>
           <div className="pt-4 border-t space-y-1">
              <div onClick={() => {setAppMode('SAVED'); setOwnerFilter(null);}} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${appMode === 'SAVED' ? 'bg-red-50 text-red-600 font-black border border-red-100' : 'text-gray-500 hover:bg-gray-50'}`}>
                 <Heart size={18} className={appMode === 'SAVED' ? 'fill-red-600' : ''} /> <span className="text-sm">نشان شده‌ها</span>
              </div>
              <div onClick={() => setShowAuthModal(true)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all relative ${showAuthModal ? 'bg-red-50 text-red-600 font-black' : 'text-gray-500 hover:bg-gray-50'}`}>
                 <User size={18} /> 
                 <span className="text-sm">پروفایل من</span>
                 {unreadAdminCount > 0 && <div className="absolute top-4 left-4 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
              </div>
           </div>
        </aside>

        <main ref={mainScrollRef} onScroll={isDetailOpen ? undefined : handleScroll} className={`flex-1 overflow-y-auto bg-gray-50 transition-all no-scrollbar pb-24 ${viewMode === 'map' ? 'max-md:pb-0' : ''}`}>
          <div className={`max-w-6xl mx-auto h-full flex flex-col ${viewMode === 'map' ? 'max-md:p-0' : 'p-4 lg:p-8'}`}>
             {appMode === 'CHATS' ? <ChatList onClose={() => setAppMode('ALL')} /> : (
               <>
                 <div className={`flex flex-col gap-4 mb-6 shrink-0 ${viewMode === 'map' ? 'max-md:hidden' : ''}`}>
                    {ownerFilter && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-red-600">در حال نمایش آگهی‌های کاربر: {ownerFilter}</span>
                        <button onClick={() => setOwnerFilter(null)} className="p-1 hover:bg-red-100 rounded-full text-red-600"><CloseIcon size={16}/></button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                       <h2 className="text-lg lg:text-xl font-black text-gray-900">
                          {appMode === 'SAVED' ? 'آگهی‌های نشان شده' : (appMode === 'ALL' ? 'آگهی‌های اخیر' : (t as any)[appMode.toLowerCase()] || appMode)}
                       </h2>
                       {appMode !== 'SAVED' && (
                        <div className="flex items-center bg-white border rounded-full px-1 py-1 gap-1 view-toggle-pill shadow-sm">
                          <button onClick={() => setViewMode('list')} className={`p-1.5 px-3 rounded-full transition-all text-[10px] font-black flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-400'}`}>
                            <ListIcon size={12}/> لیست
                          </button>
                          <button onClick={() => setViewMode('map')} className={`p-1.5 px-3 rounded-full transition-all text-[10px] font-black flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-[#a62626] text-white shadow-md' : 'text-gray-400'}`}>
                            <MapIcon size={12}/> نقشه
                          </button>
                        </div>
                       )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 shrink-0">
                        {appMode === 'ESTATE' && ['sale', 'rent', 'mortgage'].map(dt => (
                          <button key={dt} onClick={() => setDealTypeFilter(dealTypeFilter === t[dt] ? null : t[dt])} className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all whitespace-nowrap ${dealTypeFilter === t[dt] ? 'bg-[#a62626] text-white border-[#a62626]' : 'bg-white text-gray-600 border-gray-200'}`}>{t[dt]}</button>
                        ))}
                      </div>
                      <div className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1.5 gap-2 shadow-sm mb-2">
                        <Filter size={12} className="text-gray-400 shrink-0" />
                        <div className="flex items-center gap-1">
                          <input type="tel" placeholder="حداقل قیمت" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-20 lg:w-28 text-[10px] font-black outline-none bg-transparent text-right" />
                          <span className="text-gray-300">|</span>
                          <input type="tel" placeholder="حداکثر قیمت" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-20 lg:w-28 text-[10px] font-black outline-none bg-transparent text-right" />
                        </div>
                      </div>
                    </div>
                 </div>

                 {viewMode === 'map' ? (
                   <div className="flex-1 lg:h-[70vh] lg:rounded-[2.5rem] overflow-hidden lg:border shadow-xl relative h-full">
                     <MapView items={items} selectedItem={selectedItem} onSelectItem={(it) => { setSelectedItem(it); setIsDetailOpen(true); }} visitedIds={visitedIds} flyToLocation={flyToLocation} />
                     <div className="lg:hidden absolute top-2 right-2 z-[2000] flex flex-col gap-2 items-end">
                        <div className="bg-white/90 backdrop-blur-md border border-white/60 p-2 rounded-2xl shadow-2xl flex items-center gap-2 origin-right">
                           <input 
                             type="tel" 
                             placeholder="حداقل قیمت" 
                             value={minPrice} 
                             onChange={(e) => setMinPrice(e.target.value)} 
                             className="w-24 text-[11px] font-black bg-transparent outline-none text-center border-b border-gray-200 py-1" 
                           />
                           <span className="text-gray-300 font-bold">|</span>
                           <input 
                             type="tel" 
                             placeholder="حداکثر قیمت" 
                             value={maxPrice} 
                             onChange={(e) => setMaxPrice(e.target.value)} 
                             className="w-24 text-[11px] font-black bg-transparent outline-none text-center border-b border-gray-200 py-1" 
                           />
                        </div>
                        <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className={`bg-white/95 p-2 rounded-full shadow-lg text-red-600 transition-all border border-red-50 ${(!minPrice && !maxPrice) ? 'scale-0' : 'scale-90 active:scale-75'}`}><CloseIcon size={16}/></button>
                     </div>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {items.length === 0 && !isLoading ? (
                       <div className="col-span-full py-20 text-center text-gray-400 font-black">آگهی یافت نشد.</div>
                     ) : items.map((item, idx) => (
                       <div key={item.id || idx}>
                         {item.adType === 'ESTATE' && <PropertyCard property={item} onClick={() => {setSelectedItem(item); setIsDetailOpen(true);}} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} />}
                         {item.adType === 'JOBS' && <JobCard job={item} onClick={() => {setSelectedItem(item); setIsDetailOpen(true);}} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} />}
                         {item.adType === 'SERVICES' && <ServiceCard service={item} onClick={() => {setSelectedItem(item); setIsDetailOpen(true);}} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} lang={lang} />}
                         {item.adType === 'GENERAL' && <GeneralAdCard ad={item} onClick={() => {setSelectedItem(item); setIsDetailOpen(true);}} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} />}
                       </div>
                     ))}
                     {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                     {!hasMore && items.length > 0 && <div className="col-span-full text-center py-10 text-gray-400 font-bold">پایان لیست</div>}
                   </div>
                 )}
               </>
             )}
          </div>
        </main>
      </div>

      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-[65px] z-[4000] px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe transition-all ${viewMode === 'map' ? 'translate-y-full opacity-0 pointer-events-none' : ''}`}>
        <button onClick={() => { setAppMode('ALL'); setViewMode('list'); setOwnerFilter(null); }} className={`flex flex-col items-center gap-1 ${appMode === 'ALL' ? 'text-[#a62626]' : 'text-gray-400'}`}><Home size={22} /><span className="text-[10px] font-black">خانه</span></button>
        <button onClick={() => setShowNavCategoryPicker(true)} className="flex flex-col items-center gap-1 text-gray-400"><Menu size={22} /><span className="text-[10px] font-black">دسته‌ها</span></button>
        <button onClick={() => userPhone ? setShowAddCategoryPicker(true) : setShowAuthModal(true)} className="flex flex-col items-center -mt-8 bg-[#a62626] text-white p-4 rounded-2xl shadow-xl border-4 border-white active:scale-95 transition-transform"><PlusSquare size={24} /></button>
        <button onClick={() => setAppMode('CHATS')} className={`flex flex-col items-center gap-1 relative ${appMode === 'CHATS' ? 'text-[#a62626]' : 'text-gray-400'}`}>
          <MessageCircle size={22} />
          <span className="text-[10px] font-black">چت</span>
          {unreadUserCount > 0 && <div className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
        </button>
        <button onClick={() => setShowAuthModal(true)} className={`flex flex-col items-center gap-1 relative ${showAuthModal ? 'text-[#a62626]' : 'text-gray-400'}`}>
          <User size={22} />
          <span className="text-[10px] font-black">پروفایل</span>
          {unreadAdminCount > 0 && <div className="absolute top-0 right-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
        </button>
      </nav>

      {viewMode === 'map' && (
        <button onClick={() => setViewMode('list')} className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[4005] bg-white text-[#a62626] px-6 py-3 rounded-full font-black text-xs shadow-2xl border border-gray-100 flex items-center gap-2 active:scale-90 transition-all">
          <ListIcon size={18} /> مشاهده لیست
        </button>
      )}

      {isDetailOpen && selectedItem && (
        <div className="z-[5000] fixed inset-0 bg-white">
          {selectedItem.adType === 'ESTATE' && <PropertyDetails property={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => handleShowOtherAds(selectedItem.owner_id || selectedItem.ownerId)} />}
          {selectedItem.adType === 'JOBS' && <JobDetails job={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => handleShowOtherAds(selectedItem.owner_id || selectedItem.ownerId)} />}
          {selectedItem.adType === 'SERVICES' && <ServiceDetails service={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => handleShowOtherAds(selectedItem.owner_id || selectedItem.ownerId)} />}
          {selectedItem.adType === 'GENERAL' && <GeneralAdDetails ad={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => handleShowOtherAds(selectedItem.owner_id || selectedItem.ownerId)} />}
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} lang={lang} onLanguageChange={handleLanguageChange} onAdminClick={() => { setShowAuthModal(false); setShowAdminLogin(true); }} onCheckNotifications={() => {}} onSelectAd={(ad: any) => { setSelectedItem(ad); setIsDetailOpen(true); setShowAuthModal(false); }} onShowSaved={() => { setAppMode('SAVED'); setShowAuthModal(false); }} onShowChats={() => { setAppMode('CHATS'); setShowAuthModal(false); }} />}
      {showNavCategoryPicker && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-end" onClick={() => setShowNavCategoryPicker(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 grid grid-cols-3 gap-4" onClick={e => e.stopPropagation()}>
            {[
              { id: 'ESTATE', label: t.estate, icon: Home },
              { id: 'VEHICLES', label: t.vehicles, icon: Car },
              { id: 'DIGITAL', label: t.digital, icon: Smartphone },
              { id: 'HOME_KITCHEN', label: t.home_kitchen, icon: Sofa },
              { id: 'SERVICES', label: t.services, icon: Wrench },
              { id: 'JOBS', label: t.jobs, icon: Briefcase },
              { id: 'PERSONAL', label: t.personal, icon: ShoppingBag },
              { id: 'INDUSTRIAL', label: t.industrial, icon: HardHat },
              { id: 'OTHERS', label: t.others, icon: Package }
            ].map(cat => (
              <button key={cat.id} onClick={() => { setAppMode(cat.id as any); setOwnerFilter(null); setShowNavCategoryPicker(false); }} className="flex flex-col items-center gap-2 p-4 border rounded-2xl active:bg-gray-50"><cat.icon size={20} className="text-red-600" /><span className="text-[10px] font-black">{cat.label}</span></button>
            ))}
          </div>
        </div>
      )}
      {showAddCategoryPicker && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4" onClick={() => setShowAddCategoryPicker(false)}>
           <div className="bg-white w-full max-sm:max-w-xs rounded-[2.5rem] p-8" onClick={e => e.stopPropagation()}>
              <h2 className="text-center font-black mb-2 text-xl">ثبت آگهی جدید</h2>
              <p className="text-center text-[11px] font-bold text-gray-400 mb-8">دسته‌بندی مورد نظر را برای انتشار آگهی انتخاب کنید</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto no-scrollbar p-1">
                 {[
                   { id: 'ESTATE', label: t.estate, icon: Home },
                   { id: 'VEHICLES', label: t.vehicles, icon: Car },
                   { id: 'DIGITAL', label: t.digital, icon: Smartphone },
                   { id: 'HOME_KITCHEN', label: t.home_kitchen, icon: Sofa },
                   { id: 'SERVICES', label: t.services, icon: Wrench },
                   { id: 'JOBS', label: t.jobs, icon: Briefcase },
                   { id: 'PERSONAL', label: t.personal, icon: ShoppingBag },
                   { id: 'INDUSTRIAL', label: t.industrial, icon: HardHat },
                   { id: 'OTHERS', label: t.others, icon: Package }
                 ].map(cat => (
                   <button 
                     key={cat.id} 
                     onClick={() => { setTargetAddMode(cat.id as any); setShowAddForm(true); setShowAddCategoryPicker(false); }} 
                     className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-[2rem] hover:bg-red-50 hover:text-red-600 transition-all border border-gray-100 group active:scale-95"
                   >
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all">
                        <cat.icon size={24} />
                      </div>
                      <span className="text-[11px] font-black">{cat.label}</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
      {showAddForm && targetAddMode === 'ESTATE' && <AddPropertyModal t={t} onClose={() => setShowAddForm(false)} />}
      {showAddForm && targetAddMode === 'JOBS' && <AddJobModal t={t} onClose={() => setShowAddForm(false)} />}
      {showAddForm && targetAddMode === 'SERVICES' && <AddServiceModal t={t} onClose={() => setShowAddForm(false)} />}
      {showAddForm && targetAddMode && !['ESTATE', 'JOBS', 'SERVICES'].includes(targetAddMode) && <AddGeneralAdModal mode={targetAddMode} t={t} onClose={() => setShowAddForm(false)} />}
    </div>
  );
}
export default App;
