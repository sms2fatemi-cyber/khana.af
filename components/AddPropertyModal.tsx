
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, ChevronRight, Loader2, Camera, Trash2, Box, MapPinned, Crosshair, Check, Eye, EyeOff } from 'lucide-react';
import { Property, PropertyType, DealType } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddPropertyModalProps {
  onClose: () => void;
  editData?: Property;
  t: any;
  lang: string;
}

const toEnglishDigits = (str: any) => {
  if (str === null || str === undefined) return '';
  const s = str.toString();
  return s.replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
};

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 400);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const MapMoveHandler = ({ onChange, onMoveStart, onMoveEnd }: { 
  onChange: (latlng: any) => void;
  onMoveStart: () => void;
  onMoveEnd: () => void;
}) => {
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

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.flyTo([lat, lng], 16, { animate: true });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          alert("لطفاً اجازه دسترسی به مکان را تایید کنید.");
        } else {
          alert("موقعیت یافت نشد. لطفاً GPS را چک کنید.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [map]);

  return (
    <button 
      type="button"
      onClick={handleLocate}
      className="absolute bottom-24 right-6 z-[1000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[#a62626] border border-gray-100 active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

export default function AddPropertyModal({ onClose, editData, t, lang }: AddPropertyModalProps) {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  
  const userPhone = localStorage.getItem('user_phone') || '';

  const [formData, setFormData] = useState({
    title: editData?.title || '', 
    price: editData?.price?.toString() || '', 
    deposit: editData?.deposit?.toString() || '', 
    mortgageAmount: editData?.mortgageAmount?.toString() || '',
    currency: editData?.currency || 'AFN', 
    dealType: editData?.dealType || DealType.SALE,
    type: editData?.type || PropertyType.APARTMENT, 
    area: editData?.area?.toString() || '', 
    bedrooms: editData?.bedrooms?.toString() || '',
    hasStorage: editData?.hasStorage || false, 
    features: editData?.features?.join('، ') || '',
    city: editData?.city || t.provinces[1], 
    address: editData?.address || '', 
    description: editData?.description || '', 
    phoneNumber: userPhone,
    showPhoneNumber: editData?.showPhoneNumber ?? true,
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
    if (index >= existingCount) {
       const fileIndex = index - existingCount;
       setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const uploadedUrls = await uploadMultipleImages(selectedFiles);
      const allImages = [...previews.filter(p => p.startsWith('http')), ...uploadedUrls];

      let finalPrice = 0;
      if (formData.dealType === DealType.SALE) finalPrice = Number(toEnglishDigits(formData.price));
      else if (formData.dealType === DealType.RENT) finalPrice = Number(toEnglishDigits(formData.price));
      else if (formData.dealType === DealType.MORTGAGE) finalPrice = Number(toEnglishDigits(formData.mortgageAmount));

      const featuresArray = formData.features
        .split(/[،,]/)
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const payload: any = {
        title: formData.title,
        price: finalPrice || 0,
        mortgage_amount: formData.dealType === DealType.MORTGAGE ? Number(toEnglishDigits(formData.mortgageAmount)) : 0,
        deposit: formData.dealType === DealType.RENT ? Number(toEnglishDigits(formData.deposit)) : 0,
        currency: formData.currency,
        deal_type: formData.dealType,
        type: formData.type,
        area: Number(toEnglishDigits(formData.area)),
        bedrooms: formData.type === PropertyType.LAND ? 0 : (Number(toEnglishDigits(formData.bedrooms)) || 0),
        has_storage: formData.hasStorage,
        features: featuresArray,
        city: formData.city,
        address: formData.address,
        description: formData.description,
        phone_number: userPhone,
        show_phone: formData.showPhoneNumber,
        location: formData.location,
        images: allImages,
        status: editData ? editData.status : 'PENDING',
        owner_id: userPhone
      };

      let error;
      if (editData) {
        const { error: err } = await supabase.from(TABLES.PROPERTIES).update(payload).eq('id', editData.id);
        error = err;
      } else {
        const { error: err } = await supabase.from(TABLES.PROPERTIES).insert([payload]);
        error = err;
      }

      if (error) throw error;
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Submit error:", err);
      alert(lang === 'dari' ? `خطا: ${err.message}` : `تېروتنه: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) return (
    <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-sm:max-w-xs rounded-[3rem] p-10 text-center animate-slide-up shadow-2xl">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40} /></div>
        <h2 className="text-2xl font-black mb-2">{lang === 'dari' ? 'ثبت شد' : 'ثبت شو'}</h2>
        <p className="text-sm text-gray-500 font-bold mb-8 leading-7">
          {lang === 'dari' ? 'آگهی ملک شما با موفقیت ثبت شد و پس از تایید منتشر می‌شود.' : 'ستاسو د ملک اعلان ثبت شو او د تایید وروسته به خپور شي.'}
        </p>
        <button onClick={onClose} className="w-full bg-[#a62626] text-white py-4 rounded-xl font-black active:scale-95">{lang === 'dari' ? 'بسیار عالی' : 'ډېر ښه'}</button>
      </div>
    </div>
  );

  const MapContainerAny = MapContainer as any;
  const TileLayerAny = TileLayer as any;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col animate-in fade-in duration-300">
            <div className="h-16 flex items-center px-6 border-b shrink-0">
              <button onClick={() => setView('form')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2 text-lg">{t.select_location}</h2>
            </div>
            <div className="flex-1 relative bg-gray-50">
              <MapContainerAny 
                center={[formData.location.lat, formData.location.lng]} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }} 
                zoomControl={false}
              >
                <TileLayerAny url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapMoveHandler 
                  onMoveStart={() => setIsMapMoving(true)}
                  onMoveEnd={() => setIsMapMoving(false)}
                  onChange={(loc) => setFormData(prev => ({ ...prev, location: loc }))} 
                />
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                   <div className={`mb-2 px-3 py-1 rounded-full text-[10px] font-black shadow-lg transition-all duration-300 ${isMapMoving ? 'bg-gray-800 text-white translate-y-2 opacity-0' : 'bg-green-600 text-white scale-110'}`}>
                      {isMapMoving ? '...' : (lang === 'dari' ? 'مکان انتخاب شد' : 'ځای وټاکل شو')}
                   </div>
                   <MapPin 
                    size={48} 
                    className={`transition-all duration-300 drop-shadow-2xl ${isMapMoving ? 'text-gray-400 -translate-y-2 scale-90' : 'text-green-600 scale-100'}`} 
                   />
                </div>
              </MapContainerAny>
              <div className="absolute bottom-10 left-8 right-8 z-[1000]">
                <button 
                  onClick={() => setView('form')} 
                  disabled={isMapMoving}
                  className={`w-full py-4 rounded-2xl font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isMapMoving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#a62626] text-white'}`}
                >
                  <Check size={20} /> تایید نهایی موقعیت
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h2 className="font-black text-xl text-gray-800">{editData ? (lang === 'dari' ? 'ویرایش ملک' : 'ملک ایډیټ') : (lang === 'dari' ? 'ثبت ملک جدید' : 'د نوي ملک ثبتول')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
          <form id="property-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border">
                  <img src={src} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-lg"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 active:bg-gray-100">
                <Camera size={32} /> <span className="text-[10px] mt-1 font-black">{t.upload_photo}</span>
              </button>
              <input type="file" ref={fileInputRef} hidden accept=".heic,.HEIC,image/*" multiple onChange={handleFileChange} />
            </div>

            <div className="space-y-4">
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={t.title} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none focus:border-[#a62626]/40" required />
              
              <div className="grid grid-cols-2 gap-4">
                 <select value={formData.dealType} onChange={e => setFormData({...formData, dealType: e.target.value as any})} className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none">
                   <option value={DealType.SALE}>{t.sale}</option>
                   <option value={DealType.RENT}>{t.rent}</option>
                   <option value={DealType.MORTGAGE}>{t.mortgage}</option>
                 </select>
                 <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none">
                   {Object.values(PropertyType).map(pt => (<option key={pt} value={pt}>{pt}</option>))}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none">
                  {t.provinces.slice(1).map((p: string) => (<option key={p} value={p}>{p}</option>))}
                </select>
                <input type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder={t.area} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
              </div>

              {formData.dealType === DealType.SALE && (
                <div className="grid grid-cols-3 gap-4">
                   <input type="text" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder={t.total_price} className="col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
                   <div className="bg-gray-100 rounded-2xl flex items-center justify-center font-black text-xs text-gray-500">AFN</div>
                </div>
              )}

              {formData.dealType === DealType.RENT && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                     <input type="text" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder={t.monthly_rent} className="col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
                     <div className="bg-gray-100 rounded-2xl flex items-center justify-center font-black text-xs text-gray-500">AFN</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <input type="text" value={formData.deposit} onChange={e => setFormData({...formData, deposit: e.target.value})} placeholder={lang === 'dari' ? 'مبلغ ضمانت' : 'د ضمانت مقدار'} className="col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                     <div className="bg-gray-100 rounded-2xl flex items-center justify-center font-black text-[10px] text-gray-500">Deposit</div>
                  </div>
                </div>
              )}

              {formData.dealType === DealType.MORTGAGE && (
                <div className="grid grid-cols-3 gap-4">
                   <input type="text" value={formData.mortgageAmount} onChange={e => setFormData({...formData, mortgageAmount: e.target.value})} placeholder={t.mortgage_amount} className="col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
                   <div className="bg-gray-100 rounded-2xl flex items-center justify-center font-black text-xs text-gray-500">AFN</div>
                </div>
              )}

              {formData.type !== PropertyType.LAND && (
                <input type="text" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} placeholder={t.bedrooms} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" />
              )}
              
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <button type="button" onClick={() => setFormData({...formData, hasStorage: !formData.hasStorage})} className={`w-12 h-6 rounded-full transition-all relative ${formData.hasStorage ? 'bg-green-500' : 'bg-gray-200'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasStorage ? (lang === 'dari' ? 'right-7' : 'left-7') : (lang === 'dari' ? 'right-1' : 'left-1')}`} />
                </button>
                <span className="text-xs font-black text-gray-600 flex items-center gap-1"><Box size={14} /> {lang === 'dari' ? 'دارای انباری / پارکینگ' : 'انباري / پارکینګ لري'}</span>
              </div>

              <div className="relative">
                <MapPinned size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder={t.address} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-11 py-4 font-bold outline-none focus:border-[#a62626]/40" required />
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input type="tel" value={formData.phoneNumber} readOnly className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-5 py-4 font-black text-center dir-ltr text-gray-500" />
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 bg-gray-200 text-gray-500 px-2 py-1 rounded-lg text-[10px] font-bold">ثابت</div>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                   <div className="flex items-center gap-3">
                      {formData.showPhoneNumber ? <Eye size={18} className="text-green-600" /> : <EyeOff size={18} className="text-gray-400" />}
                      <span className="text-xs font-black text-gray-700">نمایش شماره به دیگران</span>
                   </div>
                   <button type="button" onClick={() => setFormData({...formData, showPhoneNumber: !formData.showPhoneNumber})} className={`w-12 h-6 rounded-full transition-all relative ${formData.showPhoneNumber ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.showPhoneNumber ? (lang === 'dari' ? 'right-7' : 'left-7') : (lang === 'dari' ? 'right-1' : 'left-1')}`} />
                   </button>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={() => setView('map')} 
                className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all ${formData.location.lat !== 34.5553 ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}
              >
                {formData.location.lat !== 34.5553 ? <><Check size={28} /> <span className="font-black">{t.location} انتخاب شد</span></> : <><MapPin size={28} /> <span className="font-black">{t.select_location}</span></>}
              </button>
              
              <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={t.description} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none resize-none focus:border-[#a62626]/40"></textarea>
            </div>
          </form>
        </div>

        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="property-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-[#a62626] text-white py-4 rounded-2xl font-black text-lg disabled:bg-gray-300 active:scale-95">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : t.submit}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black active:bg-gray-200">انصراف</button>
        </div>
      </div>
    </div>
  );
}
