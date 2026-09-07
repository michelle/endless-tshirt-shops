import { useEffect, type RefObject } from "react";

function outside(dialog: HTMLDialogElement, event: { clientX: number; clientY: number }) {
  const bounds = dialog.getBoundingClientRect();
  return event.clientX < bounds.left || event.clientX >= bounds.right ||
    event.clientY < bounds.top || event.clientY >= bounds.bottom;
}

/** Share focus, scroll locking and deliberate backdrop dismissal across drawers. */
export function useModalDrawer(ref: RefObject<HTMLDialogElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    let pointerStartedOnBackdrop = false;
    const onPointerDown = (event: PointerEvent) => {
      pointerStartedOnBackdrop = event.isPrimary && event.button === 0 && outside(dialog, event);
    };
    const onPointerCancel = () => { pointerStartedOnBackdrop = false; };
    const onClick = (event: MouseEvent) => {
      const dismiss = pointerStartedOnBackdrop && event.detail > 0 && event.target === dialog && outside(dialog, event);
      pointerStartedOnBackdrop = false;
      if (dismiss) close();
    };
    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointercancel", onPointerCancel);
    dialog.addEventListener("click", onClick);
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointercancel", onPointerCancel);
      dialog.removeEventListener("click", onClick);
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [ref, open, close]);
}
