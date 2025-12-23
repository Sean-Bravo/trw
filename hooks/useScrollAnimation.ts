import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number | number[];
  rootMargin?: string;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px' } = options;

  // Stabilize options to avoid re-creating observer on every render
  const optionsRef = useRef({ threshold, rootMargin });

  useEffect(() => {
    optionsRef.current = { threshold, rootMargin };
  }, [threshold, rootMargin]);

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Optionally disconnect after first trigger
          observer.unobserve(entry.target);
        }
      });
    }, optionsRef.current);

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []); // Only run once - options are stabilized via ref

  return { ref, isVisible };
}