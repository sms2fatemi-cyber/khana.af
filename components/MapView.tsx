
// Fix: Added React to imports as it is used for React.FC and JSX
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Property, Job, Service, Location } from '../types';
import { Car, ShieldCheck, MapPin, ChevronLeft, Crosshair, Loader2, ArrowUp } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapViewProps {
  items: (Property | Job | Service)[];
  selectedItem: Property | Job | Service | null;
  onSelectItem: (item: Property | Job | Service) => void;
  visitedIds: Set<string>; 
  flyToLocation?: Location | null;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}

const UserLocationButton = () => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      alert("GPS در دسترس نیست.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert("خطا در مکان‌یابی. لطفا دسترسی GPS را چک کنید.");
      },
      { enableHighAccuracy: true }
    );
  }, [map]);

  return (
    <button 
      onClick={handleLocate}
      className="absolute bottom-[92px] right-4 lg:bottom-6 lg:right-6 z-[5000] w-12 h-11 lg:w-14 lg:h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[#a62626] border border-gray-100 active:scale-90 transition-all pointer-events-auto"
      title="موقعیت من"
    >
      {isLocating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={22} />}
    </button>
  );
};

const MapEvents = ({ onBoundsChange }: { onBoundsChange?: (bounds: L.LatLngBounds) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    const onMoveEnd = () => {
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    };
    
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
};

const MapController = ({ location, selectedItem, markerRefs }: { location: Location | null, selectedItem: any, markerRefs: any }) => {
  const map = useMap();

  useEffect(() => {
    // Force Leaflet to recalculate its container size to avoid gray/checkered areas
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (location && location.lat && location.lng) {
      map.flyTo([location.lat, location.lng], 13, { animate: true, duration: 1.5 });
      
      const timer = setTimeout(() => {
        if (selectedItem && markerRefs.current[selectedItem.id]) {
          markerRefs.current[selectedItem.id].openPopup();
        }
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [location, map, selectedItem, markerRefs]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ items, selectedItem, onSelectItem, visitedIds, flyToLocation, onBoundsChange }) => {
  const markerRefs = useRef<Record<string, L.Marker>>({});

  const createIcon = useCallback((isVisited: boolean, isSelected: boolean) => {
    const size = isSelected ? 34 : 26;
    // Lighter red for visited (#d16b6b is roughly 2 shades lighter than #a62626)
    const color = isSelected ? '#2563eb' : (isVisited ? '#d16b6b' : '#a62626');
    const iconMarkup = renderToStaticMarkup(
      <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 6, height: 6, backgroundColor: 'white', borderRadius: '50%' }} />
      </div>
    );
    return L.divIcon({ html: iconMarkup, className: '', iconSize: [size, size], iconAnchor: [size/2, size/2] });
  }, []);

  return (
    <div className="w-full h-full relative bg-[#f2efe9]">
      <MapContainer 
        center={[34.5553, 69.2075]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false} 
        attributionControl={false}
        scrollWheelZoom={true}
        touchZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController location={flyToLocation || null} selectedItem={selectedItem} markerRefs={markerRefs} />
        <MapEvents onBoundsChange={onBoundsChange} />
        <UserLocationButton />
        
        {items.filter(item => item.location?.lat && item.location?.lng).map((item) => (
          <Marker 
            key={item.id} 
            ref={(ref) => { if (ref) markerRefs.current[item.id] = ref; }}
            position={[item.location!.lat, item.location!.lng]} 
            icon={createIcon(visitedIds.has(item.id), selectedItem?.id === item.id)}
            eventHandlers={{
              click: (e) => {
                e.target.openPopup();
              }
            }}
          >
            <Popup closeButton={false} autoPan={true} className="custom-map-popup" minWidth={200}>
              <div 
                className="flex flex-col bg-white overflow-hidden cursor-pointer w-full group" 
                dir="rtl"
                onClick={() => onSelectItem(item)}
              >
                <div className="h-28 w-full bg-gray-100 relative overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-1">
                      <ShieldCheck size={20} />
                      <span className="text-[8px] font-black">بدون تصویر</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                     {(item as any).has_parking && <div className="bg-blue-600/90 backdrop-blur-sm text-white p-1 rounded-md shadow-sm" title="پارکینگ"><Car size={10}/></div>}
                     {(item as any).has_elevator && <div className="bg-green-600/90 backdrop-blur-sm text-white p-1 rounded-md shadow-sm" title="آسانسور"><ArrowUp size={10}/></div>}
                  </div>
                </div>

                <div className="p-3 text-right">
                  <h4 className="text-[12px] font-black text-gray-800 line-clamp-1 mb-1">{item.title}</h4>
                  
                  <div className="flex items-center justify-between mt-2">
                     <span className="text-[#a62626] font-black text-[13px]">{Number((item as any).price || (item as any).salary || 0).toLocaleString()} <small className="text-[8px]">AFN</small></span>
                     <span className="text-[9px] text-gray-400 font-black flex items-center gap-0.5"><MapPin size={10}/> {item.city}</span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectItem(item); }}
                    className="w-full mt-3 bg-red-600 text-white py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    مشاهده جزئیات <ChevronLeft size={12}/>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
export default MapView;
