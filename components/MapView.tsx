
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
  viewMode: 'list' | 'map';
}

// کامپوننت حیاتی برای مجبور کردن نقشه به لود کامل
const MapResizer = ({ viewMode }: { viewMode: string }) => {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
      
      const interval = setInterval(() => {
        map.invalidateSize();
      }, 1000);

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
      alert("موقعیت یاب در دسترس نیست.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert("خطا در دریافت موقعیت.");
      }
    );
  }, [map]);

  return (
    <button 
      onClick={handleLocate}
      className="absolute bottom-28 right-4 z-[1000] w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-[#a62626] border border-gray-100 active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={24} />}
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
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
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
              className="bg-white text-gray-800 px-5 py-2 rounded-full shadow-xl border border-gray-100 font-black text-[10px] flex items-center gap-2 active:scale-95 transition-all"
            >
              {isSearching ? <Loader2 size={12} className="animate-spin text-red-600" /> : <RefreshCcw size={12} className="text-red-600" />}
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
        key={`${viewMode}-${flyToLocation?.lat}`} // اجبار به رندر مجدد در صورت تغییر ویو
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
              eventHandlers={{
                click: () => onSelectItem(item)
              }}
            >
              <Popup closeButton={false}>
                <div className="overflow-hidden cursor-pointer" onClick={() => onSelectItem(item)}>
                  <img src={item.images?.[0]} className="w-full h-24 object-cover" alt="" />
                  <div className="p-2 text-right">
                    <p className="text-[10px] font-black truncate text-gray-800">{item.title}</p>
                    <p className="text-[#a62626] font-black text-xs mt-1">
                      {(item as any).price ? (item as any).price.toLocaleString() + ' AFN' : 'تماس'}
                    </p>
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
