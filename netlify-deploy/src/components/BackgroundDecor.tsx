import { useMemo } from 'react';

export default function BackgroundDecor() {
  const shapes = useMemo(
    () => [
      { top: '12%', left: '8%', size: 180, duration: '24s', delay: '0s', depth: 40 },
      { top: '60%', left: '75%', size: 220, duration: '30s', delay: '4s', depth: 60 },
      { top: '35%', left: '50%', size: 140, duration: '20s', delay: '8s', depth: 30 },
      { top: '80%', left: '15%', size: 160, duration: '28s', delay: '2s', depth: 50 },
      { top: '20%', left: '85%', size: 120, duration: '26s', delay: '6s', depth: 35 },
    ],
    [],
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-dark-50" aria-hidden="true">
      {/* Base layered wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #faf8f5 0%, #f7f5f1 25%, #f8f6f2 60%, #faf8f5 100%)',
        }}
      />

      {/* 3D perspective container */}
      <div className="perspective-container absolute inset-0">
        {/* Floating 3D geometric shapes */}
        {shapes.map((s, i) => (
          <div
            key={i}
            className="floating-shape absolute"
            style={{
              top: s.top,
              left: s.left,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animation: `shapeFloat3D ${s.duration} ease-in-out ${s.delay} infinite`,
              ['--depth' as string]: `${s.depth}px`,
            }}
          >
            <div
              className="shape-inner h-full w-full rounded-[40%] border border-amber-200/30"
              style={{
                background:
                  i % 2 === 0
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(251,146,60,0.03) 100%)'
                    : 'linear-gradient(135deg, rgba(217,119,6,0.05) 0%, rgba(245,158,11,0.02) 100%)',
                backdropFilter: 'blur(20px)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Layered gradient orbs — parallax depth */}
      <div
        className="absolute rounded-full blur-[100px]"
        style={{
          top: '-10%',
          left: '60%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 65%)',
          animation: 'orbDrift3D 30s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-[120px]"
        style={{
          top: '45%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 65%)',
          animation: 'orbDrift3D 35s ease-in-out 5s infinite',
        }}
      />
      <div
        className="absolute rounded-full blur-[110px]"
        style={{
          top: '70%',
          left: '70%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 65%)',
          animation: 'orbDrift3D 28s ease-in-out 10s infinite',
        }}
      />

      {/* 3D mesh grid — subtle perspective floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[40vh] opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(30,36,53,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,36,53,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          transform: 'perspective(400px) rotateX(60deg)',
          transformOrigin: 'bottom center',
          maskImage: 'linear-gradient(to top, black 0%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 80%)',
        }}
      />

      {/* Top warm glow */}
      <div
        className="absolute -top-40 left-1/2 h-72 w-[90%] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(251,191,36,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Bottom warm glow */}
      <div
        className="absolute -bottom-40 left-1/2 h-72 w-[90%] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(15,19,32,0.04) 100%)',
        }}
      />

      {/* Noise texture for premium feel */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <style>{`
        .perspective-container {
          perspective: 1200px;
          transform-style: preserve-3d;
        }
        .floating-shape {
          transform-style: preserve-3d;
        }
        .shape-inner {
          transform-style: preserve-3d;
          box-shadow:
            0 20px 60px -20px rgba(245,158,11,0.12),
            inset 0 1px 2px rgba(255,255,255,0.5);
        }
        @keyframes shapeFloat3D {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          25% {
            transform: translate3d(20px, -30px, var(--depth)) rotateX(8deg) rotateY(12deg) rotateZ(3deg);
          }
          50% {
            transform: translate3d(-15px, 15px, calc(var(--depth) * 0.5)) rotateX(-6deg) rotateY(-8deg) rotateZ(-2deg);
          }
          75% {
            transform: translate3d(25px, 20px, var(--depth)) rotateX(5deg) rotateY(6deg) rotateZ(1deg);
          }
        }
        @keyframes orbDrift3D {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          33% {
            transform: translate3d(40px, -50px, 20px) scale(1.08);
          }
          66% {
            transform: translate3d(-30px, 30px, 10px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}
