
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Property, Job, Service, Location } from '../types';
import { Crosshair, Loader2, RefreshCcw } from 'lucide-react';
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
}

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const MapEventHandler = ({ onMove }: { onMove: () => void }) => {
  useMapEvents({
    movestart: () => onMove(),
    dragstart: () => onMove(),
    zoomstart: () => onMove(),
  });
  return null;
};

const SafeMapFlyTo = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
  }, [lat, lng, map]);
  return null;
};

const UserLocationHandler = () => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = useCallback(() => {
    // Check for secure context (HTTPS) for Geolocation
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

    if (!isSecure) {
      alert("⚠️ توجه: مرورگرها به دلایل امنیتی فقط در آدرس‌های امن (HTTPS) اجازه استفاده از GPS را می‌دهند. لطفاً برنامه را با پروتکل https باز کنید.");
      return;
    }

    if (!navigator.geolocation) {
      alert("سنسور مکان‌یابی در این دستگاه در دسترس نیست.");
      return;
    }
    
    setIsLocating(true);
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const success = (pos: GeolocationPosition) => {
      map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true });
      setIsLocating(false);
    };

    const error = (err: GeolocationPositionError) => {
      console.warn("Location error:", err);
      setIsLocating(false);
      
      if (err.code === 1) { // PERMISSION_DENIED
        alert("اجازه دسترسی به مکان داده نشد. لطفاً در تنظیمات مرورگر اجازه مکان‌یابی را فعال کنید.");
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        alert("موقعیت شما یافت نشد. لطفاً مطمئن شوید GPS دستگاه روشن است.");
      } else if (err.code === 3) { // TIMEOUT
        // Retry with lower accuracy if timeout
        navigator.geolocation.getCurrentPosition(success, () => {
           alert("یافتن مکان شما بیش از حد طول کشید. لطفاً مجدداً تلاش کنید.");
        }, { ...options, enableHighAccuracy: false, timeout: 5000 });
      } else {
        alert("خطایی در یافتن موقعیت شما رخ داد.");
      }
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
  }, [map]);

  return (
    <button 
      onClick={handleLocate}
      className="absolute bottom-32 right-6 z-[1000] w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-[#a62626] border border-gray-100 active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={24} />}
    </button>
  );
};

const MapView: React.FC<MapViewProps> = ({ items, selectedItem, onSelectItem, visitedIds, flyToLocation, onSearchInArea }) => {
  const defaultCenter: [number, number] = [34.5553, 69.2075];
  const [showSearchBtn, setShowSearchBtn] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const createIcon = useCallback((isVisited: boolean, isSelected: boolean) => {
    const size = isSelected ? 42 : 30;
    const color = isSelected ? '#2563eb' : (isVisited ? '#9ca3af' : '#a62626');
    
    const iconMarkup = renderToStaticMarkup(
      <div style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: '50%',
        border: '3px solid white',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
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
      }, 1000);
    };

    return (
      <>
        {showSearchBtn && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in slide-in-from-top-4">
            <button 
              onClick={handleSearchClick}
              disabled={isSearching}
              className="bg-white text-gray-800 px-6 py-2.5 rounded-full shadow-2xl border border-gray-100 font-black text-xs flex items-center gap-2 active:scale-95 transition-all hover:bg-gray-50"
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

  const MapContainerAny = MapContainer as any;
  const TileLayerAny = TileLayer as any;
  const MarkerAny = Marker as any;
  const PopupAny = Popup as any;

  return (
    <div className="w-full h-full relative bg-[#f2efe9]">
      <MapContainerAny 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayerAny url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapResizer />
        <MapInner />
        
        {items.map((item) => {
          const lat = Number(item.location?.lat);
          const lng = Number(item.location?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const isVisited = visitedIds.has(item.id);

          return (
            <MarkerAny 
              key={item.id} 
              position={[lat, lng]} 
              icon={createIcon(isVisited, selectedItem?.id === item.id)}
            >
              <PopupAny closeButton={false}>
                <div className="p-0 overflow-hidden cursor-pointer text-right" onClick={() => onSelectItem(item)}>
                  <img src={item.images?.[0]} className="w-full h-24 object-cover" alt="" />
                  <div className="p-3">
                    <p className="text-[11px] font-black truncate text-gray-800">{item.title}</p>
                    <p className="text-[#a62626] font-black text-sm mt-1">
                      {(item as any).price ? (item as any).price.toLocaleString() + ' AFN' : 'تماس بگیرید'}
                    </p>
                  </div>
                </div>
              </PopupAny>
            </MarkerAny>
          );
        })}
        
        {flyToLocation && <SafeMapFlyTo lat={flyToLocation.lat} lng={flyToLocation.lng} />}
        <UserLocationHandler />
      </MapContainerAny>
    </div>
  );
};

export default MapView;
