import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "px-2 py-0.5 text-micro",
        chip: "border border-line bg-canvas px-2 py-0.5 text-micro text-ink-muted",
        count: "min-w-5 justify-center bg-coral px-1.5 text-[10px] font-bold leading-5 text-white",
      },
    },
    defaultVariants: { variant: "solid" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
