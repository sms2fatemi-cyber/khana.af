
import { Service, Language } from '../types';
import { Bookmark, Wrench, Trash2, Clock, Edit } from 'lucide-react';
import { translations, getRelativeTime } from '../services/translations';

interface ServiceCardProps {
  service: Service;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  lang: Language;
}

export default function ServiceCard({ 
  service, 
  onClick, 
  isVisited, 
  isSaved, 
  onToggleSave, 
  onDelete, 
  onEdit, 
  lang 
}: ServiceCardProps) {
  const hasImages = service.images && service.images.length > 0;
  const t = (translations as any)[lang] || translations.dari;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[2rem] p-4 flex gap-4 cursor-pointer hover:shadow-xl transition-all border border-transparent hover:border-gray-100 relative shadow-sm group ${isVisited ? 'opacity-50 grayscale-[0.5]' : ''}`}
    >
      <div className="flex-1 flex flex-col justify-between py-1 text-right">
        <div>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-1.5">
               <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {getRelativeTime(service.created_at || service.date)}</span>
             </div>
             <div className="flex items-center gap-1">
                {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={16} /></button>}
                {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>}
                <button onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }} className="p-2 text-gray-300 hover:text-orange-600">
                    <Bookmark size={18} className={isSaved ? "fill-orange-600 text-orange-600" : ""} />
                </button>
             </div>
          </div>
          <h3 className={`font-black text-[15px] leading-7 mt-2 line-clamp-2 ${isVisited ? 'text-gray-400' : 'text-gray-800'}`}>{service.title}</h3>
          <p className="text-gray-400 text-[11px] font-bold mt-1">{service.providerName}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><Wrench size={14} /></div>
          <span className="text-gray-600 font-black text-xs">{t.experience || 'تجربه'}: {service.experience}</span>
        </div>
      </div>
      <div className="w-[110px] h-[110px] rounded-[1.8rem] overflow-hidden bg-gray-50 shrink-0 relative flex items-center justify-center border shadow-inner">
        {hasImages ? (
          <img src={service.images[0]} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <Wrench size={40} className="text-gray-200" />
        )}
      </div>
    </div>
  );
}
