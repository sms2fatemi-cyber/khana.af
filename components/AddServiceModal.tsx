import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, MapPin, ChevronRight, Loader2, Camera, Trash2, MapPinned, Crosshair, Phone } from 'lucide-react';
import { Service, ServiceCategory } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddServiceModalProps {
  onClose: () => void;
  editData?: Service;
  t: any;
  lang: string;
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
        alert("یافتن مکان ناموفق بود."); 
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
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

export default function AddServiceModal({ onClose, editData, t, lang }: AddServiceModalProps) {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const userPhone = localStorage.getItem('user_phone') || '';

  const [formData, setFormData] = useState({
    title: editData?.title || '', 
    providerName: editData?.providerName || '', 
    category: editData?.category || ServiceCategory.TECHNICAL,
    experience: editData?.experience || '', 
    phoneNumber: editData?.phoneNumber || userPhone, 
    showPhoneNumber: editData?.showPhoneNumber ?? true,
    city: editData?.city || t.provinces[1], 
    address: editData?.address || '', 
    description: editData?.description || '',
    location: editData?.location || { lat: 34.5553, lng: 69.2075 }
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editData?.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      setSelectedFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        if (!file.name.toLowerCase().endsWith('.heic')) {
          setPreviews(prev => [...prev, URL.createObjectURL(file)]);
        }
      });
    }
  };

  const removeImage = (index: number) => {
    const existingCount = editData?.images?.length || 0;
    if (index >= existingCount) setSelectedFiles(prev => prev.filter((_, i) => i !== (index - existingCount)));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const uploadedUrls = await uploadMultipleImages(selectedFiles);
      const allImages = [...previews.filter(p => p.startsWith('http')), ...uploadedUrls];
      const payload = {
        title: formData.title, 
        provider_name: formData.providerName,
        category: formData.category, 
        experience: formData.experience,
        phone_number: formData.phoneNumber, 
        show_phone: formData.showPhoneNumber,
        city: formData.city, 
        address: formData.address, 
        description: formData.description,
        location: formData.location, 
        images: allImages, 
        status: editData ? editData.status : 'PENDING',
        owner_id: userPhone
      };
      
      let result;
      if (editData) result = await supabase.from(TABLES.SERVICES).update(payload).eq('id', editData.id);
      else result = await supabase.from(TABLES.SERVICES).insert([payload]);
      
      if (result.error) throw result.error;
      
      setIsSuccess(true);
    } catch (err: any) { 
      alert("خطا در ثبت: " + (err.message || "لطفاً دوباره تلاش کنید.")); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (isSuccess) return (
    <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-sm:max-w-xs rounded-[3rem] p-10 text-center animate-slide-up shadow-2xl">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40} /></div>
        <h2 className="text-2xl font-black mb-2">{lang === 'dari' ? 'ثبت شد' : 'ثبت شو'}</h2>
        <button onClick={onClose} className="w-full bg-orange-600 text-white py-4 rounded-xl font-black active:scale-95">{lang === 'dari' ? 'بسیار عالی' : 'ډېر ښه'}</button>
      </div>
    </div>
  );

  const MapContainerAny = MapContainer as any;
  const TileLayerAny = TileLayer as any;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col animate-in fade-in duration-300">
            <div className="h-16 flex items-center px-6 border-b shrink-0 text-right">
              <button onClick={() => setView('form')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2 text-lg">تعیین موقعیت روی نقشه</h2>
            </div>
            <div className="flex-1 relative bg-gray-50">
              <MapContainerAny center={[formData.location.lat, formData.location.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayerAny url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapMoveHandler onMoveStart={() => setIsMapMoving(true)} onMoveEnd={() => setIsMapMoving(false)} onChange={(loc: any) => setFormData(prev => ({ ...prev, location: loc }))} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                   <MapPin size={48} className={isMapMoving ? 'text-gray-400' : 'text-orange-600'} />
                </div>
              </MapContainerAny>
              <div className="absolute bottom-10 left-8 right-8 z-[1000]">
                <button onClick={() => setView('form')} disabled={isMapMoving} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black shadow-xl">تایید موقعیت</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h2 className="font-black text-xl text-gray-800">{editData ? 'ویرایش خدمات' : 'ثبت خدمات جدید'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
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
                <Camera size={32} /> <span className="text-[10px] mt-1 font-black">افزودن عکس</span>
              </button>
              <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileChange} />
            </div>

            <div className="space-y-4">
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="عنوان خدمات" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              <input type="text" value={formData.providerName} onChange={e => setFormData({...formData, providerName: e.target.value})} placeholder="نام متخصص یا شرکت" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <div className="relative">
                <Phone size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="tel" value={formData.phoneNumber} readOnly className="w-full bg-gray-100 border rounded-2xl px-11 py-4 font-black text-left outline-none text-gray-400 cursor-not-allowed" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   {t.provinces.slice(1).map((p: string) => (<option key={p} value={p}>{p}</option>))}
                 </select>
                 <input type="text" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder="سابقه کاری" className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              </div>

              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                 {Object.values(ServiceCategory).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>

              <div className="relative">
                <MapPinned size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="آدرس دقیق محل خدمت" className="w-full bg-gray-50 border rounded-2xl px-11 py-4 font-bold outline-none" required />
              </div>

              <button type="button" onClick={() => setView('map')} className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all ${formData.location.lat !== 34.5553 ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                {formData.location.lat !== 34.5553 ? <><Check size={28} /> <span className="font-black">محل انتخاب شد</span></> : <><MapPin size={28} /> <span className="font-black">تعیین مکان روی نقشه (اختیاری)</span></>}
              </button>
              
              <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="توضیحات کامل خدمات..." className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none resize-none"></textarea>
            </div>
          </form>
        </div>

        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="service-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : 'ثبت آگهی'}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
        </div>
      </div>
    </div>
  );
}