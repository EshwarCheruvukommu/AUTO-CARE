import React from 'react';
import { Shield, Car, Wrench } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const iconSize = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${iconSize} flex items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20`}>
        <div className="w-full h-full bg-[#0d1117] rounded-[10px] flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Shield className="w-4/5 h-4/5 text-cyan-400 absolute opacity-30" />
          <Car className="w-1/2 h-1/2 text-white relative z-10 drop-shadow-sm" />
          <Wrench className="w-2.5 h-2.5 text-cyan-300 absolute bottom-1 right-1 z-10" />
        </div>
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`font-black tracking-wider text-white ${textSize} font-mono`}>
              AUTO<span className="text-cyan-400">CARE</span>
            </span>
          </div>
          <span className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase -mt-1 hidden sm:block">
            Vehicle Manager
          </span>
        </div>
      )}
    </div>
  );
};
