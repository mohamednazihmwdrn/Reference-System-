import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'light' | 'dark' | 'gradient';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 'w-4 h-4', text: 'text-xs' },
    md: { box: 'w-9 h-9', icon: 'w-5 h-5', text: 'text-sm' },
    lg: { box: 'w-12 h-12', icon: 'w-7 h-7', text: 'text-base' },
    xl: { box: 'w-16 h-16', icon: 'w-9 h-9', text: 'text-xl' },
  };

  const dim = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* FinTech Transfer & Verification Emblem */}
      <div
        className={`${dim.box} relative rounded-2xl flex items-center justify-center p-1.5 shadow-md shadow-blue-950/30 ring-1 ring-amber-400/30 select-none overflow-hidden shrink-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-radial from-amber-400/20 via-emerald-500/10 to-transparent pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Protective Royal Shield Outline */}
          <polygon
            points="50,6 88,24 88,72 50,94 12,72 12,24"
            className="stroke-amber-400"
            strokeWidth="3.5"
            strokeLinejoin="round"
            fill="url(#shieldGrad)"
          />

          {/* Inner Golden Border */}
          <polygon
            points="50,13 81,29 81,67 50,86 19,67 19,29"
            className="stroke-emerald-400/60"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          {/* Bank Columns & Arch Motifs */}
          <path
            d="M32,32 L68,32 M36,32 L36,44 M50,32 L50,44 M64,32 L64,44 M30,44 L70,44"
            stroke="#93c5fd"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* InstaPay Instant Transfer Lightning Arrow */}
          <path
            d="M54,34 L36,54 L48,54 L44,76 L66,50 L52,50 Z"
            fill="url(#transferBolt)"
            className="drop-shadow-md"
          />

          {/* Financial Auditor Official Stamp / Verified Badge */}
          <circle cx="72" cy="72" r="14" fill="#059669" stroke="#ffffff" strokeWidth="2.2" />
          <path
            d="M66,72 L70.5,76.5 L78,67"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="shieldGrad" x1="12" y1="24" x2="88" y2="94" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0f172a" />
              <stop offset="0.6" stopColor="#1e1b4b" />
              <stop offset="1" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="transferBolt" x1="36" y1="34" x2="66" y2="76" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef08a" />
              <stop offset="0.4" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col text-right leading-tight">
          <span className={`font-black tracking-tight text-white ${dim.text}`}>
            الروضة الشريفة
          </span>
          <span className="text-[10px] text-amber-300 font-bold tracking-wide">
            تدقيق واعتماد تحويلات إنستا باي
          </span>
        </div>
      )}
    </div>
  );
};
