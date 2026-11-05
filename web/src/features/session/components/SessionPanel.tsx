import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Icon } from '@/shared/ui';
import { cn, formatClock } from '@/shared/lib';
import { emptyState, phaseBadge } from '../lib/presentation';
import type { SessionState } from '../model/types';

export interface ChatSlotContext {
  open: boolean;
  fullscreen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionPanelProps {
  state: SessionState;
  /** The chat feature renders here so it travels with the panel into fullscreen. */
  renderChat: (context: ChatSlotContext) => ReactNode;
  /** Shown under the empty-stage message while no session is active, e.g. the start-sharing buttons. */
  idleActions?: ReactNode;
}

export function SessionPanel({ state, renderChat, idleActions }: SessionPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Chat starts collapsed and opens itself once a viewer is approved.
  const [chatOpen, setChatOpen] = useState(state.chatReady);
  const [needsPlay, setNeedsPlay] = useState(false);

  const { stream, phase, role, active } = state;
  const live = phase === 'live';
  const badge = phaseBadge[phase];
  const empty = emptyState(role, active, phase, state.endSummary);
  const endedCleanly = phase === 'ended' && state.endSummary?.role === 'host';

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    setNeedsPlay(false);
    if (stream) video.play().catch(() => setNeedsPlay(true));
  }, [stream]);

  useEffect(() => {
    if (state.chatReady && document.fullscreenElement !== panelRef.current) setChatOpen(true);
  }, [state.chatReady]);

  useEffect(() => {
    const onChange = () => {
      const isFullscreen = document.fullscreenElement === panelRef.current;
      setFullscreen(isFullscreen);
      setChatOpen(!isFullscreen);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Leave fullscreen as soon as the session ends, so the user lands back on the regular view.
  useEffect(() => {
    if ((!stream || !active) && document.fullscreenElement === panelRef.current) void document.exitFullscreen().catch(() => undefined);
  }, [stream, active]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen();
    } catch {
      /* Fullscreen can be refused by the browser; the panel simply stays inline. */
    }
  };

  return (
    <section
      ref={panelRef}
      aria-label="Screen session"
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm',
        fullscreen && 'rounded-none border-0',
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          {fullscreen && <Badge tone={badge.tone} dot pulse={live}>{badge.label}</Badge>}
          <h3 className="truncate text-sm font-medium">{state.title}</h3>
        </div>
        <Button
          variant="ghost"
          iconOnly
          disabled={!stream}
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <Icon name={fullscreen ? 'shrink' : 'expand'} />
        </Button>
      </div>

      <div className={cn('flex min-h-0 flex-1 flex-col', fullscreen && 'flex-row')}>
        <div
          className={cn(
            'relative grid aspect-video place-items-center overflow-hidden bg-stage text-stage-foreground',
            fullscreen && 'aspect-auto h-full min-w-0 flex-1',
          )}
        >
          <video
            ref={videoRef}
            className="size-full bg-stage object-contain"
            autoPlay
            playsInline
            muted
            controls={needsPlay}
            aria-label="Shared screen stream"
            hidden={!stream}
          />
          {!stream && (
            <div className="grid max-w-sm justify-items-center gap-2 p-6 text-center" role={phase === 'ended' ? 'status' : undefined}>
              <span
                className={cn(
                  'mb-2 flex size-14 items-center justify-center rounded-xl border border-stage-foreground/10 bg-stage-foreground/5',
                  endedCleanly && 'border-success/25 bg-success/10 text-success',
                )}
              >
                <Icon name={empty.icon} size={26} />
              </span>
              <h3 className="text-base font-semibold">{empty.title}</h3>
              <p className="text-sm text-stage-foreground/70">{empty.description}</p>
              <span className="mt-2 text-xs uppercase tracking-wider text-stage-foreground/50">{empty.caption}</span>
              {!active && idleActions && <div className="mt-3 flex justify-center">{idleActions}</div>}
            </div>
          )}
          {stream && state.sourceLabel && (
            <span className="absolute bottom-3 left-3 rounded-full bg-stage/80 px-3 py-1 text-xs text-stage-foreground backdrop-blur">
              {state.sourceLabel}
            </span>
          )}
        </div>
        <div className={cn('border-t', fullscreen && 'flex border-l border-t-0')}>
          {renderChat({ open: chatOpen, fullscreen, onOpenChange: setChatOpen })}
        </div>
      </div>

      <div className="flex h-12 items-center gap-4 border-t px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground" role="status">
          <span className={cn('size-2 shrink-0 rounded-full', live ? 'animate-pulse bg-brand' : 'bg-muted-foreground/40')} data-live={live} />
          <span className="truncate">{state.statusText}</span>
        </div>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">{formatClock(state.elapsedSeconds)}</span>
      </div>
    </section>
  );
}
