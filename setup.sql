-- Schema setup for Khana.shop
-- این کدها را در بخش SQL Editor در سوپابس کپی و اجرا کنید

-- ۱. جداول اصلی (پروفایل، املاک، مشاغل، خدمات، آگهی‌های عمومی، چت و تنظیمات)
CREATE TABLE IF NOT EXISTS profiles (
  phone TEXT PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price NUMERIC,
  deposit NUMERIC,
  mortgage_amount NUMERIC,
  deal_type TEXT,
  type TEXT,
  area NUMERIC,
  bedrooms INTEGER,
  has_storage BOOLEAN,
  has_parking BOOLEAN,
  city TEXT,
  address TEXT,
  description TEXT,
  phone_number TEXT,
  location JSONB,
  images TEXT[],
  owner_id TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  company TEXT,
  salary NUMERIC,
  city TEXT,
  address TEXT,
  description TEXT,
  phone_number TEXT,
  location JSONB,
  images TEXT[],
  owner_id TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  provider_name TEXT,
  category TEXT,
  experience TEXT,
  city TEXT,
  address TEXT,
  description TEXT,
  phone_number TEXT,
  location JSONB,
  images TEXT[],
  owner_id TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS general_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC,
  sub_category TEXT,
  city TEXT,
  address TEXT,
  description TEXT,
  phone_number TEXT,
  location JSONB,
  images TEXT[],
  owner_id TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ۲. جدول آگهی‌های ذخیره شده (نشان شده‌ها)
CREATE TABLE IF NOT EXISTS saved_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_phone TEXT REFERENCES profiles(phone) ON DELETE CASCADE,
  ad_id UUID NOT NULL,
  ad_table TEXT NOT NULL, -- 'properties', 'jobs', 'services', 'general_ads'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_phone, ad_id)
);

CREATE TABLE IF NOT EXISTS user_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_phone TEXT,
  receiver_phone TEXT,
  ad_id TEXT,
  ad_title TEXT,
  text TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_phone TEXT,
  text TEXT,
  is_read BOOLEAN DEFAULT false,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY,
  about_text TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  telegram_url TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT
);

-- جلوگیری از ارور تکراری در فعال‌سازی Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'user_chats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_chats;
    END IF;
END $$;

-- درج اطلاعات پیش‌فرض
INSERT INTO system_admins (username, password, full_name, role)
VALUES ('admin', '123456', 'مدیر کل', 'SUPER')
ON CONFLICT (username) DO NOTHING;

INSERT INTO app_settings (id, about_text, contact_phone)
VALUES (1, 'خوش آمدید به خانه. اولین اپلیکیشن تخصصی نیازمندی‌ها در افغانستان.', '0700000000')
ON CONFLICT (id) DO NOTHING;