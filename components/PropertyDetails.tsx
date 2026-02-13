
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Property } from '../types';
import { Bookmark, ChevronRight, ChevronLeft, Phone, Clock, MapPinned, Edit3, Trash2, MessageCircle, UserPlus, User, RefreshCcw, Loader2 } from 'lucide-react';
import { getRelativeTime } from '../services/translations';
import { supabase, TABLES } from '../services/supabaseClient';
import ChatWindow from './ChatWindow';

interface PropertyDetailsProps {
  property: Property;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  t: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onShowOtherAds?: () => void;
}

const ProfileHeader: React.FC<{ name: string; phone: string; onShowOtherAds?: () => void }> = ({ name, phone, onShowOtherAds }) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border-2 border-white shadow-md">
        <User size={32} />
      </div>
      <div className="flex-1">
        <h4 className="font-black text-gray-900 text-lg">{name || phone}</h4>
        <p className="text-[10px] text-gray-400 font-bold">آگهی‌دهنده تایید شده</p>
      </div>
    </div>
    <button onClick={onShowOtherAds} className="w-full bg-gray-50 border border-gray-100 text-gray-600 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-inner">
      <UserPlus size={18} className="text-red-600" /> مشاهده تمام آگهی‌های {name || 'این کاربر'}
    </button>
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

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property, onClose, onShowOnMap, isSaved, onToggleSave, t, onEdit, onDelete, onShowOtherAds }) => {
  const [showContact, setShowContact] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNardebaning, setIsNardebaning] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [ownerName, setOwnerName] = useState<string>('');
  const touchStartX = useRef<number | null>(null);
  
  const userPhone = localStorage.getItem('user_phone');
  const ownerId = property.owner_id || property.ownerId || (property as any).phone_number;
  const isOwner = ownerId === userPhone;
  const allImages = property?.images?.filter(img => img) || [];

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
      if (e.key === 'ArrowRight') prevImage();
      else if (e.key === 'ArrowLeft') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextImage, prevImage]);

  useEffect(() => {
    const fetchOwner = async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('phone', ownerId).maybeSingle();
      if (data?.full_name) setOwnerName(data.full_name);
    };
    if (ownerId) fetchOwner();
  }, [ownerId]);

  const handleNardeban = async () => {
    const lastUpdate = new Date(property.created_at || property.date);
    const now = new Date();
    const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 3) return alert("شما هر ۳ روز یکبار می‌توانید نردبان کنید.");

    setIsNardebaning(true);
    try {
      const { error } = await supabase.from(TABLES.PROPERTIES).update({ created_at: new Date(), is_boosted: true }).eq('id', property.id);
      if (error) throw error;
      alert("آگهی نردبان شد!");
      window.location.reload();
    } catch (e) { alert("خطا در نردبان"); } finally { setIsNardebaning(false); }
  };

  const handleChatOpen = () => {
    if (!userPhone) return alert("لطفاً ابتدا وارد حساب خود شوید.");
    if (isOwner) return alert("این آگهی متعلق به خودتان است!");
    setIsChatOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-white font-[Vazirmatn] flex flex-col h-[100dvh] w-full" dir="rtl">
      <div className="absolute top-0 left-0 right-0 h-14 z-[5002] flex items-center justify-between px-4 pt-2 pointer-events-none">
        <button onClick={onClose} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto active:scale-90"><ChevronRight size={24} /></button>
        <button onClick={onToggleSave} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto">
          <Bookmark size={20} className={isSaved ? "fill-[#a62626] text-[#a62626]" : "text-gray-700"} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto md:flex md:flex-row bg-gray-50 no-scrollbar">
        <div className="w-full md:w-[60%] flex flex-col shrink-0 bg-white">
            <div className="w-full h-[50vh] md:h-full bg-zinc-900 relative flex items-center justify-center overflow-hidden group"
                 onTouchStart={(e) => touchStartX.current = e.touches[0].clientX}
                 onTouchEnd={(e) => {
                   if (touchStartX.current === null) return;
                   const diff = touchStartX.current - e.changedTouches[0].clientX;
                   if (Math.abs(diff) > 40) diff > 0 ? nextImage() : prevImage();
                   touchStartX.current = null;
                 }}>
                {allImages.length > 0 ? (
                  <>
                    <img key={activeImageIndex} src={allImages[activeImageIndex]} className="w-full h-full object-contain animate-in fade-in duration-300" alt=""/>
                    
                    {allImages.length > 1 && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all hidden md:flex items-center justify-center z-10">
                          <ChevronRight size={32} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all hidden md:flex items-center justify-center z-10">
                          <ChevronLeft size={32} />
                        </button>

                        <div className="absolute inset-x-0 bottom-6 flex gap-1.5 justify-center pointer-events-none">
                          <div className="flex gap-1.5 bg-black/30 px-3 py-2 rounded-full backdrop-blur-sm">
                            {allImages.map((_, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : <div className="text-gray-500 font-black">بدون تصویر</div>}
            </div>
        </div>
        <div className="flex-1 p-6 md:p-10 space-y-8 pb-32 text-right bg-white">
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{property.title}</h1>
              <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] justify-end"><Clock size={12} /> {getRelativeTime(property.created_at || property.date)} در {property.city}</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y">
               <div className="text-center bg-gray-50 p-4 rounded-2xl"><span className="block text-gray-400 text-[10px] mb-1">مساحت</span><span className="font-black">{(property as any).area} متر</span></div>
               <div className="text-center bg-gray-50 p-4 rounded-2xl"><span className="block text-gray-400 text-[10px] mb-1">خواب</span><span className="font-black">{(property as any).bedrooms}</span></div>
               <div className="text-center bg-gray-50 p-4 rounded-2xl"><span className="block text-gray-400 text-[10px] mb-1">پارکینگ</span><span className="font-black">{(property as any).has_parking ? 'دارد' : 'ندارد'}</span></div>
               <div className="text-center bg-gray-50 p-4 rounded-2xl"><span className="block text-gray-400 text-[10px] mb-1">انباری</span><span className="font-black">{(property as any).has_storage ? 'دارد' : 'ندارد'}</span></div>
            </div>

            <div className="bg-red-50/50 p-6 rounded-[2rem] border border-red-100 flex justify-between items-center shadow-inner">
                <div className="text-right">
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase tracking-widest">مبلغ معامله</span>
                    <span className="text-2xl font-black text-[#a62626]">{property.price?.toLocaleString() || 'تماس بگیرید'} <small className="text-sm">AFN</small></span>
                </div>
                {property.location && (
                  <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-[#a62626] rounded-2xl shadow-md border border-red-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 border-r-4 border-red-600 pr-3">توضیحات آگهی</h3>
                <p className="font-bold text-gray-600 leading-8 whitespace-pre-wrap">{property.description}</p>
            </div>

            <div className="pt-10 border-t space-y-6">
               <ProfileHeader name={ownerName} phone={ownerId} onShowOtherAds={onShowOtherAds} />
               
               {isOwner ? (
                 <OwnerPanel onEdit={onEdit!} onDelete={onDelete!} onNardeban={handleNardeban} isNardebaning={isNardebaning} />
               ) : (
                 <div className="flex gap-3">
                    <button onClick={handleChatOpen} className="flex-1 bg-white border border-gray-200 text-gray-700 h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 shadow-sm">
                       <MessageCircle size={22} className="text-red-600" /> {String(t.chat)}
                    </button>
                    {!showContact ? (
                      <button onClick={() => setShowContact(true)} className="flex-[2] bg-[#a62626] text-white h-14 rounded-2xl font-black text-sm active:scale-95 shadow-md">نمایش شماره تماس</button>
                    ) : (
                      <a href={`tel:${ownerId}`} className="flex-[2] bg-green-600 text-white h-14 rounded-2xl font-black text-xl flex items-center justify-center gap-4 animate-in zoom-in shadow-md">
                        <Phone size={24} /> <span dir="ltr">{ownerId}</span>
                      </a>
                    )}
                 </div>
               )}
            </div>
        </div>
      </div>
      {isChatOpen && <ChatWindow receiverPhone={ownerId} adId={property.id} adTitle={property.title} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};
export default PropertyDetails;
