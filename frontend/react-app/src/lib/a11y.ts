import type { KeyboardEvent } from 'react';

// onKeyDown handler that activates on Enter/Space — pair with role="button"
// tabIndex={0} when a native <button> isn't practical.
export const onActivateKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
};
