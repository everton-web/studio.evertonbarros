interface Props {
  className?: string;
}

export function TriangleIcon({ className = "w-5 h-5" }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M50 10 Q58.6 45 84.6 70 Q50 60 15.4 70 Q41.4 45 50 10Z"
        fill="currentColor"
      />
    </svg>
  );
}
