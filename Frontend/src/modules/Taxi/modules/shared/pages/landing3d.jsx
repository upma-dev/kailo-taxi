import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';

// The landing site is decorative motion by design. Many Windows setups report
// prefers-reduced-motion, which silently killed every animation, so it is ignored here.
export const useReducedMotion = () => false;

/**
 * True only on large screens with a real mouse. Phones and tablets skip the heavy
 * effects (3D tilt, floating layers, stacked sticky sections) so scrolling stays smooth.
 */
export function useIsDesktop() {
  const query = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
  const [on, setOn] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const update = () => setOn(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return on;
}

/** Fades and lifts its children into view once. */
export function Reveal({ children, delay = 0, y = 24, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Headline whose words rise out of a mask one after another. */
export function SplitText({ text, className = '', delay = 0 }) {
  const ref = useRef(null);
  // Observe the wrapper: the words start clipped out of view, so observing them would never fire.
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const words = String(text || '').split(' ').filter(Boolean);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={{ y: '105%' }}
            animate={inView ? { y: 0 } : undefined}
            transition={{ duration: 0.6, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Card that tilts toward the pointer in 3D, with a moving glare. Desktop only. */
export function Tilt({ children, className = '', max = 10 }) {
  const desktop = useIsDesktop();
  const ref = useRef(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 160, damping: 18 });
  const sy = useSpring(py, { stiffness: 160, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glare = useTransform([sx, sy], ([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.28), transparent 55%)`);

  if (!desktop) return <div className={`h-full ${className}`}>{children}</div>;

  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const leave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className={`relative h-full ${className}`}
      >
        {children}
        <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: glare }} />
      </motion.div>
    </div>
  );
}

/**
 * Pointer-driven 3D stage. Children placed with <Layer depth={n}> sit at different
 * translateZ values and shift against the pointer. On phones it is a plain container.
 */
export function Stage({ children, className = '', tilt = 14 }) {
  const desktop = useIsDesktop();
  const ref = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 90, damping: 16 });
  const sy = useSpring(py, { stiffness: 90, damping: 16 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-tilt, tilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [tilt, -tilt]);

  if (!desktop) return <div className={className}>{children}</div>;

  const move = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={className} style={{ perspective: 1200 }}>
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

/** A floating layer inside <Stage>. Bigger depth = closer to the viewer. Static on phones. */
export function Layer({ depth = 0, float = 0, className = '', children, style }) {
  const desktop = useIsDesktop();
  if (!desktop) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={{ z: depth, transformStyle: 'preserve-3d', ...style }}
      animate={float ? { y: [0, -float, 0] } : undefined}
      transition={{ duration: 4 + depth / 40, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
