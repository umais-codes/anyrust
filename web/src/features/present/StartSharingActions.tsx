import { Button, Icon } from '@/shared/ui';
import type { SessionState } from '@/features/session';

interface StartSharingActionsProps {
  state: SessionState;
  onShare: (useSample: boolean) => void;
  className?: string;
}

function startLabel(state: SessionState): string {
  if (state.ending) return 'Ending session…';
  if (state.busy) return state.phase === 'choosing' ? 'Select a source…' : 'Starting session…';
  if (!state.canCapture) return 'Requires a desktop browser';
  return state.phase === 'ended' ? 'Start a new session' : 'Start sharing';
}

/** The "start sharing" button pair, shared by the Share page and the Live session stage. */
export function StartSharingActions({ state, onShare, className }: StartSharingActionsProps) {
  const locked = state.busy || state.ending || state.active || state.service !== 'ready';

  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      <Button variant="primary" disabled={locked || !state.canCapture} aria-busy={state.busy} onClick={() => onShare(false)}>
        <Icon name="screenShare" />
        {startLabel(state)}
      </Button>
      <Button variant="outline" disabled={locked} onClick={() => onShare(true)}>
        <Icon name="play" />
        Use a demo stream
      </Button>
    </div>
  );
}
