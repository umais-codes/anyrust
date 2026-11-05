import { Button, Dialog, Icon, IconChip, Input, Label } from '@/shared/ui';
import { formatRoomId } from '@/shared/lib';
import type { SessionState } from '@/features/session';
import { useCopyInvite } from './useCopyInvite';

interface InviteDialogProps {
  open: boolean;
  state: SessionState;
  onClose: () => void;
  /** The link was already placed on the clipboard when the session started. */
  copied: boolean;
}

const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** Shown once when a hosted session goes live, so the presenter can send the invite right away. */
export function InviteDialog({ open, state, onClose, copied }: InviteDialogProps) {
  const copy = useCopyInvite(state.inviteLink);
  const share = async () => {
    try {
      await navigator.share({ title: 'Join my screen share', url: state.inviteLink });
    } catch {
      /* Dismissing the system share sheet is not an error. */
    }
  };

  return (
    <Dialog
      open={open}
      title="Your session is live"
      onClose={onClose}
      headerAccessory={
        <>
          <IconChip icon="share" tone="brand" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Invite a viewer</span>
        </>
      }
      footer={
        <>
          <Button variant="outline" onClick={() => window.open(state.inviteLink, '_blank', 'noopener')}>
            <Icon name="screen" />
            Open viewer in new tab
          </Button>
          <Button variant="primary" autoFocus onClick={onClose}>Done</Button>
        </>
      }
    >
      <p className="text-muted-foreground">
        Send this link to the person you want to share with. Nothing is shown until you approve their request, and access is always view-only.
      </p>
      {copied && (
        <p className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-success" role="status">
          <Icon name="check" size={16} className="shrink-0" />
          Link copied to your clipboard. Paste it to anyone you want to invite.
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="invite-dialog-link">Invite link</Label>
        <div className="flex gap-2">
          <Input
            id="invite-dialog-link"
            readOnly
            value={state.inviteLink}
            className="font-mono text-xs md:text-xs"
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button variant="primary" onClick={() => void copy()}>
            <Icon name="copy" />
            Copy
          </Button>
          {canShare && (
            <Button variant="outline" iconOnly aria-label="Share link" title="Share link" onClick={() => void share()}>
              <Icon name="share" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <span className="text-xs text-muted-foreground">Session ID</span>
        <strong className="font-mono text-sm font-medium tabular-nums">{state.roomId ? formatRoomId(state.roomId) : '—'}</strong>
      </div>
    </Dialog>
  );
}
