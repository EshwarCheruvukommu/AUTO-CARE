import React, { useState } from 'react';
import { Logo } from '../common/Logo';
import { FAQModal } from '../common/FAQModal';
import { 
  ShieldCheck, 
  Wrench, 
  Receipt, 
  BellRing, 
  ArrowRight, 
  Gauge, 
  CheckCircle2, 
  FileCheck,
  ChevronRight,
  Car,
  HelpCircle
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <nav className="border-b border-gray-800/80 bg-[#07090e]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFaqOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-cyan-300 hover:bg-gray-800/60 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>FAQ</span>
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 flex-1 flex flex-col justify-center">
        {/* Futuristic background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Version 1.0 Personal Maintenance Manager</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight">
            Your Vehicle's <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
              Personal Maintenance Manager
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Manage your vehicles, track maintenance history, store insurance & PUC documents, and monitor monthly expenses in one centralized dashboard.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base shadow-xl shadow-cyan-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0f131c] hover:bg-gray-800 text-gray-200 font-semibold text-base border border-gray-700 transition-all cursor-pointer"
            >
              Existing User Login
            </button>
          </div>

          {/* Interactive Feature Preview Mockup */}
          <div className="pt-12 max-w-4xl mx-auto">
            <div className="rounded-3xl border border-cyan-500/30 bg-[#0d1017]/90 p-4 sm:p-6 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Hyundai Grand i10 Nios (Sportz)</div>
                    <div className="text-xs text-cyan-400 font-mono">TS09EX1234 • 20,640 KM • Petrol</div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                    ✓ All Docs Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-left">
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Odometer</span>
                  <div className="text-base font-bold text-white font-mono mt-0.5">20,640 KM</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Monthly Expense</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">₹6,100</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Insurance</span>
                  <div className="text-base font-bold text-cyan-400 mt-0.5">Expires in 42d</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Service History</span>
                  <div className="text-base font-bold text-white mt-0.5">8 Recorded</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="py-16 px-6 bg-[#090b10] border-t border-gray-800/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Everything Your Vehicle Needs, Unified
            </h2>
            <p className="text-sm text-gray-400">
              No more searching through paper receipts, gallery photos, WhatsApp forwards, or lost glovebox folders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#0d1017] border border-gray-800/80 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Multi-Vehicle Garage</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Add all your cars, motorbikes, and scooters. Instantly toggle between vehicles to review individual service records and logs.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#0d1017] border border-gray-800/80 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Smart Document Vault</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Save Insurance, PUC, RC, and Driving Licences with attachment previews and automated 30-day expiry notifications.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#0d1017] border border-gray-800/80 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Chronological Service Log</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Log oil changes, scheduled maintenance, parts replaced, and costs. Keep a verified vehicle maintenance history for high resale value.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-[#0d1017] border border-gray-800/80 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Expense Tracking</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Categorize expenses under Fuel, Maintenance, Repairs, and Accessories. Understand your genuine cost per kilometer and monthly spending.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-[#0d1017] border border-gray-800/80 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">In-App Reminders</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Never get penalized for an expired PUC or forgotten insurance renewal with dynamic status calculations.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-[#0d1017] border border-gray-800/80 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Private & Secure Cloud</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Built with authenticated Firebase security rules. Your vehicle documents, records, and expenses remain strictly private to your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 bg-[#07090e] py-8 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p>© 2026 AutoCare. Your Vehicle's Personal Maintenance Manager. All rights reserved.</p>
          <div className="flex items-center gap-4 text-gray-400">
            <button
              onClick={() => setFaqOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer text-xs"
            >
              FAQ &amp; Guide
            </button>
            <span>•</span>
            <span>Security Protected</span>
            <span>•</span>
            <span>Cloud Firestore</span>
          </div>
        </div>
      </footer>

      {/* Global FAQ Modal for Landing Visitors */}
      <FAQModal
        isOpen={faqOpen}
        onClose={() => setFaqOpen(false)}
        onOpenFeedback={() => onOpenAuth('signup')}
      />
    </div>
  );
};
