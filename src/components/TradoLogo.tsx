interface Props {
  size?: number;
  id?: string;
  className?: string;
}

export const TradoLogo = ({ size = 40, id = "a", className }: Props) => {
  const bgId   = `tl-bg-${id}`;
  const glowId = `tl-gw-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background: indigo → violet */}
        <linearGradient id={bgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#3340d8" />
          <stop offset="100%" stopColor="#7147d4" />
        </linearGradient>
        {/* Subtle inner glow */}
        <radialGradient id={glowId} cx="50%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.12" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="40" height="40" rx="10" fill={`url(#${bgId})`} />
      <rect width="40" height="40" rx="10" fill={`url(#${glowId})`} />

      {/* T — emerald stem (behind white bar) */}
      <rect x="17" y="14" width="6" height="18" rx="3" fill="#0fba7c" />

      {/* T — white horizontal bar (on top) */}
      <rect x="7.5" y="10" width="25" height="7" rx="3.5" fill="white" />

      {/* Emerald dot at T intersection — subtle */}
      <circle cx="20" cy="13.5" r="2.5" fill="#0fba7c" opacity="0.55" />
    </svg>
  );
};
