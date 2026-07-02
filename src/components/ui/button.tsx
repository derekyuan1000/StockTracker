import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.08em] text-[13px] rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90 h-11 px-6",
        mint: "bg-[var(--accent-mint)] text-[#010120] hover:opacity-90 h-11 px-6",
        "ghost-line":
          "bg-transparent text-[var(--text-body)] border border-[var(--hairline)] hover:bg-[var(--surface-elevated)] h-11 px-6",
        ghost:
          "bg-transparent text-[var(--text-body)] hover:bg-[var(--surface-elevated)] h-11 px-6",
        link: "text-[var(--text-body)] underline-offset-4 hover:underline normal-case tracking-normal font-sans text-sm h-auto p-0",
        destructive: "bg-[var(--down)] text-white hover:opacity-90 h-11 px-6",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[11px]",
        lg: "h-13 px-8 text-[14px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
