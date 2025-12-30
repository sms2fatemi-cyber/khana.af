
import { createClient } from '@supabase/supabase-js';

// Extract environment variables
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

// صریحاً نوع فیلدها را مشخص می‌کنیم تا خطای AdminPanel رفع شود
export const TABLES = {
  PROPERTIES: 'properties' as string,
  JOBS: 'jobs' as string,
  SERVICES: 'services' as string,
  MESSAGES: 'messages' as string
};

export const isSupabaseReady = () => isConfigured;

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onerror = () => {
        console.error("Image load error in compression");
        resolve(file);
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 1200;

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
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' });
              resolve(newFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7);
        } catch (e) {
          console.error("Canvas compression error", e);
          resolve(file);
        }
      };
    };
    reader.onerror = () => {
      console.error("FileReader error");
      resolve(file);
    };
  });
};

export const uploadImage = async (file: File): Promise<string> => {
  if (!isConfigured) return '';
  try {
    const compressedFile = await compressImage(file);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { error } = await supabase.storage.from('images').upload(fileName, compressedFile, {
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) throw error;

    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
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
