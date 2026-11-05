import type { Role } from '@/shared/api';
import { formatClock } from '@/shared/lib';
import type { BadgeTone, IconName } from '@/shared/ui';
import type { EndSummary, SessionPhase } from '../model/types';

export const phaseBadge: Record<SessionPhase, { label: string; tone: BadgeTone }> = {
  idle: { label: 'Idle', tone: 'neutral' },
  choosing: { label: 'Selecting source', tone: 'info' },
  waiting: { label: 'Waiting', tone: 'warning' },
  request: { label: 'Access request', tone: 'brand' },
  connecting: { label: 'Connecting', tone: 'info' },
  live: { label: 'Live', tone: 'success' },
  interrupted: { label: 'Reconnecting', tone: 'warning' },
  ended: { label: 'Ended', tone: 'neutral' },
};

export interface EmptyState {
  title: string;
  description: string;
  caption: string;
  icon: IconName;
}

const endedDescriptions: Record<Role, Record<EndSummary['reason'], string>> = {
  host: {
    local: 'Screen sharing has stopped and the invite link no longer works. Nothing on your device is being captured.',
    'source-stopped': 'You stopped sharing from the browser. The invite link no longer works and nothing is being captured.',
    remote: 'The viewer disconnected, so the session was closed and screen sharing stopped.',
    declined: 'Screen sharing has stopped and the invite link no longer works.',
    connection: 'The connection was lost, so screen sharing stopped. Start a new session to share again.',
  },
  viewer: {
    local: 'You left the session. Open a new invite link to view again.',
    'source-stopped': 'The presenter stopped sharing their screen.',
    remote: 'The presenter ended the session. Ask them for a new invite link to view again.',
    declined: 'The presenter declined your request. Ask them for a new invite link if this was a mistake.',
    connection: 'The connection to the presenter was lost. Ask for a new invite link to reconnect.',
  },
};

/** What the stage shows when there is no stream. */
export function emptyState(role: Role, active: boolean, phase: SessionPhase, ended: EndSummary | null = null): EmptyState {
  if (!active && phase === 'ended' && ended) {
    return {
      title: ended.reason === 'declined' && ended.role === 'viewer' ? 'Request declined' : 'Session ended',
      description: endedDescriptions[ended.role][ended.reason],
      caption: ended.seconds ? `Session length ${formatClock(ended.seconds)}` : 'Session closed',
      icon: ended.role === 'host' ? 'checkCircle' : 'screen',
    };
  }
  if (role === 'viewer' && active) {
    const connecting = phase === 'connecting';
    return {
      title: connecting ? 'Connecting to the presenter…' : 'Waiting for the presenter',
      description: 'Keep this tab open. The shared screen appears here as soon as your request is approved.',
      caption: connecting ? 'Establishing a secure connection' : 'Request sent',
      icon: 'screen',
    };
  }
  return {
    title: 'No active stream',
    description: 'Start sharing to preview your screen here. You choose exactly what’s visible.',
    caption: 'Start sharing to begin',
    icon: 'screen',
  };
}

export interface WorkflowStep {
  title: string;
  description: string;
  state: 'upcoming' | 'active' | 'complete';
}

const hostSteps = [
  ['Select a source', 'A window, browser tab, or full display.'],
  ['Invite a viewer', 'Send your private invite link.'],
  ['Approve access', 'Confirm the viewer before streaming starts.'],
] as const;

const viewerSteps = [
  ['Invite opened', 'Your access request has been sent.'],
  ['Approval pending', 'The presenter is reviewing your request.'],
  ['View the screen', 'Live, view-only stream.'],
] as const;

export function workflow(role: Role, active: boolean, phase: SessionPhase): WorkflowStep[] {
  const live = phase === 'live';
  const approvalStage = phase === 'request' || phase === 'connecting' || live || phase === 'interrupted';
  const current = !active ? 0 : approvalStage ? 2 : 1;
  return (role === 'viewer' && active ? viewerSteps : hostSteps).map(([title, description], index) => ({
    title,
    description,
    state: index < current || live ? 'complete' : index === current ? 'active' : 'upcoming',
  }));
}
