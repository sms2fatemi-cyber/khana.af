
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, MapPin, ChevronRight, Loader2, Camera, Trash2, ListChecks, MapPinned, Crosshair } from 'lucide-react';
import { JobType } from '../types';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { supabase, TABLES, uploadMultipleImages } from '../services/supabaseClient';

interface AddJobModalProps {
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
      className="absolute bottom-24 right-6 z-[1000] w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center text-blue-600 border border-gray-100 active:scale-90 transition-transform"
    >
      {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={28} />}
    </button>
  );
};

const AddJobModal: React.FC<AddJobModalProps> = ({ onClose, t, lang }) => {
  const [view, setView] = useState<'form' | 'map'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '', company: '', salary: '', jobType: JobType.FULL_TIME,
    requirements: '',
    city: t.provinces[1], address: '', description: '', phoneNumber: '',
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

      const payload = {
        title: formData.title,
        company: formData.company,
        salary: Number(toEnglishDigits(formData.salary)),
        job_type: formData.jobType,
        requirements: formData.requirements.split('،').map(r => r.trim()).filter(r => r),
        city: formData.city,
        address: formData.address,
        description: formData.description,
        phone_number: toEnglishDigits(formData.phoneNumber),
        location: formData.location,
        images: imageUrls,
        status: 'PENDING',
        owner_id: localStorage.getItem('user_phone') || 'guest'
      };

      const { error } = await supabase.from(TABLES.JOBS).insert([payload]);
      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      alert(lang === 'dari' ? "خطا در ثبت شغل." : "د دندې ثبتولو کې ستونزه ده.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) return (
    <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white w-full max-sm:max-w-xs rounded-[2.5rem] p-10 text-center animate-slide-up">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40} /></div>
        <h2 className="text-2xl font-black mb-2">{lang === 'dari' ? 'ثبت شد' : 'ثبت شو'}</h2>
        <button onClick={() => onClose()} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black">{lang === 'dari' ? 'بسیار عالی' : 'ډېر ښه'}</button>
      </div>
    </div>
  );

  const MapContainerAny = MapContainer as any;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2.5rem] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
        {view === 'map' && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col">
            <div className="h-16 flex items-center px-6 border-b shrink-0">
              <button onClick={() => setView('form')} className="p-2"><ChevronRight size={32} /></button>
              <h2 className="font-black mr-2">{t.select_location}</h2>
            </div>
            <div className="flex-1 relative">
              <MapContainerAny center={[formData.location.lat, formData.location.lng]} zoom={14} style={{ height: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <UserLocationHandler />
                <MapPin size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[1000] text-blue-600" />
              </MapContainerAny>
              <button onClick={() => setView('form')} className="absolute bottom-10 left-8 right-8 z-[1000] bg-blue-600 text-white py-4 rounded-2xl font-black shadow-2xl">{lang === 'dari' ? 'تایید محل کار' : 'د ځای تایید'}</button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h2 className="font-black text-xl text-gray-800">{lang === 'dari' ? 'ثبت شغل جدید' : 'د نوې دندې ثبتول'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
          <form id="job-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border">
                  <img src={src} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-lg"><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                <Camera size={32} /> <span className="text-[10px] mt-1 font-black">{t.upload_photo}</span>
              </button>
              {/* Fix: use the correct ref attribute instead of fileInputRef */}
              <input type="file" ref={fileInputRef} hidden accept=".heic,.HEIC,image/*" multiple onChange={handleFileChange} />
            </div>

            <div className="space-y-4">
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={lang === 'dari' ? 'عنوان شغل' : 'د دندې سرلیک'} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
              <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder={t.company} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
              
              <div className="grid grid-cols-2 gap-4">
                 <select value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value as any})} className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none">
                   {Object.values(JobType).map(jt => (<option key={jt} value={jt}>{jt}</option>))}
                 </select>
                 <input type="text" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder={t.salary} className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none" required />
              </div>

              <div className="relative">
                <ListChecks size={18} className="absolute right-4 top-4 text-blue-500" />
                <textarea rows={3} value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} placeholder={t.requirements} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-11 py-4 font-bold outline-none resize-none" />
              </div>

              <div className="relative">
                <MapPinned size={18} className="absolute right-4 top-4 text-gray-400" />
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder={t.address} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-11 py-4 font-bold outline-none" required />
              </div>

              <input type="tel" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder={t.enter_phone} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none text-center dir-ltr" required />
              
              <button type="button" onClick={() => setView('map')} className="w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 text-gray-400 font-black">
                <MapPin size={24} /> {t.select_location}
              </button>
              
              <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={t.description} className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-bold outline-none resize-none"></textarea>
            </div>
          </form>
        </div>

        <div className="p-5 border-t bg-white flex gap-4 shrink-0 shadow-inner">
          <button form="job-form" type="submit" disabled={isSubmitting} className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black text-lg disabled:bg-gray-300">
            {isSubmitting ? <Loader2 className="animate-spin m-auto" /> : t.submit}
          </button>
          <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black">{t.cancel}</button>
        </div>
      </div>
    </div>
  );
};

export default AddJobModal;
