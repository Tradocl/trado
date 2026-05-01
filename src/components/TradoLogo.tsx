interface Props {
  size?: number;
  id?: string;
  className?: string;
}

export const TradoLogo = ({ size = 40, id = "a", className }: Props) => {
  const bgId = `tl-bg-${id}`;
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
        <linearGradient id={bgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#3340d8" />
          <stop offset="100%" stopColor="#7147d4" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="40" height="40" rx="10" fill={`url(#${bgId})`} />

      {/* Shield */}
      <path
        d="M20 7 L32 12 V22 C32 29.5 20 35 20 35 C20 35 8 29.5 8 22 V12 Z"
        fill="white"
        fillOpacity="0.15"
        stroke="white"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />

      {/* Checkmark — emerald */}
      <path
        d="M13.5 21 L18.5 26.5 L27.5 15"
        stroke="#0fba7c"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
