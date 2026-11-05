import { Badge, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Icon, IconChip } from '@/shared/ui';
import type { SessionState } from '@/features/session';
import { StartSharingActions } from './StartSharingActions';

interface ShareCardProps {
  state: SessionState;
  onShare: (useSample: boolean) => void;
}

const highlights = [
  'Share a window, browser tab, or full display',
  'Viewers join only with your approval',
  'View-only access, with no remote control',
];

/** Starts a hosted session. The invite link lives in InvitePanel on the session view. */
export function ShareCard({ state, onShare }: ShareCardProps) {
  return (
    <Card as="article">
      <CardHeader>
        <div className="flex items-start gap-4">
          <IconChip icon="screenShare" tone="brand" />
          <div className="space-y-1.5">
            <CardTitle>Start a session</CardTitle>
            <CardDescription>Choose what to share. Your invite link is created instantly.</CardDescription>
          </div>
        </div>
        <CardAction><Badge tone="outline">Host</Badge></CardAction>
      </CardHeader>

      <CardContent>
        <ul className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <Icon name="check" size={16} className="shrink-0 text-success" />
              {item}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="border-t">
        <StartSharingActions state={state} onShare={onShare} />
      </CardFooter>
    </Card>
  );
}
