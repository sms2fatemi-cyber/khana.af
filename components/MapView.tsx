
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Property, Job, Service, Location } from '../types';
import { Crosshair, Loader2, RefreshCcw, ChevronLeft } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapBounds {
  southWest: Location;
  northEast: Location;
}

interface MapViewProps {
  items: (Property | Job | Service)[];
  selectedItem: Property | Job | Service | null;
  onSelectItem: (item: Property | Job | Service) => void;
  mode: 'ESTATE' | 'JOBS' | 'SERVICES';
  visitedIds: Set<string>; 
  flyToLocation?: Location | null;
  onSearchInArea?: (bounds: MapBounds) => void;
  viewMode: 'list' | 'map';
}

const MapResizer = ({ viewMode }: { viewMode: string }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setTimeout(() => { map.invalidateSize(); }, 200);
      const interval = setInterval(() => { map.invalidateSize(); }, 2000);
      return () => clearInterval(interval);
    }
  }, [map, viewMode]);
  return null;
};

const MapEventHandler = ({ onMove }: { onMove: () => void }) => {
  useMapEvents({
    moveend: () => onMove(),
    zoomend: () => onMove(),
  });
  return null;
};

const SafeMapFlyTo = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 16, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

const UserLocationHandler = () => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      alert("موقعیت یاب توسط دستگاه شما پشتیبانی نمی‌شود.");
      return;
    }
    
    setIsLocating(true);
    
    // تنظیمات بهینه برای WebView اندروید
    const options: PositionOptions = {
      enableHighAccuracy: true, // اجباری برای تحریک GPS واقعی اندروید
      timeout: 25000,          // زمان انتظار ۲۵ ثانیه برای قفل شدن ماهواره‌ها
      maximumAge: 0            // دیتای تازه الزامی است
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 15, { animate: true });
      },
      (err) => {
        setIsLocating(false);
        console.error("Android GPS Error:", err);
        
        // راهنمایی کاربر بر اساس نوع خطا
        if (err.code === 1) {
          alert("دسترسی به موقعیت مکانی رد شده است. لطفاً در تنظیمات اندروید (بخش Apps > Khana > Permissions) اجازه دسترسی به Location را بدهید.");
        } else if (err.code === 2) {
          alert("سیستم GPS یافت نشد. لطفاً دکمه Location/GPS گوشی را روشن کرده و مطمئن شوید در فضای باز هستید.");
        } else if (err.code === 3) {
          alert("زمان دریافت موقعیت تمام شد. لطفاً دوباره تلاش کنید (ممکن است اولین تلاش در اندروید زمان‌بر باشد).");
        } else {
          alert("خطایی در دریافت موقعیت رخ داد. لطفاً تنظیمات گوشی را چک کنید.");
        }
      },
      options
    );
  }, [map]);

  return (
    <button 
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLocate(); }}
      className="absolute bottom-28 right-4 z-[1000] w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-[#a62626] border border-gray-100 active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={26} className="animate-spin" /> : <Crosshair size={30} />}
    </button>
  );
};

const MapView: React.FC<MapViewProps> = ({ items, selectedItem, onSelectItem, visitedIds, flyToLocation, onSearchInArea, viewMode }) => {
  const defaultCenter: [number, number] = [34.5553, 69.2075];
  const [showSearchBtn, setShowSearchBtn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const createIcon = useCallback((isVisited: boolean, isSelected: boolean) => {
    const size = isSelected ? 38 : 28;
    const color = isSelected ? '#2563eb' : (isVisited ? '#9ca3af' : '#a62626');
    
    const iconMarkup = renderToStaticMarkup(
      <div style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%' }} />
      </div>
    );

    return L.divIcon({ 
      html: iconMarkup, 
      className: '', 
      iconSize: [size, size], 
      iconAnchor: [size/2, size/2] 
    });
  }, []);

  const MapInner = () => {
    const map = useMap();
    const handleSearchClick = () => {
      if (!onSearchInArea) return;
      setIsSearching(true);
      const b = map.getBounds();
      onSearchInArea({
        southWest: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
        northEast: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng }
      });
      setTimeout(() => {
        setIsSearching(false);
        setShowSearchBtn(false);
      }, 800);
    };

    return (
      <>
        {showSearchBtn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <button 
              onClick={handleSearchClick}
              disabled={isSearching}
              className="bg-white text-gray-800 px-6 py-3 rounded-full shadow-2xl border border-gray-100 font-black text-xs flex items-center gap-2 active:scale-95 transition-all"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin text-red-600" /> : <RefreshCcw size={14} className="text-red-600" />}
              <span>جستجو در این منطقه</span>
            </button>
          </div>
        )}
        <MapEventHandler onMove={() => setShowSearchBtn(true)} />
      </>
    );
  };

  return (
    <div className="w-full h-full relative bg-[#f2efe9]">
      <MapContainer 
        key={`${viewMode}-${flyToLocation?.lat}`}
        center={defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizer viewMode={viewMode} />
        <MapInner />
        
        {items.map((item) => {
          const lat = Number(item.location?.lat);
          const lng = Number(item.location?.lng);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker 
              key={item.id} 
              position={[lat, lng]} 
              icon={createIcon(visitedIds.has(item.id), selectedItem?.id === item.id)}
              // کلیک روی مارکر فقط پاپ‌آپ پیش‌فرض لیفلت را باز می‌کند
            >
              <Popup closeButton={false} autoPan={true} className="custom-map-popup">
                <div 
                  className="flex flex-col bg-white overflow-hidden cursor-pointer active:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    // با کلیک روی کارت پاپ‌آپ، آگهی به صورت کامل باز می‌شود
                    e.stopPropagation();
                    onSelectItem(item);
                  }}
                >
                  <div className="h-32 w-full bg-gray-100 relative">
                    {item.images && item.images.length > 0 ? (
                      <img src={item.images[0]} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">بدون تصویر</div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-lg text-[10px] font-black">
                       {item.images?.length || 0} عکس
                    </div>
                  </div>
                  <div className="p-4 text-right flex flex-col gap-1">
                    <h4 className="text-[13px] font-black text-gray-800 line-clamp-1 leading-relaxed">{item.title}</h4>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-gray-400 font-bold">{item.city}</span>
                      <span className="text-[#a62626] font-black text-sm">
                        {(item as any).price ? (item as any).price.toLocaleString() + ' AFN' : 'تماس'}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-dashed pt-2 flex items-center justify-center gap-1 text-[11px] font-black text-blue-600">
                      مشاهده جزئیات کامل <ChevronLeft size={16} />
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {flyToLocation && <SafeMapFlyTo lat={flyToLocation.lat} lng={flyToLocation.lng} />}
        <UserLocationHandler />
      </MapContainer>
    </div>
  );
};

export default MapView;
