import { cn } from "@/lib/utils";

/** Layered hills under a rising sun — the CommunityPulse mark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 48" className={cn("h-12 w-14", className)} aria-hidden="true">
      <defs>
        <linearGradient id="logo-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC15A" />
          <stop offset="1" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="13" r="7.5" fill="url(#logo-sun)" />
      <g stroke="#F5A623" strokeWidth="2" strokeLinecap="round" opacity="0.9">
        <path d="M38 1.5v2.2M49.5 13h-2.2M46.2 4.8l-1.6 1.6M29.8 4.8l1.6 1.6" />
      </g>
      <path d="M2 34c7-10 14-14 21-10.5S36 29 54 18v14H2z" fill="#3FD8DA" opacity="0.95" />
      <path d="M2 39c9-8 16-10 24-6s15 4.5 28-4v13H2z" fill="#009C9F" />
      <path d="M2 44c8-4.5 15-5.5 23-3s16 2.2 29-2.5V48H2z" fill="#00594D" />
      <path d="M8 36.5c4-1.8 7.5-2 11-.8" stroke="#FAFBFD" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.55" />
    </svg>
  );
}
