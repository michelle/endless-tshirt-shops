import { useEffect, type RefObject } from "react";

type Gesture = { id: number; x: number; y: number; started: number; horizontal: boolean };

function reservedTarget(target: EventTarget | null, root: HTMLElement) {
  if (!(target instanceof Element)) return true;
  if (target.closest('button, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], table, pre')) return true;
  const link = target.closest("a");
  // Image links remain swipeable; ordinary taps still open the storefront.
  if (link && !link.querySelector("img")) return true;
  for (let element: Element | null = target; element && element !== root; element = element.parentElement) {
    if (element.scrollWidth > element.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(element).overflowX)) return true;
  }
  return false;
}

/** Only claim deliberate, single-finger horizontal gestures inside the drawer. */
export function useDrawerSwipe(ref: RefObject<HTMLDivElement | null>, onSwipe: (direction: number) => void) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let gesture: Gesture | null = null;
    const cancel = () => { gesture = null; };
    const start = (event: TouchEvent) => {
      cancel();
      if (event.defaultPrevented || event.touches.length !== 1 || reservedTarget(event.target, root) || window.getSelection()?.toString()) return;
      const touch = event.touches[0];
      // Leave browser back/forward edge gestures alone.
      if (touch.clientX < 24 || touch.clientX > window.innerWidth - 24) return;
      gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, started: event.timeStamp, horizontal: false };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      const touch = Array.from(event.touches).find((touch) => touch.identifier === gesture?.id);
      if (event.touches.length !== 1 || !touch || event.timeStamp - gesture.started > 1000) { cancel(); return; }
      const dx = Math.abs(touch.clientX - gesture.x);
      const dy = Math.abs(touch.clientY - gesture.y);
      if (!gesture.horizontal) {
        if (Math.max(dx, dy) < 12) return;
        // Once a gesture starts vertically or diagonally, never turn it into navigation.
        if (dx < dy * 1.5) { cancel(); return; }
        gesture.horizontal = true;
      }
      if (!event.cancelable) { cancel(); return; }
      // Only horizontal gestures are canceled: vertical scrolling and pinch zoom stay native.
      // Canceling touchmove also prevents a swipe on an image from clicking its link.
      event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const current = gesture;
      cancel();
      if (!current?.horizontal || event.touches.length || event.timeStamp - current.started > 1000) return;
      const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === current.id);
      if (!touch) return;
      const dx = touch.clientX - current.x;
      const dy = touch.clientY - current.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (event.cancelable) event.preventDefault();
      onSwipe(dx < 0 ? 1 : -1);
    };
    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchmove", move, { passive: false });
    root.addEventListener("touchend", end, { passive: false });
    root.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchmove", move);
      root.removeEventListener("touchend", end);
      root.removeEventListener("touchcancel", cancel);
    };
  }, [ref, onSwipe]);
}
