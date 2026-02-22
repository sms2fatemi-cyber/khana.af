
-- ۱. ساخت یا بروزرسانی جدول پروفایل
CREATE TABLE IF NOT EXISTS public.profiles (
    phone TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ۲. اضافه کردن ستون آسانسور به جدول املاک
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='properties' AND column_name='has_elevator') THEN
        ALTER TABLE public.properties ADD COLUMN has_elevator BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ۳. تنظیم هویت کپی (Replica Identity) برای ارسال داده‌های کامل در حالت زنده
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.general_ads REPLICA IDENTITY FULL;
ALTER TABLE public.user_chats REPLICA IDENTITY FULL;

-- ۴. اصلاح محدودیت‌های کلید خارجی (CASCADE)
DO $$ 
BEGIN
    -- حذف محدودیت‌های قدیمی اگر وجود دارند
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'properties_owner_id_fkey') THEN
        ALTER TABLE public.properties DROP CONSTRAINT properties_owner_id_fkey;
    END IF;
    ALTER TABLE public.properties ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(phone) ON UPDATE CASCADE ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'jobs_owner_id_fkey') THEN
        ALTER TABLE public.jobs DROP CONSTRAINT jobs_owner_id_fkey;
    END IF;
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(phone) ON UPDATE CASCADE ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'services_owner_id_fkey') THEN
        ALTER TABLE public.services DROP CONSTRAINT services_owner_id_fkey;
    END IF;
    ALTER TABLE public.services ADD CONSTRAINT services_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(phone) ON UPDATE CASCADE ON DELETE CASCADE;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'general_ads_owner_id_fkey') THEN
        ALTER TABLE public.general_ads DROP CONSTRAINT general_ads_owner_id_fkey;
    END IF;
    ALTER TABLE public.general_ads ADD CONSTRAINT general_ads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(phone) ON UPDATE CASCADE ON DELETE CASCADE;
END $$;

-- ۵. فعال‌سازی پخش زنده (Real-time Publication)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.user_chats, 
    public.properties, 
    public.jobs, 
    public.services, 
    public.general_ads,
    public.profiles;
COMMIT;

-- ۶. ساخت جداول سیستمی و تنظیمات
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    contact_phone TEXT,
    instagram TEXT,
    telegram TEXT,
    facebook TEXT,
    about_text TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id TEXT NOT NULL,
    ad_title TEXT,
    reason TEXT,
    reporter_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- درج تنظیمات اولیه اگر وجود ندارد
INSERT INTO public.app_settings (id, contact_phone, about_text)
VALUES (1, '07XXXXXXXX', 'درباره ما...')
ON CONFLICT (id) DO NOTHING;

-- درج ادمین اولیه اگر وجود ندارد (نام کاربری: admin، رمز: admin123)
INSERT INTO public.system_admins (username, password, full_name)
VALUES ('admin', 'admin123', 'مدیر سیستم')
ON CONFLICT (username) DO NOTHING;

-- ۷. امنیت سطح ردیف (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are public" ON public.profiles;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (true);

-- فعال‌سازی دسترسی عمومی برای جداول جدید (برای سادگی در این مرحله)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are public" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Settings are manageable by anyone" ON public.app_settings FOR ALL USING (true);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are manageable by anyone" ON public.reports FOR ALL USING (true);

ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins are manageable by anyone" ON public.system_admins FOR ALL USING (true);
