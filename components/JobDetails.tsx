
import React, { useState, useCallback } from 'react';
import { Job } from '../types';
import { ChevronRight, Bookmark, MapPinned, Phone, X, MessageCircle, ChevronLeft, Clock, MapPin } from 'lucide-react';
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

  if (!job) return null;

  const allImages = job.images?.filter(img => img) || [];

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleChatOpen = () => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (userPhone === job.phoneNumber) return alert("این آگهی متعلق به خودتان است!");
    setIsChatOpen(true);
  };

  const ContactSection = () => (
    <div className="space-y-4 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
      <div className="flex gap-3">
        <button onClick={handleChatOpen} className="flex-1 bg-white border border-gray-200 text-gray-700 h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95">
            <MessageCircle size={22} className="text-blue-600" /> {t.chat}
        </button>
        {!showContact ? (
          <button onClick={() => setShowContact(true)} className="flex-[2] bg-blue-700 text-white h-14 rounded-2xl font-black text-sm active:scale-95 shadow-md">{t.contact_info}</button>
        ) : (
          <a href={`tel:${job.phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in shadow-md tracking-widest"><Phone size={24} /> {job.phoneNumber}</a>
        )}
      </div>
    </div>
  );
  
  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      
      <div className="absolute top-0 left-0 right-0 h-14 z-[5002] flex items-center justify-between px-4 pt-2 pointer-events-none text-right">
        <button onClick={onClose} className="p-2 active:scale-90 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto text-gray-700"><ChevronRight size={24} /></button>
        <button onClick={onToggleSave} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-blue-600 text-blue-600" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-row bg-gray-50 h-full no-scrollbar">
        
        <div className="w-full md:w-[60%] md:h-full flex flex-col shrink-0 md:border-l bg-white md:overflow-y-auto no-scrollbar">
            <div className="w-full h-[40vh] md:h-[75vh] bg-zinc-900 relative shrink-0 flex items-center justify-center overflow-hidden">
                {allImages.length > 0 ? (
                <>
                    <img src={allImages[activeImageIndex]} className="w-full h-full object-contain" alt={job.title} />
                    {allImages.length > 1 && (
                    <><button onClick={prevImage} className="absolute left-4 top-1/2 bg-black/30 text-white p-3 rounded-full"><ChevronLeft size={32} /></button>
                    <button onClick={nextImage} className="absolute right-4 top-1/2 bg-black/30 text-white p-3 rounded-full"><ChevronRight size={32} /></button></>
                    )}
                </>
                ) : <div className="text-gray-500">تصویری ندارد</div>}
                <button onClick={onClose} className="hidden md:flex absolute top-6 left-6 bg-white/10 text-white p-2 rounded-full backdrop-blur-md z-50"><X size={24} /></button>
            </div>

            <div className="hidden md:block p-8 border-t bg-white">
               <ContactSection />
            </div>
        </div>

        <div className="flex-1 md:h-full md:overflow-y-auto no-scrollbar bg-white p-6 md:p-10 space-y-6 pb-32 text-right">
            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2 pt-2">{job.title}</h1>
            <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-xs justify-end"><Clock size={12} /> {getRelativeTime(job.date, 'dari')} در {job.city}</div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-6 border-y text-center">
                <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.company}</span><span className="font-black text-xs text-blue-700">{job.company || '---'}</span></div>
                <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.job_type}</span><span className="font-black text-xs text-blue-700">{job.jobType || '---'}</span></div>
                <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.city}</span><span className="font-black text-xs text-blue-700">{job.city}</span></div>
                <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.salary}</span><span className="font-black text-xs text-blue-700">{job.salary ? job.salary.toLocaleString() : 'توافقی'}</span></div>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-[2rem] flex justify-between items-center border border-blue-100 shadow-inner">
                <div className="text-right">
                    <span className="text-gray-400 text-[10px] font-black block mb-1">معاش پیشنهادی ماهانه</span>
                    <span className="text-2xl font-black text-blue-700">{job.salary ? job.salary.toLocaleString() : 'توافقی'} افغانی</span>
                </div>
                <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-blue-600 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <h3 className="text-[11px] font-black text-gray-400 mb-2 flex items-center gap-2 justify-end"><MapPin size={18} className="text-blue-600" /> {t.address}:</h3>
                    <p className="text-base font-black text-gray-800 leading-7">{job.address || 'آدرسی ثبت نشده است'}</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 border-r-4 border-blue-600 pr-3">توضیحات و نیازمندی‌ها</h3>
                    <p className="text-gray-600 leading-8 text-sm text-justify font-medium whitespace-pre-wrap">{job.description}</p>
                </div>

                <div className="md:hidden pt-10 border-t">
                   <ContactSection />
                </div>
            </div>
        </div>
      </div>
      {isChatOpen && <ChatWindow receiverPhone={job.phoneNumber} adId={job.id} adTitle={job.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default JobDetails;
