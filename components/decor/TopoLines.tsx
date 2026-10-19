import { contourRings, type ContourSpec } from "@/lib/topo";
import { cn } from "@/lib/utils";

type Props = {
  width: number;
  height: number;
  peaks: ContourSpec[];
  stroke?: string;
  strokeOpacity?: number;
  className?: string;
};

/** Inline topographic contour art, deterministic so it renders the same on server and client. */
export function TopoLines({ width, height, peaks, stroke = "#009C9F", strokeOpacity = 0.35, className }: Props) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none", className)}
      aria-hidden="true"
    >
      <g fill="none" stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={1}>
        {peaks.flatMap((peak, i) => contourRings(peak).map((d, k) => <path key={`${i}-${k}`} d={d} />))}
      </g>
    </svg>
  );
}
