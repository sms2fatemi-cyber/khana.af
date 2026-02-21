
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, ChevronRight, Loader2, Camera, Trash2, Crosshair, Check, ArrowRight, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Property, PropertyType, DealType } from '../types';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';
import { PROVINCE_COORDS } from '../App';

interface AddPropertyModalProps {
  onClose: () => void;
  onBack?: () => void;
  editData?: Property | null;
  t: any;
}

const toEnglishDigits = (str: any): string => {
  if (str === null || str === undefined) return '';
  const s = str.toString();
  return s.replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
          .replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
};

const formatNumber = (val: string) => {
  const nums = toEnglishDigits(val).replace(/[^\d]/g, '');
  if (!nums) return '';
  return nums.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    e.preventDefault(); e.stopPropagation();
    if (!navigator.geolocation) { alert("GPS Error"); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.flyTo([lat, lng], 17, { animate: true });
        setIsLocating(false);
      },
      () => { setIsLocating(false); alert("GPS Error"); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [map]);

  return (
    <button ref={btnRef} type="button" onClick={handleLocate} className="absolute bottom-32 right-6 z-[3000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-[#a62626] border border-gray-100 pointer-events-auto active:scale-90 transition-transform">
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

export default function AddPropertyModal({ onClose, onBack, editData, t }: AddPropertyModalProps) {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [hasConfirmedLocation, setHasConfirmedLocation] = useState(!!editData?.location);
  const [showPhone, setShowPhone] = useState((editData as any)?.show_phone !== false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const userPhone = localStorage.getItem('user_phone') || '';

  const titleRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  
  // Controlled fields for comma formatting
  const [price, setPrice] = useState(editData?.price ? formatNumber(editData.price.toString()) : '');
  const [deposit, setDeposit] = useState(editData?.deposit ? formatNumber(editData.deposit.toString()) : '');
  const [mortgage, setMortgage] = useState(editData?.mortgage_amount ? formatNumber(editData.mortgage_amount.toString()) : '');
  const [area, setArea] = useState(editData?.area ? formatNumber(editData.area.toString()) : '');
  const [bedrooms, setBedrooms] = useState(editData?.bedrooms ? editData.bedrooms.toString() : '');
  const [floor, setFloor] = useState((editData as any)?.floor ? (editData as any).floor.toString() : '');
  const [totalFloors, setTotalFloors] = useState((editData as any)?.total_floors ? (editData as any).total_floors.toString() : '');
  const [buildYear, setBuildYear] = useState(editData?.build_year ? editData.build_year.toString() : '');

  const [dealType, setDealType] = useState(editData?.deal_type || DealType.SALE);
  const [propertyType, setPropertyType] = useState(editData?.type || PropertyType.APARTMENT);
  const [city, setCity] = useState(editData?.city || t.provinces[1]);
  const [hasParking, setHasParking] = useState(editData?.has_parking || false);
  const [hasStorage, setHasStorage] = useState(editData?.has_storage || false);
  const [hasElevator, setHasElevator] = useState((editData as any)?.has_elevator || false);
  const [location, setLocation] = useState(editData?.location || { lat: 34.5553, lng: 69.2075 });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(editData?.images || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-center map on city when clicking "Location on Map"
  const handleOpenMap = () => {
    if (!hasConfirmedLocation) {
        const coords = PROVINCE_COORDS[city];
        if (coords) setLocation(coords);
    }
    setView('map');
  };

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
    setErrorMessage('');

    if (!userPhone) {
        setErrorMessage("لطفا ابتدا وارد حساب خود شوید.");
        return;
    }

    if (!hasConfirmedLocation) {
       setErrorMessage(t.location_on_map);
       handleOpenMap();
       return;
    }

    setIsSubmitting(true);
    try {
      const { data: userExists } = await supabase.from('profiles').select('phone').eq('phone', userPhone).maybeSingle();
      if (!userExists) {
          localStorage.removeItem('user_phone');
          alert("نشست شما منقضی شده یا حساب شما یافت نشد. لطفا دوباره ثبت‌نام کنید.");
          window.location.reload();
          return;
      }

      const urls = await uploadMultipleImages(selectedFiles);
      const allImages = [...previews.filter(p => p.startsWith('http')), ...urls];
      
      const payload: any = {
        title: titleRef.current?.value || '', 
        price: Number(toEnglishDigits(price).replace(/,/g, '')) || 0, 
        mortgage_amount: Number(toEnglishDigits(mortgage).replace(/,/g, '')) || 0,
        deposit: Number(toEnglishDigits(deposit).replace(/,/g, '')) || 0,
        deal_type: dealType, 
        type: propertyType,
        area: Number(toEnglishDigits(area).replace(/,/g, '')) || 0,
        bedrooms: Number(toEnglishDigits(bedrooms)) || 0,
        floor: floor ? Number(toEnglishDigits(floor)) : null,
        total_floors: totalFloors ? Number(toEnglishDigits(totalFloors)) : null,
        build_year: buildYear ? Number(toEnglishDigits(buildYear)) : null,
        has_storage: hasStorage, 
        has_parking: hasParking,
        has_elevator: hasElevator,
        city: city, 
        address: addressRef.current?.value || '', 
        description: descriptionRef.current?.value || '',
        phone_number: userPhone, 
        show_phone: showPhone,
        location: location, 
        images: allImages,
        owner_id: userPhone, 
        status: 'PENDING'
      };

      const { error } = editData 
        ? await supabase.from(TABLES.PROPERTIES).update(payload).eq('id', editData.id)
        : await supabase.from(TABLES.PROPERTIES).insert([payload]);

      if (error) {
        setErrorMessage("خطا در ثبت پایگاه داده: " + error.message);
        return;
      }

      alert(editData ? t.update_ad : t.success_msg);
      onClose();
    } catch (err: any) { 
      setErrorMessage("خطای سیستمی رخ داد.");
    } finally { 
      setIsSubmitting(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:max-h-[95vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative shadow-2xl" onClick={e => e.stopPropagation()}>
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col animate-in fade-in">
            <div className="h-16 flex items-center px-6 border-b shrink-0 text-right">
              <button onClick={() => setView('form')} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2 text-lg">{t.location_on_map}</h2>
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
                <button onClick={() => { setHasConfirmedLocation(true); setView('form'); }} className="w-full bg-[#a62626] text-white py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">تایید موقعیت</button>
              </div>
            </div>
          </div>
        )}
        <div className="p-5 border-b flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onBack || onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ArrowRight size={24} className="text-gray-800" /></button>
            <h2 className="font-black text-xl text-gray-800">{editData ? t.edit_ad : t.add_post}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-xl"><X size={24} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
          {errorMessage && (
             <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-black animate-in slide-in-from-top-2">
                <AlertCircle size={20} />
                <span>{errorMessage}</span>
             </div>
          )}
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
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-white rounded-xl shadow-sm text-gray-400"><Phone size={18} /></div>
                       <span className="text-[13px] font-black text-gray-800" dir="ltr">{userPhone}</span>
                    </div>
                    <button type="button" onClick={() => setShowPhone(!showPhone)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${showPhone ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
                       {showPhone ? <Eye size={14} /> : <EyeOff size={14} />}
                       <span className="text-[10px] font-black">{showPhone ? t.show_phone : t.hide_phone}</span>
                    </button>
                 </div>
              </div>

              <input type="text" ref={titleRef} defaultValue={editData?.title} placeholder={t.title} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <div className="grid grid-cols-2 gap-4">
                 <select value={dealType} onChange={e => setDealType(e.target.value as any)} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   <option value={DealType.SALE}>{t.sale}</option>
                   <option value={DealType.RENT}>{t.rent}</option>
                   <option value={DealType.MORTGAGE}>{t.mortgage}</option>
                 </select>
                 <select value={propertyType} onChange={e => setPropertyType(e.target.value as any)} className="bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none">
                   {t.sub_categories.ESTATE.map((pt: string) => <option key={pt} value={pt}>{pt}</option>)}
                 </select>
              </div>

              {dealType === DealType.SALE && (
                 <input 
                  type="tel" 
                  value={price} 
                  onChange={e => setPrice(formatNumber(e.target.value))} 
                  placeholder={`${t.price} (${t.currency})`} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" 
                  required 
                 />
              )}
              {dealType === DealType.RENT && (
                 <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="tel" 
                      value={price} 
                      onChange={e => setPrice(formatNumber(e.target.value))} 
                      placeholder={t.rent} 
                      className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" 
                      required 
                    />
                    <input 
                      type="tel" 
                      value={deposit} 
                      onChange={e => setDeposit(formatNumber(e.target.value))} 
                      placeholder="Deposit" 
                      className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" 
                      required 
                    />
                 </div>
              )}
              {dealType === DealType.MORTGAGE && (
                 <input 
                  type="tel" 
                  value={mortgage} 
                  onChange={e => setMortgage(formatNumber(e.target.value))} 
                  placeholder={t.mortgage} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none" 
                  required 
                 />
              )}

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="tel" 
                  value={area} 
                  onChange={e => setArea(formatNumber(e.target.value))} 
                  placeholder={t.area} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" 
                  required 
                />
                <input 
                  type="tel" 
                  value={bedrooms} 
                  onChange={e => setBedrooms(toEnglishDigits(e.target.value).replace(/\D/g, ''))} 
                  placeholder={t.bedrooms} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="tel" 
                  value={floor} 
                  onChange={e => setFloor(toEnglishDigits(e.target.value).replace(/\D/g, ''))} 
                  placeholder={t.floor} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" 
                />
                <input 
                  type="tel" 
                  value={totalFloors} 
                  onChange={e => setTotalFloors(toEnglishDigits(e.target.value).replace(/\D/g, ''))} 
                  placeholder={t.total_floors} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" 
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                 <button type="button" onClick={() => setHasParking(!hasParking)} className={`py-4 rounded-2xl font-black text-[10px] border flex flex-col items-center justify-center gap-1 ${hasParking ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                   <Check size={16} className={hasParking ? "block" : "hidden"} /> {t.parking}
                 </button>
                 <button type="button" onClick={() => setHasStorage(!hasStorage)} className={`py-4 rounded-2xl font-black text-[10px] border flex flex-col items-center justify-center gap-1 ${hasStorage ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                   <Check size={16} className={hasStorage ? "block" : "hidden"} /> {t.storage}
                 </button>
                 <button type="button" onClick={() => setHasElevator(!hasElevator)} className={`py-4 rounded-2xl font-black text-[10px] border flex flex-col items-center justify-center gap-1 ${hasElevator ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                   <Check size={16} className={hasElevator ? "block" : "hidden"} /> {t.elevator}
                 </button>
              </div>

              <div className="relative">
                <input 
                  type="tel" 
                  value={buildYear} 
                  onChange={e => setBuildYear(toEnglishDigits(e.target.value).replace(/\D/g, ''))} 
                  placeholder={t.build_year} 
                  className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" 
                />
              </div>

              <select value={city} onChange={e => setCity(e.target.value)} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-black outline-none">
                {t.provinces.slice(1).map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>

              <input type="text" ref={addressRef} defaultValue={editData?.address} placeholder={t.address} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <button type="button" onClick={handleOpenMap} className={`w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all ${hasConfirmedLocation ? 'border-green-500 bg-green-50 text-green-700' : 'border-[#a62626] bg-red-50 text-[#a62626] animate-pulse'}`}>
                {hasConfirmedLocation ? <><Check size={28} /> <span className="font-black">{t.location_confirmed}</span></> : <><MapPin size={28} /> <span className="font-black">{t.location_on_map}</span></>}
              </button>

              <textarea rows={4} ref={descriptionRef} defaultValue={editData?.description} placeholder={t.description} className="w-full bg-gray-50 border rounded-2xl px-5 py-4 font-bold outline-none resize-none"></textarea>
            </div>
          </form>
        </div>
        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="property-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-[#a62626] text-white py-4 rounded-2xl font-black text-lg shadow-lg">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : (editData ? t.update_ad : t.submit)}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}
