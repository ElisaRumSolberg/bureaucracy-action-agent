interface Props {
  className?: string;
}

/** Check + workflow mark: a completed step (ring + checkmark) branching into
 * the next one — the same "task done -> next action" loop the product is
 * built around. */
export default function Logo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Bureaucracy Action Agent logo"
    >
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#5B5BD6" />
      <circle cx="17" cy="24" r="9" stroke="white" strokeWidth="2.5" fill="none" />
      <path
        d="M13 24.5 L16 27.5 L21.5 20.5"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 24 H32" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 24 L36 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M32 24 L36 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="37.5" cy="17" r="2.5" fill="white" />
      <circle cx="37.5" cy="31" r="2.5" fill="white" />
    </svg>
  );
}
