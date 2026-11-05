import { useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { ApprovalDialog } from '@/features/approval';
import { InviteDialog, copyInviteLink, copyWhenFocused, startPendingCopy } from '@/features/present';
import { useChatLog } from '@/features/chat';
import { useHistory } from '@/features/history';
import { useSession } from '@/features/session';
import { ThemeToggle } from '@/features/theme';
import { Sidebar, Topbar } from '@/shared/layout';
import type { NavEntry } from '@/shared/layout';
import { Notice, useDismissToast, useToast } from '@/shared/ui';
import { hrefFor, useRoute, viewTitles } from './router';
import type { View } from './router';
import { HelpView } from './views/HelpView';
import { HistoryView } from './views/HistoryView';
import { HomeView } from './views/HomeView';
import { JoinView } from './views/JoinView';
import { SessionView } from './views/SessionView';
import { ShareView } from './views/ShareView';
import type { ViewProps } from './views/shared';

/** How long the bottom-right "link copied" toast shows before the invite popup takes over. */
const INVITE_POPUP_DELAY_MS = 1800;

const screens: Record<View, ComponentType<ViewProps>> = {
  home: HomeView,
  share: ShareView,
  join: JoinView,
  session: SessionView,
  history: HistoryView,
  help: HelpView,
};

export function App() {
  const toast = useToast();
  const dismissToast = useDismissToast();
  const history = useHistory();
  const [view, navigate] = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  // Chat state lives here so the session engine can feed it without depending on the chat feature.
  const chat = useChatLog();
  const { receive: receiveChat, reset: resetChat } = chat;
  const { add: addHistory } = history;

  const session = useSession({
    onToast: toast,
    onChatMessage: receiveChat,
    onChatReset: resetChat,
    onSessionRecorded: addHistory,
  });
  const { state } = session;

  // Jump to the live view whenever a session starts (sharing begins or a join is accepted).
  // For invite links this also replaces `#join=…` in the address bar, so the token isn't left behind.
  const wasActive = useRef(state.active);
  useEffect(() => {
    if (state.active && !wasActive.current) navigate('session');
    wasActive.current = state.active;
  }, [state.active, navigate]);

  // Starting to share copies the invite link automatically and then offers it in a popup.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const stopWaitingToCopy = useRef<(() => void) | null>(null);
  const hosting = state.active && state.role === 'host' && Boolean(state.inviteLink);
  const hostingRef = useRef(hosting);
  hostingRef.current = hosting;

  useEffect(() => {
    if (hosting) return;
    setInviteOpen(false);
    setInviteCopied(false);
    stopWaitingToCopy.current?.();
    stopWaitingToCopy.current = null;
  }, [hosting]);

  // Must run synchronously inside the click, so the clipboard write keeps the click's permission.
  const share = (useSample: boolean) => {
    const pending = startPendingCopy();
    return session.share(useSample).then(async (link) => {
      if (!link) {
        pending?.cancel();
        return link;
      }
      pending?.resolve(link);
      const copied = (pending ? await pending.result : false) || (await copyInviteLink(link));
      let copiedToast: number | null = null;
      if (copied) {
        setInviteCopied(true);
        copiedToast = toast('Invite link copied to clipboard.', 'success');
      }
      // e.g. Chrome moved focus to the shared tab: copy the moment the person comes back.
      // The popup is already open by then, so it shows the confirmation itself instead of a toast.
      else stopWaitingToCopy.current = copyWhenFocused(link, () => setInviteCopied(true));
      // Let the "copied" toast be read first, then hand over to the popup, which repeats the confirmation.
      window.setTimeout(() => {
        if (copiedToast !== null) dismissToast(copiedToast);
        if (hostingRef.current) setInviteOpen(true);
      }, copied ? INVITE_POPUP_DELAY_MS : 0);
      return link;
    });
  };
  const sessionApi = { ...session, share };

  const nav: NavEntry[] = [
    { id: 'home', label: 'Home', icon: 'home', href: hrefFor('home') },
    { id: 'share', label: 'Share screen', icon: 'screenShare', href: hrefFor('share') },
    { id: 'join', label: 'Join session', icon: 'join', href: hrefFor('join') },
    { id: 'session', label: 'Live session', icon: 'screen', href: hrefFor('session'), live: state.active },
    { id: 'history', label: 'History', icon: 'clock', href: hrefFor('history') },
  ];
  const footerNav: NavEntry[] = [{ id: 'help', label: 'How it works', icon: 'help', href: hrefFor('help') }];

  const Screen = screens[view];

  return (
    <>
      <a
        className="fixed left-2 top-2 z-[100] -translate-y-[160%] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform focus:translate-y-0"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <Sidebar items={nav} footerItems={footerNav} activeId={view} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="min-h-screen lg:pl-60">
        <Topbar section={viewTitles[view]} service={state.service} onMenu={() => setMenuOpen(true)} actions={<ThemeToggle />} />
        <main id="main" tabIndex={-1} className="outline-none">
          {state.notice && (
            <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8">
              <Notice message={state.notice} onDismiss={session.dismissNotice} />
            </div>
          )}
          <Screen session={sessionApi} chat={chat} history={history.entries} />
        </main>
      </div>

      <InviteDialog open={inviteOpen && !state.approvalOpen} copied={inviteCopied} state={state} onClose={() => setInviteOpen(false)} />
      <ApprovalDialog open={state.approvalOpen} onApprove={() => void session.approveViewer()} onDecline={() => void session.rejectViewer()} />
    </>
  );
}
