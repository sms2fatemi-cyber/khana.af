
export type Language = 'dari' | 'pashto';

export interface Location {
  lat: number;
  lng: number;
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

export enum ServiceCategory {
  TECHNICAL = 'تخنیکی',
  REPAIR = 'ترمیماتی',
  CLEANING = 'نظافت',
  BEAUTY = 'آرایشگری',
  EDUCATIONAL = 'آموزشی',
  TRANSPORT = 'حمل و نقل',
  OTHERS = 'سایر'
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
  | 'OTHERS';

export interface SubCategory {
  id: string;
  label: string;
  icon?: any;
}

export interface Ad {
  id: string;
  mode: AppMode;
  sub_category?: string;
  subCategory?: string;
  ownerId: string;
  owner_id?: string;
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
  phoneNumber: string;
  phone_number?: string;
  item_condition?: 'نو' | 'در حد نو' | 'دست دوم';
  // Fix: Added is_boosted to Ad interface to resolve TS errors in PropertyCard.tsx and JobCard.tsx
  is_boosted?: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'SUPER' | 'NORMAL';
}

export interface Property extends Ad {
  deposit?: number;
  mortgage_amount?: number;
  mortgageAmount?: number;
  bedrooms: number;
  has_storage?: boolean;
  hasStorage: boolean;
  has_parking?: boolean;
  hasParking: boolean;
  area: number;
  type: PropertyType;
  deal_type?: DealType;
  dealType: DealType;
  build_year?: number;
}

export interface Job extends Ad {
  company: string;
  salary: number;
}

export interface Service extends Ad {
  provider_name?: string;
  providerName: string;
  experience: string;
  category?: string;
}
