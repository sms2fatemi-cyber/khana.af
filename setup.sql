
-- اجرای این کدها در SQL Editor سوپابس الزامی است

-- ۱. افزودن ستون نمایش شماره به جدول آگهی‌های عمومی
ALTER TABLE general_ads ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;
ALTER TABLE general_ads ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false;

-- ۲. افزودن ستون نمایش شماره به سایر جداول برای اطمینان از عدم وقوع خطا در آینده
ALTER TABLE properties ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors INTEGER;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;

ALTER TABLE services ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;

-- ۳. رفرش کردن کش اسکیما (اختیاری اما توصیه شده)
-- در پنل سوپابس معمولاً پس از اجرای ALTER TABLE، کش به صورت خودکار آپدیت می‌شود.
-- اگر خطا باقی ماند، در بخش دیتابیس پنل سوپابس دکمه "Reload PostgREST" را بزنید.
