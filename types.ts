
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

export interface AdminMessage {
  id: string;
  targetPhone: string;
  text: string;
  date: string;
  isRead: boolean;
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  price: number;
  deposit?: number;
  mortgageAmount?: number;
  currency: string;
  location: Location;
  address: string;
  city: string;
  images: string[];
  bedrooms: number;
  hasStorage: boolean;
  area: number;
  type: PropertyType;
  dealType: DealType;
  description: string;
  features: string[];
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  phoneNumber: string;
}

export enum JobType {
  FULL_TIME = 'تمام وقت',
  PART_TIME = 'پاره وقت',
  REMOTE = 'دورکاری',
  CONTRACT = 'قراردادی'
}

export interface Job {
  id: string;
  ownerId: string;
  title: string;
  company: string;
  salary: number;
  currency: string;
  location: Location;
  address: string;
  city: string;
  images: string[];
  jobType: JobType;
  description: string;
  requirements: string[];
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  phoneNumber: string;
}

export enum ServiceCategory {
  REPAIR = 'ترمیمات',
  CLEANING = 'نظافت و پاک‌کاری',
  EDUCATION = 'آموزش و تدریس',
  TECHNICAL = 'فنی و مهندسی',
  TRANSPORT = 'حمل و نقل'
}

export interface Service {
  id: string;
  ownerId: string;
  title: string;
  providerName: string;
  category: ServiceCategory;
  location: Location;
  address: string;
  city: string;
  images: string[];
  description: string;
  experience: string;
  phoneNumber: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export type AdminRole = 'SUPER' | 'NORMAL';

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: AdminRole;
}

export type AppMode = 'ESTATE' | 'JOBS' | 'SERVICES';
