// With "block all cookies" on in Safari, and in some embedded browsers, merely touching
// localStorage throws a SecurityError; on first render that leaves the app on a blank (black) screen.
// Failing to persist a preference must never take the app down.
export const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* if it cannot be stored it simply lasts for this session */
    }
  },
};
