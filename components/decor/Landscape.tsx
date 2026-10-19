import { cn } from "@/lib/utils";

/** Layered hills with a low sunset sun; sits behind the quiz and empty states. */
export function Landscape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 620 120" preserveAspectRatio="xMidYMax slice" className={cn("pointer-events-none", className)} aria-hidden="true">
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3D9" stopOpacity="0" />
          <stop offset="1" stopColor="#FFE7EB" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="ls-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFC15A" />
          <stop offset="0.6" stopColor="#F5A623" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FF5365" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="620" height="120" fill="url(#ls-sky)" />
      <circle cx="470" cy="70" r="46" fill="url(#ls-sun)" opacity="0.75" />
      <path d="M0 78C70 52 120 50 180 66s110 22 170 2 120-40 190-18 70 22 80 24V120H0z" fill="#E3F5EE" />
      <path d="M0 92c60-18 120-20 190-6s120 14 180-4 140-20 250 6V120H0z" fill="#B9E6DD" opacity="0.8" />
      <path d="M0 104c80-12 150-12 230-2s150 6 230-6 110-4 160 2V120H0z" fill="#009C9F" opacity="0.28" />
      <g fill="#00594D" opacity="0.35">
        <path d="M86 92l6-16 6 16zM96 94l5-12 5 12zM540 96l6-15 6 15zM552 98l4-10 4 10z" />
      </g>
    </svg>
  );
}
