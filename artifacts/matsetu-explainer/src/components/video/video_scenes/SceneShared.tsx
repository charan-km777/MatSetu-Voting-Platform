import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

export const ease = [0.16, 1, 0.3, 1] as const;

export function SceneShell({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <motion.div className={`absolute inset-0 overflow-hidden ${className}`} style={{ perspective: 1100, ...style }} initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }} exit={{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }} transition={{ duration: 0.8, ease }}>
      {children}
    </motion.div>
  );
}

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-[.65vw]" style={{ color: inverted ? 'var(--color-text-inverse)' : 'var(--color-primary)' }}>
      <span className="relative grid place-items-center w-[2.8vw] h-[2.8vw] min-w-[26px] min-h-[26px]">
        <span className="absolute inset-0 rotate-45 border-[.14vw] border-current" />
        <span className="absolute w-[1.2vw] h-[1.2vw] min-w-[10px] min-h-[10px] rounded-full" style={{ background: 'var(--color-accent)' }} />
      </span>
      <span className="display text-[1.25vw] min-text font-semibold tracking-[-.05em]">MATSETU</span>
    </div>
  );
}

export function SceneTag({ index, label }: { index: string; label: string }) {
  return (
    <div className="absolute left-[6vw] top-[5vh] flex items-center gap-[.9vw]">
      <span className="eyebrow">{index}</span>
      <span className="w-[3vw] h-px" style={{ background: 'var(--color-accent)' }} />
      <span className="eyebrow" style={{ color: 'var(--color-primary)' }}>{label}</span>
    </div>
  );
}

export function Kicker({ children, color = 'var(--color-accent)' }: { children: ReactNode; color?: string }) {
  return <div className="eyebrow" style={{ color }}>{children}</div>;
}

export function SignalDot({ color = 'var(--color-aqua)', delay = 0, style }: { color?: string; delay?: number; style?: CSSProperties }) {
  return <motion.span className="absolute block w-[.48vw] h-[.48vw] min-w-[5px] min-h-[5px] rounded-full" style={{ background: color, boxShadow: `0 0 .8vw ${color}`, ...style }} animate={{ opacity: [0.25, 1, .25], scale: [0.8, 1.2, .8] }} transition={{ duration: 1.8, delay, repeat: Infinity, ease: 'easeInOut' }} />;
}

export function Arrow({ color = 'var(--color-accent)' }: { color?: string }) {
  return <svg width="18" height="12" viewBox="0 0 18 12" fill="none" style={{ color }}><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}