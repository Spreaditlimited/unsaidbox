import Link from "next/link";

export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
    >
      <rect width="34" height="34" rx="10" fill="currentColor" />
      <path
        d="M9 13.5 17 18l8-4.5M9 13.5V23h16v-9.5M9 13.5l8-4.5 8 4.5"
        stroke="white"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M17 9v5"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="UnsaidBox home">
      <Mark />
      <span>
        Unsaid<span className="brand-light">Box</span>
      </span>
    </Link>
  );
}
export function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
