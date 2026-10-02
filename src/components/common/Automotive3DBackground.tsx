import React, { useEffect, useRef } from 'react';

export const Automotive3DBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Automotive telemetry particles & light streaks
    const particleCount = prefersReducedMotion ? 0 : 35;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: -(Math.random() * 0.4 + 0.15),
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.45 + 0.1,
      length: Math.random() * 25 + 10,
    }));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render subtle automotive telemetry particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y < -p.length) {
          p.y = height + p.length;
          p.x = Math.random() * width;
        }

        // Draw light streak
        const gradient = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.length);
        gradient.addColorStop(0, `rgba(0, 212, 199, ${p.opacity})`);
        gradient.addColorStop(1, 'rgba(0, 212, 199, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.length);
        ctx.stroke();
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Subtle Automotive Perspective Grid */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #00D4C7 1px, transparent 1px),
            linear-gradient(to bottom, #00D4C7 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          transform: 'perspective(1000px) rotateX(20deg)',
          transformOrigin: 'top center',
        }}
      />

      {/* Floating Canvas Particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />

      {/* Subtle Ambient Glow Cones */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#00D4C7]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-10 w-[450px] h-[450px] bg-blue-600/5 rounded-full blur-[140px]" />
    </div>
  );
};
