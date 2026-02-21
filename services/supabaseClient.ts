
import { createClient } from '@supabase/supabase-js';

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

const isUrlValid = supabaseUrl.startsWith('https://');
const isKeyValid = supabaseAnonKey.length > 20;

const isConfigured = isUrlValid && isKeyValid;

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isConfigured ? supabaseAnonKey : 'placeholder'
);

export const TABLES = {
  PROPERTIES: 'properties',
  JOBS: 'jobs',
  SERVICES: 'services',
  MESSAGES: 'messages',
  USER_CHATS: 'user_chats',
  GENERAL_ADS: 'general_ads',
  APP_SETTINGS: 'app_settings',
  SAVED_ADS: 'saved_ads',
  REPORTS: 'reports'
};

export const isSupabaseReady = () => isConfigured;

/**
 * تابع اصلی تبدیل و فشرده‌سازی تصویر
 */
const processAndCompressImage = async (file: File): Promise<File> => {
  let blobToProcess: Blob | File = file;
  const fileName = file.name.toLowerCase();
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';

  if (isHeic) {
    try {
      // @ts-ignore
      const heic2any = window.heic2any;
      if (heic2any) {
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        blobToProcess = Array.isArray(converted) ? converted[0] : converted;
      }
    } catch (e) {
      console.error("خطا در تبدیل HEIC:", e);
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blobToProcess);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onerror = () => {
        resolve(file);
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200; 
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const finalFileName = file.name.split('.')[0] + ".jpg";
              const newFile = new File([blob], finalFileName, { 
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(newFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        } catch (e) { 
          resolve(file); 
        }
      };
    };
    reader.onerror = () => resolve(file);
  });
};

export const uploadImage = async (file: File): Promise<string> => {
  if (!isConfigured) return '';
  try {
    const processedFile = await processAndCompressImage(file);
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const { error } = await supabase.storage.from('images').upload(uniqueFileName, processedFile, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from('images').getPublicUrl(uniqueFileName);
    return data.publicUrl;
  } catch (e) {
    console.error("Upload error:", e);
    return '';
  }
};

export const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadImage(file);
    if (url) urls.push(url);
  }
  return urls;
};
