interface TradoShieldLogoProps {
  className?: string;
}

const TradoShieldLogo = ({ className = "h-24 w-24" }: TradoShieldLogoProps) => {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield shape */}
      <path
        d="M50 5 L90 20 L90 55 C90 80 70 100 50 115 C30 100 10 80 10 55 L10 20 Z"
        fill="#1a365d"
        stroke="#2dd4bf"
        strokeWidth="2"
      />
      
      {/* Circular arrows - three arrows forming exchange/recycle symbol */}
      <g transform="translate(50, 60)">
        {/* Arrow 1 - pointing right (top) */}
        <path
          d="M-2 -22 Q18 -22 18 0"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <polygon
          points="22,-4 14,4 22,8"
          fill="#22c55e"
          transform="translate(0, 2)"
        />
        
        {/* Arrow 2 - pointing bottom-left */}
        <path
          d="M14 4 Q14 22 -8 16"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <polygon
          points="-12,20 -8,8 -18,10"
          fill="#22c55e"
        />
        
        {/* Arrow 3 - pointing top-left */}
        <path
          d="M-12 12 Q-22 0 -8 -16"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <polygon
          points="-6,-22 2,-14 -10,-12"
          fill="#22c55e"
        />
      </g>
    </svg>
  );
};

export default TradoShieldLogo;
