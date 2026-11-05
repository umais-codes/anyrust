import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SessionEngine } from '../model/SessionEngine';
import type { SessionCallbacks, SessionState } from '../model/types';

export interface SessionApi {
  state: SessionState;
  /** Resolves with the invite link once the hosted session is live, or `null` if it did not start. */
  share: (useSample: boolean) => Promise<string | null>;
  join: SessionEngine['join'];
  approveViewer: () => Promise<void>;
  rejectViewer: () => Promise<void>;
  endSession: () => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  setQuality: SessionEngine['setQuality'];
  dismissNotice: () => void;
}

/** Creates one SessionEngine for the lifetime of the component and binds it to React. */
export function useSession(callbacks: SessionCallbacks): SessionApi {
  // Callbacks change identity every render; the engine always calls the latest ones.
  const latest = useRef(callbacks);
  useEffect(() => {
    latest.current = callbacks;
  });

  const [engine] = useState(
    () =>
      new SessionEngine({
        onToast: (message, tone) => latest.current.onToast(message, tone),
        onChatMessage: (message) => latest.current.onChatMessage(message),
        onChatReset: () => latest.current.onChatReset(),
        onSessionRecorded: (record) => latest.current.onSessionRecorded(record),
      }),
  );

  useEffect(() => {
    engine.start();
    return () => engine.dispose();
  }, [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  return {
    state,
    share: engine.share,
    join: engine.join,
    approveViewer: engine.approveViewer,
    rejectViewer: engine.rejectViewer,
    endSession: () => engine.endSession(),
    sendChat: engine.sendChat,
    setQuality: engine.setQuality,
    dismissNotice: engine.dismissNotice,
  };
}
