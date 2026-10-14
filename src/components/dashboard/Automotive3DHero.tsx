import React, { useRef, useState, useEffect } from 'react';
import { Gauge, Car, ChevronDown, History, Printer, Activity } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { Vehicle } from '../../types';
import { formatOdometer } from '../../utils/formatters';

interface Automotive3DHeroProps {
  selectedVehicle: Vehicle;
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onOpenAddVehicle: () => void;
  onOpenTimeline: () => void;
  onPrintReport: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Automotive3DHero: React.FC<Automotive3DHeroProps> = ({
  selectedVehicle,
  vehicles,
  onSelectVehicle,
  onOpenAddVehicle,
  onOpenTimeline,
  onPrintReport,
  onNavigateTab,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Respect user's accessibility reduced motion preferences
  const shouldReduceMotion = useReducedMotion();

  // Normalized cursor coordinates [-0.5, 0.5]
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  // Framer Motion useSpring for smooth, sophisticated physics-based tilt and latency
  const springConfig = { damping: 26, stiffness: 180, mass: 0.6 };
  const smoothMouseX = useSpring(rawMouseX, springConfig);
  const smoothMouseY = useSpring(rawMouseY, springConfig);

  // 3D Parallax tilt rotations (subtle, non-distracting automotive showroom tilt)
  const tiltRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [4.5, -4.5]);
  const tiltRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-6, 6]);

  // Layered parallax translations for realistic optical depth
  const carTranslateX = useTransform(smoothMouseX, [-0.5, 0.5], [-9, 9]);
  const carTranslateY = useTransform(smoothMouseY, [-0.5, 0.5], [-5, 5]);

  // Dynamic rim-light and highlight reflection movement
  const highlightPercentX = useTransform(smoothMouseX, [-0.5, 0.5], [20, 80]);
  const highlightPercentY = useTransform(smoothMouseY, [-0.5, 0.5], [20, 80]);

  // Mouse move handler on the hero vehicle container
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (e.clientY - rect.top) / rect.height - 0.5;
    rawMouseX.set(normalizedX);
    rawMouseY.set(normalizedY);
  };

  const handleHeroMouseLeave = () => {
    rawMouseX.set(0);
    rawMouseY.set(0);
  };

  // Preload hero everyday car image
  useEffect(() => {
    const img = new Image();
    img.src = '/src/assets/images/hero_everyday_car_1791023391107.jpg';
    img.onload = () => setImageLoaded(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative rounded-3xl overflow-hidden border border-[#1D3552] bg-gradient-to-r from-[#07111F] via-[#0B1628] to-[#0F1F35] shadow-2xl p-6 sm:p-8 card-3d light-sweep-effect select-none"
    >
      {/* Dynamic Electric Blue Rim Light & Cyan Ambient Glow */}
      <div 
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-25"
        style={{
          background: 'radial-gradient(circle at 60% 40%, #1677FF 0%, transparent 70%)'
        }}
      />
      <div className="absolute -bottom-10 left-1/4 w-80 h-80 bg-[#00D9FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Automotive HUD Grid Background */}
      <div className="absolute inset-0 telemetry-grid opacity-35 pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Left Column: Active Vehicle Specs & Command */}
        <div className="space-y-4 max-w-xl">
          {/* VEHICLE DATA SYNCED Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1677FF]/15 border border-[#1677FF]/40 text-[#00D9FF] text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
            <span className="tracking-wider uppercase font-mono text-[11px]">Vehicle Data Synced</span>
          </div>

          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#F5F9FF] tracking-tight leading-tight flex items-center gap-3">
              <span>{selectedVehicle.name}</span>
            </h1>

            <div className="flex items-center gap-2.5 mt-3 flex-wrap text-sm">
              <span className="text-white font-extrabold font-mono bg-[#1677FF] px-3 py-1 rounded-xl shadow-md tracking-wider">
                {selectedVehicle.vehicleNumber}
              </span>
              <span className="text-[#A9B8CC] font-medium text-xs sm:text-sm">
                {selectedVehicle.brand} • {selectedVehicle.model}{selectedVehicle.variant ? ` • ${selectedVehicle.variant}` : ''}
              </span>
              <span className="text-[#1D3552]">•</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#122A46] text-[#A9B8CC] text-xs font-semibold border border-[#1D3552]">
                {selectedVehicle.fuelType}
              </span>
              <span className="text-[#1D3552]">•</span>
              <span className="text-[#22C55E] font-mono font-bold flex items-center gap-1.5 bg-[#22C55E]/10 px-2.5 py-0.5 rounded-lg border border-[#22C55E]/30 text-xs">
                <Gauge className="w-3.5 h-3.5" />
                <span>{formatOdometer(selectedVehicle.currentOdometer)}</span>
              </span>
            </div>
          </div>

          {/* Quick Vehicle Switcher Dropdown & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {/* Quick Switch Dropdown */}
            {vehicles.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setVehicleDropdownOpen(!vehicleDropdownOpen)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0F1F35] border border-[#1D3552] hover:border-[#1677FF]/60 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-md hover:bg-[#122A46] btn-3d"
                >
                  <Car className="w-3.5 h-3.5 text-[#00D9FF]" />
                  <span>Switch Vehicle</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${vehicleDropdownOpen ? 'rotate-180 text-[#00D9FF]' : ''}`} />
                </button>

                {vehicleDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setVehicleDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-64 bg-[#0F1F35] border border-[#1677FF]/40 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1 text-[10px] font-bold text-[#A9B8CC] uppercase tracking-wider">
                        My Garage Fleet ({vehicles.length})
                      </div>
                      {vehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            onSelectVehicle(v.id);
                            setVehicleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#122A46] transition-colors cursor-pointer ${
                            selectedVehicle.id === v.id ? 'bg-[#1677FF]/20 text-[#00D9FF] font-bold' : 'text-gray-300'
                          }`}
                        >
                          <span className="truncate pr-2">{v.name}</span>
                          {selectedVehicle.id === v.id && (
                            <span className="w-2 h-2 rounded-full bg-[#00D9FF] shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={onOpenTimeline}
              className="px-3.5 py-2.5 rounded-xl bg-[#0F1F35] hover:bg-[#122A46] border border-[#1D3552] hover:border-[#1677FF]/50 text-[#00D9FF] hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md btn-3d"
              title="View Complete Vehicle Lifetime Timeline"
            >
              <History className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="hidden sm:inline">Timeline</span>
            </button>

            <button
              onClick={onPrintReport}
              className="px-3.5 py-2.5 rounded-xl bg-[#0F1F35] hover:bg-[#122A46] border border-[#1D3552] hover:border-[#1677FF]/50 text-gray-200 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md btn-3d"
              title="Print Official Maintenance Certificate"
            >
              <Printer className="w-3.5 h-3.5 text-[#2196FF]" />
              <span className="hidden sm:inline">Report / PDF</span>
            </button>

            <button
              onClick={() => onNavigateTab('vehicles')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#2196FF] hover:from-[#1360D4] hover:to-[#1677FF] text-white font-extrabold text-xs shadow-lg shadow-[#1677FF]/25 transition-all cursor-pointer btn-3d"
            >
              Manage Vehicle
            </button>
          </div>
        </div>

        {/* Right Column: Photorealistic Everyday Car Showcase with Framer Motion useSpring 3D Tilt */}
        <div 
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
          className="relative w-full lg:w-[500px] h-[260px] sm:h-[290px] flex items-center justify-center group/hero [perspective:1000px]"
        >
          {/* Depth Backing Plate */}
          <div className="absolute inset-0 rounded-3xl bg-[#0B1628] border border-[#1D3552]/80 shadow-2xl overflow-hidden" />

          {/* Interactive Parallax Canvas Container Powered by Framer Motion useSpring */}
          <motion.div 
            style={
              shouldReduceMotion
                ? undefined
                : {
                    rotateX: tiltRotateX,
                    rotateY: tiltRotateY,
                    transformStyle: 'preserve-3d',
                  }
            }
            className="relative w-full h-full rounded-3xl overflow-hidden cursor-crosshair transition-shadow duration-300"
          >
            {/* Loading Skeleton */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r from-[#07111F] via-[#0F1F35] to-[#0B1628] transition-opacity duration-700 ${
                imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* Photorealistic Everyday Production Car Image with Spring-Damped Parallax Translation */}
            <motion.img
              src="/src/assets/images/hero_everyday_car_1791023391107.jpg"
              alt="Photorealistic modern everyday production car in cinematic dark navy setting with blue rim lighting"
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover object-center filter saturate-[1.12] contrast-[1.08] transition-opacity duration-700 ${
                imageLoaded ? 'opacity-90' : 'opacity-0'
              }`}
              style={
                shouldReduceMotion
                  ? { transform: 'scale(1.04)' }
                  : {
                      x: carTranslateX,
                      y: carTranslateY,
                      scale: 1.08,
                    }
              }
            />

            {/* Dynamic Blue & Cyan Rim Lighting Overlay with Cursor Tracking */}
            <motion.div 
              className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-60 group-hover/hero:opacity-90"
              style={{
                background: shouldReduceMotion
                  ? 'radial-gradient(circle at 50% 50%, rgba(22, 119, 255, 0.28) 0%, rgba(0, 217, 255, 0.12) 40%, transparent 70%)'
                  : useTransform(
                      [highlightPercentX, highlightPercentY],
                      ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(22, 119, 255, 0.32) 0%, rgba(0, 217, 255, 0.14) 40%, transparent 70%)`
                    )
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07111F]/80 via-transparent to-[#07111F]/40" />

            {/* Subtle Horizon Ground Reflection Grid */}
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#07111F] to-transparent pointer-events-none" />

            {/* Spec Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#07111F]/85 border border-[#1D3552] text-[10px] text-[#A9B8CC] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-ping" />
              <span className="font-mono uppercase font-bold text-white">Everyday Production Spec</span>
            </div>

            {/* 3D Depth Interactive Hint */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#07111F]/85 border border-[#1D3552] text-[10px] text-[#A9B8CC] pointer-events-none backdrop-blur-md">
              <Activity className="w-3 h-3 text-[#00D9FF]" />
              <span>3D Motion • Interactive</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
