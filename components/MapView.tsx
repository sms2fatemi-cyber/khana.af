
import { useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Property, Job, Service, Location } from '../types';
import { Car, ShieldCheck, MapPin, ChevronLeft } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapViewProps {
  items: (Property | Job | Service)[];
  selectedItem: Property | Job | Service | null;
  onSelectItem: (item: Property | Job | Service) => void;
  visitedIds: Set<string>; 
  flyToLocation?: Location | null;
}

const MapController = ({ location, selectedItem, markerRefs }: { location: Location | null, selectedItem: any, markerRefs: any }) => {
  const map = useMap();
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

const MapView: React.FC<MapViewProps> = ({ items, selectedItem, onSelectItem, visitedIds, flyToLocation }) => {
  const markerRefs = useRef<Record<string, L.Marker>>({});

  const createIcon = useCallback((isVisited: boolean, isSelected: boolean) => {
    const size = isSelected ? 34 : 26;
    const color = isSelected ? '#2563eb' : (isVisited ? '#9ca3af' : '#a62626');
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
                     {(item as any).has_parking && <div className="bg-blue-600/90 backdrop-blur-sm text-white p-1 rounded-md shadow-sm"><Car size={10}/></div>}
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
