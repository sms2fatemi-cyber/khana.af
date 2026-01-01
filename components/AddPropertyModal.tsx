
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, ChevronRight, Loader2, Camera, Trash2, Box, MapPinned, Crosshair, Check } from 'lucide-react';
import { PropertyType, DealType } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddPropertyModalProps {
  onClose: () => void;
  t: any;
  lang: string;
}

const toEnglishDigits = (str: string) => {
  if (!str) return '';
  return str.toString().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
};

const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => { map.invalidateSize(); });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
};

const MapMoveHandler = ({ onChange }: { onChange: (latlng: any) => void }) => {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onChange({ lat: center.lat, lng: center.lng });
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
      () => {
        setIsLocating(false);
        alert("لطفاً GPS را روشن کنید.");
      },
      { enableHighAccuracy: false, timeout: 5000 }
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

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ onClose, t, lang }) => {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '', 
    price: '', 
    deposit: '', 
    mortgageAmount: '',
    currency: 'AFN', 
    dealType: DealType.SALE,
    type: PropertyType.APARTMENT, 
    area: '', 
    bedrooms: '',
    hasStorage: false, 
    features: '',
    city: t.provinces[1], 
    address: '', 
    description: '', 
    phoneNumber: '',
    location: { lat: 34.5553, lng: 69.2075 }
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
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
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const imageUrls = await uploadMultipleImages(selectedFiles);
      const userPhone = localStorage.getItem('user_phone') || 'guest';

      const payload = {
        title: formData.title,
        price: Number(toEnglishDigits(formData.price || formData.mortgageAmount || '0')),
        deposit: formData.dealType === DealType.RENT ? Number(toEnglishDigits(formData.deposit)) : null,
        mortgage_amount: formData.dealType === DealType.MORTGAGE ? Number(toEnglishDigits(formData.mortgageAmount)) : null,
        currency: formData.currency,
        deal_type: formData.dealType,
        type: formData.type,
        area: Number(toEnglishDigits(formData.area)),
        bedrooms: formData.type === PropertyType.LAND ? 0 : Number(toEnglishDigits(formData.bedrooms)),
        has_storage: formData.hasStorage,
        features: formData.features.split('،').map(f => f.trim()).filter(f => f),
        city: formData.city,
        address: formData.address,
        description: formData.description,
        phone_number: toEnglishDigits(formData.phoneNumber),
        location: formData.location,
        images: imageUrls,
        status: 'PENDING',
        owner_id: userPhone
      };

      const { error } = await supabase.from(TABLES.PROPERTIES).insert([payload]);
      if (error) throw error;
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert(lang === 'dari' ? `خطا در ثبت: ${err.message}` : `د ثبتولو تېروتنه: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) return (
    <div className="fixed inset-0 z-[11000] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center animate-in slide-in-from-bottom shadow-2xl">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} />
        </div>
        <h2 className="text-2xl font-black mb-2">{lang === 'dari' ? 'با موفقیت ثبت شد' : 'په بري سره ثبت شو'}</h2>
        <p className="text-sm text-gray-500 font-bold mb-8 leading-7">
          {lang === 'dari' 
            ? 'ملک شما ثبت شد و پس از بررسی توسط تیم مدیریت منتشر خواهد شد.' 
            : 'ستاسو اعلان ثبت شو او د ارزونې وروسته به خپور شي.'}
        </p>
        <button onClick={onClose} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-red-900/20">
          {lang === 'dari' ? 'متوجه شدم' : 'پوه شوم'}
        </button>
      </div>
    </div>
  );

  const MapContainerAny = MapContainer as any;
  const TileLayerAny = TileLayer as any;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col">
            <div className="h-16 flex items-center px-6 border-b shrink-0">
              <button onClick={() => setView('form')} className="p-2"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2">{t.select_location}</h2>
            </div>
            <div className="flex-1 relative">
              <MapContainerAny center={[formData.location.lat, formData.location.lng]} zoom={14} style={{ height: '100%' }} zoomControl={false}>
                <TileLayerAny url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapMoveHandler onChange={(loc) => setFormData(prev => ({ ...prev, location: loc }))} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none">
                  <MapPin size={40} className="text-[#a62626] drop-shadow-xl" />
                </div>
              </MapContainerAny>
              <button onClick={() => setView('form')} className="absolute bottom-10 left-8 right-8 z-[1000] bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-2xl active:scale-95">تایید محل ملک</button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h2 className="font-black text-xl text-gray-800">{lang === 'dari' ? 'ثبت ملک جدید' : 'د نوي ملک ثبتول'}</h2>
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
                     <div className="bg-gray-100 rounded-2xl flex items-center justify-center font-black text-xs text-gray-500">{t.rent}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <input type="text" value={formData.deposit} onChange={e => setFormData({...formData, deposit: e.target.value})} placeholder={lang === 'dari' ? 'مقدار پول ضمانت' : 'د ضمانت مقدار'} className="col-span-2 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
                     <div className="bg-gray-100 rounded-2xl flex items-center justify-center font-black text-[10px] text-gray-500">{t.deposit}</div>
                  </div>
                </div>
              )}

              <div className={`grid gap-4 ${formData.type === PropertyType.LAND ? 'grid-cols-1' : 'grid-cols-2'}`}>
                 <input type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} placeholder={t.area} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
                 {formData.type !== PropertyType.LAND && (
                   <input type="text" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} placeholder={t.bedrooms} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
                 )}
              </div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <button type="button" onClick={() => setFormData({...formData, hasStorage: !formData.hasStorage})} className={`w-12 h-6 rounded-full transition-all relative ${formData.hasStorage ? 'bg-green-500' : 'bg-gray-200'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasStorage ? 'right-7' : 'right-1'}`} />
                </button>
                <span className="text-xs font-black text-gray-600 flex items-center gap-1"><Box size={14} /> {lang === 'dari' ? 'دارای انباری / پارکینگ' : 'انباري / پارکینګ لري'}</span>
              </div>

              <div className="relative">
                <MapPinned size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder={t.address} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-11 py-4 font-bold outline-none focus:border-[#a62626]/40" required />
              </div>

              <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder={t.enter_phone} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none text-center dir-ltr" required />
              
              <button type="button" onClick={() => setView('map')} className="w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 text-gray-400 font-black active:bg-gray-50">
                <MapPin size={24} /> {t.select_location}
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
};

export default AddPropertyModal;
