interface TradoShieldLogoProps {
  className?: string;
}

const TradoShieldLogo = ({ className = "h-32 w-32" }: TradoShieldLogoProps) => {
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
        strokeWidth="2.5"
      />
      
      {/* Two exchange arrows - matching reference design */}
      <g transform="translate(50, 58)">
        {/* Top-right arrow going left */}
        <path
          d="M-2 -18 L20 -18 L20 0 Q20 10 10 10 L-5 10"
          stroke="#22c55e"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Left arrowhead */}
        <path
          d="M-5 2 L-18 10 L-5 18 Z"
          fill="#22c55e"
        />
        
        {/* Bottom-left arrow going right */}
        <path
          d="M2 18 L-20 18 L-20 0 Q-20 -10 -10 -10 L5 -10"
          stroke="#22c55e"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Right arrowhead */}
        <path
          d="M5 -2 L18 -10 L5 -18 Z"
          fill="#22c55e"
        />
      </g>
    </svg>
  );
};

export default TradoShieldLogo;
