import { useEffect } from 'react';

/**
 * Every tutorial screen is a full page. Moving forward or backward between
 * them must show the new screen from the top instead of keeping the scroll
 * offset of the previous screen.
 */
export function useScrollToTop(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
}

export default useScrollToTop;
