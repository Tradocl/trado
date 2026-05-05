interface LogoProps {
  variant?: 'gradient' | 'solid' | 'white' | 'black';
  height?: number;
  className?: string;
}

export function Logo({ variant = 'gradient', height = 32, className }: LogoProps) {
  const gradientId = `trado-gradient-${variant}`;

  const fillMap = {
    gradient: `url(#${gradientId})`,
    solid: '#1F25C1',
    white: '#FFFFFF',
    black: '#131924',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 56"
      height={height}
      role="img"
      aria-label="Trado"
      className={className}
    >
      <title>Trado</title>
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1F25C1" />
            <stop offset="100%" stopColor="#7B46D8" />
          </linearGradient>
        </defs>
      )}
      <text
        x="0"
        y="44"
        fontFamily="-apple-system, 'SF Pro Display', Inter, system-ui, sans-serif"
        fontSize="56"
        fontWeight="600"
        letterSpacing="-2.5"
        fill={fillMap[variant]}
      >
        trado
      </text>
    </svg>
  );
}

export function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Trado"
      className={className}
    >
      <title>Trado</title>
      <defs>
        <linearGradient id="trado-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1F25C1" />
          <stop offset="100%" stopColor="#7B46D8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#trado-icon-grad)" />
      <text
        x="32"
        y="46"
        textAnchor="middle"
        fontFamily="-apple-system, 'SF Pro Display', Inter, system-ui, sans-serif"
        fontSize="42"
        fontWeight="600"
        letterSpacing="-1.5"
        fill="#FFFFFF"
      >
        t
      </text>
    </svg>
  );
}
