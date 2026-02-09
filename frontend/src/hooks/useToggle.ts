import { useCallback, useState } from "react";

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const open = useCallback(() => setValue(true), []);
  const close = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue((prev) => !prev), []);

  return { value, open, close, toggle, setValue };
}
