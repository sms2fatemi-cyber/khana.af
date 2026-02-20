
export type Language = 'dari' | 'pashto';

export interface Location {
  lat: number;
  lng: number;
}

/**
 * Added AdminUser interface for authentication and management.
 */
export interface AdminUser {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'SUPER' | 'EDITOR';
}

/**
 * Added ServiceCategory enum for service classification.
 */
export enum ServiceCategory {
  TECHNICAL = 'خدمات تخنیکی',
  REPAIR = 'تعمیرات',
  CLEANING = 'نظافت',
  BEAUTY = 'آرایشگری',
  EDUCATION = 'آموزشی',
  TRANSPORT = 'حمل و نقل',
  OTHERS = 'سایر'
}

export enum PropertyType {
  APARTMENT = 'آپارتمان',
  HOUSE = 'حویلی',
  HOME = 'خانه',
  LAND = 'زمین',
  COMMERCIAL = 'تجاری',
  SHOP = 'دکان'
}

export enum DealType {
  SALE = 'فروشی',
  RENT = 'کرایی',
  MORTGAGE = 'گروی'
}

export type AppMode = 
  | 'ESTATE' 
  | 'VEHICLES' 
  | 'DIGITAL' 
  | 'HOME_KITCHEN' 
  | 'SERVICES' 
  | 'PERSONAL' 
  | 'INDUSTRIAL' 
  | 'JOBS' 
  | 'ENTERTAINMENT'
  | 'OTHERS';

export interface Ad {
  id: string;
  mode: AppMode;
  adType?: string;
  sub_category?: string;
  owner_id?: string;
  ownerId?: string;
  title: string;
  price: number;
  currency: string;
  location: Location | null;
  address: string;
  city: string;
  images: string[];
  description: string;
  date: string;
  created_at?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  phone_number?: string;
  phoneNumber?: string;
  item_condition?: 'نو' | 'در حد نو' | 'دست دوم';
  is_boosted?: boolean;
  show_phone?: boolean;
}

export interface Property extends Ad {
  deposit?: number;
  mortgage_amount?: number;
  bedrooms: number;
  has_storage?: boolean;
  has_parking?: boolean;
  area: number;
  type: PropertyType;
  deal_type?: DealType;
  build_year?: number;
}

export interface Job extends Ad {
  company: string;
  salary: number;
}

export interface Service extends Ad {
  provider_name?: string;
  experience: string;
  category?: string;
}
