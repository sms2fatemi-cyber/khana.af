
import { createClient } from '@supabase/supabase-js';

// استخراج متغیرها با حذف فاصله‌های احتمالی (trim)
const getEnvVar = (name: string): string => {
  try {
    // @ts-ignore
    const val = import.meta.env[name];
    return typeof val === 'string' ? val.trim() : "";
  } catch (e) {
    return "";
  }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// بررسی دقیق‌تر برای تایید پیکربندی
const isUrlValid = supabaseUrl.startsWith('https://');
const isKeyValid = supabaseAnonKey.length > 20;

console.log("Database Connection Status:", {
  urlFound: !!supabaseUrl,
  keyFound: !!supabaseAnonKey,
  urlValid: isUrlValid,
  keyLength: supabaseAnonKey.length,
  // @ts-ignore
  envMode: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.MODE : 'unknown'
});

const isConfigured = isUrlValid && isKeyValid;

if (!isConfigured) {
  console.warn("Supabase is not configured properly. Check your GitHub Secrets.");
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder'
);

export const TABLES = {
  PROPERTIES: 'properties',
  JOBS: 'jobs',
  SERVICES: 'services'
};

export const isSupabaseReady = () => isConfigured;

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1000;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.5);
      };
    };
  });
};

export const uploadImage = async (file: File): Promise<string> => {
  if (!isConfigured) return '';
  try {
    const compressedFile = await compressImage(file);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const { error } = await supabase.storage.from('images').upload(fileName, compressedFile);
    if (error) throw error;
    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (e) {
    console.error("Upload failed", e);
    return '';
  }
};

export const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
  const urls = await Promise.all(files.map(file => uploadImage(file)));
  return urls.filter(url => url !== '');
};
