
import { Property, Language, DealType } from '../types';
import { Bookmark, Home, Trash2, Clock, Edit, MapPin, Box, Car } from 'lucide-react';
import { getRelativeTime } from '../services/translations';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  lang: Language;
}

export default function PropertyCard({ 
  property, 
  onClick, 
  isVisited, 
  isSaved, 
  onToggleSave, 
  onDelete, 
  onEdit, 
  lang 
}: PropertyCardProps) {
  const hasImages = property.images && property.images.length > 0;
  const cityName = property.city || (lang === 'dari' ? 'نامشخص' : 'نامعلوم');
  
  // منطق جدید برای نمایش صحیح مبلغ بر اساس نوع معامله
  const displayAmount = property.dealType === DealType.MORTGAGE 
    ? (property.mortgageAmount || 0) 
    : (property.price || 0);
    
  const priceDisplay = displayAmount.toLocaleString();

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[2rem] p-4 flex gap-4 cursor-pointer hover:shadow-xl transition-all border border-transparent hover:border-gray-100 relative shadow-sm group ${isVisited ? 'opacity-85' : ''}`}
    >
      <div className="flex-1 flex flex-col justify-between py-1 text-right">
        <div>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-1.5">
               <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {getRelativeTime(property.date, lang)}</span>
             </div>
             <div className="flex items-center gap-1">
                {onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={16} /></button>
                )}
                {onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }} className="p-2 text-gray-300 hover:text-[#a62626]">
                    <Bookmark size={18} className={isSaved ? "fill-[#a62626] text-[#a62626]" : ""} />
                </button>
             </div>
          </div>
          <h3 className="font-black text-gray-800 text-[15px] leading-7 mt-2 line-clamp-2">{property.title}</h3>
          
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1 text-[#a62626] text-[10px] font-black">
              <MapPin size={12} />
              <span>{cityName}</span>
              <span className="mx-1 text-gray-300">|</span>
              <span className="text-gray-400 font-bold">{property.dealType}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {property.hasParking && <Car size={14} className="text-blue-500" />}
              {property.hasStorage && <Box size={14} className="text-amber-600" />}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-[#a62626] font-black text-xl tracking-tight">{priceDisplay}</span>
          <small className="text-gray-400 text-[10px] font-black uppercase">AFN</small>
        </div>
      </div>
      <div className="w-[110px] h-[110px] rounded-[1.8rem] overflow-hidden bg-gray-50 shrink-0 relative flex items-center justify-center">
        {hasImages ? (
          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <Home size={40} className="text-gray-200" />
        )}
      </div>
    </div>
  );
}
