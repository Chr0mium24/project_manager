import { nextTick, onBeforeUnmount, watch, type Ref } from "vue";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

function isHTMLElement(value: Element | null): value is HTMLElement {
  return value instanceof HTMLElement;
}

function readFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isHTMLElement);
}

function focusModalContent(
  dialog: HTMLElement | null,
  preferredElement: HTMLElement | null
): void {
  if (dialog === null) {
    return;
  }

  const focusableElements = readFocusableElements(dialog);
  const fallbackTarget = focusableElements[0] ?? dialog;
  const focusTarget = preferredElement ?? fallbackTarget;
  focusTarget.focus();
}

function trapModalFocus(event: KeyboardEvent, dialog: HTMLElement): void {
  const focusableElements = readFocusableElements(dialog);
  if (focusableElements.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);
  if (firstElement === undefined || lastElement === undefined) {
    return;
  }

  const activeElement = document.activeElement;
  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

interface ModalBehaviorOptions {
  dialogRef: Ref<HTMLElement | null>;
  initialFocusRef?: Ref<HTMLElement | null>;
  isOpen: Ref<boolean>;
  onClose(): void;
}

export function useModalBehavior(options: ModalBehaviorOptions): void {
  let cleanup: (() => void) | null = null;

  watch(options.isOpen, (isOpen) => {
    cleanup?.();
    cleanup = null;
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousActiveElement = isHTMLElement(document.activeElement) ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        options.onClose();
        return;
      }
      if (event.key === "Tab" && options.dialogRef.value !== null) {
        trapModalFocus(event, options.dialogRef.value);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeydown);
    void nextTick(() => {
      focusModalContent(options.dialogRef.value, options.initialFocusRef?.value ?? null);
    });

    cleanup = () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeydown);
      if (previousActiveElement !== null && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, { immediate: true });

  onBeforeUnmount(() => {
    cleanup?.();
  });
}
