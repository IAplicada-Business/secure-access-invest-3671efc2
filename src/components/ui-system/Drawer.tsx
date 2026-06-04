import { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper do Sheet (shadcn) para edição lateral. Animação lush na entrada.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = 'right',
  children,
  className,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={className}>
        {(title || description) && (
          <SheetHeader>
            {title && <SheetTitle className="font-ds-display text-ink-900">{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
