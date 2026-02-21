
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Service } from '../types';
import { 
  X, Bookmark, MapPinned, Phone, MessageCircle, 
  Clock, MapPin, Wrench, ShieldCheck, 
  UserPlus, Edit3, Trash2, RefreshCcw, Loader2, User, ChevronRight, Flag, AlertTriangle
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

const SpecItem = ({ icon: Icon, label, value, color = "text-orange-600" }: { icon: any, label: string, value: any, color?: string }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm gap-1">
    <Icon size={18} className={color} />
    <span className="text-[10px] text-gray-400 font-black">{label}</span>
    <span className="text-xs font-black text-gray-800">{value}</span>
  </div>
);

const ProfileHeader: React.FC<{ name: string; phone: string; onShowOtherAds?: () => void }> = ({ name, phone, onShowOtherAds }) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center border-2 border-white shadow-md">
        <User size={32} />
      </div>
      <div className="flex-1 text-right">
        <h4 className="font-black text-gray-900 text-lg">{name || phone}</h4>
        <p className="text-[10px] text-gray-400 font-bold">متخصص تایید شده</p>
      </div>
    </div>
    <button onClick={onShowOtherAds} className="w-full bg-gray-50 border border-gray-100 text-gray-600 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-inner">
      <UserPlus size={18} className="text-orange-600" /> مشاهده سایر خدمات {name || 'این کاربر'}
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
      <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
      <span className="text-[10px] font-black uppercase tracking-widest">پنل مدیریت آگهی شما</span>
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
      <button onClick={onDelete} className="flex flex-col items-center gap-2 p-4 bg-red-600 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/20">
        <Trash2 size={20} />
        <span className="text-[10px] font-black">حذف آگهی</span>
      </button>
    </div>
  </div>
);

const ServiceDetails: React.FC<ServiceDetailsProps> = ({ service, onClose, onShowOnMap, isSaved, onToggleSave, t, onShowOtherAds, onEdit, onDelete }) => {
  const [showContact, setShowContact] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNardebaning, setIsNardebaning] = useState(false);
  const [ownerName, setOwnerName] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  
  const userPhone = localStorage.getItem('user_phone');
  const ownerId = service.owner_id || service.ownerId || (service as any).phone_number;
  const isOwner = ownerId === userPhone;
  const allImages = service.images?.filter(img => img) || [];

  const reportReasons = [
    "دیگر خدمات ارائه نمی‌دهد",
    "کلاه برداری است",
    "تخصص ادعا شده را ندارد",
    "شماره تماس اشتباه یا عدم پاسخگویی",
    "محتوای نامناسب یا توهین آمیز",
    "آگهی تکراری / اسپم"
  ];

  const handleReport = async (reason: string) => {
    setIsReporting(true);
    try {
      const { error } = await supabase.from(TABLES.REPORTS).insert([{
        ad_id: service.id,
        reporter_phone: userPhone || 'ANONYMOUS',
        reason: reason,
        ad_title: service.title,
        ad_type: 'SERVICES'
      }]);
      if (error) throw error;
      alert("گزارش ثبت شد.");
      setShowReportModal(false);
    } catch (e) {
      alert("خطا در ثبت گزارش.");
    } finally {
      setIsReporting(false);
    }
  };

  const nextImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length > 1) setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  useEffect(() => {
    const fetchOwner = async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('phone', ownerId).maybeSingle();
      if (data?.full_name) setOwnerName(data.full_name);
    };
    if (ownerId) fetchOwner();
  }, [ownerId]);

  const handleNardeban = async () => {
    const lastUpdate = new Date(service.created_at || service.date);
    const now = new Date();
    const diffDays = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
    if (diffDays < 3) return alert("شما هر ۳ روز یکبار می‌توانید نردبان کنید.");

    setIsNardebaning(true);
    try {
      const { error } = await supabase.from(TABLES.SERVICES).update({ created_at: new Date(), is_boosted: true }).eq('id', service.id);
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
        <button onClick={onClose} className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto active:scale-90 border border-gray-100">
          <X size={24} className="text-gray-800" />
        </button>
        {!isOwner && (
          <button 
            onClick={() => setShowReportModal(true)} 
            className="p-2 bg-white/90 backdrop-blur rounded-full shadow-lg pointer-events-auto active:scale-90 border border-gray-100 text-gray-400 hover:text-orange-600 transition-colors"
          >
            <Flag size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto md:flex md:flex-row bg-gray-50 no-scrollbar">
        <div className="w-full md:w-[60%] flex flex-col shrink-0 bg-white relative">
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
                        <button onClick={prevImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 text-white rounded-full hover:bg-black/40 transition-all z-10 hidden md:flex">
                           <ChevronRight size={28} className="rotate-180" />
                        </button>
                        <button onClick={nextImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/20 text-white rounded-full hover:bg-black/40 transition-all z-10 hidden md:flex">
                           <ChevronRight size={28} />
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
                ) : <div className="text-gray-500 font-black">تصویری موجود نیست</div>}
            </div>
        </div>
        <div className="flex-1 p-6 md:p-10 space-y-8 pb-32 text-right bg-white">
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{service.title}</h1>
              <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] justify-end"><Clock size={12} /> {getRelativeTime(service.created_at || service.date)} در {service.city}</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               <SpecItem icon={ShieldCheck} label="متخصص" value={service.provider_name} />
               <SpecItem icon={Wrench} label="تجربه" value={service.experience} />
               <SpecItem icon={MapPin} label="ولایت" value={service.city} />
            </div>

            <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex justify-between items-center shadow-inner">
                <div className="text-right">
                    <span className="text-gray-400 text-[10px] font-black block mb-1 uppercase tracking-widest">نوع تخصص</span>
                    <span className="text-2xl font-black text-orange-600">{service.category || 'فنی و خدماتی'}</span>
                </div>
                {service.location && (
                  <button onClick={onShowOnMap} className="w-14 h-14 bg-white text-orange-600 rounded-2xl shadow-md border border-orange-100 flex items-center justify-center active:scale-90 transition-transform"><MapPinned size={28} /></button>
                )}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-black text-gray-900 border-r-4 border-orange-600 pr-3">درباره این تخصص</h3>
                <p className="font-bold text-gray-600 leading-8 whitespace-pre-wrap">{service.description}</p>
            </div>

            <div className="pt-10 border-t space-y-6">
               <ProfileHeader name={ownerName} phone={ownerId} onShowOtherAds={onShowOtherAds} />
               
               {isOwner ? (
                 <OwnerPanel onEdit={onEdit!} onDelete={onDelete!} onNardeban={handleNardeban} isNardebaning={isNardebaning} />
               ) : (
                 <div className="flex gap-3">
                    <button onClick={onToggleSave} className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border transition-all active:scale-90 shadow-sm ${isSaved ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                       <Bookmark size={24} className={isSaved ? "fill-current" : ""} />
                    </button>
                    <button onClick={handleChatOpen} className="flex-1 bg-white border border-gray-200 text-gray-700 h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 shadow-sm">
                       <MessageCircle size={22} className="text-orange-600" /> {String(t.chat)}
                    </button>
                    {!showContact ? (
                      <button onClick={() => setShowContact(true)} className="flex-[2] bg-orange-700 text-white h-14 rounded-2xl font-black text-sm active:scale-95 shadow-md">نمایش اطلاعات تماس</button>
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
      {isChatOpen && <ChatWindow receiverPhone={ownerId} adId={service.id} adTitle={service.title} onClose={() => setIsChatOpen(false)} />}
      
      {showReportModal && (
        <div className="fixed inset-0 z-[15000] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-6 text-orange-600">
                 <div className="p-3 bg-orange-50 rounded-xl"><AlertTriangle size={24} /></div>
                 <h3 className="font-black text-lg">گزارش تخصص / خدمات</h3>
              </div>
              <div className="space-y-2">
                 {reportReasons.map((reason, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleReport(reason)}
                      disabled={isReporting}
                      className="w-full text-right p-4 rounded-xl hover:bg-gray-50 font-bold text-sm border border-transparent hover:border-gray-100 transition-all flex items-center justify-between group disabled:opacity-50"
                    >
                      {reason}
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-600 transition-colors" />
                    </button>
                 ))}
              </div>
              <button onClick={() => setShowReportModal(false)} className="w-full mt-6 py-3 text-gray-400 font-black text-sm">انصراف</button>
           </div>
        </div>
      )}
    </div>
  );
};
export default ServiceDetails;
