/**
 * Automotive Visual Intelligence Service
 * Dynamically resolves, caches, and provides photorealistic, section-specific
 * automotive imagery and fallbacks based on real-time navigation.
 */

export interface AutomotiveVisual {
  sectionId: string;
  query: string;
  title: string;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  imageUrl: string;
  altText: string;
  metricLabel: string;
  badgeText: string;
}

// Curated photorealistic generated automotive imagery strictly matched to section semantics
const AUTOMOTIVE_SECTION_VISUALS: Record<string, AutomotiveVisual> = {
  dashboard: {
    sectionId: 'dashboard',
    query: 'photorealistic modern everyday compact SUV dark blue studio environment',
    title: 'Command & Vehicle Overview',
    tagline: 'Comprehensive vehicle diagnostics, maintenance metrics, and AI health status.',
    accentColor: '#1677FF', // Electric Blue
    secondaryColor: '#00D9FF', // Cyan
    imageUrl: '/src/assets/images/hero_everyday_car_1791023391107.jpg',
    altText: 'Photorealistic modern everyday compact SUV parked in a cinematic dark navy environment with blue/cyan lighting',
    metricLabel: 'Vehicle Status',
    badgeText: 'Vehicle Synced',
  },
  vehicles: {
    sectionId: 'vehicles',
    query: 'photorealistic everyday car garage fleet',
    title: 'Vehicle Fleet & Specifications',
    tagline: 'Multi-vehicle registry, garage specifications, and active status tracking.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/hero_everyday_car_1791023391107.jpg',
    altText: 'Photorealistic modern everyday passenger car in showroom setting with blue/cyan lighting',
    metricLabel: 'Fleet Garage',
    badgeText: 'Registered Fleet',
  },
  documents: {
    sectionId: 'documents',
    query: 'photorealistic vehicle insurance registration documents car key',
    title: 'Legal Documents & Compliance',
    tagline: 'Insurance policies, PUC emission certificates, registration (RC), and warranty verification.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/vehicle_documents_1791023432609.jpg',
    altText: 'Photorealistic vehicle insurance certificate, registration papers, and car key fob beside modern vehicle',
    metricLabel: 'Regulatory Status',
    badgeText: 'Legal Compliance',
  },
  services: {
    sectionId: 'services',
    query: 'photorealistic car service workshop hydraulic lift mechanic inspection',
    title: 'Service & Maintenance Bay',
    tagline: 'OEM preventative intervals, engine diagnostics, workshop history, and 20-point digital inspection.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/service_workshop_1791023420120.jpg',
    altText: 'Photorealistic everyday car on service workshop hydraulic lift with mechanic inspection tools',
    metricLabel: 'Maintenance Cycle',
    badgeText: 'Service Station',
  },
  fuel: {
    sectionId: 'fuel',
    query: 'photorealistic car refueling modern fuel station fuel nozzle dispensing petrol',
    title: 'Fuel & Mileage Intelligence',
    tagline: 'Consecutive consumption logging, true interval fuel efficiency (km/L), and price-per-litre trends.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/fuel_refueling_1791023404719.jpg',
    altText: 'Photorealistic modern everyday car being refueled with fuel nozzle inserted at clean illuminated station',
    metricLabel: 'Consumption Rate',
    badgeText: 'Fuel Efficiency',
  },
  expenses: {
    sectionId: 'expenses',
    query: 'photorealistic automotive service bill receipt invoice fuel payment',
    title: 'Automotive Financial Analytics',
    tagline: 'Total cost of ownership, recurring expenditure breakdown, vendor logs, and predictive budget.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/automotive_expenses_1791023446344.jpg',
    altText: 'Photorealistic vehicle service invoice, expense payment card, and car key fob beside console',
    metricLabel: 'Operating Budget',
    badgeText: 'Cost Analytics',
  },
  reminders: {
    sectionId: 'reminders',
    query: 'photorealistic car dashboard instrument cluster maintenance reminder icon alert',
    title: 'Preventative Reminders & Deadlines',
    tagline: 'Smart alerts prioritized by urgency (Overdue, Due Soon, Upcoming) with duplicate prevention.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/maintenance_alert_1791023461475.jpg',
    altText: 'Photorealistic modern vehicle dashboard instrument cluster showing illuminated maintenance service warning',
    metricLabel: 'Alert Status',
    badgeText: 'Smart Schedules',
  },
  'ai-assistant': {
    sectionId: 'ai-assistant',
    query: 'photorealistic vehicle with futuristic automotive telemetry HUD',
    title: 'AutoCare Neural AI Assistant',
    tagline: 'Grounded automotive intelligence with full vehicle isolation and contextual diagnostics.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/ai_automotive_telemetry_1791023474152.jpg',
    altText: 'Photorealistic modern everyday car surrounded by futuristic blue/cyan telemetry HUD visualization',
    metricLabel: 'Neural Engine',
    badgeText: 'Gemini AI Core',
  },
  profile: {
    sectionId: 'profile',
    query: 'photorealistic vehicle documents and security credentials vault',
    title: 'Account, Security & Data Backup',
    tagline: 'Authentication credentials, local preferences, full account JSON backup, and security rules.',
    accentColor: '#1677FF',
    secondaryColor: '#00D9FF',
    imageUrl: '/src/assets/images/vehicle_documents_1791023432609.jpg',
    altText: 'Photorealistic vehicle security credentials and encrypted data vault',
    metricLabel: 'Account Vault',
    badgeText: 'Spark Secured',
  },
};

// In-memory cache for fetched or loaded images to prevent layout shift and redundant network hits
const imageCache = new Map<string, string>();

/**
 * Dynamically fetches and selects the appropriate automotive visual for a section.
 * Returns cached asset immediately or resolves seamlessly with preloading.
 */
export function getSectionVisual(sectionId: string): AutomotiveVisual {
  const normalizedKey = sectionId.toLowerCase().trim();
  const visual = AUTOMOTIVE_SECTION_VISUALS[normalizedKey] || AUTOMOTIVE_SECTION_VISUALS.dashboard;

  // Check cache or initialize preload in background
  if (!imageCache.has(normalizedKey)) {
    imageCache.set(normalizedKey, visual.imageUrl);
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      const img = new Image();
      img.src = visual.imageUrl;
    }
  }

  return visual;
}
