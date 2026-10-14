import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Car,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { LiveVoiceStatus } from '../../services/liveVoiceClient';

interface GeminiLiveVoicePanelProps {
  status: LiveVoiceStatus;
  isMuted: boolean;
  volume: number;
  volumeSpeaker: 'user' | 'model';
  vehicleName: string;
  vehicleNumber?: string;
  userTranscript: string;
  modelTranscript: string;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEndLiveSession: () => void;
  error?: string | null;
  errorCategory?: string | null;
  onRetry?: () => void;
}

export const GeminiLiveVoicePanel: React.FC<GeminiLiveVoicePanelProps> = ({
  status,
  isMuted,
  volume,
  volumeSpeaker,
  vehicleName,
  vehicleNumber,
  userTranscript,
  modelTranscript,
  onToggleMute,
  onInterrupt,
  onEndLiveSession,
  error,
  errorCategory,
  onRetry,
}) => {
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';
  const isConnecting = status === 'connecting';
  const isInterrupted = status === 'interrupted';

  // Dynamic visualizer bars
  const barCount = 18;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
    const activeMultiplier = isSpeaking || isListening ? Math.max(0.2, volume) : 0.15;
    const heightPercent = Math.min(100, Math.max(15, centerFactor * activeMultiplier * 100 + ((i % 3) * 10)));
    return heightPercent;
  });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B1628] via-[#07111F] to-[#040913] border-2 border-[#1677FF]/50 p-5 sm:p-7 shadow-2xl shadow-[#1677FF]/20 animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Background ambient glow */}
      <div
        className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-30 ${
          isSpeaking
            ? 'bg-[#00D9FF] scale-125 opacity-40'
            : isListening
            ? 'bg-[#1677FF] scale-110'
            : 'bg-[#2196FF]'
        }`}
      />

      {/* Top Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1D3552]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] flex items-center justify-center text-white shadow-lg shadow-[#1677FF]/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white tracking-tight">
                Gemini Live Voice
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Real-Time
              </span>
            </div>
            <p className="text-[11px] text-[#A9B8CC] flex items-center gap-1">
              <span>gemini-3.8-live</span>
              <span>•</span>
              <span>Hands-Free Barge-in</span>
            </p>
          </div>
        </div>

        {/* Vehicle indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1F35] border border-[#1D3552] text-xs">
          <Car className="w-3.5 h-3.5 text-[#00D9FF]" />
          <span className="font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]">
            {vehicleName}
          </span>
          {vehicleNumber && (
            <span className="text-[#00D9FF] font-mono text-[11px] hidden sm:inline">
              ({vehicleNumber})
            </span>
          )}
        </div>
      </div>

      {/* Center Interactive Visualizer & Pulse Orb */}
      <div className="relative z-10 py-6 flex flex-col items-center justify-center text-center">
        {/* Pulsing Voice Avatar Sphere */}
        <div className="relative mb-5">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
              isSpeaking
                ? 'bg-gradient-to-tr from-[#00D9FF] via-[#1677FF] to-[#67E8F9] shadow-[0_0_50px_rgba(0,217,255,0.7)] scale-110'
                : isListening && !isMuted
                ? 'bg-gradient-to-tr from-[#1677FF] to-[#2196FF] shadow-[0_0_40px_rgba(22,119,255,0.6)] scale-105'
                : isMuted
                ? 'bg-amber-600/30 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : 'bg-[#1D3552] shadow-inner'
            }`}
          >
            {/* Inner Avatar Ring */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#07111F] flex items-center justify-center relative overflow-hidden">
              <img
                src="/src/assets/images/autocare_ai_avatar_1791025216006.jpg"
                alt="Gemini Live Voice"
                className={`w-full h-full object-cover object-top transition-transform duration-300 ${
                  isSpeaking ? 'scale-110 brightness-110' : 'scale-100'
                }`}
              />
              {/* Overlay pulse on speech */}
              {isSpeaking && (
                <div className="absolute inset-0 bg-[#00D9FF]/20 animate-pulse pointer-events-none" />
              )}
            </div>
          </div>

          {/* Sound Wave Ripple Effect when model is speaking */}
          {isSpeaking && (
            <div className="absolute inset-0 rounded-full border-2 border-[#00D9FF]/60 animate-ping pointer-events-none" />
          )}
        </div>

        {/* Live Status Label */}
        <div className="space-y-1 mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0F1F35] border border-[#1D3552]">
            {isConnecting ? (
              <span className="text-[#00D9FF] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-ping" />
                Connecting Audio Stream...
              </span>
            ) : isInterrupted ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Interrupted — Listening to you...
              </span>
            ) : isMuted ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <MicOff className="w-3.5 h-3.5" />
                Microphone Muted
              </span>
            ) : isSpeaking ? (
              <span className="text-[#00D9FF] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#00D9FF]" />
                AutoCare AI Speaking
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Listening to you...
              </span>
            )}
          </div>
          <p className="text-xs text-[#A9B8CC] max-w-sm">
            {isSpeaking
              ? 'Interrupt anytime by speaking naturally or clicking Interrupt below.'
              : isMuted
              ? 'Unmute to ask questions about your vehicle.'
              : 'Speak naturally: "What is my odometer?", "When was my last service?", etc.'}
          </p>
        </div>

        {/* Dynamic Audio Visualizer Bars */}
        <div className="flex items-center justify-center gap-1 h-10 w-full max-w-xs px-4">
          {bars.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`w-1 rounded-full transition-all duration-100 ${
                isSpeaking
                  ? 'bg-gradient-to-t from-[#1677FF] to-[#00D9FF]'
                  : isListening && !isMuted
                  ? 'bg-gradient-to-t from-[#1677FF] to-emerald-400'
                  : 'bg-[#1D3552]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Real-Time Live Transcripts Box */}
      {(userTranscript || modelTranscript) && (
        <div className="relative z-10 my-3 p-3.5 rounded-2xl bg-[#07111F]/90 border border-[#1D3552] space-y-2 text-left">
          {userTranscript && (
            <div className="flex items-start gap-2 text-xs">
              <span className="font-bold text-[#A9B8CC] shrink-0">You:</span>
              <span className="text-white font-medium italic">"{userTranscript}"</span>
            </div>
          )}
          {modelTranscript && (
            <div className="flex items-start gap-2 text-xs border-t border-[#1D3552]/50 pt-2">
              <span className="font-bold text-[#00D9FF] shrink-0">AutoCare AI:</span>
              <span className="text-gray-200">{modelTranscript}</span>
            </div>
          )}
        </div>
      )}

      {/* Error alert if any */}
      {error && (
        <div className="relative z-10 mb-3 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-rose-300">
              {errorCategory === 'MIC_PERMISSION_DENIED'
                ? 'Microphone Access Blocked'
                : errorCategory === 'GEMINI_PERMISSION_DENIED'
                ? 'Gemini Live API 403 Forbidden'
                : errorCategory === 'AUTH_INVALID'
                ? 'Authentication Expired'
                : 'Live Voice Notice'}
            </div>
            <div className="text-[11px] leading-relaxed text-rose-200/90 break-words">
              {error}
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[10px] font-semibold shrink-0 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Bottom Live Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-[#1D3552]/80">
        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
            isMuted
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-[#0F1F35] text-white border border-[#1D3552] hover:bg-[#162740] hover:text-[#00D9FF]'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? (
            <>
              <MicOff className="w-4 h-4 text-amber-400" />
              <span>Unmute Mic</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-[#00D9FF]" />
              <span>Mute Mic</span>
            </>
          )}
        </button>

        {/* Interrupt / Cut-off Button (Barge-in) */}
        {isSpeaking && (
          <button
            type="button"
            onClick={onInterrupt}
            className="px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 bg-[#1677FF]/20 text-[#00D9FF] border border-[#1677FF]/50 hover:bg-[#1677FF]/35 transition-all cursor-pointer shadow-md animate-pulse"
            title="Interrupt AI and speak"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Interrupt</span>
          </button>
        )}

        {/* End Live Session Button */}
        <button
          type="button"
          onClick={onEndLiveSession}
          className="px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white transition-all cursor-pointer shadow-lg shadow-rose-900/30"
          title="End Live Voice Session"
        >
          <PhoneOff className="w-4 h-4" />
          <span>End Live Session</span>
        </button>
      </div>
    </div>
  );
};
