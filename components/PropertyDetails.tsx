import React, { useState, useCallback } from 'react';
import { Property } from '../types';
import { Bookmark, ChevronRight, Phone, MapPinned, X, ChevronLeft, MessageCircle, Clock, MapPin } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { getRelativeTime } from '../services/translations';

interface PropertyDetailsProps {
  property: Property;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
}

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property, onClose, onShowOnMap, isSaved, onToggleSave, t }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!property) return null;

  const displayAddress = property.address || (property as any).exact_address || 'آدرسی ثبت نشده است';
  const cityName = property.city || (t.city === 'ولایت' ? 'نامشخص' : 'نامعلوم');

  const allImages = property.images?.filter(img => img) || [];
  const minSwipeDistance = 50;

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

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
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (userPhone === property.phoneNumber) return alert("شما نمی‌توانید با خودتان چت کنید!");
    setIsChatOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      
      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm pointer-events-auto text-gray-700"><ChevronRight size={24} /></button>
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={onToggleSave} className="p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-[#a62626] text-[#a62626]" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar md:flex md:flex-row md:overflow-hidden bg-gray-50">
        <div className="w-full h-[40vh] md:w-[60%] md:h-full bg-zinc-900 relative shrink-0 flex items-center justify-center overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            {allImages.length > 0 ? (
            <>
                <img src={allImages[activeImageIndex]} className="w-full h-full object-contain" alt={property.title} />
                {allImages.length > 1 && (
                <><button onClick={prevImage} className="absolute left-4 top-1/2 bg-black/30 text-white p-3 rounded-full"><ChevronLeft size={32} /></button>
                <button onClick={nextImage} className="absolute right-4 top-1/2 bg-black/30 text-white p-3 rounded-full"><ChevronRight size={32} /></button></>
                )}
            </>
            ) : <div className="text-gray-500">تصویری ندارد</div>}
            <button onClick={onClose} className="hidden md:flex absolute top-6 left-6 bg-white/10 text-white p-2 rounded-full backdrop-blur-md z-50"><X size={24} /></button>
        </div>

        <div className="bg-white relative z-10 -mt-6 md:mt-0 rounded-t-[2rem] md:rounded-none md:flex-1 md:h-full md:overflow-y-auto no-scrollbar shadow-xl pb-4 text-right">
            <div className="p-6 md:p-8 space-y-6">
                <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2 pt-2">{property.title}</h1>
                <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-xs">
                  <Clock size={12} /> {getRelativeTime(property.date, 'dari')} در ولایت {cityName}
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-6 border-y border-gray-100 text-center">
                    <div className="bg-red-50 p-2.5 rounded-2xl border border-red-100/50">
                      <span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">{t.city}</span>
                      <span className="font-black text-xs text-[#a62626] flex items-center justify-center gap-1"><MapPin size={10} /> {cityName}</span>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100/50"><span className="block text-gray-400 text-[8px] font-black mb-1 uppercase">{t.area}</span><span className="font-black text-xs">{property.area} متر</span></div>
                    <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100/50"><span className="block text-gray-400 text-[8px] font-black mb-1 uppercase">{t.bedrooms}</span><span className="font-black text-xs">{property.bedrooms} خواب</span></div>
                    <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100/50"><span className="block text-gray-400 text-[8px] font-black mb-1 uppercase">{t.type}</span><span className="font-black text-xs">{property.type}</span></div>
                </div>

                <div className="bg-red-50/50 p-6 rounded-[1.8rem] border border-red-100 my-8">
                    <div className="flex justify-between items-center">
                        <div className="text-right">
                            <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase">قیمت کل / مبلغ</span>
                            <span className="text-2xl font-black text-[#a62626]">{property.price?.toLocaleString()} افغانی</span>
                        </div>
                        <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-[#a62626] rounded-2xl shadow-sm border border-red-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-200 shadow-sm">
                        <h3 className="text-[11px] font-black text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-widest"><MapPin size={18} className="text-red-600" /> آدرس دقیق در {cityName}:</h3>
                        <p className="text-base font-black text-gray-800 leading-8">{displayAddress}</p>
                    </div>
                    
                    <div className="space-y-4 mb-4">
                        <h3 className="text-lg font-black text-gray-900">{t.description}</h3>
                        <p className="text-gray-600 leading-8 text-sm text-justify font-medium pb-4">{property.description}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white border-t p-4 flex gap-3 z-30 shadow-lg safe-area-bottom shrink-0">
        <button onClick={handleChatOpen} className="flex-1 bg-gray-100 text-gray-700 h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-colors">
            <MessageCircle size={22} /> {t.chat}
        </button>
        {!showContact ? (
          <button onClick={() => setShowContact(true)} className="flex-[2] bg-[#a62626] text-white h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 shadow-xl transition-all">
              {t.contact_info}
          </button>
        ) : (
          <a href={`tel:${property.phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in tracking-widest shadow-xl">
              <Phone size={24} /> {property.phoneNumber}
          </a>
        )}
      </div>
      {isChatOpen && <ChatWindow receiverPhone={property.phoneNumber} adId={property.id} adTitle={property.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default PropertyDetails;