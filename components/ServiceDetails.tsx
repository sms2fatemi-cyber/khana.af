
import React, { useState, useEffect, useCallback } from 'react';
import { Service } from '../types';
import { User, ChevronRight, Bookmark, MapPinned, Phone, X, Share2, MessageCircle, ChevronLeft } from 'lucide-react';
import ChatWindow from './ChatWindow.tsx';

interface ServiceDetailsProps {
  service: Service;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
}

const ServiceDetails: React.FC<ServiceDetailsProps> = ({ service, onClose, onShowOnMap, isSaved, onToggleSave, t }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!service || !('providerName' in service)) {
    console.error("ServiceDetails received invalid data:", service);
    return null; 
  }

  const allImages = service.images?.filter(img => img) || [];

  const nextImage = useCallback(() => { if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0)); }, [allImages.length]);
  const prevImage = useCallback(() => { if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1)); }, [allImages.length]);

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
    if (navigator.share) navigator.share({ title: service.title, text: service.description, url: window.location.href }).catch(() => {});
    else alert("لینک کپی شد!");
  };

  const handleChatOpen = () => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone) { alert("لطفاً ابتدا وارد حساب خود شوید."); return; }
    if (userPhone === service.phoneNumber) { alert("این آگهی متعلق به خودتان است!"); return; }
    setIsChatOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 active:scale-90 bg-white/80 backdrop-blur-md rounded-full shadow-sm pointer-events-auto text-gray-700"><ChevronRight size={24} /></button>
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={handleShare} className="p-2 text-gray-700 bg-white/80 backdrop-blur-md rounded-full shadow-sm"><Share2 size={20} /></button>
          <button onClick={onToggleSave} className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-orange-600 text-orange-600" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar md:flex md:flex-row md:overflow-hidden">
        <div className="w-full h-[40vh] md:w-[60%] md:h-full bg-orange-950 relative shrink-0 flex items-center justify-center group select-none overflow-hidden">
            {allImages.length > 0 ? (
            <>
                <img key={allImages[activeImageIndex]} src={allImages[activeImageIndex]} className="w-full h-full object-contain" alt={service.title} />
                {allImages.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full z-50 backdrop-blur-sm border border-white/10"><ChevronRight size={32} /></button>
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full z-50 backdrop-blur-sm border border-white/10"><ChevronLeft size={32} /></button>
                </>
                )}
            </>
            ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500"><X size={48} /></div>
            )}
        </div>

        <div className="bg-white md:flex-1 md:h-full md:overflow-y-auto p-6 md:p-8 space-y-6">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3">{service.title}</h1>
            <div className="flex items-center gap-2 text-orange-600 font-bold bg-orange-50 px-3 py-2 rounded-xl inline-flex text-xs"><User size={16} /> {service.providerName}</div>

            <div className="bg-gray-50 p-6 rounded-[2rem] flex justify-between items-center border border-gray-100 my-8">
                <div>
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">{t.experience}</span>
                    <span className="text-2xl font-black text-orange-600">{service.experience}</span>
                </div>
                <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-orange-600 rounded-2xl shadow-sm border border-orange-50 flex items-center justify-center"><MapPinned size={28} /></button>
            </div>

            <div className="space-y-4 pb-4">
                <h3 className="text-lg font-black text-gray-900">{t.description}</h3>
                <p className="text-gray-600 leading-8 text-sm text-justify font-medium">{service.description}</p>
            </div>
        </div>
      </div>

      <div className="bg-white border-t p-4 flex gap-3 z-30 shrink-0 safe-area-bottom">
        <button onClick={handleChatOpen} className="flex-1 bg-gray-100 text-gray-700 h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95">
            <MessageCircle size={22} /> {t.chat}
        </button>
        {service.showPhoneNumber !== false ? (
          !showContact ? (
            <button onClick={() => setShowContact(true)} className="flex-[2] bg-orange-700 text-white h-14 rounded-2xl font-black text-lg active:scale-95 shadow-xl">
                اطلاعات تماس
            </button>
          ) : (
            <a href={`tel:${service.phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in shadow-xl tracking-widest">
                <Phone size={24} /> {service.phoneNumber}
            </a>
          )
        ) : (
          <div className="flex-[2] bg-gray-50 text-gray-400 h-14 rounded-2xl font-bold flex items-center justify-center text-xs border border-dashed border-gray-200">فقط از طریق چت</div>
        )}
      </div>

      {isChatOpen && <ChatWindow receiverPhone={service.phoneNumber} adId={service.id} adTitle={service.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default ServiceDetails;
