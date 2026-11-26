'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utilities/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  side = 'right',
  title,
  description,
  children,
  className,
}: {
  side?: 'right' | 'left' | 'bottom';
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const positionClass =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t pb-[calc(1rem+env(safe-area-inset-bottom))]'
      : side === 'left'
        ? 'inset-y-0 left-0 h-full w-80 max-w-[85vw] border-r'
        : 'inset-y-0 right-0 h-full w-96 max-w-[92vw] border-l';

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 overflow-y-auto overscroll-contain border-border bg-card p-5 text-card-foreground shadow-xl focus:outline-none',
          positionClass,
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label="Close panel"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
