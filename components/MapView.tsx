import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Property, Job, Service, Location } from '../types';
import { Crosshair, Loader2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapViewProps {
  items: (Property | Job | Service)[];
  selectedItem: Property | Job | Service | null;
  onSelectItem: (item: Property | Job | Service) => void;
  mode: 'ESTATE' | 'JOBS' | 'SERVICES';
  visitedIds: Set<string>;
  flyToLocation?: Location | null;
}

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    // فراخوانی چند مرحله‌ای برای اطمینان از لود کامل کاشی‌ها و ابعاد
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 200);
    const timer2 = setTimeout(() => map.invalidateSize(), 1000);
    
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(map.getContainer());
    
    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map]);
  return null;
};

const SafeMapFlyTo = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
    } catch {
      map.setView([lat, lng], 16);
    }
  }, [lat, lng, map]);
  return null;
};

const UserLocationHandler = () => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("مرورگر شما از GPS پشتیبانی نمی‌کند.");
      return;
    }
    
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          map.flyTo([lat, lng], 16, { animate: true });
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert("خطا در یافتن موقعیت. مطمئن شوید GPS گوشی روشن است.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [map]);

  return (
    <button 
      onClick={handleLocate}
      className="absolute bottom-36 md:bottom-24 right-6 z-[1000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[#a62626] border border-gray-100 active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

const MapView: React.FC<MapViewProps> = ({ items, selectedItem, onSelectItem, visitedIds, flyToLocation }) => {
  const defaultCenter: [number, number] = [34.5553, 69.2075];
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);

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
        justifyContent: 'center',
        transition: 'all 0.3s'
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
        <TileLayerAny 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          maxZoom={19}
        />
        <MapResizer />
        
        {items.map((item) => {
          const lat = Number(item.location?.lat);
          const lng = Number(item.location?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return (
            <MarkerAny 
              key={item.id} 
              position={[lat, lng]} 
              icon={createIcon(visitedIds.has(item.id), selectedItem?.id === item.id)}
              eventHandlers={{ 
                click: () => {
                  if (activeMarkerId === item.id) {
                    onSelectItem(item);
                  } else {
                    setActiveMarkerId(item.id);
                  }
                },
                popupclose: () => {
                  setActiveMarkerId(null);
                }
              }}
            >
              <PopupAny closeButton={false} className="custom-popup">
                <div 
                  className="p-0 overflow-hidden cursor-pointer text-right" 
                  onClick={() => onSelectItem(item)}
                >
                  <img src={item.images?.[0]} className="w-full h-24 object-cover" alt="" />
                  <div className="p-3">
                    <p className="text-[11px] font-black truncate text-gray-800">{item.title}</p>
                    <p className="text-[#a62626] font-black text-sm mt-1">
                      {(item as any).price ? (item as any).price.toLocaleString() + ' AFN' : (item as any).salary ? (item as any).salary.toLocaleString() + ' AFN' : 'تماس بگیرید'}
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