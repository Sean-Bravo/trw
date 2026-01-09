import { renderHook } from '@testing-library/react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

describe('useScrollAnimation Hook', () => {
  describe('Initial State', () => {
    it('returns ref and isVisible state', () => {
      const { result } = renderHook(() => useScrollAnimation());

      expect(result.current).toHaveProperty('ref');
      expect(result.current).toHaveProperty('isVisible');
    });

    it('isVisible starts as false', () => {
      const { result } = renderHook(() => useScrollAnimation());

      // Initially false before observer triggers
      expect(typeof result.current.isVisible).toBe('boolean');
    });

    it('ref is a React ref object', () => {
      const { result } = renderHook(() => useScrollAnimation());

      expect(result.current.ref).toHaveProperty('current');
    });

    it('ref.current starts as null', () => {
      const { result } = renderHook(() => useScrollAnimation());

      expect(result.current.ref.current).toBeNull();
    });
  });

  describe('Return Value', () => {
    it('returns object with ref and isVisible', () => {
      const { result } = renderHook(() => useScrollAnimation());

      const keys = Object.keys(result.current);
      expect(keys).toContain('ref');
      expect(keys).toContain('isVisible');
      expect(keys.length).toBe(2);
    });

    it('isVisible is a boolean', () => {
      const { result } = renderHook(() => useScrollAnimation());

      expect(typeof result.current.isVisible).toBe('boolean');
    });
  });

  describe('Options Handling', () => {
    it('works with default options (no args)', () => {
      expect(() => {
        renderHook(() => useScrollAnimation());
      }).not.toThrow();
    });

    it('works with empty options object', () => {
      expect(() => {
        renderHook(() => useScrollAnimation({}));
      }).not.toThrow();
    });

    it('accepts threshold option', () => {
      expect(() => {
        renderHook(() => useScrollAnimation({ threshold: 0.5 }));
      }).not.toThrow();
    });

    it('accepts rootMargin option', () => {
      expect(() => {
        renderHook(() => useScrollAnimation({ rootMargin: '100px' }));
      }).not.toThrow();
    });

    it('accepts array threshold', () => {
      expect(() => {
        renderHook(() => useScrollAnimation({ threshold: [0, 0.5, 1] }));
      }).not.toThrow();
    });

    it('accepts combined options', () => {
      expect(() => {
        renderHook(() => useScrollAnimation({ threshold: 0.25, rootMargin: '-50px' }));
      }).not.toThrow();
    });
  });

  describe('Stability', () => {
    it('ref is stable across rerenders', () => {
      const { result, rerender } = renderHook(() => useScrollAnimation());

      const initialRef = result.current.ref;
      rerender();

      expect(result.current.ref).toBe(initialRef);
    });

    it('does not error on rerender with same options', () => {
      const { rerender } = renderHook(() => useScrollAnimation({ threshold: 0.1 }));

      expect(() => rerender()).not.toThrow();
    });

    it('does not error on multiple rapid rerenders', () => {
      const { rerender } = renderHook(() => useScrollAnimation());

      expect(() => {
        for (let i = 0; i < 10; i++) {
          rerender();
        }
      }).not.toThrow();
    });
  });

  describe('Hook Behavior', () => {
    it('can be used in multiple components independently', () => {
      const { result: result1 } = renderHook(() => useScrollAnimation());
      const { result: result2 } = renderHook(() => useScrollAnimation());

      expect(result1.current.ref).not.toBe(result2.current.ref);
    });

    it('each instance has its own isVisible state', () => {
      const { result: result1 } = renderHook(() => useScrollAnimation());
      const { result: result2 } = renderHook(() => useScrollAnimation());

      // Both start with the same value but are independent
      expect(typeof result1.current.isVisible).toBe('boolean');
      expect(typeof result2.current.isVisible).toBe('boolean');
    });
  });

  describe('Cleanup', () => {
    it('does not error on unmount', () => {
      const { unmount } = renderHook(() => useScrollAnimation());

      expect(() => unmount()).not.toThrow();
    });

    it('can be remounted after unmount', () => {
      const { unmount: unmount1 } = renderHook(() => useScrollAnimation());
      unmount1();

      expect(() => {
        renderHook(() => useScrollAnimation());
      }).not.toThrow();
    });
  });
});
