import { createContext, useContext, useState, type ReactNode } from "react";

import type { WebPushState } from "../../app/features/web-push/web-push";

export type { WebPushState } from "../../app/features/web-push/web-push";

type DemoPush = {
  state: WebPushState;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  retry: () => Promise<void>;
};
const PushContext = createContext<DemoPush | null>(null);

export function DemoPushProvider({
  children,
  initialState = "ready",
}: {
  children: ReactNode;
  initialState?: WebPushState;
}) {
  const [state, setState] = useState(initialState);
  async function change(busy: WebPushState, result: WebPushState) {
    setState(busy);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setState(result);
  }
  return (
    <PushContext
      value={{
        state,
        enable: () => change("enabling", "enabled"),
        disable: () => change("disabling", "ready"),
        retry: () => change("synchronizing", "enabled"),
      }}
    >
      {children}
    </PushContext>
  );
}

export function useWebPush() {
  const value = useContext(PushContext);
  if (!value) throw new Error("Wrap notification stories in DemoPushProvider.");
  return value;
}
