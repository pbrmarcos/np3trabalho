import { useState, useEffect, useCallback, useRef } from 'react';

interface ParallaxConfig {
  speed?: number; // 0 to 1, where 0.5 means half the scroll speed
  maxOffset?: number; // Maximum offset in pixels
}

export function useParallax({ speed = 0.3, maxOffset = 200 }: ParallaxConfig = {}) {
  const [offset, setOffset] = useState(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const newOffset = Math.min(scrollY * speed, maxOffset);
        setOffset(newOffset);
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [speed, maxOffset]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return offset;
}
