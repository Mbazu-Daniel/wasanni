import * as React from "react";
import { useLocation } from "@tanstack/react-router";

export function useMenuDisclosure<T extends HTMLDetailsElement>() {
  const ref = React.useRef<T>(null);
  const pathname = useLocation({ select: (location) => location.pathname });

  React.useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (ref.current?.open && !ref.current.contains(event.target as Node)) {
        ref.current.open = false;
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  React.useEffect(() => {
    if (ref.current !== null) ref.current.open = false;
  }, [pathname]);

  return ref;
}
