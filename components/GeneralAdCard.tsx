
import { Package, Clock, MapPin, Bookmark, ShieldCheck } from 'lucide-react';
import { getRelativeTime } from '../services/translations';

interface GeneralAdCardProps {
  ad: any;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export default function GeneralAdCard({ ad, onClick, isSaved, onToggleSave }: GeneralAdCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl p-3 flex gap-3 cursor-pointer hover:shadow-xl transition-all border border-transparent shadow-sm group"
    >
      <div className="flex-1 flex flex-col justify-between py-0.5 text-right">
        <div>
          <div className="flex justify-between items-start">
             <span className="text-[8px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={9} /> {getRelativeTime(ad.created_at || ad.date)}</span>
             <button onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }} className="p-1">
                <Bookmark size={16} className={isSaved ? "fill-red-600 text-red-600" : "text-gray-300"} />
             </button>
          </div>
          <h3 className="font-black text-[14px] leading-6 mt-1 line-clamp-1 text-gray-800">{ad.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
             <span className="text-[8px] text-red-600 font-black bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100">{ad.sub_category}</span>
             {ad.item_condition && (
               <span className="text-[8px] text-green-600 font-black bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100 flex items-center gap-0.5">
                 <ShieldCheck size={10} /> {ad.item_condition}
               </span>
             )}
             <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5 mr-auto"><MapPin size={10} /> {ad.city}</span>
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-red-600 font-black text-[16px]">{Number(ad.price || 0).toLocaleString()}</span>
          <small className="text-gray-400 text-[8px] font-black uppercase">AFN</small>
        </div>
      </div>
      <div className="w-[90px] h-[90px] rounded-xl overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center border shadow-inner">
        {ad.images && ad.images.length > 0 ? (
          <img src={ad.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
        ) : <Package size={28} className="text-gray-200" />}
      </div>
    </div>
  );
}
