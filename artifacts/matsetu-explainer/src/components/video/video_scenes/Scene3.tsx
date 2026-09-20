import { motion } from 'framer-motion';
import { SceneShell, SceneTag, Kicker, Arrow, ease } from './SceneShared';

const services = [
  { name: 'web', role: 'operator surface', color: 'var(--color-sun)', x: '8vw', y: '19vh' },
  { name: 'api', role: 'identity + election API', color: 'var(--color-accent)', x: '30vw', y: '35vh' },
  { name: 'mongo', role: 'persistence volume', color: 'var(--color-aqua)', x: '54vw', y: '19vh' },
  { name: 'hardhat', role: 'local EVM ledger', color: 'var(--color-primary)', x: '74vw', y: '35vh' },
];

export function Scene3() {
  return (
    <SceneShell style={{ background: 'linear-gradient(120deg, #f1eadc 0%, #eee5d5 50%, #e2dfd4 100%)' }}>
      <SceneTag index="02 / 05" label="reproducible infrastructure" />
      <motion.div className="absolute left-[6vw] top-[17vh] w-[27vw]" initial={{ opacity: 0, x: -35 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1, duration: .8, ease }}>
        <Kicker>02 / docker compose</Kicker>
        <h2 className="display mt-[2vh] text-[4.8vw] leading-[.91] font-semibold">Four services.<br /><span style={{ color: 'var(--color-accent)' }}>One net.</span></h2>
        <p className="mt-[3vh] max-w-[23vw] text-[1.3vw] leading-[1.4]" style={{ color: 'var(--color-secondary)' }}>Compose provisions the whole voting stack on <span className="mono text-[1.05vw]" style={{ color: 'var(--color-primary)' }}>voting_net</span> — so the path from interface to ledger is repeatable.</p>
      </motion.div>
      <motion.div className="absolute right-[6vw] top-[15vh] w-[58vw] h-[52vh] rounded-[1.2vw] border-[.1vw] p-[1.5vw]" style={{ borderColor: 'rgba(16,27,50,.25)', background: 'rgba(242,238,229,.48)' }} initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .2, duration: .85, ease }}>
        <div className="flex justify-between items-center">
          <span className="mono text-[.72vw]" style={{ color: 'var(--color-secondary)' }}>docker-compose.yml</span>
          <span className="mono text-[.72vw] px-[.65vw] py-[.32vw] rounded-full" style={{ color: 'var(--color-primary)', background: 'rgba(82,197,189,.35)' }}>NETWORK / voting_net</span>
        </div>
        <div className="relative mt-[2vh] h-[43vh]">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M15 25 L39 57 L65 25 L83 57 M39 57 L83 57" fill="none" stroke="rgba(16,27,50,.28)" strokeWidth=".35" strokeDasharray="2 2" />
            <motion.path d="M15 25 L39 57 L65 25 L83 57 M39 57 L83 57" fill="none" stroke="#e5614d" strokeWidth=".7" strokeDasharray="7 93" animate={{ strokeDashoffset: [100, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} />
          </svg>
          {services.map((service, i) => (
            <motion.div key={service.name} className="absolute w-[11.5vw] h-[8.7vh] rounded-[.55vw] p-[.8vw] soft-shadow" style={{ left: service.x, top: service.y, background: 'rgba(242,238,229,.93)', border: `1px solid ${service.color}` }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35 + i * .16, duration: .55, ease }}>
              <div className="flex items-center gap-[.5vw]"><span className="w-[.65vw] h-[.65vw] rounded-full" style={{ background: service.color }} /><span className="mono text-[.85vw] font-medium">{service.name}</span></div>
              <div className="mt-[.9vh] text-[.7vw]" style={{ color: 'var(--color-secondary)' }}>{service.role}</div>
            </motion.div>
          ))}
          <motion.div className="absolute left-[17vw] bottom-[2vh] flex items-center gap-[.75vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25 }}>
            <span className="mono text-[.65vw]" style={{ color: 'var(--color-secondary)' }}>shared bridge</span><Arrow color="var(--color-accent)" /><span className="mono text-[.65vw]" style={{ color: 'var(--color-accent)' }}>isolated + observable</span>
          </motion.div>
        </div>
      </motion.div>
      <motion.div className="absolute left-[6vw] bottom-[6vh] flex items-center gap-[1vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25 }}>
        <span className="w-[.55vw] h-[.55vw] rounded-full" style={{ background: 'var(--color-aqua)' }} /><span className="mono text-[.7vw]" style={{ color: 'var(--color-secondary)' }}>MONGODB VOLUME PERSISTS THE CONTAINER PATH</span>
      </motion.div>
    </SceneShell>
  );
}