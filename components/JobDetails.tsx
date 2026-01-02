
import React, { useState, useEffect, useCallback } from 'react';
import { Job } from '../types';
import { Building2, ChevronRight, Bookmark, MapPinned, Phone, X, Share2, MessageCircle, ChevronLeft, Clock } from 'lucide-react';
import ChatWindow from './ChatWindow.tsx';
import { getRelativeTime } from '../services/translations';

interface JobDetailsProps {
  job: Job;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
}

const JobDetails: React.FC<JobDetailsProps> = ({ job, onClose, onShowOnMap, isSaved, onToggleSave, t }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!job || !('company' in job)) return null;

  const allImages = job.images?.filter(img => img) || [];
  const minSwipeDistance = 50;

  const nextImage = useCallback(() => {
    if (allImages.length > 1) {
      setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
    }
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) {
      setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
    }
  }, [allImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage, onClose]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: job.title, text: job.description, url: window.location.href }).catch(() => {});
    } else {
      alert("لینک کپی شد!");
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) nextImage(); 
    if (distance < -minSwipeDistance) prevImage();
  };

  const handleChatOpen = () => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone) { alert("لطفاً ابتدا وارد حساب خود شوید."); return; }
    if (userPhone === job.phoneNumber) { alert("این آگهی متعلق به خودتان است!"); return; }
    setIsChatOpen(true);
  };
  
  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 active:scale-90 bg-white/80 backdrop-blur-md rounded-full shadow-sm pointer-events-auto text-gray-700">
          <ChevronRight size={24} />
        </button>
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={handleShare} className="p-2 text-gray-700 bg-white/80 backdrop-blur-md rounded-full shadow-sm"><Share2 size={20} /></button>
          <button onClick={onToggleSave} className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-blue-600 text-blue-600" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar md:flex md:flex-row md:overflow-hidden">
        {/* Image Viewer */}
        <div 
            className="w-full h-[40vh] md:w-[60%] md:h-full bg-zinc-900 relative shrink-0 flex items-center justify-center group select-none overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {allImages.length > 0 ? (
            <>
                <img 
                  key={allImages[activeImageIndex]} 
                  src={allImages[activeImageIndex]} 
                  className="w-full h-full object-contain" 
                  alt={job.title} 
                />
                {allImages.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full transition-all z-50 backdrop-blur-sm border border-white/10 cursor-pointer"><ChevronRight size={32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full transition-all z-50 backdrop-blur-sm border border-white/10 cursor-pointer"><ChevronLeft size={32} /></button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm z-20">
                        {allImages.map((_, i) => (
                          <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeImageIndex ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`} />
                        ))}
                    </div>
                </>
                )}
            </>
            ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500"><X size={48} /><span className="text-xs mt-2">تصویر ندارد</span></div>
            )}
            <button onClick={onClose} className="hidden md:flex absolute top-6 left-6 bg-white/10 text-white p-2 rounded-full hover:bg-white/20 backdrop-blur-md z-50 border border-white/20 cursor-pointer"><X size={24} /></button>
        </div>

        {/* Content Section */}
        <div className="bg-white relative z-10 -mt-6 md:mt-0 rounded-t-[2rem] md:rounded-none md:flex-1 md:h-full md:overflow-y-auto no-scrollbar shadow-[0_-5px_20px_rgba(0,0,0,0.1)] md:shadow-none pb-4">
          <div className="p-6 md:p-8 space-y-6">
            <div className="max-w-2xl mx-auto md:mx-0">
                <div className="hidden md:flex justify-between items-start mb-6">
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">{job.title}</h1>
                    <div className="flex gap-2">
                        <button onClick={handleShare} className="p-2 hover:bg-gray-100 rounded-xl"><Share2 size={20} /></button>
                        <button onClick={onToggleSave} className="p-2 hover:bg-gray-100 rounded-xl"><Bookmark size={20} className={isSaved ? "fill-blue-600 text-blue-600" : "text-gray-500"} /></button>
                    </div>
                </div>

                <h1 className="md:hidden text-2xl font-black text-gray-900 leading-tight mb-2 pt-2">{job.title}</h1>
                <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-xs">
                   <Clock size={12} /> {getRelativeTime(job.date, 'dari')} در {job.city}
                </div>

                <div className="bg-blue-50/50 p-6 rounded-[2rem] flex justify-between items-center border border-blue-100 my-8">
                    <div>
                        <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">{t.salary}</span>
                        <span className="text-2xl font-black text-blue-700">{job.salary ? job.salary.toLocaleString() : 'توافقی'} افغانی</span>
                    </div>
                    <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                       <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm"><Building2 size={20} /></div>
                       <div>
                          <span className="block text-[10px] font-black text-gray-400">نام شرکت / کارفرما</span>
                          <span className="font-black text-sm text-gray-800">{job.company}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-900">{t.description}</h3>
                        <p className="text-gray-600 leading-8 text-sm text-justify font-medium pb-4">{job.description}</p>
                    </div>

                    {job.requirements && job.requirements.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-gray-900">{t.requirements}</h3>
                            <div className="flex flex-wrap gap-2">
                                {job.requirements.map((r, i) => (
                                    <span key={i} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold">{r}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-t p-4 flex gap-3 z-30 shrink-0 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <button onClick={handleChatOpen} className="flex-1 bg-gray-100 text-gray-700 h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-colors">
            <MessageCircle size={22} /> {t.chat}
        </button>
        {job.showPhoneNumber !== false ? (
          !showContact ? (
            <button onClick={() => setShowContact(true)} className="flex-[2] bg-blue-700 text-white h-14 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">
                {t.contact_info}
            </button>
          ) : (
            <a href={`tel:${job.phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in tracking-widest shadow-xl">
                <Phone size={24} /> {job.phoneNumber}
            </a>
          )
        ) : (
          <div className="flex-[2] bg-gray-50 text-gray-400 h-14 rounded-2xl font-bold flex items-center justify-center text-xs border border-dashed border-gray-200">فقط از طریق چت</div>
        )}
      </div>

      {isChatOpen && <ChatWindow receiverPhone={job.phoneNumber} adId={job.id} adTitle={job.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default JobDetails;