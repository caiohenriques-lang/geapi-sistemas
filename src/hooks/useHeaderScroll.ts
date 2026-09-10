import { useState, useEffect, useRef } from 'react';

export function useHeaderScroll(threshold = 8) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Only active on mobile viewport (< 640px)
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop;
          const isMobile = window.innerWidth < 640;

          if (!isMobile) {
            setIsVisible(true);
            lastScrollY.current = currentScrollY;
            ticking.current = false;
            return;
          }

          // Always visible at the top
          if (currentScrollY <= 20) {
            setIsVisible(true);
            lastScrollY.current = currentScrollY;
            ticking.current = false;
            return;
          }

          const diff = currentScrollY - lastScrollY.current;

          // Only trigger if difference exceeds threshold to prevent flickering
          if (Math.abs(diff) >= threshold) {
            if (diff > 0 && currentScrollY > 60) {
              // Scrolling down -> hide header
              setIsVisible(false);
            } else if (diff < 0) {
              // Scrolling up -> show header
              setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
          }

          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [threshold]);

  return isVisible;
}
