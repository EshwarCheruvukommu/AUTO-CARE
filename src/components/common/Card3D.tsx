import React, { useRef, useState } from 'react';

interface Card3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowOnHover?: boolean;
  accentColor?: string;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  glowOnHover = true,
  accentColor = '#00D4C7',
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Small, comfortable tilt range (max ~3 degrees)
    const rotX = ((y - centerY) / centerY) * -3;
    const rotY = ((x - centerX) / centerX) * 3;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) translateZ(8px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px) translateZ(0px)',
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease',
      }}
      className={`relative rounded-2xl bg-[#151A20] border border-[#252C35] transition-all duration-300 ${
        isHovered && glowOnHover ? 'border-[#00D4C7]/40 shadow-2xl' : 'shadow-lg'
      } ${className}`}
      {...props}
    >
      {/* Subtle Inner Highlight */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/[0.04]" />
      
      {/* Card Content with translateZ for depth layering */}
      <div style={{ transform: isHovered ? 'translateZ(10px)' : 'none', transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  );
};
