import { motion } from 'framer-motion';
import { SceneShell, SceneTag, Kicker, ease } from './SceneShared';

const ticks = Array.from({ length: 18 });

export function Scene2() {
  return (
    <SceneShell style={{ background: 'linear-gradient(140deg, #e8eee6 0%, #d6e5de 48%, #cbd8d2 100%)' }}>
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(90deg, transparent 49.8%, rgba(16,27,50,.18) 50%, transparent 50.2%), linear-gradient(rgba(16,27,50,.14) 1px, transparent 1px)', backgroundSize: '8vw 100%, 100% 6vw' }} />
      <SceneTag index="01 / 05" label="identity boundary" />
      <motion.div className="absolute left-[7vw] top-[18vh] w-[35vw]" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .8, delay: .15, ease }}>
        <Kicker>01 / biometric verification</Kicker>
        <h2 className="display mt-[2vh] text-[5.3vw] leading-[.9] font-semibold">Know the<br /><span style={{ color: 'var(--color-accent)' }}>voter.</span></h2>
        <p className="mt-[3vh] max-w-[23vw] text-[1.35vw] leading-[1.35]" style={{ color: 'var(--color-secondary)' }}>A 128-value descriptor checks for a match — never exposing the stored template to the client.</p>
        <div className="mt-[4vh] flex items-center gap-[1.2vw]">
          <span className="mono text-[.72vw] px-[.8vw] py-[.55vw] rounded-full border" style={{ borderColor: 'rgba(16,27,50,.24)' }}>128-D VECTOR</span>
          <span className="mono text-[.72vw] px-[.8vw] py-[.55vw] rounded-full" style={{ background: 'var(--color-aqua)', color: 'var(--color-primary)' }}>DIST &lt; 0.45</span>
        </div>
      </motion.div>
      <motion.div className="absolute right-[12vw] top-[15vh] w-[29vw] h-[29vw] rounded-full border-[.1vw] flex items-center justify-center" style={{ borderColor: 'rgba(16,27,50,.28)' }} initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, delay: .25, ease }}>
        <motion.div className="absolute inset-[7%] rounded-full border-[.07vw] border-dashed" style={{ borderColor: 'var(--color-accent)' }} animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }} />
        <div className="absolute inset-[23%] rounded-full" style={{ background: 'rgba(242,238,229,.72)', boxShadow: 'inset 0 0 0 .12vw rgba(16,27,50,.16)' }}>
          <div className="absolute left-[31%] top-[21%] w-[38%] h-[27%] rounded-[50%_50%_45%_45%] border-[.16vw]" style={{ borderColor: 'var(--color-primary)' }} />
          <div className="absolute left-[42%] top-[32%] w-[6%] h-[6%] rounded-full" style={{ background: 'var(--color-accent)' }} />
          <div className="absolute left-[27%] top-[55%] w-[46%] h-[.16vw]" style={{ background: 'var(--color-primary)' }} />
          <div className="absolute left-[36%] top-[67%] w-[28%] h-[.16vw]" style={{ background: 'var(--color-accent)' }} />
        </div>
        {ticks.map((_, i) => <motion.span key={i} className="absolute left-1/2 top-1/2 w-[.32vw] h-[1.1vw] min-w-[3px]" style={{ background: i % 3 === 0 ? 'var(--color-accent)' : 'var(--color-primary)', transform: `rotate(${i * 20}deg) translateY(-13.4vw)`, transformOrigin: '50% 13.4vw', opacity: i % 3 === 0 ? .8 : .28 }} animate={{ opacity: [0.25, .9, .25] }} transition={{ delay: i * .08, duration: 2.4, repeat: Infinity }} />)}
      </motion.div>
      <motion.div className="absolute right-[8vw] bottom-[10vh] w-[33vw] h-[7vh] flex items-center justify-between px-[1.4vw] rounded-[.5vw]" style={{ background: 'rgba(242,238,229,.68)', border: '1px solid rgba(16,27,50,.16)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: .55, ease }}>
        <span className="mono text-[.7vw]" style={{ color: 'var(--color-secondary)' }}>IDENTITY STORE</span>
        <motion.span className="w-[5vw] h-[.14vw]" style={{ background: 'var(--color-aqua)' }} animate={{ scaleX: [0, 1, .65] }} transition={{ delay: 1.2, duration: 1.6, repeat: Infinity, repeatDelay: 1.6, ease }} />
        <span className="mono text-[.7vw]" style={{ color: 'var(--color-accent)' }}>OFF-CHAIN / SEALED</span>
      </motion.div>
      <div className="absolute left-[6vw] bottom-[6vh] right-[6vw] thin-rule" />
    </SceneShell>
  );
}