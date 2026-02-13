
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Service } from '../types';
import { 
  ChevronRight, ChevronLeft, Bookmark, MapPinned, Phone, MessageCircle, 
  Clock, MapPin, Wrench, ShieldCheck, 
  UserPlus, Edit3, Trash2, RefreshCcw, Loader2, Info 
} from 'lucide-react';
import ChatWindow from './ChatWindow';
import { getRelativeTime } from '../services/translations';
import { supabase, TABLES } from '../services/supabaseClient';

interface ServiceDetailsProps {
  service: Service;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
  onShowOtherAds?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ServiceContact: React.FC<{
  handleChatOpen: () => void;
  showContact: boolean;
  setShowContact: (b: boolean) => void;
  phoneNumber: string;
  t: any;
  onShowOtherAds?: () => void;
}> = ({ handleChatOpen, showContact, setShowContact, phoneNumber, t, onShowOtherAds }) => (
  <div className="space-y-4 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
    {onShowOtherAds && (
      <button onClick={onShowOtherAds} className="w-full bg-white border-2 border-dashed border-gray-200 text-gray-600 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-sm">
        <UserPlus size={18} /> سایر آگهی‌های این آگهی‌دهنده
      </button>
    )}
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

const OwnerPanel: React.FC<{
  onEdit: () => void;
  onDelete: () => void;
  onNardeban: () => void;
  isNardebaning: boolean;
}> = ({ onEdit, onDelete, onNardeban, isNardebaning }) => (
  <div className="bg-zinc-900 p-6 rounded-[2.5rem] text-white space-y-4 shadow-2xl">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      <span className="text-[10px] font-black uppercase tracking-widest">مدیریت آگهی خدماتی شما</span>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <button onClick={onEdit} className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
        <Edit3 size={20} />
        <span className="text-[10px] font-black">ویرایش</span>
      </button>
      <button onClick={onNardeban} disabled={isNardebaning} className="flex flex-col items-center gap-2 p-4 bg-orange-600/20 text-orange-500 rounded-2xl hover:bg-orange-600/30 transition-all border border-orange-600/20">
        {isNardebaning ? <Loader2 size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
        <span className="text-[10px] font-black">نردبان</span>
      </button>
      <button onClick={onDelete} className="flex flex-col items-center gap-2 p-4 bg-red-600 rounded-2xl hover:bg-red-700 transition-all shadow-lg">
        <Trash2 size={20} />
        <span className="text-[10px] font-black">حذف</span>
      </button>
    </div>
  </div>
);

const ServiceDetails: React.FC<ServiceDetailsProps> = ({ service, onClose, onShowOnMap, isSaved, onToggleSave, t, onShowOtherAds, onEdit, onDelete }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNardebaning, setIsNardebaning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  
  const userPhone = localStorage.getItem('user_phone');
  const isOwner = service.ownerId === userPhone || service.owner_id === userPhone;
  const allImages = service.images?.filter(img => img) || [];

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') prevImage();
      else if (e.key === 'ArrowLeft') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage]);

  const handleNardeban = async () => {
    const lastUpdate = new Date(service.created_at || service.date);
    const now = new Date();
    const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 3) return alert("شما هر ۳ روز یکبار می‌توانید نردبان کنید.");
    setIsNardebaning(true);
    try {
      const { error } = await supabase.from(TABLES.SERVICES).update({ created_at: new Date() }).eq('id', service.id);
      if (error) throw error;
      alert("آگهی نردبان شد!");
    } catch (e) { alert("خطا در نردبان"); } finally { setIsNardebaning(false); }
  };

  const handleChatOpen = () => {
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (userPhone === service.phoneNumber) return alert("این آگهی متعلق به خودتان است!");
    setIsChatOpen(true);
  };

  if (!service) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      <div className="absolute top-0 left-0 right-0 h-14 z-[5002] flex items-center justify-between px-4 pt-2 pointer-events-none text-right">
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
                 if (Math.abs(diff) > 40) diff > 0 ? nextImage() : prevImage();
                 touchStartX.current = null;
               }}>
                {allImages.length > 0 ? (
                <>
                    <img key={activeImageIndex} src={String(allImages[activeImageIndex])} className="w-full h-full object-contain animate-in fade-in duration-300" alt={String(service.title)} />
                    
                    {allImages.length > 1 && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all hidden md:flex z-10">
                          <ChevronRight size={32} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all hidden md:flex z-10">
                          <ChevronLeft size={32} />
                        </button>

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest">
                          {activeImageIndex + 1} از {allImages.length}
                        </div>
                      </>
                    )}
                </>
                ) : <div className="text-gray-500 font-black uppercase tracking-widest opacity-20">بدون تصویر</div>}
            </div>
            <div className="hidden md:block p-8 border-t bg-white">
               {isOwner ? (
                 <OwnerPanel onEdit={onEdit!} onDelete={onDelete!} onNardeban={handleNardeban} isNardebaning={isNardebaning} />
               ) : (
                 <ServiceContact onShowOtherAds={onShowOtherAds} handleChatOpen={handleChatOpen} showContact={showContact} setShowContact={setShowContact} phoneNumber={service.phoneNumber} t={t} />
               )}
            </div>
        </div>

        <div className="flex-1 md:h-full md:overflow-y-auto no-scrollbar bg-white p-6 md:p-8 space-y-6 pb-32 text-right">
            {isOwner && service.status === 'PENDING' && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-3 animate-pulse">
                {/* Fix: Info icon is now imported */}
                <Info className="text-orange-600" size={20} />
                <p className="text-[10px] font-black text-orange-600">این آگهی در انتظار تایید ادمین است و فعلاً فقط برای شما نمایش داده می‌شود.</p>
              </div>
            )}
            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2 pt-2">{String(service.title)}</h1>
            <div className="flex items-center gap-2 mb-6 text-gray-400 font-bold text-xs justify-end"><Clock size={12} /> {getRelativeTime(service.created_at || service.date)} در {String(service.city)}</div>
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
                {service.location && (
                  <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-orange-600 rounded-2xl shadow-sm border border-orange-200 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                )}
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
                   {isOwner ? (
                     <OwnerPanel onEdit={onEdit!} onDelete={onDelete!} onNardeban={handleNardeban} isNardebaning={isNardebaning} />
                   ) : (
                     <ServiceContact onShowOtherAds={onShowOtherAds} handleChatOpen={handleChatOpen} showContact={showContact} setShowContact={setShowContact} phoneNumber={service.phoneNumber} t={t} />
                   )}
                </div>
            </div>
        </div>
      </div>
      {isChatOpen && <ChatWindow receiverPhone={service.phoneNumber} adId={service.id} adTitle={service.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default ServiceDetails;
