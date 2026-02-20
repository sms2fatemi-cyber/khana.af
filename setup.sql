
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

-- ۶. امنیت سطح ردیف (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are public" ON public.profiles;
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (true);
