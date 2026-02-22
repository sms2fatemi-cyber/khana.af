
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, User, 
  Home, PlusSquare, 
  List as ListIcon, Map as MapIcon, Globe, MessageCircle,
  Briefcase, Wrench, Package, Car, Smartphone, Sofa, Heart,
  HardHat, ShoppingBag, X as CloseIcon, Layers, Trophy
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
import { AppMode, Language, Location, Ad, DealType } from './types';
import { translations } from './services/translations';
import { supabase, TABLES, isSupabaseReady } from './services/supabaseClient';

const PAGE_SIZE = 15;
const EXPIRY_DAYS = 60;

export const PROVINCE_COORDS: Record<string, Location> = {
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
  'sمنگان': { lat: 36.2646, lng: 68.0151 },
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

const formatNumberWithCommas = (val: string): string => {
  const engValue = toEnglishDigits(val).replace(/,/g, '');
  if (!engValue || isNaN(Number(engValue))) return '';
  return Number(engValue).toLocaleString();
};

function App() {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'dari');
  const t = (translations as any)[lang];

  const userPhone = localStorage.getItem('user_phone');
  const [appMode, setAppMode] = useState<AppMode | 'ALL' | 'SAVED' | 'CHATS'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [selectedProvince, setSelectedProvince] = useState(() => {
    return localStorage.getItem('user_province') || t.provinces[0];
  });

  const [flyToLocation, setFlyToLocation] = useState<Location | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [isSearchingInArea, setIsSearchingInArea] = useState(false);
  const [showSearchInAreaBtn, setShowSearchInAreaBtn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealTypeFilter, setDealTypeFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  const [unreadUserCount, setUnreadUserCount] = useState(() => Number(localStorage.getItem('unread_user_count')) || 0);
  const [unreadAdminCount, setUnreadAdminCount] = useState(() => Number(localStorage.getItem('unread_admin_count')) || 0);
  
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const local = localStorage.getItem('saved_ads_ids');
    return local ? new Set(JSON.parse(local)) : new Set();
  });

  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('visited_ads');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [showAddCategoryPicker, setShowAddCategoryPicker] = useState(false);
  const [showNavCategoryPicker, setShowNavCategoryPicker] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [targetAddMode, setTargetAddMode] = useState<AppMode | null>(null);
  const [editData, setEditData] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loggedAdmin, setLoggedAdmin] = useState<any>(null);

  const mainScrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 'ESTATE', label: t.estate, icon: Home },
    { id: 'VEHICLES', label: t.vehicles, icon: Car },
    { id: 'DIGITAL', label: t.digital, icon: Smartphone },
    { id: 'HOME_KITCHEN', label: t.home_kitchen, icon: Sofa },
    { id: 'SERVICES', label: t.services, icon: Wrench },
    { id: 'JOBS', label: t.jobs, icon: Briefcase },
    { id: 'ENTERTAINMENT', label: t.entertainment, icon: Trophy },
    { id: 'PERSONAL', label: t.personal, icon: ShoppingBag },
    { id: 'INDUSTRIAL', label: t.industrial, icon: HardHat },
    { id: 'OTHERS', label: t.others, icon: Package },
  ];

  const fetchUnreadCounts = useCallback(async () => {
    if (!userPhone) return;
    try {
      const { count: adminCount } = await supabase.from(TABLES.USER_CHATS).select('*', { count: 'exact', head: true }).match({ receiver_phone: userPhone, sender_phone: 'ADMIN', is_read: false });
      const { count: userCount } = await supabase.from(TABLES.USER_CHATS).select('*', { count: 'exact', head: true }).eq('receiver_phone', userPhone).neq('sender_phone', 'ADMIN').eq('is_read', false);
      
      const aCount = adminCount || 0;
      const uCount = userCount || 0;
      
      setUnreadAdminCount(aCount);
      setUnreadUserCount(uCount);
      
      localStorage.setItem('unread_admin_count', aCount.toString());
      localStorage.setItem('unread_user_count', uCount.toString());
    } catch (e) { console.error(e); }
  }, [userPhone]);

  const fetchAds = useCallback(async (isReset = false) => {
    if (!isSupabaseReady() || (isLoadingRef.current && !isReset)) return;
    if ((appMode as string) === 'CHATS') return;
    
    // Immediate load from cache for 'ALL' mode to feel instant
    if (isReset && appMode === 'ALL' && !searchTerm && !ownerFilter && !dealTypeFilter && !minPrice && !maxPrice && !isSearchingInArea) {
      const cached = localStorage.getItem('feed_cache_all');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        } catch (e) { console.error("Cache parse error", e); }
      }
    }

    setIsLoading(true);
    isLoadingRef.current = true;
    const currentPage = isReset ? 0 : page;
    const expiryISO = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    try {
      if (appMode === 'SAVED') {
        const results = [];
        const idsArray = Array.from(savedIds);
        if (idsArray.length > 0) {
          const cachedObjects = localStorage.getItem('saved_ads_content_cache');
          if (cachedObjects && isReset) {
              const parsed = JSON.parse(cachedObjects).filter((o: any) => savedIds.has(o.id));
              if (parsed.length > 0) {
                  setItems(parsed);
                  setIsLoading(false);
                  isLoadingRef.current = false;
              }
          }
          for (const table of [TABLES.PROPERTIES, TABLES.JOBS, TABLES.SERVICES, TABLES.GENERAL_ADS]) {
            const { data } = await supabase.from(table).select('*').in('id', idsArray);
            if (data) {
              const typeMap: any = { [TABLES.PROPERTIES]: 'ESTATE', [TABLES.JOBS]: 'JOBS', [TABLES.SERVICES]: 'SERVICES', [TABLES.GENERAL_ADS]: 'GENERAL' };
              results.push(...data.map(d => ({ ...d, adType: typeMap[table] })));
            }
          }
          const sorted = results.sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
          setItems(sorted);
          localStorage.setItem('saved_ads_content_cache', JSON.stringify(sorted));
        } else {
            setItems([]);
            localStorage.removeItem('saved_ads_content_cache');
        }
        setHasMore(false); setIsLoading(false); isLoadingRef.current = false; return;
      }

      const applyFilters = (q: any, tableType: 'ESTATE' | 'JOBS' | 'SERVICES' | 'GENERAL') => {
        let query = q.eq('status', 'APPROVED').gte('created_at', expiryISO);
        
        if (isSearchingInArea && mapBounds) {
          const sw = mapBounds.getSouthWest();
          const ne = mapBounds.getNorthEast();
          query = query
            .filter('location->lat', 'gte', sw.lat)
            .filter('location->lat', 'lte', ne.lat)
            .filter('location->lng', 'gte', sw.lng)
            .filter('location->lng', 'lte', ne.lng);
        } else if (ownerFilter) {
          query = query.eq('owner_id', ownerFilter);
        } else {
          if (selectedProvince !== t.provinces[0]) query = query.eq('city', selectedProvince);
          if (searchTerm) query = query.ilike('title', `%${searchTerm}%`);
          if (tableType === 'ESTATE' && dealTypeFilter) query = query.eq('deal_type', dealTypeFilter);
          const engMin = minPrice ? parseInt(toEnglishDigits(minPrice).replace(/,/g, '')) : null;
          const engMax = maxPrice ? parseInt(toEnglishDigits(maxPrice).replace(/,/g, '')) : null;
          const priceCol = tableType === 'JOBS' ? 'salary' : 'price';
          if (engMin !== null && !isNaN(engMin)) query = query.gte(priceCol, engMin);
          if (engMax !== null && !isNaN(engMax)) query = query.lte(priceCol, engMax);
        }
        return query;
      };

      let normalizedResults: any[] = [];
      if (appMode === 'ALL') {
        const mapLimit = viewMode === 'map' ? (isSearchingInArea ? 100 : 25) : 10;
        const [p, j, s, g] = await Promise.all([
          applyFilters(supabase.from(TABLES.PROPERTIES).select('*'), 'ESTATE').order('created_at', { ascending: false }).limit(mapLimit),
          applyFilters(supabase.from(TABLES.JOBS).select('*'), 'JOBS').order('created_at', { ascending: false }).limit(mapLimit),
          applyFilters(supabase.from(TABLES.SERVICES).select('*'), 'SERVICES').order('created_at', { ascending: false }).limit(mapLimit),
          applyFilters(supabase.from(TABLES.GENERAL_ADS).select('*'), 'GENERAL').order('created_at', { ascending: false }).limit(mapLimit),
        ]);
        normalizedResults = [
          ...(p.data || []).map((x: Ad) => ({...x, adType: 'ESTATE'})),
          ...(j.data || []).map((x: Ad) => ({...x, adType: 'JOBS'})),
          ...(s.data || []).map((x: Ad) => ({...x, adType: 'SERVICES'})),
          ...(g.data || []).map((x: Ad) => ({...x, adType: 'GENERAL'})),
        ].sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
        
        // Update cache for 'ALL' mode
        if (isReset && !searchTerm && !ownerFilter && !dealTypeFilter && !minPrice && !maxPrice && !isSearchingInArea) {
          localStorage.setItem('feed_cache_all', JSON.stringify(normalizedResults));
        }
      } else {
        const table = appMode === 'ESTATE' ? TABLES.PROPERTIES : appMode === 'JOBS' ? TABLES.JOBS : appMode === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
        const tableType = (appMode === 'ESTATE') ? 'ESTATE' : (appMode === 'JOBS') ? 'JOBS' : (appMode === 'SERVICES') ? 'SERVICES' : 'GENERAL';
        let q = supabase.from(table).select('*');
        if (table === TABLES.GENERAL_ADS) q = q.eq('mode', appMode);
        q = applyFilters(q, tableType);
        const rangeEnd = viewMode === 'map' ? (isSearchingInArea ? 299 : 99) : (currentPage + 1) * PAGE_SIZE - 1;
        const { data } = await q.order('created_at', { ascending: false }).range(currentPage * PAGE_SIZE, rangeEnd);
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
    } catch (err) { console.error(err); } finally { 
      setIsLoading(false); 
      isLoadingRef.current = false;
    }
  }, [appMode, viewMode, selectedProvince, searchTerm, dealTypeFilter, page, userPhone, t, minPrice, maxPrice, savedIds, ownerFilter, isSearchingInArea, mapBounds]);

  useEffect(() => {
    fetchUnreadCounts();
    const chatChannel = supabase.channel('live-chats').on('postgres_changes', { event: '*', schema: 'public', table: TABLES.USER_CHATS }, () => fetchUnreadCounts()).subscribe();
    
    // Ads Channel Listener: Clear from visitedIds if an ad is boosted (updated)
    const adsChannel = supabase.channel('live-ads-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.PROPERTIES }, (payload) => {
        if (payload.eventType === 'UPDATE') {
           setVisitedIds(prev => {
             const next = new Set(prev);
             if (next.has(payload.new.id)) {
               next.delete(payload.new.id);
               localStorage.setItem('visited_ads', JSON.stringify(Array.from(next)));
             }
             return next;
           });
        }
        fetchAds(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.JOBS }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setVisitedIds(prev => {
            const next = new Set(prev);
            if (next.has(payload.new.id)) {
              next.delete(payload.new.id);
              localStorage.setItem('visited_ads', JSON.stringify(Array.from(next)));
            }
            return next;
          });
        }
        fetchAds(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.SERVICES }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setVisitedIds(prev => {
            const next = new Set(prev);
            if (next.has(payload.new.id)) {
              next.delete(payload.new.id);
              localStorage.setItem('visited_ads', JSON.stringify(Array.from(next)));
            }
            return next;
          });
        }
        fetchAds(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.GENERAL_ADS }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setVisitedIds(prev => {
            const next = new Set(prev);
            if (next.has(payload.new.id)) {
              next.delete(payload.new.id);
              localStorage.setItem('visited_ads', JSON.stringify(Array.from(next)));
            }
            return next;
          });
        }
        fetchAds(true);
      })
      .subscribe();

    const handleMessagesRead = () => fetchUnreadCounts();
    window.addEventListener('messages_read', handleMessagesRead);
    const handleSavedSync = () => {
        const local = localStorage.getItem('saved_ads_ids');
        setSavedIds(local ? new Set(JSON.parse(local)) : new Set());
    };
    window.addEventListener('saved_ads_updated', handleSavedSync);
    return () => { 
      supabase.removeChannel(chatChannel); 
      supabase.removeChannel(adsChannel);
      window.removeEventListener('messages_read', handleMessagesRead);
      window.removeEventListener('saved_ads_updated', handleSavedSync);
    };
  }, [userPhone, fetchUnreadCounts, fetchAds]);

  useEffect(() => {
    // Reduce delay for mode switching to feel faster
    const delay = (appMode === 'ALL' && viewMode === 'list') ? 50 : 250;
    const timer = setTimeout(() => { 
      if (mainScrollRef.current && appMode !== 'CHATS') mainScrollRef.current.scrollTop = 0;
      if (viewMode !== 'map') {
        setIsSearchingInArea(false);
        setShowSearchInAreaBtn(false);
      }
      fetchAds(true); 
    }, delay);
    return () => clearTimeout(timer);
  }, [appMode, viewMode, selectedProvince, searchTerm, dealTypeFilter, minPrice, maxPrice, ownerFilter, isSearchingInArea]);

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    localStorage.setItem('user_province', province);
    setIsSearchingInArea(false);
    setShowSearchInAreaBtn(false);
    const coords = PROVINCE_COORDS[province];
    if (coords) setFlyToLocation(coords);
  };

  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
    if (!isSearchingInArea) {
      setShowSearchInAreaBtn(true);
    } else {
      // If already searching in area, we might want to refresh automatically on move?
      // Or just let the user click the button again if they move far.
      // For now, let's show the button again if they move.
      setShowSearchInAreaBtn(true);
    }
  };

  const handleToggleSave = async (item: any) => {
    const isSaved = savedIds.has(item.id);
    const next = new Set(savedIds);
    if (isSaved) next.delete(item.id); else next.add(item.id);
    setSavedIds(next);
    localStorage.setItem('saved_ads_ids', JSON.stringify(Array.from(next)));
    const cachedObjects = localStorage.getItem('saved_ads_content_cache');
    if (cachedObjects) {
        let parsed = JSON.parse(cachedObjects);
        if (isSaved) parsed = parsed.filter((o: any) => o.id !== item.id);
        else parsed = [item, ...parsed];
        localStorage.setItem('saved_ads_content_cache', JSON.stringify(parsed));
    }
  };

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
    
    // Add to visitedIds and persist
    setVisitedIds(prev => {
      if (prev.has(item.id)) return prev;
      const next = new Set(prev);
      next.add(item.id);
      localStorage.setItem('visited_ads', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleDeleteAd = async (item: any) => {
    if (!confirm('آیا از حذف این آگهی مطمئن هستید؟')) return;
    const table = item.adType === 'ESTATE' ? TABLES.PROPERTIES : item.adType === 'JOBS' ? TABLES.JOBS : item.adType === 'SERVICES' ? TABLES.SERVICES : TABLES.GENERAL_ADS;
    const { error } = await supabase.from(table).delete().eq('id', item.id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      setIsDetailOpen(false);
      alert("آگهی با موفقیت حذف شد.");
    }
  };

  const handleEditAd = (item: any) => {
    setTargetAddMode(item.adType === 'GENERAL' ? item.mode : item.adType);
    setEditData(item);
    setShowAddForm(true);
    setIsDetailOpen(false);
  };

  const handleNavHome = () => {
    setAppMode('ALL');
    setOwnerFilter(null);
    setDealTypeFilter(null);
    setMinPrice('');
    setMaxPrice('');
    setSearchTerm('');
    setIsSearchingInArea(false);
    setShowSearchInAreaBtn(false);
    if (viewMode === 'list') mainScrollRef.current?.scrollTo(0, 0);
  };

  const openAddPost = () => {
    if (!userPhone) setShowAuthModal(true);
    else { setEditData(null); setShowAddCategoryPicker(true); }
  };

  if (isAdminMode) return <AdminPanel onExit={() => setIsAdminMode(false)} currentAdmin={loggedAdmin} properties={[]} jobs={[]} services={[]} />;

  return (
    <div className="flex flex-col h-[100dvh] bg-white font-[Vazirmatn] overflow-hidden text-gray-800" dir="rtl">
      {showAdminLogin && <AdminLogin onLogin={(adm) => { setLoggedAdmin(adm); setShowAdminLogin(false); setIsAdminMode(true); }} onCancel={() => setShowAdminLogin(false)} />}
      
      <header className={`bg-white border-b flex items-center justify-between px-4 lg:px-12 z-[3000] shrink-0 gap-1 lg:gap-2 transition-all ${viewMode === 'map' ? 'h-[45px] max-md:h-[40px] px-2' : 'h-[64px]'}`}>
        <div className="flex items-center gap-1 lg:gap-6 flex-1 overflow-hidden">
          <div className="md:hidden flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 shrink-0">
             <button onClick={() => setViewMode('list')} className={`p-1 px-2 rounded-md transition-all text-[8px] font-black ${(viewMode as string) === 'list' ? 'bg-[#a62626] text-white' : 'text-gray-400'}`}>{t.list}</button>
             <button onClick={() => setViewMode('map')} className={`p-1 px-2 rounded-md transition-all text-[8px] font-black ${(viewMode as string) === 'map' ? 'bg-[#a62626] text-white' : 'text-gray-400'}`}>{t.map}</button>
          </div>
          <div className="hidden md:flex items-center cursor-pointer shrink-0" onClick={handleNavHome}>
             <span className="text-[#a62626] text-lg lg:text-2xl font-black">Khana</span>
          </div>
          <div className={`flex items-center gap-0.5 bg-gray-100 rounded-lg px-1.5 py-1 shrink-0 border border-gray-200 transition-all ${viewMode === 'map' ? 'max-md:scale-75' : 'max-md:scale-90 max-md:-ml-1'}`}>
            <Globe size={12} className="text-gray-400" />
            <select value={selectedProvince} onChange={(e) => handleProvinceChange(e.target.value)} className="bg-transparent text-[9px] lg:text-xs font-black outline-none border-none cursor-pointer">
              {t.provinces.map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className={`flex items-center flex-1 relative max-w-[200px] lg:max-w-md ${viewMode === 'map' ? 'max-md:scale-85' : 'max-md:scale-95 max-md:-mr-2'}`}>
             <input type="text" placeholder={t.search_placeholder} className={`w-full bg-gray-50 rounded-md pr-7 pl-2 py-1 text-[9px] lg:text-xs font-black outline-none border border-gray-200 ${viewMode === 'map' ? 'max-md:py-0.5' : 'py-1.5'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <Search size={12} className="absolute right-2 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
           <button onClick={() => setAppMode('CHATS')} className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border relative ${appMode === 'CHATS' ? 'bg-red-50 text-red-600' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>
              <MessageCircle size={18}/>
              <span className="text-xs font-black">{t.chat}</span>
              {unreadUserCount > 0 && <div className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
           </button>
           <button onClick={() => setShowAuthModal(true)} className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 relative">
              <User size={18}/>
              <span className="text-xs font-black">{t.profile}</span>
              {unreadAdminCount > 0 && <div className="absolute top-1 right-2 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
           </button>
           <button onClick={openAddPost} className={`hidden md:block bg-[#a62626] text-white rounded-md font-black text-[10px] lg:text-xs shadow-md active:scale-95 transition-transform ${viewMode === 'map' ? 'px-2 py-1' : 'px-3 lg:px-6 py-2'}`}>{t.add_post}</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden lg:flex flex-col w-72 border-l overflow-y-auto p-5 shrink-0 no-scrollbar bg-white">
           <nav className="space-y-1 flex-1">
              <div onClick={handleNavHome} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${appMode === 'ALL' ? 'bg-red-50 text-red-600 font-black' : 'text-gray-500 hover:bg-gray-50'}`}>
                 <Home size={18} /> <span className="text-sm">{t.all}</span>
              </div>
              <div onClick={() => {setAppMode('SAVED'); setOwnerFilter(null);}} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${appMode === 'SAVED' ? 'bg-red-50 text-red-600 font-black' : 'text-gray-500 hover:bg-gray-50'}`}>
                 <Heart size={18} className={appMode === 'SAVED' ? 'fill-red-600' : ''} /> <span className="text-sm">{t.saved}</span>
              </div>
              <div className="my-4 border-t border-gray-100"></div>
              {categories.map(cat => (
                <div key={cat.id} onClick={() => {setAppMode(cat.id as any); setOwnerFilter(null);}} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${appMode === cat.id ? 'bg-red-50 text-red-600 font-black' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <cat.icon size={18} /> <span className="text-sm">{cat.label}</span>
                </div>
              ))}
           </nav>
        </aside>

        <main ref={mainScrollRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto bg-gray-50 transition-all no-scrollbar lg:pb-8 ${viewMode === 'map' ? 'pb-0' : 'pb-[350px]'}`}>
          <div className={`max-w-7xl mx-auto flex flex-col ${viewMode === 'map' ? 'h-full p-0 lg:p-2' : 'p-4 lg:p-8'}`}>
             {appMode === 'CHATS' ? <ChatList onClose={() => setAppMode('ALL')} /> : (
               <>
                 <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6 shrink-0">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 md:gap-6 flex-wrap overflow-hidden">
                         <h2 className="text-base md:text-xl font-black text-gray-900 whitespace-nowrap truncate max-w-[120px] md:max-w-none">
                            {appMode === 'SAVED' ? t.saved : (appMode === 'ALL' ? t.recent_ads : (t as any)[appMode.toLowerCase()] || appMode)}
                         </h2>
                         {viewMode === 'map' && appMode === 'ESTATE' && (
                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                               {[null, DealType.SALE, DealType.RENT, DealType.MORTGAGE].map(type => (
                                  <button key={type || 'all'} onClick={() => setDealTypeFilter(type)} className={`px-2 md:px-4 py-1 rounded-lg text-[8px] md:text-[10px] font-black border transition-all whitespace-nowrap ${dealTypeFilter === type ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200 shadow-sm'}`}>
                                     {type ? type : t.all}
                                  </button>
                               ))}
                            </div>
                         )}
                       </div>
                       <div className="flex items-center shrink-0">
                          <div className="hidden md:flex items-center bg-white border rounded-full px-1 py-1 gap-1 view-toggle-pill shadow-sm">
                            <button onClick={() => setViewMode('list')} className={`p-1.5 px-3 rounded-full transition-all text-[10px] font-black flex items-center gap-1.5 ${(viewMode as string) === 'list' ? 'bg-[#a62626] text-white' : 'text-gray-400'}`}><ListIcon size={12}/> {t.list}</button>
                            <button onClick={() => setViewMode('map')} className={`p-1.5 px-3 rounded-full transition-all text-[10px] font-black flex items-center gap-1.5 ${(viewMode as string) === 'map' ? 'bg-[#a62626] text-white' : 'text-gray-400'}`}><MapIcon size={12}/> {t.map}</button>
                          </div>
                          {viewMode === 'list' && (
                             <div className="md:hidden flex items-center gap-1 bg-white border border-gray-100 rounded-xl px-2 py-1 shadow-sm">
                                <input type="tel" placeholder={t.min} value={minPrice} onChange={(e) => setMinPrice(formatNumberWithCommas(e.target.value))} className="w-20 text-[10px] font-black outline-none bg-transparent text-center" />
                                <span className="text-gray-300 text-[8px]">|</span>
                                <input type="tel" placeholder={t.max} value={maxPrice} onChange={(e) => setMaxPrice(formatNumberWithCommas(e.target.value))} className="w-20 text-[10px] font-black outline-none bg-transparent text-center" />
                             </div>
                          )}
                       </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                       <div className="hidden md:flex bg-white border rounded-xl px-3 py-1.5 items-center gap-2 shadow-sm border-gray-100">
                          <input type="tel" placeholder={t.min_price} value={minPrice} onChange={(e) => setMinPrice(formatNumberWithCommas(e.target.value))} className="w-20 md:w-28 text-[10px] font-black outline-none" />
                          <span className="text-gray-300">|</span>
                          <input type="tel" placeholder={t.max_price} value={maxPrice} onChange={(e) => setMaxPrice(formatNumberWithCommas(e.target.value))} className="w-20 md:w-28 text-[10px] font-black outline-none" />
                       </div>
                       {viewMode === 'list' && appMode === 'ESTATE' && [null, DealType.SALE, DealType.RENT, DealType.MORTGAGE].map(type => (
                          <button key={type || 'all'} onClick={() => setDealTypeFilter(type)} className={`px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black border transition-all ${dealTypeFilter === type ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>
                             {type ? type : t.all}
                          </button>
                       ))}
                    </div>
                 </div>

                 {viewMode === 'map' ? (
                   <div className="flex-1 lg:rounded-[1.5rem] overflow-hidden lg:border shadow-xl relative h-full bg-white">
                                           <MapView 
                        items={items} 
                        selectedItem={selectedItem} 
                        onSelectItem={handleSelectItem} 
                        visitedIds={visitedIds} 
                        flyToLocation={flyToLocation} 
                        onBoundsChange={handleBoundsChange}
                      />
                      
                      {showSearchInAreaBtn && (
                        <button 
                          onClick={() => { setIsSearchingInArea(true); setShowSearchInAreaBtn(false); fetchAds(true); }}
                          className="absolute top-16 left-1/2 -translate-x-1/2 z-[5000] bg-[#a62626] text-white px-6 py-2 rounded-full shadow-2xl font-black text-[10px] flex items-center gap-2 animate-in fade-in slide-in-from-top-4 active:scale-95 transition-all"
                        >
                          <Search size={14} />
                          جستجو در این محدوده
                        </button>
                      )}
                     <div className="absolute top-3 left-3 z-[2000] bg-white/95 backdrop-blur-md shadow-xl rounded-xl border border-gray-100 p-1 flex items-center gap-1 scale-90">
                        <input type="tel" placeholder={t.min} value={minPrice} onChange={(e) => setMinPrice(formatNumberWithCommas(e.target.value))} className="w-16 md:w-20 text-[9px] font-black outline-none bg-transparent text-center" />
                        <span className="text-gray-300 text-[8px]">|</span>
                        <input type="tel" placeholder={t.max} value={maxPrice} onChange={(e) => setMaxPrice(formatNumberWithCommas(e.target.value))} className="w-16 md:w-20 text-[9px] font-black outline-none bg-transparent text-center" />
                     </div>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {items.length === 0 && !isLoading ? (
                       <div className="col-span-full py-20 text-center text-gray-400 font-black">{t.no_results}</div>
                     ) : items.map((item, idx) => (
                       <div key={item.id || idx}>
                         {item.adType === 'ESTATE' && <PropertyCard property={item} onClick={() => handleSelectItem(item)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} isVisited={visitedIds.has(item.id)} />}
                         {item.adType === 'JOBS' && <JobCard job={item} onClick={() => handleSelectItem(item)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} isVisited={visitedIds.has(item.id)} />}
                         {item.adType === 'SERVICES' && <ServiceCard service={item} onClick={() => handleSelectItem(item)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} lang={lang} isVisited={visitedIds.has(item.id)} />}
                         {item.adType === 'GENERAL' && <GeneralAdCard ad={item} onClick={() => handleSelectItem(item)} isSaved={savedIds.has(item.id)} onToggleSave={() => handleToggleSave(item)} isVisited={visitedIds.has(item.id)} />}
                       </div>
                     ))}
                     {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                   </div>
                 )}
               </>
             )}
          </div>
        </main>
      </div>

      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-[4000] px-2 pb-safe transition-all grid grid-cols-5 items-center ${viewMode === 'map' ? 'bg-white h-[52px] shadow-none border-none' : 'bg-white h-[65px] border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'}`}>
        <button onClick={handleNavHome} className={`flex flex-col items-center justify-center gap-1 h-full ${appMode === 'ALL' ? 'text-[#a62626]' : 'text-gray-400'}`}>
          <Home size={viewMode === 'map' ? 20 : 22} />
          <span className="text-[8px] font-black">{t.home}</span>
        </button>
        
        <button onClick={() => setShowNavCategoryPicker(true)} className="flex flex-col items-center justify-center gap-1 h-full text-gray-400">
          <Layers size={viewMode === 'map' ? 20 : 22} />
          <span className="text-[8px] font-black">{t.categories}</span>
        </button>

        <div className="flex items-center justify-center relative h-full">
          <button onClick={openAddPost} className={`flex items-center justify-center bg-[#a62626] text-white shadow-lg active:scale-90 transition-all ${viewMode === 'map' ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl -mt-8 border-4 border-white shadow-red-100'}`}>
            <PlusSquare size={viewMode === 'map' ? 20 : 24} />
          </button>
        </div>

        <button onClick={() => setAppMode('CHATS')} className={`flex flex-col items-center justify-center gap-1 h-full relative ${appMode === 'CHATS' ? 'text-[#a62626]' : 'text-gray-400'}`}>
          <MessageCircle size={viewMode === 'map' ? 20 : 22} />
          <span className="text-[8px] font-black">{t.chat}</span>
          {unreadUserCount > 0 && <div className="absolute top-1 right-1/4 w-2 h-2 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
        </button>

        <button onClick={() => setShowAuthModal(true)} className="flex flex-col items-center justify-center gap-1 h-full text-gray-400 relative">
          <User size={viewMode === 'map' ? 20 : 22} />
          <span className="text-[8px] font-black">{t.profile}</span>
          {unreadAdminCount > 0 && <div className="absolute top-1 right-1/4 w-2 h-2 bg-red-600 rounded-full border-2 border-white animate-pulse" />}
        </button>
      </nav>

      {isDetailOpen && selectedItem && (
        <div className="z-[6000] fixed inset-0 bg-white">
          {selectedItem.adType === 'ESTATE' && <PropertyDetails property={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => {setOwnerFilter(selectedItem.owner_id); setIsDetailOpen(false);}} onEdit={() => handleEditAd(selectedItem)} onDelete={() => handleDeleteAd(selectedItem)} />}
          {selectedItem.adType === 'JOBS' && <JobDetails job={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => {setOwnerFilter(selectedItem.owner_id); setIsDetailOpen(false);}} onEdit={() => handleEditAd(selectedItem)} onDelete={() => handleDeleteAd(selectedItem)} />}
          {selectedItem.adType === 'SERVICES' && <ServiceDetails service={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => {setOwnerFilter(selectedItem.owner_id); setIsDetailOpen(false);}} onEdit={() => handleEditAd(selectedItem)} onDelete={() => handleDeleteAd(selectedItem)} />}
          {selectedItem.adType === 'GENERAL' && <GeneralAdDetails ad={selectedItem} onClose={() => setIsDetailOpen(false)} onShowOnMap={() => { setFlyToLocation(selectedItem.location); setViewMode('map'); setIsDetailOpen(false); }} isSaved={savedIds.has(selectedItem.id)} onToggleSave={() => handleToggleSave(selectedItem)} t={t} onShowOtherAds={() => {setOwnerFilter(selectedItem.owner_id); setIsDetailOpen(false);}} onEdit={() => handleEditAd(selectedItem)} onDelete={() => handleDeleteAd(selectedItem)} />}
        </div>
      )}

      {showNavCategoryPicker && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-end md:items-center justify-center p-4" onClick={() => setShowNavCategoryPicker(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-[2.5rem] p-6 animate-in slide-in-from-bottom-full md:zoom-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-xl">{t.categories}</h3>
                <button onClick={() => setShowNavCategoryPicker(false)} className="p-2 bg-gray-50 rounded-xl"><CloseIcon size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => { setAppMode(cat.id as any); setOwnerFilter(null); setShowNavCategoryPicker(false); }} className={`flex flex-col items-center gap-2 p-4 border rounded-2xl transition-all ${appMode === cat.id ? 'bg-red-50 border-red-200 text-red-600' : 'hover:bg-gray-50 active:bg-gray-100'}`}>
                   <cat.icon size={24} className={appMode === cat.id ? 'text-red-600' : 'text-gray-400'} />
                   <span className="text-[10px] font-black">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddCategoryPicker && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4" onClick={() => setShowAddCategoryPicker(false)}>
           <div className="bg-white w-full max-sm:max-w-xs rounded-[2.5rem] p-8 overflow-y-auto no-scrollbar max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowAddCategoryPicker(false)} className="absolute top-6 left-6 p-2 bg-gray-50 rounded-xl hover:bg-red-50 transition-colors"><CloseIcon size={20} /></button>
              <h2 className="text-center font-black mb-8 text-xl">{t.add_post}</h2>
              <div className="grid grid-cols-2 gap-4">
                 {categories.map(cat => (
                   <button key={cat.id} onClick={() => { setTargetAddMode(cat.id as any); setShowAddForm(true); setShowAddCategoryPicker(false); }} className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-3xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent group active:scale-95">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all"><cat.icon size={24} /></div>
                      <span className="text-[11px] font-black">{cat.label}</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}
      {showAddForm && targetAddMode === 'ESTATE' && <AddPropertyModal t={t} onClose={() => setShowAddForm(false)} onBack={() => { setShowAddForm(false); setShowAddCategoryPicker(true); }} editData={editData} />}
      {showAddForm && targetAddMode === 'JOBS' && <AddJobModal t={t} onClose={() => setShowAddForm(false)} onBack={() => { setShowAddForm(false); setShowAddCategoryPicker(true); }} editData={editData} />}
      {showAddForm && targetAddMode === 'SERVICES' && <AddServiceModal t={t} onClose={() => setShowAddForm(false)} onBack={() => { setShowAddForm(false); setShowAddCategoryPicker(true); }} editData={editData} />}
      {showAddForm && targetAddMode && !['ESTATE', 'JOBS', 'SERVICES'].includes(targetAddMode) && <AddGeneralAdModal mode={targetAddMode} t={t} onClose={() => setShowAddForm(false)} onBack={() => { setShowAddForm(false); setShowAddCategoryPicker(true); }} editData={editData} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} lang={lang} onLanguageChange={setLang} onAdminClick={() => { setShowAuthModal(false); setShowAdminLogin(true); }} onCheckNotifications={() => {}} onShowSaved={() => {setAppMode('SAVED'); setShowAuthModal(false);}} onShowChats={() => {setAppMode('CHATS'); setShowAuthModal(false);}} onSelectAd={handleSelectItem} t={t} />}
    </div>
  );

  function handleScroll(e: React.UIEvent<HTMLElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 150 && hasMore && !isLoading && appMode !== 'SAVED' && appMode !== 'CHATS') {
      setPage(prev => prev + 1);
    }
  }
}
export default App;
