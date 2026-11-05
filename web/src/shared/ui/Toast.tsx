import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}
type ShowToast = (message: string, tone?: ToastTone) => number;
type DismissToast = (id: number) => void;

const ToastContext = createContext<{ show: ShowToast; dismiss: DismissToast } | null>(null);
const DURATION_MS = 5000;

const toneIcon: Record<ToastTone, { icon: IconName; className: string }> = {
  success: { icon: 'checkCircle', className: 'text-success' },
  info: { icon: 'info', className: 'text-muted-foreground' },
  error: { icon: 'alert', className: 'text-destructive' },
};

/**
 * Toasts styled after shadcn/ui's sonner: bottom-right on desktop, bottom-centre on phones.
 * The region is a manual popover so it renders in the top layer, above open modal dialogs.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const regionRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);

  const show = useCallback<ShowToast>(
    (message, tone = 'info') => {
      const id = ++nextId.current;
      // An identical message replaces the earlier one rather than stacking a duplicate.
      setItems((current) => [...current.filter((item) => item.message !== message).slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), DURATION_MS);
      return id;
    },
    [dismiss],
  );

  // React 18 has no `popover` prop, so set it on the element. Re-showing moves it to the top of the
  // top layer, so a toast raised while a dialog is open still appears above the dialog.
  useEffect(() => {
    const region = regionRef.current;
    if (!region || typeof region.showPopover !== 'function') return;
    region.setAttribute('popover', 'manual');
    if (region.matches(':popover-open')) region.hidePopover();
    if (items.length > 0) region.showPopover();
  }, [items]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        ref={regionRef}
        className="pointer-events-none fixed inset-x-4 bottom-4 top-auto z-[90] m-0 flex w-auto flex-col gap-2 overflow-visible border-0 bg-transparent p-0 text-foreground sm:left-auto sm:right-6 sm:bottom-6 sm:w-[22rem]"
        role="region"
        aria-label="Notifications"
      >
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          {items.map((item) => {
            const { icon, className } = toneIcon[item.tone];
            return (
              <div
                key={item.id}
                className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border/60 bg-popover/85 py-3 pl-4 pr-2 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 backdrop-blur-xl backdrop-saturate-150 animate-in fade-in-0 slide-in-from-bottom-2 sm:slide-in-from-right-4 sm:slide-in-from-bottom-0"
              >
                <Icon name={icon} size={16} className={cn('mt-0.5 shrink-0', className)} />
                <span className="min-w-0 flex-1 leading-5">{item.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(item.id)}
                  className="-my-1 inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function useToastContext() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

export const useToast = (): ShowToast => useToastContext().show;

/** Removes a toast early, e.g. once another surface has taken over its message. */
export const useDismissToast = (): DismissToast => useToastContext().dismiss;
