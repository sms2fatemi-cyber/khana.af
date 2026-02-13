
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, ChevronRight, Loader2, Camera, Trash2, Crosshair, Car, Box, Check, Calendar, ArrowUpCircle, ArrowRight, Phone, Eye, EyeOff } from 'lucide-react';
import { Property, PropertyType, DealType } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddPropertyModalProps {
  onClose: () => void;
  editData?: Property | null;
  t: any;
}

const toEnglishDigits = (str: any): string => {
  if (str === null || str === undefined) return '';
  const s = str.toString();
  return s.replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
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
        alert("خطا در مکان‌یابی.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [map]);

  return (
    <button 
      ref={btnRef}
      type="button" 
      onClick={handleLocate} 
      className="absolute bottom-32 right-6 z-[3000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[#a62626] border border-gray-100 pointer-events-auto active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

export default function AddPropertyModal({ onClose, editData, t }: AddPropertyModalProps) {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [hasConfirmedLocation, setHasConfirmedLocation] = useState(!!editData?.location);
  const userPhone = localStorage.getItem('user_phone') || '';

  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const depositRef = useRef<HTMLInputElement>(null);
  const mortgageRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const bedroomsRef = useRef<HTMLInputElement>(null);
  const floorRef = useRef<HTMLInputElement>(null);
  const totalFloorsRef = useRef<HTMLInputElement>(null);
  const buildYearRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [dealType, setDealType] = useState(editData?.dealType || DealType.SALE);
  const [propertyType, setPropertyType] = useState(editData?.type || PropertyType.APARTMENT);
  const [city, setCity] = useState(editData?.city || t.provinces[1]);
  const [hasParking, setHasParking] = useState(editData?.hasParking || false);
  const [hasStorage, setHasStorage] = useState(editData?.hasStorage || false);
  const [hasElevator, setHasElevator] = useState((editData as any)?.has_elevator || false);
  const [location, setLocation] = useState(editData?.location || { lat: 34.5553, lng: 69.2075 });
  const [showPhone, setShowPhone] = useState((editData as any)?.show_phone ?? true);

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
    if (idx >= existingCount) {
        setSelectedFiles(prev => prev.filter((_, i) => i !== (idx - existingCount)));
    }
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPhone) return alert("ابتدا وارد شوید.");
    setIsSubmitting(true);
    try {
      const urls = await uploadMultipleImages(selectedFiles);
      const allImages = [...previews.filter(p => p.startsWith('http')), ...urls];
      
      const payload = {
        title: titleRef.current?.value || '', 
        price: Number(toEnglishDigits(priceRef.current?.value)) || 0, 
        mortgage_amount: Number(toEnglishDigits(mortgageRef.current?.value)) || 0,
        deposit: Number(toEnglishDigits(depositRef.current?.value)) || 0,
        deal_type: dealType, 
        type: propertyType,
        area: Number(toEnglishDigits(areaRef.current?.value)) || 0,
        bedrooms: (Number(toEnglishDigits(bedroomsRef.current?.value)) || 0),
        floor: Number(toEnglishDigits(floorRef.current?.value)) || null,
        total_floors: Number(toEnglishDigits(totalFloorsRef.current?.value)) || null,
        build_year: buildYearRef.current?.value ? Number(toEnglishDigits(buildYearRef.current?.value)) : null,
        has_storage: hasStorage, 
        has_parking: hasParking,
        has_elevator: hasElevator,
        city: city, 
        address: addressRef.current?.value || '', 
        description: descriptionRef.current?.value || '',
        phone_number: userPhone, 
        show_phone: showPhone,
        location: hasConfirmedLocation ? location : null, 
        images: allImages,
        owner_id: userPhone, 
        status: 'PENDING',
        created_at: editData ? editData.created_at : new Date().toISOString()
      };

      if (editData) {
        await supabase.from(TABLES.PROPERTIES).update(payload).eq('id', editData.id);
        alert("تغییرات ثبت شد.");
      } else {
        await supabase.from(TABLES.PROPERTIES).insert([payload]);
        alert("آگهی با موفقیت ثبت شد.");
      }
      onClose();
    } catch (err: any) { 
      alert("خطا در ثبت."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:max-h-[95vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col">
            <div className="h-16 flex items-center px-6 border-b shrink-0 text-right">
              <button onClick={() => setView('form')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2 text-lg">تعیین موقعیت روی نقشه</h2>
            </div>
            <div className="flex-1 relative bg-gray-50">
              <MapContainer center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapMoveHandler onMoveStart={() => setIsMapMoving(true)} onMoveEnd={() => setIsMapMoving(false)} onChange={(loc: any) => setLocation(loc)} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                   <MapPin size={48} className={isMapMoving ? 'text-gray-400 opacity-50' : 'text-[#a62626]'} />
                </div>
              </MapContainer>
              <div className="absolute bottom-10 left-8 right-8 z-[1000]">
                <button onClick={() => { setHasConfirmedLocation(true); setView('form'); }} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-xl">تایید موقعیت</button>
              </div>
            </div>
          </div>
        )}
        <div className="p-5 border-b flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ArrowRight size={24} className="text-gray-800" /></button>
            <h2 className="font-black text-xl text-gray-800">{editData ? 'ویرایش خانه' : 'ثبت خانه'}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl"><X size={24} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
          <form id="property-form" onSubmit={handleSubmit} className="space-y-6 text-right">
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
              {/* بخش نمایش شماره تلفن و تنظیمات حریم خصوصی */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-white rounded-xl shadow-sm text-gray-400"><Phone size={18} /></div>
                       <span className="text-[13px] font-black text-gray-800" dir="ltr">{userPhone}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">شماره تماس شما</span>
                 </div>
                 <div className="pt-3 border-t flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => setShowPhone(!showPhone)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${showPhone ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
                    >
                       {showPhone ? <Eye size={16} /> : <EyeOff size={16} />}
                       <span className="text-[10px] font-black">{showPhone ? 'شماره نمایش داده شود' : 'شماره مخفی بماند'}</span>
                    </button>
                    <div className="flex items-center gap-2">
                       <input 
                         type="checkbox" 
                         checked={showPhone} 
                         onChange={() => setShowPhone(!showPhone)} 
                         className="w-5 h-5 rounded accent-[#a62626]" 
                       />
                       <label className="text-[11px] font-bold text-gray-600">نمایش شماره در آگهی</label>
                    </div>
                 </div>
              </div>

              <input type="text" ref={titleRef} defaultValue={editData?.title} placeholder="عنوان آگهی (مثلاً آپارتمان ۱۲۰ متری در هرات)" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <div className="grid grid-cols-2 gap-4">
                 <select value={dealType} onChange={e => setDealType(e.target.value as any)} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   <option value={DealType.SALE}>{t.sale}</option>
                   <option value={DealType.RENT}>{t.rent}</option>
                   <option value={DealType.MORTGAGE}>{t.mortgage}</option>
                 </select>
                 <select value={propertyType} onChange={e => setPropertyType(e.target.value as any)} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   {Object.values(PropertyType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                 </select>
              </div>

              {dealType === DealType.SALE && (
                 <input type="tel" ref={priceRef} defaultValue={editData?.price} placeholder="قیمت کل (افغانی)" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" required />
              )}
              {dealType === DealType.RENT && (
                 <div className="grid grid-cols-2 gap-4">
                    <input type="tel" ref={priceRef} defaultValue={editData?.price} placeholder="کرایه ماهانه" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" required />
                    <input type="tel" ref={depositRef} defaultValue={editData?.deposit} placeholder="پول پیش (ضمانت)" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" required />
                 </div>
              )}
              {dealType === DealType.MORTGAGE && (
                 <input type="tel" ref={mortgageRef} defaultValue={(editData as any)?.mortgage_amount || editData?.mortgageAmount} placeholder="مبلغ گروی (افغانی)" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" required />
              )}

              <div className="grid grid-cols-2 gap-4">
                <input type="tel" ref={areaRef} defaultValue={editData?.area} placeholder="متراژ (مترمربع)" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
                <input type="tel" ref={bedroomsRef} defaultValue={editData?.bedrooms} placeholder="تعداد اتاق" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input type="tel" ref={floorRef} defaultValue={(editData as any)?.floor} placeholder="طبقه" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" />
                <input type="tel" ref={totalFloorsRef} defaultValue={(editData as any)?.total_floors} placeholder="تعداد طبقات کل" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                 <button type="button" onClick={() => setHasParking(!hasParking)} className={`py-4 rounded-2xl font-black text-[10px] border flex flex-col items-center justify-center gap-1 ${hasParking ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                   <Car size={16}/> پارکینگ
                 </button>
                 <button type="button" onClick={() => setHasStorage(!hasStorage)} className={`py-4 rounded-2xl font-black text-[10px] border flex flex-col items-center justify-center gap-1 ${hasStorage ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                   <Box size={16}/> انباری
                 </button>
                 <button type="button" onClick={() => setHasElevator(!hasElevator)} className={`py-4 rounded-2xl font-black text-[10px] border flex flex-col items-center justify-center gap-1 ${hasElevator ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                   <ArrowUpCircle size={16}/> آسانسور
                 </button>
              </div>

              <div className="relative">
                <Calendar size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="tel" ref={buildYearRef} defaultValue={editData?.build_year} placeholder="سال ساخت" className="w-full bg-gray-50 border rounded-2xl px-11 py-4 font-bold outline-none" />
              </div>

              <select value={city} onChange={e => setCity(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none">
                {t.provinces.slice(1).map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>

              <input type="text" ref={addressRef} defaultValue={editData?.address} placeholder="آدرس دقیق و محله" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <button 
                type="button" 
                onClick={() => setView('map')} 
                className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 ${hasConfirmedLocation ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'}`}
              >
                {hasConfirmedLocation ? <><Check size={28} /> <span className="font-black">موقعیت روی نقشه انتخاب شد</span></> : <><MapPin size={28} /> <span className="font-black">تعیین مکان روی نقشه (اختیاری)</span></>}
              </button>

              <textarea rows={4} ref={descriptionRef} defaultValue={editData?.description} placeholder="توضیحات تکمیلی (دسترسی‌ها، امکانات و...)" className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none resize-none"></textarea>
            </div>
          </form>
        </div>
        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="property-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-[#a62626] text-white py-4 rounded-2xl font-black text-lg shadow-lg">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : (editData ? 'بروزرسانی آگهی' : 'انتشار آگهی')}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">انصراف</button>
        </div>
      </div>
    </div>
  );
}
