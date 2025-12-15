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
      
      {/* Two semi-square circular arrows */}
      <g transform="translate(50, 58)">
        {/* Arrow 1 - clockwise from top-right to bottom-left */}
        <path
          d="M5 -20 L22 -20 L22 -3 Q22 12 8 12 L-8 12"
          stroke="#22c55e"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Arrowhead 1 */}
        <polygon
          points="-8,4 -20,12 -8,20"
          fill="#22c55e"
        />
        
        {/* Arrow 2 - clockwise from bottom-left to top-right */}
        <path
          d="M-5 20 L-22 20 L-22 3 Q-22 -12 -8 -12 L8 -12"
          stroke="#22c55e"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Arrowhead 2 */}
        <polygon
          points="8,-4 20,-12 8,-20"
          fill="#22c55e"
        />
      </g>
    </svg>
  );
};

export default TradoShieldLogo;
