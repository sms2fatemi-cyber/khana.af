
import React from 'react';
import { Job, Language } from '../types';
import { Bookmark, Building2, Briefcase, Trash2, Clock } from 'lucide-react';
import { getRelativeTime } from '../App';

interface JobCardProps {
  job: Job;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onDelete?: () => void;
  lang: Language;
}

const JobCard: React.FC<JobCardProps> = ({ job, onClick, isVisited, isSaved, onToggleSave, onDelete, lang }) => {
  const hasImages = job.images && job.images.length > 0;

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-[2rem] p-4 flex gap-4 cursor-pointer hover:shadow-xl transition-all border border-transparent hover:border-gray-100 relative shadow-sm group ${isVisited ? 'opacity-85' : ''}`}
    >
      <div className="flex-1 flex flex-col justify-between py-1 text-right">
        <div>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-1.5">
               <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-lg">{lang === 'dari' ? 'استخدام' : 'استخدام'}</span>
               <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {getRelativeTime(job.date, lang)}</span>
             </div>
             <div className="flex items-center gap-1">
                {onDelete && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors z-20"
                    title="حذف آگهی"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }}
                    className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
                >
                    <Bookmark size={18} className={isSaved ? "fill-blue-600 text-blue-600" : ""} />
                </button>
             </div>
          </div>
          <h3 className="font-black text-gray-800 text-[15px] leading-7 mt-2 line-clamp-2">{job.title}</h3>
          <div className="flex items-center gap-1 text-gray-400 text-[11px] font-bold mt-1">
            <Building2 size={12} /> <span>{job.company}</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-blue-700 font-black text-xl tracking-tight">
            {job.salary?.toLocaleString() || (lang === 'dari' ? 'توافقی' : 'توافقي')}
          </span>
          <small className="text-gray-400 text-[10px] font-black uppercase">افغانی</small>
        </div>
      </div>

      <div className="w-[110px] h-[110px] rounded-[1.8rem] overflow-hidden bg-gray-50 shrink-0 relative shadow-inner flex items-center justify-center">
        {hasImages ? (
          <img 
            src={job.images[0]} 
            alt={job.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        ) : (
          <Briefcase size={40} className="text-gray-200" />
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

export default JobCard;
