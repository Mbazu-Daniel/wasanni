import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[transform,box-shadow,background-color] duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_28px_-6px_rgba(255,46,136,0.9)] hover:shadow-[0_0_44px_-4px_rgba(255,46,136,1)]",
        blue: "bg-accent text-accent-foreground shadow-[0_0_28px_-6px_rgba(46,123,255,0.9)] hover:shadow-[0_0_44px_-4px_rgba(46,123,255,1)]",
        outline:
          "border border-blue-soft/30 bg-white/[0.02] text-foreground hover:border-pink/50 hover:bg-white/[0.06]",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
        gradient:
          "bg-[linear-gradient(100deg,#ff725e,#7259e8)] text-white shadow-[0_10px_34px_-12px_rgba(114,89,232,0.8)] hover:shadow-[0_16px_42px_-12px_rgba(114,89,232,0.9)]",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        default: "h-11 px-6",
        lg: "h-13 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
