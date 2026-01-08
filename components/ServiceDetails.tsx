
import React, { useState, useCallback, useRef } from 'react';
import { Service } from '../types';
import { ChevronRight, Bookmark, MapPinned, Phone, X, MessageCircle, ChevronLeft, Clock, MapPin, Wrench, ShieldCheck, Info } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { getRelativeTime } from '../services/translations';

interface ServiceDetailsProps {
  service: Service;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
}

const ServiceContact: React.FC<{
  handleChatOpen: () => void;
  showContact: boolean;
  setShowContact: (b: boolean) => void;
  phoneNumber: string;
  t: any;
}> = ({ handleChatOpen, showContact, setShowContact, phoneNumber, t }) => (
  <div className="space-y-4 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
    <div className="flex gap-3">
      <button onClick={handleChatOpen} className="flex-1 bg-white border border-gray-200 text-gray-700 h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 shadow-sm">
          <MessageCircle size={22} className="text-orange-600" /> {String(t.chat)}
      </button>
      {!showContact ? (
        <button onClick={() => setShowContact(true)} className="flex-[2] bg-orange-700 text-white h-14 rounded-2xl font-black text-sm active:scale-95 shadow-md transition-all">{String(t.contact_info)}</button>
      ) : (
        <a href={`tel:${phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in shadow-md tracking-widest text-left px-6">
          <Phone size={24} /> <span dir="ltr">{String(phoneNumber)}</span>
        </a>
      )}
    </div>
  </div>
);

const ServiceDetails: React.FC<ServiceDetailsProps> = ({ service, onClose, onShowOnMap, isSaved, onToggleSave, t }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isPending = service.status === 'PENDING';
  const isOwner = service.ownerId === localStorage.getItem('user_phone');
  
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
      
      <div className="absolute top-0 left-0 right-0 h-14 z-[5002] flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 active:scale-90 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto text-gray-700"><ChevronRight size={24} /></button>
        <button onClick={onToggleSave} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-orange-600 text-orange-600" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-row bg-gray-50 h-full no-scrollbar">
        
        <div className="w-full md:w-[60%] md:h-full flex flex-col shrink-0 md:border-l bg-white md:overflow-y-auto no-scrollbar">
            <div className="w-full h-[40vh] md:h-[75vh] bg-orange-950 relative shrink-0 flex items-center justify-center overflow-hidden"
               onTouchStart={(e) => touchStartX.current = e.touches[0].clientX} 
               onTouchEnd={(e) => {
                 if (touchStartX.current === null) return;
                 const diff = touchStartX.current - e.changedTouches[0].clientX;
                 if (Math.abs(diff) > 50) diff > 0 ? nextImage() : prevImage();
                 touchStartX.current = null;
               }}>
                {allImages.length > 0 ? (
                <>
                    <img key={activeImageIndex} src={String(allImages[activeImageIndex])} className="w-full h-full object-contain animate-in fade-in duration-500" alt={String(service.title)} />
                    {allImages.length > 1 && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                          <button onClick={prevImage} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all"><ChevronLeft size={32} /></button>
                          <button onClick={nextImage} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all"><ChevronRight size={32} /></button>
                        </div>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest">
                          {activeImageIndex + 1} از {allImages.length}
                        </div>
                      </>
                    )}
                </>
                ) : <div className="text-gray-500 font-black uppercase tracking-widest opacity-20">بدون تصویر</div>}
                <button onClick={onClose} className="hidden md:flex absolute top-6 left-6 bg-white/10 text-white p-2 rounded-full backdrop-blur-md z-50"><X size={24} /></button>
            </div>

            <div className="hidden md:block p-8 border-t bg-white">
               <ServiceContact handleChatOpen={handleChatOpen} showContact={showContact} setShowContact={setShowContact} phoneNumber={service.phoneNumber} t={t} />
            </div>
        </div>

        <div className="flex-1 md:h-full md:overflow-y-auto no-scrollbar bg-white p-6 md:p-8 space-y-6 pb-32 text-right">
            {isOwner && isPending && (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 animate-pulse">
                <Info className="text-red-600" size={20} />
                <p className="text-[10px] font-black text-red-600">این آگهی در انتظار تایید ادمین است و فعلاً فقط برای شما نمایش داده می‌شود.</p>
              </div>
            )}

            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2 pt-2">{String(service.title)}</h1>
            <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-xs justify-end"><Clock size={12} /> {getRelativeTime(service.date, 'dari')} در {String(service.city)}</div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-6 border-y text-center">
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100 shadow-sm"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{String(t.provider || 'نام متخصص')}</span><span className="font-black text-xs text-orange-700 truncate"><ShieldCheck size={12} className="inline ml-1" />{String(service.providerName) || '---'}</span></div>
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100 shadow-sm"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{String(t.experience || 'سابقه کار')}</span><span className="font-black text-xs text-orange-700"><Wrench size={12} className="inline ml-1" />{String(service.experience) || '---'}</span></div>
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100 shadow-sm"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{String(t.city)}</span><span className="font-black text-xs text-orange-700"><MapPin size={12} className="inline ml-1" />{String(service.city)}</span></div>
                <div className="bg-orange-50 p-2.5 rounded-2xl border border-orange-100 shadow-sm"><span className="block text-gray-400 text-[8px] font-black uppercase mb-1">{String(t.category)}</span><span className="font-black text-[10px] text-orange-700">{String(service.category) || '---'}</span></div>
            </div>

            <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex justify-between items-center shadow-inner">
                <div className="text-right">
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase tracking-widest">{String(t.experience)}</span>
                    <span className="text-2xl font-black text-orange-600">{String(service.experience)}</span>
                </div>
                <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-orange-600 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <h3 className="text-[11px] font-black text-gray-400 mb-2 flex items-center gap-2 justify-end"><MapPin size={18} className="text-orange-600" /> {String(t.address)}:</h3>
                    <p className="text-base font-black text-gray-800 leading-7">{String(service.address) || 'آدرسی ثبت نشده است'}</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100">
                    <h3 className="text-lg font-black text-gray-900 border-r-4 border-orange-600 pr-3 mb-4">جزئیات تخصص</h3>
                    <div className="grid grid-cols-1 gap-4 text-sm font-bold text-gray-700">
                      <div className="flex justify-between border-b pb-2">نام متخصص: <span className="text-gray-900">{String(service.providerName)}</span></div>
                      <div className="flex justify-between border-b pb-2">دسته بندی: <span className="text-orange-600">{String(service.category)}</span></div>
                      <div className="flex justify-between border-b pb-2">سابقه فعالیت: <span className="text-gray-900">{String(service.experience)}</span></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 border-r-4 border-orange-600 pr-3">{String(t.description)}</h3>
                    <p className="text-gray-600 leading-8 text-sm text-justify font-bold whitespace-pre-wrap">{String(service.description)}</p>
                </div>

                <div className="md:hidden pt-10 border-t">
                   <ServiceContact handleChatOpen={handleChatOpen} showContact={showContact} setShowContact={setShowContact} phoneNumber={service.phoneNumber} t={t} />
                </div>
            </div>
        </div>
      </div>
      {isChatOpen && <ChatWindow receiverPhone={service.phoneNumber} adId={service.id} adTitle={service.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default ServiceDetails;
