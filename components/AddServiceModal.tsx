
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, MapPin, ChevronRight, Loader2, Camera, Trash2, Crosshair, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Service, ServiceCategory } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddServiceModalProps {
  onClose: () => void;
  onBack?: () => void;
  editData?: Service | null;
  t: any;
}

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const resize = () => { map.invalidateSize(); };
    resize();
    const timers = [100, 500, 1000].map(t => setTimeout(resize, t));
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
};

const MapMoveHandler = ({ onChange, onMoveStart, onMoveEnd }: any) => {
  useMapEvents({
    movestart: () => onMoveStart(),
    moveend: (e) => {
      const center = e.target.getCenter();
      onChange({ lat: center.lat, lng: center.lng });
      onMoveEnd();
    }
  });
  return null;
};

const UserLocationHandler = () => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (btnRef.current) {
      L.DomEvent.disableClickPropagation(btnRef.current);
    }
  }, []);

  const handleLocate = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!navigator.geolocation) {
      alert("GPS در دسترس نیست.");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.flyTo([lat, lng], 17, { animate: true });
        setIsLocating(false);
      },
      () => { 
        setIsLocating(false); 
        alert("خطا در مکان‌یابی. لطفا دسترسی GPS را چک کنید."); 
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [map]);

  return (
    <button 
      ref={btnRef}
      type="button" 
      onClick={handleLocate} 
      className="absolute bottom-32 right-6 z-[3000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-orange-600 border border-gray-100 pointer-events-auto active:scale-90 transition-transform"
      title="موقعیت فعلی من"
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

export default function AddServiceModal({ onClose, onBack, editData, t }: AddServiceModalProps) {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [hasConfirmedLocation, setHasConfirmedLocation] = useState(!!editData?.location);
  const [showPhone, setShowPhone] = useState((editData as any)?.show_phone !== false);
  const userPhone = localStorage.getItem('user_phone') || '';

  const titleRef = useRef<HTMLInputElement>(null);
  const providerRef = useRef<HTMLInputElement>(null);
  const experienceRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [category, setCategory] = useState(editData?.category || ServiceCategory.TECHNICAL);
  const [city, setCity] = useState(editData?.city || t.provinces[1]);
  const [location, setLocation] = useState(editData?.location || { lat: 34.5553, lng: 69.2075 });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editData?.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      setSelectedFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        setPreviews(prev => [...prev, URL.createObjectURL(file)]);
      });
    }
  };

  const removeImage = (idx: number) => {
    const existingCount = editData?.images?.length || 0;
    if (idx >= existingCount) setSelectedFiles(prev => prev.filter((_, i) => i !== (idx - existingCount)));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConfirmedLocation) {
        alert("لطفاً موقعیت ارائه خدمات را روی نقشه تعیین کنید. این مورد برای ثبت آگهی الزامی است.");
        setView('map');
        return;
    }

    setIsSubmitting(true);
    try {
      const uploadedUrls = await uploadMultipleImages(selectedFiles);
      const allImages = [...previews.filter(p => p.startsWith('http')), ...uploadedUrls];
      
      const payload: any = {
        title: titleRef.current?.value || '', 
        provider_name: providerRef.current?.value || '',
        category: category, 
        experience: experienceRef.current?.value || '',
        phone_number: userPhone, 
        show_phone: showPhone,
        city: city, 
        address: addressRef.current?.value || '', 
        description: descriptionRef.current?.value || '',
        location: location, 
        images: allImages, 
        status: 'PENDING', 
        owner_id: userPhone
      };
      
      if (editData) {
        await supabase.from(TABLES.SERVICES).update(payload).eq('id', editData.id);
        alert("تغییرات ذخیره شد.");
        onClose();
      } else {
        await supabase.from(TABLES.SERVICES).insert([payload]);
        alert("آگهی با موفقیت ثبت شد.");
        setIsSuccess(true);
      }
    } catch (err: any) { alert("خطا در ثبت."); } finally { setIsSubmitting(false); }
  };

  if (isSuccess) return (
    <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-sm:max-w-xs rounded-[3rem] p-10 text-center animate-slide-up shadow-2xl">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40} /></div>
        <h2 className="text-2xl font-black mb-2">با موفقیت ثبت شد</h2>
        <button onClick={onClose} className="w-full bg-orange-600 text-white py-4 rounded-xl font-black active:scale-95">بسیار عالی</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col animate-in fade-in duration-300">
            <div className="h-16 flex items-center px-6 border-b shrink-0 text-right">
              <button onClick={() => setView('form')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2 text-lg">تعیین موقعیت الزامی روی نقشه</h2>
            </div>
            <div className="flex-1 relative bg-gray-50">
              <MapContainer center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapMoveHandler onMoveStart={() => setIsMapMoving(true)} onMoveEnd={() => setIsMapMoving(false)} onChange={(loc: any) => setLocation(loc)} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                   <MapPin size={48} className={isMapMoving ? 'text-gray-400' : 'text-orange-600'} />
                </div>
              </MapContainer>
              <div className="absolute bottom-10 left-8 right-8 z-[1000]">
                <button onClick={() => { setHasConfirmedLocation(true); setView('form'); }} disabled={isMapMoving} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">تایید موقعیت</button>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 border-b flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack || onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ArrowRight size={24} className="text-gray-800" /></button>
            <h2 className="font-black text-xl text-gray-800">{editData ? 'ویرایش خدمات' : 'ثبت خدمات جدید'}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl"><X size={24} className="text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
          <form id="service-form" onSubmit={handleSubmit} className="space-y-6 text-right">
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-lg"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 active:bg-gray-100">
                <Camera size={32} />
              </button>
              <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileChange} />
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-white rounded-xl shadow-sm text-orange-400"><Phone size={18} /></div>
                       <span className="text-[13px] font-black text-gray-800" dir="ltr">{userPhone}</span>
                    </div>
                    <button type="button" onClick={() => setShowPhone(!showPhone)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${showPhone ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
                       {showPhone ? <Eye size={14} /> : <EyeOff size={14} />}
                       <span className="text-[10px] font-black">{showPhone ? 'شماره نمایش داده می‌شود' : 'شماره مخفی است'}</span>
                    </button>
                 </div>
              </div>

              <input type="text" ref={titleRef} defaultValue={editData?.title} placeholder="عنوان خدمات" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              <input type="text" ref={providerRef} defaultValue={editData?.provider_name} placeholder="نام متخصص" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <div className="grid grid-cols-2 gap-4">
                 <select value={city} onChange={e => setCity(e.target.value)} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   {t.provinces.slice(1).map((p: string) => (<option key={p} value={p}>{p}</option>))}
                 </select>
                 <input type="text" ref={experienceRef} defaultValue={editData?.experience} placeholder="سابقه کاری" className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              </div>

              <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                 {Object.values(ServiceCategory).map(cat => (<option key={cat as any} value={cat as any}>{cat as any}</option>))}
              </select>

              <input type="text" ref={addressRef} defaultValue={editData?.address} placeholder="آدرس" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />

              <button type="button" onClick={() => setView('map')} className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all ${hasConfirmedLocation ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-orange-600 bg-orange-50 text-orange-600 animate-pulse'}`}>
                {hasConfirmedLocation ? <><Check size={28} /> <span className="font-black">محل انتخاب شد</span></> : <><MapPin size={28} /> <span className="font-black">{t.location_on_map}</span></>}
              </button>
              
              <textarea rows={4} ref={descriptionRef} defaultValue={editData?.description} placeholder="توضیجات..." className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none resize-none"></textarea>
            </div>
          </form>
        </div>

        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="service-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : (editData ? 'اعمال تغییرات' : 'ثبت آگهی')}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
        </div>
      </div>
    </div>
  );
}
