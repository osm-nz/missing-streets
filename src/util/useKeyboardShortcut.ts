import { useEffect } from "react";

/** @param cb must be memorized */
export const useKeyboardShortcut = (key: string, cb: () => void) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === key) cb();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, cb]);
};
