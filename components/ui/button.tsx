import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        teal: "bg-teal text-white shadow-[0_6px_16px_-8px_rgba(0,156,159,0.9)] hover:bg-[#008a8d]",
        navy: "bg-navy text-white hover:bg-navy-800",
        outline: "border border-line bg-white text-ink hover:border-[#cfd8e3] hover:bg-canvas",
        ghost: "text-ink-muted hover:bg-canvas hover:text-ink",
        soft: "bg-teal-soft text-teal hover:bg-[#d2eeee]",
      },
      size: {
        sm: "h-8 rounded-12 px-3 text-meta",
        md: "h-10 rounded-12 px-4 text-[13px]",
        lg: "h-11 rounded-14 px-5 text-sm",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: { variant: "teal", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
