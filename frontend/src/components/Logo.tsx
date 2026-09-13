interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'dark' | 'light'
  className?: string
}

export default function Logo({
  size = 'md',
  showText = true,
  variant = 'dark',
  className = '',
}: LogoProps) {
  const pixelSizes = {
    sm: 30,
    md: 38,
    lg: 48,
    xl: 60,
  }

  const px = pixelSizes[size] || pixelSizes.md

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon SVG Emblem */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B4324" />
            <stop offset="100%" stopColor="#2F5D3A" />
          </linearGradient>
          <linearGradient id="logoLeafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#6EE7B7" />
          </linearGradient>
          <linearGradient id="logoGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
          <linearGradient id="logoFlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>

        {/* Squircle Badge Container */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          fill="url(#logoBgGrad)"
          stroke="#4ADE80"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />

        {/* Ambient Inner Ring */}
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="14"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.75"
          strokeOpacity="0.18"
        />

        {/* Sun Glow Behind Crops */}
        <circle cx="39" cy="23" r="9" fill="url(#logoGoldGrad)" opacity="0.3" />

        {/* Flowing Irrigation / River Wave */}
        <path
          d="M12 46 C20 42, 28 50, 38 45 C46 41, 51 43, 54 44"
          fill="none"
          stroke="url(#logoFlowGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M15 50 C23 47, 29 53, 39 49 C46 46, 49 48, 52 49"
          fill="none"
          stroke="#6EE7B7"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Sprouting Leaf */}
        <path
          d="M19 43 C18 32, 24 20, 34 14 C34 24, 29 36, 21 43 Z"
          fill="url(#logoLeafGrad)"
        />
        <path
          d="M22 39 C26 31, 29 25, 33 16"
          fill="none"
          stroke="#065F46"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Golden Wheat Spikelets */}
        <g transform="translate(32, 12)">
          <path
            d="M3 30 C3 22, 5 12, 7 0"
            fill="none"
            stroke="url(#logoGoldGrad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse cx="7" cy="2" rx="2.4" ry="4.2" transform="rotate(15 7 2)" fill="url(#logoGoldGrad)" />
          <ellipse cx="3.5" cy="8" rx="2.3" ry="4" transform="rotate(-30 3.5 8)" fill="url(#logoGoldGrad)" />
          <ellipse cx="10" cy="9" rx="2.3" ry="4" transform="rotate(35 10 9)" fill="url(#logoGoldGrad)" />
          <ellipse cx="2" cy="15" rx="2.3" ry="4" transform="rotate(-35 2 15)" fill="url(#logoGoldGrad)" />
          <ellipse cx="9.5" cy="16" rx="2.3" ry="4" transform="rotate(35 9.5 16)" fill="url(#logoGoldGrad)" />
          <ellipse cx="1.5" cy="22" rx="2.2" ry="3.8" transform="rotate(-40 1.5 22)" fill="url(#logoGoldGrad)" />
          <ellipse cx="8.5" cy="23" rx="2.2" ry="3.8" transform="rotate(40 8.5 23)" fill="url(#logoGoldGrad)" />
        </g>
      </svg>

      {/* Branded Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-black tracking-tight ${
              size === 'sm'
                ? 'text-base'
                : size === 'md'
                ? 'text-xl'
                : size === 'lg'
                ? 'text-2xl'
                : 'text-3xl'
            }`}
          >
            <span className={variant === 'light' ? 'text-white' : 'text-soil'}>
              Agri
            </span>
            <span className={variant === 'light' ? 'text-amber-300' : 'text-leaf'}>
              Flow
            </span>
          </span>
          {(size === 'md' || size === 'lg' || size === 'xl') && (
            <span
              className={`text-[8.5px] font-bold uppercase tracking-[0.16em] mt-0.5 ${
                variant === 'light' ? 'text-white/70' : 'text-soil/50'
              }`}
            >
              Harvest Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  )
}
