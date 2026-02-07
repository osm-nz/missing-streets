import { useEffect, useEffectEvent } from "react";

export const useKeyboardShortcut = (key: string, cb: () => void) => {
  const cb_stable = useEffectEvent(cb);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) cb_stable();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key]);
};
