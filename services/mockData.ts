
import { Property, Job, Service, AdminUser } from '../types';

// Mocking current user ID as 'user_123' for demonstration
export const ADMINS: AdminUser[] = [
  {
    id: 'admin_1',
    username: 'admin',
    password: '123',
    fullName: 'مدیر اصلی سیستم',
    role: 'SUPER'
  }
];

// Empty mock arrays as requested - only real data from database will be shown
export const PROPERTIES: Property[] = [];
export const JOBS: Job[] = [];
export const SERVICES: Service[] = [];
