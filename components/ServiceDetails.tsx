
import React, { useState, useCallback } from 'react';
import { Service } from '../types';
import { ChevronRight, Bookmark, MapPinned, Phone, X, MessageCircle, ChevronLeft, Clock, MapPin } from 'lucide-react';
import ChatWindow from './ChatWindow.tsx';
import { getRelativeTime } from '../services/translations';

interface ServiceDetailsProps {
  service: Service;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
}

// Added 't' to the component props to resolve the TypeScript error in App.tsx
const ServiceDetails: React.FC<ServiceDetailsProps> = ({ service, onClose, onShowOnMap, isSaved, onToggleSave, t }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  if (!service) return null;

  const allImages = service.images?.filter(img => img) || [];

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleChatOpen = () => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (userPhone === service.phoneNumber) return alert("این آگهی متعلق به خودتان است!");
    setIsChatOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 active:scale-90 bg-white/80 backdrop-blur-md rounded-full shadow-sm pointer-events-auto text-gray-700"><ChevronRight size={24} /></button>
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={onToggleSave} className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-orange-600 text-orange-600" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar md:flex md:flex-row md:overflow-hidden bg-gray-50">
        {/* Image Viewer */}
        <div className="w-full h-[40vh] md:w-[60%] md:h-full bg-orange-950 relative shrink-0 flex items-center justify-center overflow-hidden">
            {allImages.length > 0 ? (
            <>
                <img src={allImages[activeImageIndex]} className="w-full h-full object-contain" alt={service.title} />
                {allImages.length > 1 && (
                <><button onClick={prevImage} className="absolute left-4 top-1/2 bg-black/30 text-white p-3 rounded-full"><ChevronLeft size={32} /></button>
                <button onClick={nextImage} className="absolute right-4 top-1/2 bg-black/30 text-white p-3 rounded-full"><ChevronRight size={32} /></button></>
                )}
            </>
            ) : <div className="text-gray-500">تصویری ندارد</div>}
            <button onClick={onClose} className="hidden md:flex absolute top-6 left-6 bg-white/10 text-white p-2 rounded-full backdrop-blur-md z-50"><X size={24} /></button>
        </div>

        {/* Content Section */}
        <div className="bg-white relative z-10 -mt-6 md:mt-0 rounded-t-[2rem] md:rounded-none md:flex-1 md:h-full md:overflow-y-auto p-6 md:p-8 space-y-6 shadow-xl no-scrollbar pb-32">
            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2 pt-2">{service.title}</h1>
            <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-xs"><Clock size={12} /> {getRelativeTime(service.date, 'dari')} در {service.city}</div>

            {/* Grid Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-6 border-y text-center">
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.provider || 'نام متخصص'}</span><span className="font-black text-xs text-orange-700">{service.providerName || '---'}</span></div>
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.experience || 'سابقه کار'}</span><span className="font-black text-xs text-orange-700">{service.experience || '---'}</span></div>
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.city}</span><span className="font-black text-xs text-orange-700">{service.city}</span></div>
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{t.category}</span><span className="font-black text-[10px] text-orange-700">{service.category || '---'}</span></div>
            </div>

            {/* Highlights */}
            <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex justify-between items-center my-8 shadow-sm">
                <div className="text-right">
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">{t.experience}</span>
                    <span className="text-2xl font-black text-orange-600">{service.experience}</span>
                </div>
                <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-orange-600 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
            </div>

            {/* Address & Description */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <h3 className="text-[11px] font-black text-gray-400 mb-2 flex items-center gap-2"><MapPin size={18} className="text-orange-600" /> {t.address}:</h3>
                    <p className="text-base font-black text-gray-800 leading-7">{service.address || 'آدرسی ثبت نشده است'}</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900">{t.description}</h3>
                    <p className="text-gray-600 leading-8 text-sm text-justify font-medium pb-4">{service.description}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-white border-t p-4 flex gap-3 z-30 shrink-0 safe-area-bottom shadow-lg">
        <button onClick={handleChatOpen} className="flex-1 bg-gray-100 text-gray-700 h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3">
            <MessageCircle size={22} /> {t.chat}
        </button>
        {!showContact ? (
          <button onClick={() => setShowContact(true)} className="flex-[2] bg-orange-700 text-white h-14 rounded-2xl font-black text-lg active:scale-95 shadow-xl transition-all">{t.contact_info}</button>
        ) : (
          <a href={`tel:${service.phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in shadow-xl tracking-widest"><Phone size={24} /> {service.phoneNumber}</a>
        )}
      </div>
      {isChatOpen && <ChatWindow receiverPhone={service.phoneNumber} adId={service.id} adTitle={service.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default ServiceDetails;
