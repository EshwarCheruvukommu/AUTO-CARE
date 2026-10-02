import React, { useState, useEffect } from 'react';
import { getSectionVisual, AutomotiveVisual } from '../../services/automotiveVisuals';
import { Sparkles, Gauge, Car, Shield, Activity } from 'lucide-react';

interface SectionVisualHeaderProps {
  sectionId: string;
  customTitle?: string;
  customTagline?: string;
  activeVehicleInfo?: string;
  rightAction?: React.ReactNode;
}

export const SectionVisualHeader: React.FC<SectionVisualHeaderProps> = ({
  sectionId,
  customTitle,
  customTagline,
  activeVehicleInfo,
  rightAction,
}) => {
  const visual: AutomotiveVisual = getSectionVisual(sectionId);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);

    // Preload image
    const img = new Image();
    img.src = visual.imageUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
  }, [visual.imageUrl]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-[#252C35] bg-[#151A20] shadow-2xl transition-all duration-300 card-3d mb-6 group">
      {/* Dynamic Background Image with Depth & Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Loading skeleton / Metallic Gradient Fallback */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-[#0B0E14] via-[#151A20] to-[#10141B] transition-opacity duration-700 ${
            imageLoaded && !imageError ? 'opacity-40' : 'opacity-100'
          }`}
        />

        {/* Real Automotive High-Res Image */}
        {!imageError && (
          <img
            src={visual.imageUrl}
            alt={visual.altText}
            className={`w-full h-full object-cover object-center filter saturate-[1.1] contrast-[1.08] transition-all duration-1000 scale-100 group-hover:scale-105 ${
              imageLoaded ? 'opacity-35 blur-0' : 'opacity-0 blur-sm'
            }`}
          />
        )}

        {/* Automotive Vignette & Color Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E14] via-[#0B0E14]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14] via-transparent to-[#0B0E14]/40" />

        {/* Ambient Glow Orb */}
        <div 
          className="absolute -top-16 -right-16 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 group-hover:opacity-35"
          style={{ backgroundColor: visual.accentColor }}
        />

        {/* Automotive Perspective Grid overlay */}
        <div className="absolute inset-0 telemetry-grid opacity-25" />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          {/* Section Kicker & Active Vehicle Context */}
          <div className="flex items-center gap-3 flex-wrap">
            <span 
              className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border"
              style={{
                color: visual.accentColor,
                backgroundColor: `${visual.accentColor}15`,
                borderColor: `${visual.accentColor}40`,
              }}
            >
              {visual.badgeText}
            </span>

            {activeVehicleInfo && (
              <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-gray-400" />
                <span>{activeVehicleInfo}</span>
              </span>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {customTitle || visual.title}
          </h1>

          {/* Tagline */}
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
            {customTagline || visual.tagline}
          </p>
        </div>

        {/* Right Action slot or Telemetry Accent */}
        {rightAction ? (
          <div className="shrink-0 flex items-center gap-3 flex-wrap">
            {rightAction}
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-3 p-3.5 rounded-2xl bg-[#1D232B]/80 border border-[#252C35] backdrop-blur-md self-center">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${visual.accentColor}15`,
                borderColor: `${visual.accentColor}35`,
                color: visual.accentColor,
              }}
            >
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                {visual.metricLabel}
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Synchronized</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Line */}
      <div 
        className="h-[2px] w-full opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${visual.accentColor} 50%, transparent 100%)`,
        }}
      />
    </div>
  );
};
