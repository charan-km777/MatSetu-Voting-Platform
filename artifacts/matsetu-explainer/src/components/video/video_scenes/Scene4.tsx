import { motion } from 'framer-motion';
import { SceneShell, SceneTag, Kicker, Arrow, ease } from './SceneShared';

const steps = [
  ['01', 'Verify', 'biometric gate', 'off-chain'],
  ['02', 'Authorize', 'wallet address', 'separate'],
  ['03', 'Cast', 'candidate choice', 'signed'],
  ['04', 'Audit', 'vote event', 'on-chain'],
];

export function Scene4() {
  return (
    <SceneShell style={{ background: 'linear-gradient(124deg, #101b32 0%, #182942 55%, #1b4550 100%)', color: 'var(--color-text-inverse)' }}>
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(242,238,229,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(242,238,229,.06) 1px, transparent 1px)', backgroundSize: '5vw 5vw' }} />
      <SceneTag index="03 / 05" label="the voter journey" />
      <motion.div className="absolute left-[6vw] top-[17vh] w-[28vw]" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15, duration: .8, ease }}>
        <Kicker color="var(--color-sun)">03 / a ballot in motion</Kicker>
        <h2 className="display mt-[2vh] text-[4.7vw] leading-[.9] font-semibold">From face<br />to <span style={{ color: 'var(--color-sun)' }}>vote.</span></h2>
        <p className="mt-[3vh] max-w-[21vw] text-[1.3vw] leading-[1.4]" style={{ color: 'rgba(242,238,229,.68)' }}>Identity and ballot travel through different lanes. Authorization connects them without merging them.</p>
      </motion.div>
      <div className="absolute left-[39vw] right-[6vw] top-[25vh]">
        <motion.div className="absolute top-[5.3vh] left-[4vw] right-[3vw] h-[.14vw]" style={{ background: 'linear-gradient(90deg, var(--color-aqua), var(--color-sun), var(--color-accent))' }} initial={{ scaleX: 0, transformOrigin: 'left' }} animate={{ scaleX: 1 }} transition={{ delay: .35, duration: 1.5, ease }} />
        <div className="grid grid-cols-4 gap-[1.4vw]">
          {steps.map(([num, title, desc, meta], i) => (
            <motion.div key={num} className="relative" initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .46 + i * .18, duration: .6, ease }}>
              <motion.div className="relative z-10 grid place-items-center w-[3.2vw] h-[3.2vw] rounded-full border-[.16vw]" style={{ borderColor: i === 0 ? 'var(--color-aqua)' : i === 3 ? 'var(--color-accent)' : 'var(--color-sun)', background: '#101b32' }} animate={{ rotate: [0, 8, 0] }} transition={{ delay: i * .22, duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
                <span className="mono text-[.75vw]">{num}</span>
              </motion.div>
              <h3 className="display mt-[2.4vh] text-[1.8vw] font-semibold">{title}</h3>
              <p className="mt-[.7vh] text-[.95vw]" style={{ color: 'rgba(242,238,229,.7)' }}>{desc}</p>
              <div className="mt-[1.5vh] mono text-[.65vw]" style={{ color: i === 0 ? 'var(--color-aqua)' : i === 3 ? 'var(--color-accent)' : 'var(--color-sun)' }}>{meta}</div>
            </motion.div>
          ))}
        </div>
        <motion.div className="mt-[9vh] flex items-center justify-between border-t border-b py-[1.8vh]" style={{ borderColor: 'rgba(242,238,229,.22)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.45, duration: .5 }}>
          <span className="mono text-[.7vw]" style={{ color: 'rgba(242,238,229,.65)' }}>BIOMETRIC DATA</span>
          <span className="w-[16vw] h-[.18vw]" style={{ background: 'var(--color-aqua)' }} />
          <Arrow color="var(--color-sun)" />
          <span className="mono text-[.7vw]" style={{ color: 'rgba(242,238,229,.65)' }}>BALLOT STATE</span>
          <span className="w-[9vw] h-[.18vw]" style={{ background: 'var(--color-accent)' }} />
        </motion.div>
      </div>
      <div className="absolute left-[6vw] bottom-[6vh] right-[6vw] flex justify-between"><span className="mono text-[.65vw]" style={{ color: 'rgba(242,238,229,.45)' }}>NO IDENTITY PAYLOAD CROSSES THE LEDGER BOUNDARY</span><span className="mono text-[.65vw]" style={{ color: 'rgba(242,238,229,.45)' }}>04—JOURNEY</span></div>
    </SceneShell>
  );
}