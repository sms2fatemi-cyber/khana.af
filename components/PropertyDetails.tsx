
import React, { useState, useCallback, useRef } from 'react';
import { Property } from '../types';
import { Bookmark, ChevronRight, Phone, MapPinned, X, ChevronLeft, Send, Clock, MapPin, Box, Car, Loader2 } from 'lucide-react';
import { getRelativeTime } from '../services/translations';
import { supabase, TABLES } from '../services/supabaseClient';

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
  const [chatMsg, setChatMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const touchStartX = useRef<number | null>(null);
  const allImages = property?.images?.filter(img => img) || [];

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleQuickChatSend = async () => {
    const userPhone = localStorage.getItem('user_phone');
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (userPhone === property.phoneNumber) return alert("شما نمی‌توانید با خودتان چت کنید!");
    if (!chatMsg.trim() || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from(TABLES.USER_CHATS).insert([{
        sender_phone: userPhone,
        receiver_phone: property.phoneNumber,
        ad_id: property.id,
        ad_title: property.title,
        text: chatMsg.trim(),
        is_read: false
      }]);
      if (error) throw error;
      setChatMsg('');
      alert("پیام شما ارسال شد.");
    } catch (e: any) {
      alert("خطا در ارسال: " + e.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!property) return null;

  // تابع کمکی برای رندر بخش تماس (بدون تعریف به عنوان کامپوننت مجزا برای جلوگیری از Focus Loss)
  const renderContactActions = () => (
    <div className="space-y-4 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
      <h3 className="text-sm font-black text-gray-700 mb-2">ارتباط مستقیم</h3>
      <div className="flex gap-2">
         <input 
            type="text" 
            placeholder="پیام به مالک..." 
            className="flex-1 bg-white rounded-2xl px-5 py-4 font-bold text-sm outline-none border-2 border-transparent focus:border-red-100 transition-all shadow-sm"
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
         />
         <button 
            onClick={handleQuickChatSend}
            disabled={isSending || !chatMsg.trim()}
            className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-50 shrink-0"
         >
            {isSending ? <Loader2 className="animate-spin" /> : <Send size={24} className="rotate-180" />}
         </button>
      </div>
      <div className="flex gap-3">
        {!showContact ? (
          <button onClick={() => setShowContact(true)} className="flex-1 bg-[#a62626] text-white h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 shadow-md">
              {t.contact_info}
          </button>
        ) : (
          <a href={`tel:${property.phoneNumber}`} className="flex-1 bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in tracking-widest shadow-md">
              <Phone size={24} /> {property.phoneNumber}
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      
      {/* Header Buttons */}
      <div className="absolute top-0 left-0 right-0 h-14 z-[5002] flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto text-gray-700 active:scale-90"><ChevronRight size={24} /></button>
        <button onClick={onToggleSave} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto text-gray-700">
             <Bookmark size={20} className={isSaved ? "fill-[#a62626] text-[#a62626]" : ""} />
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-row bg-gray-50 h-full no-scrollbar">
        
        {/* Left Side: Photos */}
        <div className="w-full md:w-[60%] md:h-full flex flex-col shrink-0 md:border-l bg-white md:overflow-y-auto no-scrollbar">
            <div className="w-full h-[45vh] md:h-[75vh] bg-zinc-900 relative shrink-0 flex items-center justify-center overflow-hidden" onTouchStart={(e) => touchStartX.current = e.touches[0].clientX} onTouchEnd={(e) => {
               if (touchStartX.current === null) return;
               const diff = touchStartX.current - e.changedTouches[0].clientX;
               if (Math.abs(diff) > 50) diff > 0 ? nextImage() : prevImage();
               touchStartX.current = null;
            }}>
                {allImages.length > 0 ? (
                <>
                    <img key={activeImageIndex} src={allImages[activeImageIndex]} className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500" alt={property.title} />
                    {allImages.length > 1 && (
                      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                        <button onClick={prevImage} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all"><ChevronLeft size={32} /></button>
                        <button onClick={nextImage} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all"><ChevronRight size={32} /></button>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest">
                          {activeImageIndex + 1} از {allImages.length}
                        </div>
                      </div>
                    )}
                </>
                ) : <div className="text-gray-500 font-black uppercase tracking-widest">تصویری ندارد</div>}
                <button onClick={onClose} className="hidden md:flex absolute top-6 left-6 bg-white/10 text-white p-2 rounded-full backdrop-blur-md z-50 hover:bg-red-600 transition-colors"><X size={24} /></button>
            </div>

            {/* Desktop Contact Section */}
            <div className="hidden md:block p-8 border-t bg-white">
               {renderContactActions()}
            </div>
        </div>

        {/* Right Side: Info Section */}
        <div className="flex-1 md:h-full md:overflow-y-auto no-scrollbar bg-white p-6 md:p-10 space-y-8 pb-32">
            <div className="space-y-2 pt-2 text-right">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{property.title}</h1>
              <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider justify-end">
                <Clock size={12} /> {getRelativeTime(property.date, 'dari')} در {property.city}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 py-6 border-y border-gray-100 text-center">
                <div className="bg-red-50 p-3 rounded-2xl border border-red-100/50">
                  <span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">{t.city}</span>
                  <span className="font-black text-xs text-[#a62626] flex items-center justify-center gap-1"><MapPin size={12} /> {property.city}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50"><span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">{t.area}</span><span className="font-black text-xs">{property.area} متر</span></div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50"><span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">{t.bedrooms}</span><span className="font-black text-xs">{property.bedrooms} خواب</span></div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50"><span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">{t.type}</span><span className="font-black text-xs">{property.type}</span></div>
            </div>

            <div className="flex gap-4">
              {property.hasParking && <div className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-4 rounded-2xl font-black text-xs border border-blue-100"><Car size={18} /> پارکینگ</div>}
              {property.hasStorage && <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 text-amber-700 py-4 rounded-2xl font-black text-xs border border-amber-100"><Box size={18} /> انباری</div>}
            </div>

            <div className="bg-red-50/50 p-6 rounded-[2.2rem] border border-red-100">
                <div className="flex justify-between items-center">
                    <div className="text-right">
                        <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase tracking-widest">مبلغ نهایی</span>
                        <span className="text-2xl font-black text-[#a62626]">{property.price?.toLocaleString()} افغانی</span>
                    </div>
                    <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-[#a62626] rounded-2xl shadow-md border border-red-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                </div>
            </div>

            <div className="space-y-8 text-right">
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-widest justify-end"><MapPin size={18} className="text-red-600" /> آدرس دقیق:</h3>
                    <p className="text-base font-black text-gray-800 leading-8">{property.address || 'آدرسی ثبت نشده است'}</p>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 border-r-4 border-red-600 pr-3">توضیحات تکمیلی</h3>
                    <p className="text-gray-600 leading-8 text-sm text-justify font-bold whitespace-pre-wrap">{property.description}</p>
                </div>

                {/* Mobile Contact Section */}
                <div className="md:hidden pt-10 border-t">
                   {renderContactActions()}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
export default PropertyDetails;
