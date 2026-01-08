
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, ChevronRight, Loader2, Camera, Trash2, MapPinned, Crosshair, Phone, Check } from 'lucide-react';
import { Job } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddJobModalProps {
  onClose: () => void;
  editData?: Job | null;
  t: any;
}

const toEnglishDigits = (str: any) => {
  if (!str) return '';
  return str.toString().replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
                       .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

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
      className="absolute bottom-32 right-6 z-[3000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-blue-600 border border-gray-100 pointer-events-auto active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

const AddJobModal: React.FC<AddJobModalProps> = ({ onClose, editData, t }) => {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [hasConfirmedLocation, setHasConfirmedLocation] = useState(!!editData?.location);
  const userPhone = localStorage.getItem('user_phone') || '';

  const titleRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const salaryRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [city, setCity] = useState(editData?.city || t.provinces[1]);
  const [location, setLocation] = useState(editData?.location || { lat: 34.5553, lng: 69.2075 });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editData?.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      setSelectedFiles(prev => [...prev, ...files]);
      files.forEach(f => setPreviews(prev => [...prev, URL.createObjectURL(f)]));
    }
  };

  const removeImage = (idx: number) => {
    const existingCount = editData?.images?.length || 0;
    if (idx >= existingCount) setSelectedFiles(prev => prev.filter((_, i) => i !== (idx - existingCount)));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const urls = await uploadMultipleImages(selectedFiles);
      const allImages = [...previews.filter(p => p.startsWith('http')), ...urls];
      
      const payload = {
        title: titleRef.current?.value || '', 
        company: companyRef.current?.value || '',
        salary: Number(toEnglishDigits(salaryRef.current?.value)) || 0,
        city: city, 
        address: addressRef.current?.value || '',
        description: descriptionRef.current?.value || '', 
        phone_number: userPhone,
        location: location, 
        images: allImages, 
        owner_id: userPhone, 
        status: 'PENDING' // ویرایش هم نیاز به تایید مجدد دارد
      };

      if (editData) {
        const { error } = await supabase.from(TABLES.JOBS).update(payload).eq('id', editData.id);
        if (error) throw error;
        alert("تغییرات ثبت شد و پس از تایید ادمین نمایش داده می‌شود.");
      } else {
        const { error } = await supabase.from(TABLES.JOBS).insert([payload]);
        if (error) throw error;
      }
      onClose();
    } catch (err: any) { 
      alert("خطا: " + err.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

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
              <MapContainerAny center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayerAny url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapMoveHandler onMoveStart={() => setIsMapMoving(true)} onMoveEnd={() => setIsMapMoving(false)} onChange={(loc: any) => setLocation(loc)} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                   <MapPin size={48} className={isMapMoving ? 'text-gray-400 opacity-50' : 'text-blue-600'} />
                </div>
              </MapContainerAny>
              <div className="absolute bottom-10 left-8 right-8 z-[1000]">
                <button 
                  onClick={() => { setHasConfirmedLocation(true); setView('form'); }} 
                  disabled={isMapMoving} 
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                >
                  تایید موقعیت انتخاب شده
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="p-5 border-b flex justify-between items-center bg-white shrink-0">
          <h2 className="font-black text-xl text-gray-800">{editData ? 'ویرایش شغل' : 'ثبت شغل'}</h2>
          <button onClick={onClose} className="p-2"><X size={32} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32 text-right">
          <form id="job-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-lg"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Camera size={32} />
              </button>
              <input type="file" ref={fileInputRef} hidden multiple onChange={handleFileChange} />
            </div>
            <div className="space-y-4">
              <input type="text" ref={titleRef} defaultValue={editData?.title} placeholder="عنوان شغل" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              <input type="text" ref={companyRef} defaultValue={editData?.company} placeholder="نام شرکت" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <div className="relative">
                <Phone size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="tel" value={userPhone} readOnly className="w-full bg-gray-100 border rounded-2xl px-11 py-4 font-black text-left outline-none text-gray-400 cursor-not-allowed" dir="ltr" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <select value={city} onChange={e => setCity(e.target.value)} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   {t.provinces.slice(1).map((p: string) => <option key={p} value={p}>{p}</option>)}
                 </select>
                 <div className="relative flex-1">
                    <input type="tel" ref={salaryRef} defaultValue={editData?.salary} placeholder="معاش پیشنهادی" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
                    <div className="absolute left-4 top-4 text-[10px] font-black text-gray-400">AFN</div>
                 </div>
              </div>
              
              <div className="relative">
                <MapPinned size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="text" ref={addressRef} defaultValue={editData?.address} placeholder="آدرس دقیق" className="w-full bg-gray-50 border rounded-2xl px-11 py-4 font-bold outline-none" required />
              </div>

              <button 
                type="button" 
                onClick={() => setView('map')} 
                className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all ${hasConfirmedLocation ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
              >
                {hasConfirmedLocation ? (
                  <><Check size={28} /> <span className="font-black">موقعیت با موفقیت انتخاب شد</span></>
                ) : (
                  <><MapPin size={28} /> <span className="font-black">تعیین مکان روی نقشه (اختیاری)</span></>
                )}
              </button>

              <textarea rows={6} ref={descriptionRef} defaultValue={editData?.description} placeholder="توضیحات و نیازمندی‌ها..." className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none resize-none"></textarea>
            </div>
          </form>
        </div>
        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="job-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : (editData ? 'اعمال تغییرات' : 'ثبت آگهی')}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
        </div>
      </div>
    </div>
  );
};
export default AddJobModal;
