'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy = false,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-stone-200 bg-white p-5 shadow-2xl outline-none focus-visible:ring-4 focus-visible:ring-gold-200">
          <div className="flex items-start gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', destructive ? 'bg-red-50 text-red-700' : 'bg-gold-50 text-gold-800')}>
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-semibold text-neutral-950">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-neutral-600">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-stone-100 focus-visible:ring-4 focus-visible:ring-gold-200"
                aria-label="Close confirmation"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={busy}
                className="min-h-11 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={cn(
                'min-h-11 rounded-lg px-4 text-sm font-semibold text-white focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60',
                destructive
                  ? 'bg-red-700 hover:bg-red-800 focus-visible:ring-red-200'
                  : 'bg-neutral-950 hover:bg-neutral-800 focus-visible:ring-gold-200'
              )}
            >
              {busy ? 'Updating…' : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
