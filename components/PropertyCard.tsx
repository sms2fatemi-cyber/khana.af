
import React from 'react';
import { Property, Language } from '../types';
import { Bookmark, Home, Trash2, Clock } from 'lucide-react';
import { translations } from '../services/translations';
import { getRelativeTime } from '../App';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onDelete?: () => void;
  lang: Language;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick, isVisited, isSaved, onToggleSave, onDelete, lang }) => {
  const hasImages = property.images && property.images.length > 0;
  const t = translations[lang];

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[2rem] p-4 flex gap-4 cursor-pointer hover:shadow-xl transition-all border border-transparent hover:border-gray-100 relative shadow-sm group ${isVisited ? 'opacity-85' : ''}`}
    >
      <div className="flex-1 flex flex-col justify-between py-1 text-right">
        <div>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-1.5">
               <span className="bg-red-50 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-lg">{t.new}</span>
               <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {getRelativeTime(property.date, lang)}</span>
             </div>
             <div className="flex items-center gap-1">
                {onDelete && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-2 -m-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }}
                    className="p-2 -m-2 text-gray-300 hover:text-[#a62626] transition-colors"
                >
                    <Bookmark size={18} className={isSaved ? "fill-[#a62626] text-[#a62626]" : ""} />
                </button>
             </div>
          </div>
          <h3 className="font-black text-gray-800 text-[15px] leading-7 mt-2 line-clamp-2">
            {property.title}
          </h3>
          <p className="text-gray-400 text-[11px] font-bold mt-1">
            {property.city} | {property.dealType}
          </p>
        </div>
        
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-[#a62626] font-black text-xl tracking-tight">
            {property.price.toLocaleString()}
          </span>
          <small className="text-gray-400 text-[10px] font-black uppercase">AFN</small>
        </div>
      </div>

      <div className="w-[110px] h-[110px] rounded-[1.8rem] overflow-hidden bg-gray-50 shrink-0 relative shadow-inner flex items-center justify-center">
        {hasImages ? (
          <img 
            src={property.images[0]} 
            alt={property.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        ) : (
          <Home size={40} className="text-gray-200" />
        )}
        {isVisited && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
             <span className="bg-white/90 text-black text-[9px] px-2 py-1 rounded-lg font-black shadow-sm">{lang === 'dari' ? 'دیده شده' : 'لیدل شوی'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
