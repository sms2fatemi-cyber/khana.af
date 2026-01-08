
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
  USER_CHATS: 'user_chats'
};

export const isSupabaseReady = () => isConfigured;

/**
 * تابع اصلی تبدیل و فشرده‌سازی تصویر
 * این تابع فایل‌های HEIC را به JPEG تبدیل کرده و سپس فشرده می‌کند.
 */
const processAndCompressImage = async (file: File): Promise<File> => {
  let blobToProcess: Blob | File = file;
  const fileName = file.name.toLowerCase();
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';

  // ۱. مرحله تبدیل HEIC به JPEG (مخصوص آیفون)
  if (isHeic) {
    try {
      // @ts-ignore
      const heic2any = window.heic2any;
      if (heic2any) {
        console.log("تبدیل فایل HEIC آغاز شد...");
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        blobToProcess = Array.isArray(converted) ? converted[0] : converted;
        console.log("تبدیل با موفقیت انجام شد.");
      }
    } catch (e) {
      console.error("خطا در تبدیل HEIC:", e);
      // اگر تبدیل با خطا مواجه شود، همان فایل اصلی برمی‌گردد که احتمالاً در مرحله بعد روی Canvas خطا می‌دهد.
    }
  }

  // ۲. مرحله فشرده‌سازی و تغییر اندازه با استفاده از Canvas
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blobToProcess);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onerror = () => {
        console.error("خطا در بارگذاری تصویر برای فشرده‌سازی");
        resolve(file); // در صورت خطا، فایل اصلی را برگردان
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // محدود کردن حداکثر اندازه تصویر برای سرعت بیشتر
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
              // ساخت فایل نهایی با پسوند قطعی .jpg
              const finalFileName = file.name.split('.')[0] + ".jpg";
              const newFile = new File([blob], finalFileName, { 
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(newFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.7); // فشرده‌سازی با کیفیت ۷۰ درصد
        } catch (e) { 
          console.error("خطا در پردازش Canvas:", e);
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
    // پردازش تصویر (تبدیل HEIC و فشرده‌سازی)
    const processedFile = await processAndCompressImage(file);
    
    // نام یکتا برای فایل در سرور
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    // آپلود به Supabase Storage
    const { error } = await supabase.storage.from('images').upload(uniqueFileName, processedFile, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });
    
    if (error) throw error;
    
    // دریافت آدرس عمومی فایل
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
