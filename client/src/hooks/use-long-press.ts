import { useCallback, useRef, useEffect } from "react";

export function useLongPress(
  onLongPress: () => void,
  { delay = 500, shouldPreventDefault = true } = {}
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(
    (event: any) => {
      isLongPressActive.current = false;
      timeoutRef.current = setTimeout(() => {
        onLongPress();
        isLongPressActive.current = true;
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (
        shouldPreventDefault &&
        isLongPressActive.current &&
        event &&
        event.cancelable
      ) {
        event.preventDefault();
      }
    },
    [shouldPreventDefault]
  );

  return {
    onMouseDown: (e: any) => start(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchStart: (e: any) => start(e),
    onTouchEnd: (e: any) => clear(e),
  };
}
