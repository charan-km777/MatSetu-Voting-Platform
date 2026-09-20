import { motion } from 'framer-motion';
import { SceneShell, SceneTag, SignalDot, Wordmark, ease } from './SceneShared';

export function Scene1() {
  return (
    <SceneShell style={{ background: 'linear-gradient(118deg, #f2eee5 0%, #efe7d9 51%, #d9e6df 100%)' }}>
      <div className="absolute inset-0 opacity-40 dot-grid" />
      <motion.div className="absolute w-[39vw] h-[39vw] rounded-full border-[.08vw]" style={{ right: '-10vw', top: '-17vw', borderColor: 'rgba(82,197,189,.55)' }} animate={{ rotate: [0, 25, 0], scale: [1, 1.06, 1] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute w-[23vw] h-[23vw] rounded-full border-[.12vw]" style={{ right: '-2vw', top: '-8vw', borderColor: 'rgba(229,97,77,.6)' }} animate={{ rotate: [0, -40, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />
      <SceneTag index="00 / 05" label="institutional signal" />
      <div className="absolute left-[6vw] top-[20vh] w-[59vw]">
        <motion.div initial={{ opacity: 0, x: -35 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7, delay: .15, ease }}>
          <Wordmark />
        </motion.div>
        <motion.h1 className="display mt-[3vh] max-w-[52vw] text-[7.9vw] leading-[.86] font-semibold" initial={{ opacity: 0, y: 45, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.05, delay: .38, ease }}>
          Trust,<br /><span style={{ color: 'var(--color-accent)' }}>made visible.</span>
        </motion.h1>
        <motion.p className="mt-[4vh] max-w-[30vw] text-[1.5vw] leading-[1.3]" style={{ color: 'var(--color-secondary)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, delay: .92, ease }}>
          A voting system where identity is protected, services are reproducible, and every ballot leaves a local audit trail.
        </motion.p>
      </div>
      <motion.div className="absolute right-[14vw] bottom-[15vh] w-[18vw] h-[18vw]" initial={{ opacity: 0, scale: .4, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1.1, delay: .55, ease }}>
        <div className="absolute inset-[15%] rotate-45 border-[.18vw]" style={{ borderColor: 'var(--color-primary)' }} />
        <div className="absolute inset-[30%] rounded-full" style={{ background: 'var(--color-accent)' }} />
        <div className="absolute inset-[39%] rounded-full border-[.15vw] border-[#f2eee5]" />
        <SignalDot color="var(--color-aqua)" delay={.2} /><SignalDot color="var(--color-sun)" delay={.5} style={{ right: 0, bottom: '15%' }} />
      </motion.div>
      <motion.div className="absolute left-[6vw] bottom-[6vh] right-[6vw] flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: .5 }}>
        <span className="mono text-[.68vw] tracking-[.08em]" style={{ color: 'var(--color-secondary)' }}>BIOMETRIC GATE / LOCAL EVM / COMPOSE NETWORK</span>
        <span className="mono text-[.68vw]" style={{ color: 'var(--color-secondary)' }}>01—MATSETU</span>
      </motion.div>
    </SceneShell>
  );
}