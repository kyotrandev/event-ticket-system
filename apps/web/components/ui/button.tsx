import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-transparent px-4 text-sm font-black whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/35 active:not-aria-[haspopup]:translate-x-1 active:not-aria-[haspopup]:translate-y-1 disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground shadow-[4px_4px_0_var(--foreground)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--foreground)] dark:shadow-[4px_4px_0_var(--secondary)]',
        outline:
          'border-foreground/25 bg-card text-foreground shadow-[3px_3px_0_var(--secondary)] hover:border-primary hover:bg-accent',
        secondary:
          'border-secondary bg-secondary text-secondary-foreground shadow-[4px_4px_0_var(--primary)] hover:-translate-x-0.5 hover:-translate-y-0.5',
        ghost:
          'border-transparent text-muted-foreground hover:border-foreground/15 hover:bg-muted hover:text-foreground',
        destructive:
          'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/18',
        link: 'min-h-0 border-0 px-0 text-primary shadow-none underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11',
        xs: 'h-9 min-h-9 px-3 text-xs',
        sm: 'h-10 min-h-10 px-3 text-[0.82rem]',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11 min-h-11 p-0',
        'icon-xs': 'size-9 min-h-9 p-0 [&_svg:not([class*=size-])]:size-3.5',
        'icon-sm': 'size-10 min-h-10 p-0',
        'icon-lg': 'size-12 min-h-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
