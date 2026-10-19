"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Hand-drawn rays: slightly uneven lengths and angles so it reads as marker ink, not geometry.
const RAYS = [
  { a: -90, l: 11 },
  { a: -52, l: 9 },
  { a: -18, l: 12 },
  { a: 18, l: 8.5 },
  { a: 55, l: 11 },
  { a: 92, l: 9 },
  { a: 128, l: 12 },
  { a: 165, l: 9.5 },
  { a: 200, l: 11.5 },
  { a: 236, l: 8.5 },
];

export function Sunburst({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="-22 -22 44 44" className={cn("size-9", className)} aria-hidden="true">
      <motion.g
        initial={reduce ? false : { scale: 0.4, rotate: -40, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.15 }}
      >
        {RAYS.map(({ a, l }, i) => {
          const rad = (a * Math.PI) / 180;
          const r0 = 9.5;
          const x1 = Math.cos(rad) * r0;
          const y1 = Math.sin(rad) * r0;
          const x2 = Math.cos(rad + 0.06) * (r0 + l);
          const y2 = Math.sin(rad + 0.06) * (r0 + l);
          // Slight bow in each stroke.
          const cx = (x1 + x2) / 2 + Math.cos(rad + Math.PI / 2) * 1.1;
          const cy = (y1 + y2) / 2 + Math.sin(rad + Math.PI / 2) * 1.1;
          return (
            <path
              key={i}
              d={`M${x1.toFixed(2)} ${y1.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`}
              stroke={i % 3 === 1 ? "#FF5365" : "#F5A623"}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
        <path
          d="M0 -6.2C3.6 -6.4 6.4 -3.4 6.1 0.3 5.8 3.9 3 6.3 -0.4 6.1 -3.9 5.9 -6.3 3.1 -6 -0.4 -5.7 -3.6 -3.4 -6 0 -6.2Z"
          fill="#F5A623"
          stroke="#E8941A"
          strokeWidth="1"
        />
      </motion.g>
    </svg>
  );
}
