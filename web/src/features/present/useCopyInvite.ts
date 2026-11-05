import { useToast } from '@/shared/ui';

/** Writes the invite link to the clipboard. Resolves `false` when the browser refuses. */
export async function copyInviteLink(inviteLink: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(inviteLink);
    return true;
  } catch {
    return false;
  }
}

export interface PendingCopy {
  /** Supplies the text once it exists. */
  resolve: (text: string) => void;
  /** Abandons the write (e.g. the share was cancelled). */
  cancel: () => void;
  /** Settles `true` once the text is on the clipboard. */
  result: Promise<boolean>;
}

/**
 * Browsers only allow clipboard writes during a click, while the page has focus. The invite link
 * doesn't exist until after the screen picker closes, by which point both are usually gone. So the
 * write is started now, inside the click, with a promise for the text that is filled in later.
 * Returns `null` where promise-based clipboard items are unsupported.
 */
export function startPendingCopy(): PendingCopy | null {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return null;
  let resolve!: (text: string) => void;
  let cancel!: () => void;
  const text = new Promise<string>((res, rej) => {
    resolve = res;
    cancel = () => rej(new Error('cancelled'));
  });
  const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
  blob.catch(() => undefined);
  let result: Promise<boolean>;
  try {
    result = navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]).then(
      () => true,
      () => false,
    );
  } catch {
    result = Promise.resolve(false);
  }
  return { resolve, cancel, result };
}

/**
 * Last resort: copy as soon as the person is back on this page (focus, or their next click or key
 * press), which browsers accept. Returns a function that stops waiting.
 */
export function copyWhenFocused(text: string, onCopied: () => void): () => void {
  const events = ['focus', 'pointerdown', 'keydown'] as const;
  const attempt = () => {
    void copyInviteLink(text).then((ok) => {
      if (!ok) return;
      stop();
      onCopied();
    });
  };
  const stop = () => events.forEach((name) => window.removeEventListener(name, attempt, true));
  events.forEach((name) => window.addEventListener(name, attempt, true));
  return stop;
}

/** Copies the invite link to the clipboard and reports the outcome with a toast. */
export function useCopyInvite(inviteLink: string) {
  const toast = useToast();
  return async () => {
    if (await copyInviteLink(inviteLink)) toast('Invite link copied to clipboard.', 'success');
    else toast('Couldn’t copy automatically. Select the link and press Ctrl+C (⌘C on Mac).', 'error');
  };
}
