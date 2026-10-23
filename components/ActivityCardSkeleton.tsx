import { cn } from "@/lib/utils";

/** A shimmering block; the gradient slides unless the viewer prefers reduced motion. */
function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded-full bg-[linear-gradient(90deg,#EEF2F6_0%,#F7F9FB_40%,#EEF2F6_80%)] bg-[length:200%_100%] motion-safe:animate-shimmer",
        className,
      )}
    />
  );
}

/** Mirrors ActivityCard's layout, including its container-query breakpoints, so nothing jumps on load. */
export function ActivityCardSkeleton({ index = 0 }: { index?: number }) {
  // Vary line lengths so a stack of skeletons doesn't look stamped out.
  const titleWidth = ["w-3/4", "w-2/3", "w-4/5", "w-3/5"][index % 4];
  return (
    <div className="rounded-14 border border-line bg-white p-2.5 shadow-card @container">
      <div className="flex flex-col gap-3 @[620px]:min-h-[135px] @[620px]:flex-row @[620px]:gap-4">
        <div className="flex gap-3 @[620px]:contents">
          <Bone className="size-[92px] shrink-0 rounded-12 @[620px]:h-[135px] @[620px]:w-[138px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
            <Bone className="h-[18px] w-28" />
            <Bone className={cn("h-4", titleWidth)} />
            <Bone className="h-3 w-1/2" />
            <Bone className="hidden h-3 w-full @[420px]:block" />
            <div className="mt-auto flex gap-1.5 pt-1">
              <Bone className="h-[18px] w-16" />
              <Bone className="h-[18px] w-20" />
              <Bone className="h-[18px] w-14" />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 @[620px]:w-[220px] @[620px]:border-l @[620px]:border-line @[620px]:pl-4">
          <div className="grid grid-cols-3 gap-1">
            <Bone className="h-[52px] rounded-12" />
            <Bone className="h-[52px] rounded-12" />
            <Bone className="h-[52px] rounded-12" />
          </div>
          <div className="mt-auto flex gap-1.5">
            <Bone className="h-8 flex-1 rounded-12" />
            <Bone className="size-8 rounded-12" />
          </div>
          <Bone className="h-8 rounded-12" />
        </div>
      </div>
    </div>
  );
}
