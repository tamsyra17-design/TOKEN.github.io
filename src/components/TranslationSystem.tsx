/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'ar' | 'bn';

interface TranslationDictionary {
  [key: string]: {
    en: string;
    ar: string;
    bn: string;
  };
}

export const translations: TranslationDictionary = {
  // Navigation & General
  hospitalSystem: {
    en: "Smart Hospital Token Management",
    ar: "نظام إدارة توكن المستشفى الذكي",
    bn: "স্মার্ট হাসপাতাল টোকেন ব্যবস্থাপনা"
  },
  reception: {
    en: "Reception Desk",
    ar: "مكتب الاستقبال",
    bn: "রিসেপশনিস্ট ডেস্ক"
  },
  doctorRoom: {
    en: "Doctor's Chamber",
    ar: "عيادة الطبيب",
    bn: "ডাক্তারের চেম্বার"
  },
  tvDisplay: {
    en: "TV Queue Board",
    ar: "شاشة عرض الانتظار TV",
    bn: "টিভি কিউ বোর্ড"
  },
  pwaCheck: {
    en: "Patient Live Tracker",
    ar: "تتبع حالة المريض",
    bn: "রোগীর লাইভ ট্র্যাকিং"
  },
  reports: {
    en: "Insights & Reports",
    ar: "التقارير والإحصائيات",
    bn: "রিপোর্ট ও অ্যানালিটিক্স"
  },
  settings: {
    en: "Global Settings",
    ar: "الإعدادات العامة",
    bn: "গ্লোবাল সেটিংস"
  },
  login: {
    en: "Staff Login Portal",
    ar: "بوابة دخول الموظفين",
    bn: "স্টাফ লগইন পোর্টাল"
  },
  signOut: {
    en: "Sign Out",
    ar: "تسجيل الخروج",
    bn: "লগ আউট"
  },
  
  // Reception panel
  registerNewToken: {
    en: "Register New Token",
    ar: "تسجيل توكن جديد",
    bn: "নতুন টোকেন নিবন্ধন করুন"
  },
  patientName: {
    en: "Patient Full Name",
    ar: "اسم المريض بالكامل",
    bn: "রোগীর সম্পূর্ণ নাম"
  },
  patientPhone: {
    en: "Phone Number",
    ar: "رقم الهاتف والواتساب",
    bn: "ফোন নম্বর"
  },
  selectDoctor: {
    en: "Select Medical Consultant",
    ar: "اختر الطبيب المعالج",
    bn: "ডাক্তার নির্বাচন করুন"
  },
  tokenLanguage: {
    en: "Patient Preferred Language",
    ar: "اللغة المفضلة للمريض",
    bn: "রোগীর পছন্দের ভাষা"
  },
  triagePriority: {
    en: "Triage Assignment",
    ar: "حالة أولوية الفرز",
    bn: "অগ্রাধিকার শ্রেনীবিভাগ"
  },
  priorityNormal: {
    en: "Standard Queue",
    ar: "انتظار طبيعي",
    bn: "সাধারণ কিউ"
  },
  priorityEmergency: {
    en: "EMERGENCY - Urgent Triage",
    ar: "حالة طوارئ عاجلة 🚨",
    bn: "জরুরী triage 🚨"
  },
  generateTokenBtn: {
    en: "Generate Queue Token",
    ar: "إصدار رقم التوكن",
    bn: "টোকেন তৈরি করুন"
  },
  assignedDoctor: {
    en: "Assigned Consultant",
    ar: "الطبيب المعين",
    bn: "নির্ধারিত ডাক্তার"
  },

  // Doctor Panel
  activeQueue: {
    en: "Active Waiting Chamber",
    ar: "طابور الانتظار الفعلي",
    bn: "অপেক্ষারত কিউ"
  },
  callPatient: {
    en: "Call Next",
    ar: "استدعاء المريض التالي",
    bn: "পরবর্তী রোগীকে ডাকুন"
  },
  completeConsult: {
    en: "Complete Consultation",
    ar: "إتمام الكشف الطبي",
    bn: "পরামর্শ সম্পন্ন"
  },
  skipPatient: {
    en: "Skip Patient",
    ar: "تخطي المريض",
    bn: "এড়িয়ে যান"
  },
  recallPatient: {
    en: "Recall Sound",
    ar: "إعادة الاستدعاء صوتياً",
    bn: "পুনরায় ডাকুন"
  },
  aiFlowAnalyst: {
    en: "Gemini AI Chamber Auditor",
    ar: "المدقق الذكي من جيميناي",
    bn: "জেমিনাই এআই কিউ বিশ্লেষক"
  },
  doctorDashboard: {
    en: "Consulting Chamber Panel",
    ar: "لوحة عيادات الأطباء الاستشارية",
    bn: "ডাক্তার কনসালটেশন প্যানেল"
  },

  // State
  statusWaiting: {
    en: "Waiting",
    ar: "قيد الانتظار",
    bn: "অপেক্ষারত"
  },
  statusCalled: {
    en: "CALLING NOW",
    ar: "استدعاء الآن",
    bn: "বর্তমানে ডাকছেন"
  },
  statusCompleted: {
    en: "Completed",
    ar: "تم الكشف للمريض",
    bn: "সম্পন্ন"
  },
  statusSkipped: {
    en: "Skipped / Absent",
    ar: "غير متواجد / متخطى",
    bn: "অনুপস্থিত"
  },

  // TV display
  nowConsultingToken: {
    en: "NOW SERVING TOKEN",
    ar: "التوكن الحالي في العيادة",
    bn: "বর্তমান টোকেন নম্বর"
  },
  proceedToRoom: {
    en: "Please proceed to Room",
    ar: "يرجى التوجه إلى الغرفة رقم",
    bn: "অনুগ্রহ করে এই কক্ষে যান"
  },
  nextWaitingTitle: {
    en: "Upcoming Waiting Queue",
    ar: "قائمة الانتظار التالية",
    bn: "পরবর্তী অপেক্ষারত কিউ"
  },
  hospitalLobbyScreen: {
    en: "Main waiting Lobby LCD Display",
    ar: "شاشة استراحة الصالة الرئيسية LCD",
    bn: "প্রধান অপেক্ষারত লবি এলসিডি ডিসপ্লে"
  },

  // Analytics
  todayPatients: {
    en: "Today's Patient Intake",
    ar: "عدد مرضى اليوم المراجعين",
    bn: "আজকের মোট রোগী"
  },
  avgWait: {
    en: "Avg Queue Waiting Time",
    ar: "متوسط وقت انتظار المريض",
    bn: "গড় অপেক্ষার সময়"
  },
  completedCount: {
    en: "Completed Diagnostics",
    ar: "الفحوصات الطبية المكتملة",
    bn: "সম্পন্ন পরামর্শ"
  },
  skippedCount: {
    en: "Skipped/Missed Calls",
    ar: "حالات التخطي / الغياب",
    bn: "মিসড কল"
  },

  // Settings
  hospitalDetails: {
    en: "Hospital Structure Details",
    ar: "تفاصيل هيكل المستشفى المعرف",
    bn: "হাসপাতাল কনফিগারেশন"
  },
  tokenPrefixText: {
    en: "Token Letter Prefix",
    ar: "الحرف البدائي للتوكن (سابقة)",
    bn: "টোকেন প্রিফিক্স"
  },
  soundBroadcastToggle: {
    en: "Enable Multi-lingual Audio Vocalizations",
    ar: "تفعيل الإعلانات الصوتية متعددة اللغات",
    bn: "বহুভাষিক ভয়েস ঘোষণা সক্ষম করুন"
  },
  whatsappToggle: {
    en: "WhatsApp Alert Updates",
    ar: "إشعارات تنبيه الواتساب المباشرة",
    bn: "হোয়াটসঅ্যাপ সতর্কতা সক্ষম করুন"
  },
  qrCodeTrackerToggle: {
    en: "Enable QR Patient Checking",
    ar: "تفعيل التتبع المباشر عبر رمز QR",
    bn: "কিউআর রোগীর ট্র্যাকিং সক্রিয় করুন"
  }
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  translate: (key: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    // Sync direction inside document head
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.body.style.fontFamily = "'Poppins', 'Cairo', sans-serif";
    } else {
      document.documentElement.dir = 'ltr';
      document.body.style.fontFamily = "'Inter', 'Poppins', sans-serif";
    }
  }, [language]);

  const translate = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language] || translations[key]['en'];
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, isRtl }}>
      <div className={isRtl ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be declared within a LanguageProvider context');
  }
  return context;
}
