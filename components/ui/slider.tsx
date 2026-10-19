"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-line">
      <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-teal to-electric" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block size-[18px] rounded-full border-[3px] border-white bg-teal shadow-[0_2px_8px_rgba(6,29,53,0.3)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal/25" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
