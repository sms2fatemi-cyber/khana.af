
export const getRelativeTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'لحظاتی پیش';
  try {
    const past = new Date(dateStr);
    const now = new Date();
    if (isNaN(past.getTime())) return 'مدتی پیش';
    const diffInMs = now.getTime() - past.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSecs < 60) return 'همین حالا';
    if (diffInMins < 60) return `${diffInMins} دقیقه پیش`;
    if (diffInHours < 24) return `${diffInHours} ساعت پیش`;
    if (diffInDays < 7) return `${diffInDays} روز پیش`;
    return past.toLocaleDateString('fa-AF');
  } catch (e) { return 'مدتی پیش'; }
};

export const translations = {
  dari: {
    lang_label: 'Pushto',
    estate: 'املاک',
    vehicles: 'وسایل نقلیه',
    digital: 'کالای دیجیتال',
    home_kitchen: 'خانه و آشپزخانه',
    services: 'خدمات',
    personal: 'وسایل شخصی',
    industrial: 'تجهیزات و صنعتی',
    jobs: 'استخدام و کاریابی',
    others: 'سایر موارد',
    search_placeholder: 'جستجو در آگهی‌ها...',
    account: 'خانه من',
    add_post: 'ثبت آگهی',
    map: 'نقشه',
    list: 'لیست آگهی‌ها',
    all: 'همه',
    sale: 'فروشی',
    rent: 'کرایی',
    mortgage: 'گروی',
    contact_info: 'تماس',
    chat: 'چت',
    price: 'قیمت',
    city: 'شهر / ولایت',
    my_ads: 'آگهی‌های من',
    saved: 'نشان شده‌ها',
    notifications: 'پیام‌ها',
    no_results: 'آگهی یافت نشد.',
    currency: 'افغانی',
    experience: 'سابقه',
    provider: 'ارائه‌دهنده',
    category: 'دسته',
    description: 'توضیحات',
    area: 'مساحت (متر)',
    bedrooms: 'تعداد اتاق',
    type: 'نوع',
    address: 'آدرس',
    title: 'عنوان',
    submit: 'انتشار آگهی',
    login_title: 'ورود به سیستم',
    company: 'نام شرکت',
    salary: 'معاش پیشنهادی',
    cancel: 'انصراف',
    parking: 'پارکینگ',
    storage: 'انباری',
    build_year: 'سال ساخت',
    condition: 'وضعیت کالا',
    new: 'نو',
    almost_new: 'در حد نو',
    used: 'دست دوم',
    provinces: ['همه ولایات', 'کابل', 'هرات', 'بلخ', 'قندهار', 'ننگرهار', 'بامیان', 'غزنی', 'کندوز', 'بدخشان', 'تخار', 'بغلان', 'پروان', 'کاپیسا', 'پنجشیر', 'میدان وردک', 'لوگر', 'پکتیا', 'پکتیکا', 'خوست', 'لغمان', 'کنر', 'نورستان', 'جوزجان', 'فاریاب', 'سرپل', 'سمنگان', 'بادغیس', 'غور', 'دایکندی', 'اروزگان', 'زابل', 'هلمند', 'فراه', 'نیمروز'],
    sub_categories: {
      SERVICES: ['خدمات تخنیکی', 'تعمیرات', 'نظافت', 'آرایشگری', 'آموزشی', 'حمل و نقل', 'سایر'],
      ESTATE: ['آپارتمان', 'حویلی', 'خانه', 'زمین', 'تجاری', 'دکان'],
      VEHICLES: ['موترهای سواری', 'موترهای سنگین', 'موترسایکل', 'بایسکل', 'لوازم یدکی'],
      DIGITAL: ['موبایل', 'لپ‌تاپ', 'کنسول بازی', 'لوازم جانبی'],
      HOME_KITCHEN: ['فرش و کوچ', 'وسایل آشپزخانه', 'دکور', 'لوازم خانگی'],
      PERSONAL: ['کیف و کفش', 'ساعت و جواهرات', 'آرایشی و بهداشتی'],
      INDUSTRIAL: ['ماشین‌آلات', 'تجهیزات صنعتی'],
      JOBS: ['اداری', 'تخنیکی', 'فروشندگی', 'خدماتی'],
      OTHERS: ['سایر']
    }
  },
  pashto: {
    lang_label: 'دری',
    estate: 'املاک',
    vehicles: 'موټر',
    digital: 'دیجیټل وسایل',
    home_kitchen: 'کور او پخلنځی',
    services: 'خدمتونه',
    personal: 'شخصي توکي',
    industrial: 'صنعتي تجهیزات',
    jobs: 'دندې موندل',
    others: 'نور موارد',
    search_placeholder: 'ټولو اعلانونو کې لټون...',
    account: 'زما کور',
    add_post: 'اعلان ورکول',
    map: 'نقشه',
    list: 'لړلیک',
    all: 'ټول',
    sale: 'پلورل',
    rent: 'کرایه',
    mortgage: 'ګروي',
    contact_info: 'اړیکې شمیره',
    chat: 'خبرې اترې',
    price: 'بیه',
    city: 'ښار / ولایت',
    my_ads: 'زما اعلانونه',
    saved: 'نښه شوي',
    notifications: 'پیامونه',
    no_results: 'اعلان ونه موندل شو.',
    currency: 'افغانۍ',
    experience: 'تجربه',
    provider: 'وړاندې کوونکی',
    category: 'ویش',
    description: 'توضیحات',
    area: 'مساحت (متر)',
    bedrooms: 'کوټې',
    type: 'ډول',
    address: 'پته',
    title: 'سرلیک',
    submit: 'خپرول',
    login_title: 'ننوتل',
    company: 'شرکت نوم',
    salary: 'وړاندیز شوی معاش',
    cancel: 'بندول',
    parking: 'پارکینګ',
    storage: 'ګودام',
    build_year: 'جوړیدو کال',
    condition: 'حالت',
    new: 'نوی',
    almost_new: 'نوي ته نږدې',
    used: 'استعمال شوی',
    provinces: ['ټول ولایتونه', 'کابل', 'هرات', 'بلخ', 'قندهار', 'ننګرهار', 'بامیان', 'غزنی', 'کندوز', 'بدخشان', 'تخار', 'بغلان', 'پروان', 'کاپیسا', 'پنجشیر', 'میدان وردک', 'لوګر', 'پکتیا', 'پکتیکا', 'خوست', 'لغمان', 'کنر', 'نورستان', 'جوزجان', 'فاریاب', 'سرپل', 'سمنګان', 'بادغیس', 'غور', 'دایکندی', 'اروزګان', 'زابل', 'هلمند', 'فراه', 'نیمروز'],
    sub_categories: {
      SERVICES: ['تخنیکي', 'ترمیم', 'پاکول', 'نور'],
      ESTATE: ['آپارتمان', 'حویلي', 'ځمکه', 'دکان'],
      VEHICLES: ['موټر', 'موټرسايکل', 'بايسکل', 'پرزې'],
      DIGITAL: ['موبایل', 'کمپیوټر'],
      HOME_KITCHEN: ['غالۍ', 'سامانونه'],
      PERSONAL: ['جامې', 'ګاڼې'],
      INDUSTRIAL: ['ماشینونه'],
      JOBS: ['اداري', 'تخنیکي', 'خدماتي'],
      OTHERS: ['نور']
    }
  }
};
