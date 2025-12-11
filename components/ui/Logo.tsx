/**
 * BetHub Logo Component
 * Code brackets with arrow icon - cyan color
 */

export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left bracket < */}
      <path
        d="M8 8L2 16L8 24"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Right bracket > */}
      <path
        d="M32 8L38 16L32 24"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Center arrow up */}
      <path
        d="M20 24V8"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 14L20 8L26 14"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * BetHub Logo Icon Only (for favicon style)
 */
export function LogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left bracket < */}
      <path
        d="M8 8L2 16L8 24"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Right bracket > */}
      <path
        d="M32 8L38 16L32 24"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Center arrow up */}
      <path
        d="M20 24V8"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 14L20 8L26 14"
        stroke="#00D9FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
