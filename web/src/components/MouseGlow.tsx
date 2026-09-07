'use client';

import { useEffect, useRef } from 'react';

/**
 * A single fixed radial glow that eases toward the pointer. Purely
 * atmospheric — sits behind content, mix-blend-mode: overlay tints the
 * background and doesn't fight the text or the cards' own paints.
 * All rendering is CSS; JS only sets `transform` on rAF ticks.
 */
export function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honor prefers-reduced-motion: render the glow once, centered,
    // and skip every mouse-driven update afterwards. Motion is what the
    // OS-level toggle wants to suppress; the ornament itself is fine.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Center on the viewport at start so first paint has the glow visible
    // — otherwise the layer lives at translate(-9999px) until the first move.
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let renderedX = targetX;
    let renderedY = targetY;
    let rafId: number | null = null;

    const paint = () => {
      // The extra -50% shift centers the 60vw div on the pointer instead
      // of anchoring its top-left there.
      el.style.transform = `translate3d(${renderedX}px, ${renderedY}px, 0) translate(-50%, -50%)`;
    };

    const tick = () => {
      // Ease toward the pointer so the glow trails softly rather than
      // snapping — reads as light bending, not a sprite following a cursor.
      renderedX += (targetX - renderedX) * 0.18;
      renderedY += (targetY - renderedY) * 0.18;
      paint();
      const dx = targetX - renderedX;
      const dy = targetY - renderedY;
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    // Initial paint before the first move so the layer is placed.
    paint();

    if (reducedMotion) return;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (rafId === null) rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return <div ref={ref} className="mouse-glow" aria-hidden />;
}
