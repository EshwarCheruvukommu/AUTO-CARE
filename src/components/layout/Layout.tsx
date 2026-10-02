import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  FileText, 
  Wrench, 
  Fuel, 
  Receipt, 
  Bell, 
  User, 
  LogOut, 
  ChevronDown, 
  Plus, 
  Menu, 
  X,
  Gauge,
  Bot,
  MessageSquareHeart,
  HelpCircle,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { FeedbackModal } from '../common/FeedbackModal';
import { FAQModal } from '../common/FAQModal';
import { FeedbackFloatingButton } from '../common/FeedbackFloatingButton';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { Automotive3DBackground } from '../common/Automotive3DBackground';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { useTheme } from '../../context/ThemeContext';
import { formatOdometer } from '../../utils/formatters';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAddVehicle: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAddVehicle,
  children,
}) => {
  const { userProfile, currentUser, logout } = useAuth();
  const { 
    vehicles, 
    selectedVehicle, 
    setSelectedVehicleId, 
    activeAlertCount,
    reminders 
  } = useVehicle();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('autocare_notifications_enabled') !== 'false';
  });

  useEffect(() => {
    const handleToggle = (e: any) => {
      const enabled = e.detail !== undefined ? e.detail : (localStorage.getItem('autocare_notifications_enabled') !== 'false');
      setNotificationsEnabled(enabled);
    };
    window.addEventListener('autocare:notifications_toggle', handleToggle);
    window.addEventListener('storage', handleToggle);
    return () => {
      window.removeEventListener('autocare:notifications_toggle', handleToggle);
      window.removeEventListener('storage', handleToggle);
    };
  }, []);

  // Listen for custom global events to open feedback and FAQ modals
  useEffect(() => {
    const handleOpenFeedbackEvent = () => setFeedbackModalOpen(true);
    const handleOpenFAQEvent = () => setFaqModalOpen(true);
    window.addEventListener('autocare:open_feedback', handleOpenFeedbackEvent);
    window.addEventListener('autocare:open_faq', handleOpenFAQEvent);
    return () => {
      window.removeEventListener('autocare:open_feedback', handleOpenFeedbackEvent);
      window.removeEventListener('autocare:open_faq', handleOpenFAQEvent);
    };
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vehicles', label: 'My Vehicles', icon: Car, count: vehicles.length },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'services', label: 'Service & Maintenance', icon: Wrench },
    { id: 'fuel', label: 'Fuel & Mileage', icon: Fuel },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'reminders', label: 'Reminders', icon: Bell, badge: notificationsEnabled ? activeAlertCount : undefined },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'profile', label: 'Profile & Settings', icon: User },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F5F7FA] flex flex-col md:flex-row antialiased selection:bg-[#00D4C7] selection:text-black relative">
      {/* 3D Animated Automotive Telemetry Background */}
      <Automotive3DBackground />
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#10141B] border-r border-[#252C35] sticky top-0 h-screen z-30 select-none backdrop-blur-md">
        {/* Brand */}
        <div className="p-5 border-b border-[#252C35]/80">
          <Logo size="md" />
        </div>

        {/* Vehicle Quick Switcher */}
        <div className="p-4 border-b border-[#252C35]/80">
          <label className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 block mb-1.5 font-mono">
            Active Telemetry
          </label>
          <div className="relative">
            <button
              onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#151A20] border border-[#252C35] hover:border-[#00D4C7]/50 hover:bg-[#1D232B] transition-all text-left group shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#00D4C7]/10 border border-[#00D4C7]/30 flex items-center justify-center text-[#00D4C7] shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-[#00D4C7] transition-colors">
                    {selectedVehicle ? selectedVehicle.name : 'No Vehicle'}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5">
                    <span className="truncate">{selectedVehicle ? selectedVehicle.vehicleNumber : 'Add your first'}</span>
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${vehicleDropdownOpen ? 'rotate-180 text-[#00D4C7]' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {vehicleDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setVehicleDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-2 bg-[#121620] border border-cyan-500/30 rounded-xl shadow-2xl py-2 z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Select Vehicle
                  </div>
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVehicleId(v.id);
                        setVehicleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-800/90 transition-colors ${
                        selectedVehicle?.id === v.id ? 'bg-cyan-500/10 text-cyan-400 font-semibold' : 'text-gray-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium">{v.name}</div>
                        <div className="text-[10px] text-gray-500">{v.vehicleNumber} • {formatOdometer(v.currentOdometer)}</div>
                      </div>
                      {selectedVehicle?.id === v.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-gray-800 my-1 pt-1">
                    <button
                      onClick={() => {
                        setVehicleDropdownOpen(false);
                        onOpenAddVehicle();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-gray-800/60 flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Vehicle</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00D4C7]/20 via-[#1D232B] to-[#151A20] text-[#00D4C7] border border-[#00D4C7]/40 shadow-lg shadow-[#00D4C7]/10'
                    : 'text-gray-400 hover:text-[#F5F7FA] hover:bg-[#151A20]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00D4C7]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                ) : item.count !== undefined ? (
                  <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded bg-[#1D232B] border border-gray-800">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* Quick Help & Feedback Divider & Buttons */}
          <div className="pt-3 mt-2 border-t border-[#252C35]/80 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-wider">
              Help &amp; Diagnostics
            </div>

            <button
              onClick={() => setFaqModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-[#00D4C7] hover:bg-[#151A20] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-[#00D4C7]/80 group-hover:text-[#00D4C7]" />
                <span>FAQ &amp; Help Guide</span>
              </div>
            </button>

            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-[#00D4C7] hover:bg-[#151A20] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <MessageSquareHeart className="w-4 h-4 text-[#00D4C7] group-hover:scale-110 transition-transform" />
                <span>Feedback</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00D4C7]/10 text-[#00D4C7] font-semibold border border-[#00D4C7]/30">
                Share
              </span>
            </button>
          </div>
        </nav>

        {/* User Profile & Logout Bottom Section */}
        <div className="p-3 border-t border-[#252C35] bg-[#0E121A]">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#151A20] border border-[#252C35]">
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity flex-1"
              title="View Profile & Settings"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30 shrink-0 uppercase">
                {userProfile?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">
                  {userProfile?.name || 'Owner'}
                </div>
                <div className="text-[10px] text-gray-400 truncate">
                  {currentUser?.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0d1017] border-b border-gray-800 sticky top-0 z-30">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          {/* Mobile In-App Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              className="p-2 rounded-lg bg-gray-800/80 text-gray-300 hover:text-white relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {notificationsEnabled && activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-[#0d1017] animate-pulse">
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>

          {selectedVehicle && (
            <button
              onClick={() => handleNavClick('vehicles')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center gap-1.5"
            >
              <Car className="w-3.5 h-3.5" />
              <span className="font-semibold truncate max-w-[100px]">{selectedVehicle.name}</span>
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE FULL DRAWER NAVIGATION */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-[#090b10] z-40 p-4 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            {/* Quick Vehicle Switcher on Mobile */}
            <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Active Vehicle
              </div>
              <select
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  setSelectedVehicleId(e.target.value);
                }}
                className="w-full bg-[#121620] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.vehicleNumber})
                  </option>
                ))}
              </select>
            </div>

            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-gray-400 hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 ? (
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-gray-800 space-y-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setFaqModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-900 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-cyan-400" />
                    <span>FAQ &amp; Help Guide</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setFeedbackModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquareHeart className="w-5 h-5 text-pink-400" />
                    <span>Feedback Form</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                    Share
                  </span>
                </button>
              </div>
            </nav>
          </div>

          <div className="pt-6 border-t border-gray-800">
            <button
              onClick={() => logout()}
              className="w-full py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center gap-2 font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        {/* Top contextual bar for quick glance */}
        {selectedVehicle && (
          <div className="bg-[#10141B]/90 backdrop-blur-md border-b border-[#252C35] px-6 py-2.5 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-gray-300">
                <Car className="w-3.5 h-3.5 text-[#00D4C7]" />
                <span className="font-semibold text-white">{selectedVehicle.brand} {selectedVehicle.model}</span>
                {selectedVehicle.variant && <span className="text-gray-400">({selectedVehicle.variant})</span>}
              </span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1.5 font-mono text-[#00D4C7] bg-[#151A20] px-2.5 py-0.5 rounded border border-[#00D4C7]/30">
                {selectedVehicle.vehicleNumber}
              </span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatOdometer(selectedVehicle.currentOdometer)}</span>
              </span>
              <span className="text-gray-700">|</span>
              <span className="px-2 py-0.5 rounded bg-[#1D232B] text-gray-300 text-[11px] border border-gray-800">
                {selectedVehicle.fuelType}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Accessible Theme Toggle (Simple, Not 3D) */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                className="px-2.5 py-1 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </button>

              {/* Desktop Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors relative cursor-pointer flex items-center gap-1.5"
                  title="In-App Notifications"
                >
                  <Bell className="w-4 h-4 text-cyan-400" />
                  {notificationsEnabled && activeAlertCount > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                      {activeAlertCount}
                    </span>
                  )}
                </button>
              </div>

              <button
                onClick={() => setCurrentTab('vehicles')}
                className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer hidden sm:block"
              >
                Manage Vehicle →
              </button>
            </div>
          </div>
        )}

        {/* Floating In-App Notification Panel Dropdown */}
        {notificationDropdownOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setNotificationDropdownOpen(false)} 
            />
            <div className="fixed sm:absolute right-4 top-14 sm:top-12 w-80 sm:w-96 bg-[#121620] border border-cyan-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3.5 border-b border-gray-800 flex items-center justify-between bg-[#0f131c]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Alerts & Deadlines
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold font-mono">
                  {activeAlertCount} active
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-800/60 custom-scrollbar">
                {reminders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    🛡️ You're all caught up! No overdue or urgent reminders for this vehicle.
                  </div>
                ) : (
                  reminders.slice(0, 6).map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setNotificationDropdownOpen(false);
                        if (item.actionUrl === '/documents') setCurrentTab('documents');
                        else setCurrentTab('reminders');
                      }}
                      className="p-3 hover:bg-gray-800/60 transition-colors cursor-pointer flex items-start gap-2.5"
                    >
                      <span className="text-xs mt-0.5 shrink-0">
                        {item.type === 'danger' ? '🔴' : '🟡'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{item.title}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{item.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-gray-950/80 border-t border-gray-800 text-center">
                <button
                  onClick={() => {
                    setNotificationDropdownOpen(false);
                    setCurrentTab('reminders');
                  }}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 py-1 cursor-pointer"
                >
                  View All Reminders →
                </button>
              </div>
            </div>
          </>
        )}

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1">
          <div key={currentTab} className="animate-page-enter">
            {children}
          </div>
        </div>
      </main>

      {/* Global Persistent Floating Feedback Button (Bottom-Right) */}
      <FeedbackFloatingButton onClick={() => setFeedbackModalOpen(true)} />

      {/* Global Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />

      {/* Global FAQ & Help Modal */}
      <FAQModal
        isOpen={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        onOpenFeedback={() => setFeedbackModalOpen(true)}
      />
    </div>
  );
};
