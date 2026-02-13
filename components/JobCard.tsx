
import { Job } from '../types';
import { Bookmark, Building2, Briefcase, Clock } from 'lucide-react';
import { getRelativeTime } from '../services/translations';

interface JobCardProps {
  job: Job;
  onClick: () => void;
  isVisited?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export default function JobCard({ job, onClick, isVisited, isSaved, onToggleSave }: JobCardProps) {
  const hasImages = job.images && job.images.length > 0;

  return (
    <div onClick={onClick} className={`bg-white rounded-[2rem] p-4 flex gap-4 cursor-pointer hover:shadow-xl transition-all border border-transparent shadow-sm group ${isVisited ? 'opacity-50 grayscale-[0.5]' : ''}`}>
      <div className="flex-1 flex flex-col justify-between py-1 text-right overflow-hidden">
        <div>
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-1.5">
               <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5"><Clock size={10} /> {getRelativeTime(job.created_at || job.date)}</span>
               {job.is_boosted === true && <span className="text-[9px] text-blue-600 font-black">| نردبان شده</span>}
             </div>
             <button onClick={(e) => { e.stopPropagation(); onToggleSave?.(); }} className="p-1">
                <Bookmark size={18} className={isSaved ? "fill-blue-600 text-blue-600" : "text-gray-300"} />
             </button>
          </div>
          <h3 className={`font-black text-[15px] leading-7 mt-2 line-clamp-2 ${isVisited ? 'text-gray-400' : 'text-gray-800'}`}>{job.title}</h3>
          <div className="flex items-center gap-1 text-gray-400 text-[11px] font-bold mt-1">
            <Building2 size={12} /> <span>{job.company}</span>
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-blue-700 font-black text-xl">{Number(job.salary || 0).toLocaleString()}</span>
          <small className="text-gray-400 text-[10px] font-black uppercase">AFN</small>
        </div>
      </div>
      <div className="w-[110px] h-[110px] rounded-[1.8rem] overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center border shadow-inner">
        {hasImages ? (
          <img src={job.images[0]} alt={job.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : <Briefcase size={40} className="text-gray-200" />}
      </div>
    </div>
  );
}
