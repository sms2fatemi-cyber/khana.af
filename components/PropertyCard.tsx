
import { Property, DealType } from '../types';
import { Bookmark, Camera, Package, Car, Box, Calendar, ArrowUp } from 'lucide-react';
import { getRelativeTime } from '../services/translations';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export default function PropertyCard({ property, onClick, isSaved, onToggleSave }: PropertyCardProps) {
  const hasImages = property.images && property.images.length > 0;
  const displayAmount = property.deal_type === DealType.MORTGAGE 
    ? (property.mortgage_amount || 0) 
    : (property.price || 0);

  const hasElevator = (property as any).has_elevator === true;

  return (
    <div onClick={onClick} className="bg-white rounded-2xl p-3 flex gap-3 cursor-pointer border border-gray-100 hover:shadow-divar transition-all relative group">
      <div className="flex-1 flex flex-col justify-between py-0.5 text-right overflow-hidden">
        <div>
          <h3 className="font-black text-[14px] leading-6 line-clamp-1 mb-1 text-gray-900">{property.title}</h3>
          
          <div className="flex flex-wrap gap-1.5 mb-2">
            {property.has_parking && (
              <span className="flex items-center gap-0.5 text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">
                <Car size={10}/> پارکینگ
              </span>
            )}
            {property.has_storage && (
              <span className="flex items-center gap-0.5 text-[8px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-100">
                <Box size={10}/> انباری
              </span>
            )}
            {hasElevator && (
              <span className="flex items-center gap-0.5 text-[8px] font-black bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md border border-green-100">
                <ArrowUp size={10}/> آسانسور
              </span>
            )}
            {property.build_year && (
              <span className="flex items-center gap-0.5 text-[8px] font-black bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-md border border-gray-100">
                <Calendar size={10}/> {property.build_year}
              </span>
            )}
          </div>

          <div className="space-y-0.5">
             <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1 justify-end">{property.deal_type} در {property.city}</div>
             <div className="text-[14px] text-[#a62626] font-black flex items-center gap-1 justify-end">{displayAmount.toLocaleString()} <span className="text-[9px] text-gray-400 font-bold">AFN</span></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
             {getRelativeTime(property.created_at || property.date)}
             {property.is_boosted === true && (
               <span className="text-[#a62626] font-black border-r pr-1 mr-1 border-gray-200">نردبان</span>
             )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }} className="text-gray-200 hover:text-[#a62626] transition-colors p-1.5">
            <Bookmark size={16} className={isSaved ? "fill-[#a62626] text-[#a62626]" : ""} />
          </button>
        </div>
      </div>
      <div className="w-[100px] h-[100px] rounded-xl overflow-hidden bg-gray-50 shrink-0 relative border border-gray-100 shadow-inner">
        {hasImages ? (
          <>
            <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {property.images.length > 1 && (
              <div className="absolute bottom-1 right-1 bg-black/50 backdrop-blur-sm text-white text-[8px] px-1 py-0.5 rounded-md flex items-center gap-0.5 font-black"><Camera size={9} />{property.images.length}</div>
            )}
          </>
        ) : <div className="w-full h-full flex flex-col items-center justify-center text-gray-200 bg-gray-50 gap-1"><Package size={24} /><span className="text-[7px] font-black">بدون تصویر</span></div>}
      </div>
    </div>
  );
}
