
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Bookmark, Phone, MapPinned, Clock, MapPin, Loader2, Info, UserPlus, Edit3, Trash2, RefreshCcw, Shield, MessageCircle, X } from 'lucide-react';
import { getRelativeTime } from '../services/translations';
import { supabase, TABLES } from '../services/supabaseClient';
import ChatWindow from './ChatWindow';

interface GeneralAdDetailsProps {
  ad: any;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
  onShowOtherAds?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ContactActions: React.FC<{
  handleChatOpen: () => void;
  showContact: boolean;
  setShowContact: (b: boolean) => void;
  phoneNumber: string;
  ownerName: string;
  t: any;
  isSaved: boolean;
  onToggleSave: () => void;
  onShowOtherAds?: () => void;
}> = ({ handleChatOpen, showContact, setShowContact, phoneNumber, ownerName, t, isSaved, onToggleSave, onShowOtherAds }) => (
  <div className="space-y-4 bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner">
    <div className="flex flex-col gap-3">
      {onShowOtherAds && (
        <button onClick={onShowOtherAds} className="w-full bg-white border-2 border-dashed border-gray-200 text-gray-600 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-sm">
          <UserPlus size={18} /> سایر آگهی‌های {ownerName}
        </button>
      )}
      <div className="flex gap-3">
         <button onClick={onToggleSave} className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border transition-all active:scale-90 shadow-sm ${isSaved ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <Bookmark size={24} className={isSaved ? "fill-current" : ""} />
         </button>
         <button onClick={handleChatOpen} className="flex-1 bg-white border border-gray-200 text-gray-700 h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 shadow-sm">
            <MessageCircle size={22} className="text-red-600" /> {String(t.chat)}
         </button>
         {!showContact ? (
           <button onClick={() => setShowContact(true)} className="flex-[2] bg-[#a62626] text-white h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 shadow-md transition-all">
               {String(t.contact_info)}
           </button>
         ) : (
           <a href={`tel:${phoneNumber}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in tracking-widest shadow-md">
               <Phone size={24} /> <span dir="ltr">{String(phoneNumber)}</span>
           </a>
         )}
      </div>
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
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-[10px] font-black uppercase tracking-widest">پنل مدیریت آگهی شما</span>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <button onClick={onEdit} className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
        <Edit3 size={20} />
        <span className="text-[10px] font-black">ویرایش</span>
      </button>
      <button onClick={onNardeban} disabled={isNardebaning} className="flex flex-col items-center gap-2 p-4 bg-red-600/20 text-red-500 rounded-2xl hover:bg-red-600/30 transition-all border border-red-600/20">
        {isNardebaning ? <Loader2 size={20} className="animate-spin" /> : <RefreshCcw size={20} />}
        <span className="text-[10px] font-black">نردبان</span>
      </button>
      <button onClick={onDelete} className="flex flex-col items-center gap-2 p-4 bg-red-600 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
        <Trash2 size={20} />
        <span className="text-[10px] font-black">حذف آگهی</span>
      </button>
    </div>
  </div>
);

export default function GeneralAdDetails({ ad, onClose, onShowOnMap, isSaved, onToggleSave, t, onShowOtherAds, onEdit, onDelete }: GeneralAdDetailsProps) {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNardebaning, setIsNardebaning] = useState(false);
  const [ownerName, setOwnerName] = useState<string>(ad.phoneNumber || (ad as any).phone_number || '');
  
  const userPhone = localStorage.getItem('user_phone');
  const isOwner = ad.owner_id === userPhone || ad.ownerId === userPhone;
  const isPending = ad.status === 'PENDING';
  
  const touchStartX = useRef<number | null>(null);
  const allImages = ad?.images?.filter((img: any) => img) || [];

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  useEffect(() => {
    const fetchOwnerName = async () => {
      const phone = ad.owner_id || ad.ownerId;
      if (phone) {
        const { data } = await supabase.from('profiles').select('full_name').eq('phone', phone).maybeSingle();
        if (data?.full_name) setOwnerName(data.full_name);
      }
    };
    fetchOwnerName();
  }, [ad]);

  const handleNardeban = async () => {
    const lastUpdate = new Date(ad.created_at || ad.date);
    const now = new Date();
    const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 3) return alert("شما هر ۳ روز یکبار می‌توانید نردبان کنید.");

    setIsNardebaning(true);
    try {
      const { error } = await supabase.from(TABLES.GENERAL_ADS).update({ created_at: new Date() }).eq('id', ad.id);
      if (error) throw error;
      alert("آگهی نردبان شد!");
    } catch (e) { alert("خطا در نردبان"); } finally { setIsNardebaning(false); }
  };

  const handleChatOpen = () => {
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (userPhone === ad.phoneNumber || userPhone === (ad as any).phone_number) return alert("شما نمی‌توانید با خودتان چت کنید!");
    setIsChatOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      {/* Header: Fixed top left exit button */}
      <div className="absolute top-0 left-0 right-0 h-14 z-[5002] flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto active:scale-90 border border-gray-100">
          <X size={24} className="text-gray-800" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto md:overflow-hidden md:flex md:flex-row bg-gray-50 h-full no-scrollbar">
        <div className="w-full md:w-[60%] md:h-full flex flex-col shrink-0 md:border-l bg-white md:overflow-y-auto no-scrollbar relative">
            <div className="w-full h-[45vh] md:h-[75vh] bg-zinc-900 relative shrink-0 flex items-center justify-center overflow-hidden" 
                 onTouchStart={(e) => touchStartX.current = e.touches[0].clientX} 
                 onTouchEnd={(e) => {
                   if (touchStartX.current === null) return;
                   const diff = touchStartX.current - e.changedTouches[0].clientX;
                   if (Math.abs(diff) > 40) diff > 0 ? nextImage() : prevImage();
                   touchStartX.current = null;
                 }}>
                {allImages.length > 0 ? (
                <>
                    <img key={activeImageIndex} src={String(allImages[activeImageIndex])} className="w-full h-full object-contain animate-in fade-in duration-300" alt={String(ad.title)} />
                    
                    {allImages.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all hidden md:flex z-10">
                          <Bookmark className="rotate-180" size={32} />
                        </button>
                        <button onClick={nextImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all hidden md:flex z-10">
                          <Bookmark size={32} />
                        </button>

                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest">
                          {activeImageIndex + 1} از {allImages.length}
                        </div>
                      </>
                    )}
                </>
                ) : <div className="text-gray-500 font-black uppercase tracking-widest">تصویری ندارد</div>}
            </div>
            <div className="hidden md:block p-8 border-t bg-white">
               {isOwner ? (
                 <OwnerPanel onEdit={onEdit!} onDelete={onDelete!} onNardeban={handleNardeban} isNardebaning={isNardebaning} />
               ) : (
                 <ContactActions ownerName={ownerName} isSaved={isSaved} onToggleSave={onToggleSave} onShowOtherAds={onShowOtherAds} handleChatOpen={handleChatOpen} showContact={showContact} setShowContact={setShowContact} phoneNumber={ad.phoneNumber || (ad as any).phone_number} t={t} />
               )}
            </div>
        </div>

        <div className="flex-1 md:h-full md:overflow-y-auto no-scrollbar bg-white p-6 md:p-10 space-y-8 pb-32">
            {isOwner && isPending && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3 animate-pulse">
                <Info className="text-amber-600" size={20} />
                <p className="text-[10px] font-black text-amber-600">در انتظار تایید ادمین.</p>
              </div>
            )}
            <div className="space-y-2 pt-2 text-right">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{String(ad.title)}</h1>
              <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-wider justify-end">
                <Clock size={12} /> {getRelativeTime(ad.created_at || ad.date)} در {String(ad.city)}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 py-6 border-y border-gray-100 text-center">
                <div className="bg-red-50 p-3 rounded-2xl border border-red-100/50">
                  <span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">{String(t.city)}</span>
                  <span className="font-black text-xs text-[#a62626] flex items-center justify-center gap-1"><MapPin size={12} /> {String(ad.city)}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                  <span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">وضعیت کالا</span>
                  <span className="font-black text-xs text-blue-600 flex items-center justify-center gap-1"><Shield size={12} /> {ad.item_condition || 'نامشخص'}</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                  <span className="block text-gray-400 text-[8px] font-black mb-1 uppercase tracking-widest">دسته‌بندی</span>
                  <span className="font-black text-xs">{ad.sub_category || 'سایر'}</span>
                </div>
            </div>

            <div className="bg-red-50/50 p-6 rounded-[2.2rem] border border-red-100 shadow-inner">
                <div className="flex justify-between items-center">
                    <div className="text-right">
                        <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase tracking-widest">قیمت</span>
                        <span className="text-2xl font-black text-[#a62626]">{Number(ad.price || 0).toLocaleString()} <small className="text-sm">افغانی</small></span>
                    </div>
                    {ad.location && (
                      <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-[#a62626] rounded-2xl shadow-md border border-red-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                    )}
                </div>
            </div>

            <div className="space-y-8 text-right">
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-sm">
                    <h3 className="text-[10px] font-black text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-widest justify-end"><MapPin size={18} className="text-red-600" /> آدرس دقیق:</h3>
                    <p className="text-base font-black text-gray-800 leading-8">{String(ad.address) || 'آدرسی ثبت نشده است'}</p>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 border-r-4 border-red-600 pr-3">توضیحات تکمیلی</h3>
                    <p className="text-gray-600 leading-8 text-sm text-justify font-bold whitespace-pre-wrap">{String(ad.description)}</p>
                </div>

                <div className="md:hidden pt-10 border-t">
                   {isOwner ? (
                     <OwnerPanel onEdit={onEdit!} onDelete={onDelete!} onNardeban={handleNardeban} isNardebaning={isNardebaning} />
                   ) : (
                     <ContactActions ownerName={ownerName} isSaved={isSaved} onToggleSave={onToggleSave} onShowOtherAds={onShowOtherAds} handleChatOpen={handleChatOpen} showContact={showContact} setShowContact={setShowContact} phoneNumber={ad.phoneNumber || (ad as any).phone_number} t={t} />
                   )}
                </div>
            </div>
        </div>
      </div>
      {isChatOpen && <ChatWindow receiverPhone={ad.phoneNumber || (ad as any).phone_number} adId={ad.id} adTitle={ad.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}
