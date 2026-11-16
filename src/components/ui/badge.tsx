import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-wider [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        right: "border-side-right/40 bg-side-right/15 text-side-right",
        left: "border-side-left/40 bg-side-left/15 text-side-left",
        new: "border-transparent bg-pop text-white",
        danger: "border-danger/40 bg-danger/15 text-danger",
        warning: "border-warn/40 bg-warn/15 text-warn",
        accent: "border-primary/40 bg-primary/10 text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
