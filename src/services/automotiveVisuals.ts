/**
 * Automotive Visual Intelligence Service
 * Dynamically resolves, caches, and provides high-resolution, section-specific
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

// Curated, ultra-high-resolution, royalty-free automotive imagery strictly matched to section semantics
const AUTOMOTIVE_SECTION_VISUALS: Record<string, AutomotiveVisual> = {
  dashboard: {
    sectionId: 'dashboard',
    query: 'premium modern car automotive technology',
    title: 'Command & Telemetry Overview',
    tagline: 'Real-time vehicle diagnostics, telemetry metrics, and AI health status.',
    accentColor: '#00D4C7', // Electric Teal
    secondaryColor: '#B8C2CC',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=85',
    altText: 'Premium modern automotive sports vehicle illuminated in cinematic teal studio lighting',
    metricLabel: 'System Telemetry',
    badgeText: 'Active Telemetry',
  },
  vehicles: {
    sectionId: 'vehicles',
    query: 'premium car vehicle exterior',
    title: 'Vehicle Fleet & Specifications',
    tagline: 'Multi-vehicle registry, garage specifications, and active status tracking.',
    accentColor: '#00D4C7',
    secondaryColor: '#B8C2CC',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85',
    altText: 'Cinematic luxury sports coupe exterior showcasing aerodynamic silhouette',
    metricLabel: 'Fleet Garage',
    badgeText: 'Registered Fleet',
  },
  documents: {
    sectionId: 'documents',
    query: 'car insurance vehicle documents',
    title: 'Legal Documents & Compliance',
    tagline: 'Insurance policies, PUC emission certificates, registration (RC), and warranty verification.',
    accentColor: '#38BDF8', // Cyan / Sky
    secondaryColor: '#B8C2CC',
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1600&q=85',
    altText: 'Vehicle document inspection and automotive compliance certification folder',
    metricLabel: 'Regulatory Status',
    badgeText: 'Legal Compliance',
  },
  services: {
    sectionId: 'services',
    query: 'car mechanic automotive service maintenance',
    title: 'Service & Maintenance Bay',
    tagline: 'OEM preventative intervals, engine diagnostics, workshop history, and 20-point digital inspection.',
    accentColor: '#00D4C7',
    secondaryColor: '#B8C2CC',
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1600&q=85',
    altText: 'Precision automotive workshop service bay with mechanical engine inspection',
    metricLabel: 'Maintenance Cycle',
    badgeText: 'Service Station',
  },
  fuel: {
    sectionId: 'fuel',
    query: 'car refueling fuel station',
    title: 'Fuel & Mileage Intelligence',
    tagline: 'Consecutive consumption logging, true interval fuel efficiency (km/L), and price-per-litre trends.',
    accentColor: '#FFB020', // Amber
    secondaryColor: '#00D4C7',
    imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1600&q=85',
    altText: 'Automotive fuel pump nozzle dispensing fuel at a clean modern illuminated station',
    metricLabel: 'Consumption Rate',
    badgeText: 'Fuel Efficiency',
  },
  expenses: {
    sectionId: 'expenses',
    query: 'car maintenance expenses automotive cost',
    title: 'Automotive Financial Analytics',
    tagline: 'Total cost of ownership, recurring expenditure breakdown, vendor logs, and predictive budget.',
    accentColor: '#20C997', // Emerald
    secondaryColor: '#B8C2CC',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=85',
    altText: 'Automotive financial analytics and fleet cost management tracking',
    metricLabel: 'Operating Budget',
    badgeText: 'Cost Analytics',
  },
  reminders: {
    sectionId: 'reminders',
    query: 'car maintenance service reminder',
    title: 'Preventative Reminders & Deadlines',
    tagline: 'Smart alerts prioritized by urgency (Overdue, Due Soon, Upcoming) with duplicate prevention.',
    accentColor: '#FFB020', // Warning Amber
    secondaryColor: '#FF4D4F',
    imageUrl: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=1600&q=85',
    altText: 'Illuminated modern automotive instrument cluster with vehicle maintenance alerts',
    metricLabel: 'Alert Status',
    badgeText: 'Smart Schedules',
  },
  'ai-assistant': {
    sectionId: 'ai-assistant',
    query: 'automotive artificial intelligence vehicle technology',
    title: 'AutoCare Neural AI Assistant',
    tagline: 'Grounded automotive intelligence with full vehicle isolation and contextual diagnostics.',
    accentColor: '#00D4C7', // Electric Teal
    secondaryColor: '#A855F7',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=85',
    altText: 'Futuristic automotive artificial intelligence data interface with glowing neural telemetry',
    metricLabel: 'Neural Engine',
    badgeText: 'Gemini AI Core',
  },
  profile: {
    sectionId: 'profile',
    query: 'premium automotive account security',
    title: 'Account, Security & Data Backup',
    tagline: 'Authentication credentials, local preferences, full account JSON backup, and security rules.',
    accentColor: '#B8C2CC',
    secondaryColor: '#00D4C7',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1600&q=85',
    altText: 'Secure high-tech automotive credentials and encrypted data vault',
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
