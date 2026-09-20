import { motion } from 'framer-motion';
import { SceneShell, SceneTag, Kicker, Wordmark, ease } from './SceneShared';

export function Scene5() {
  const candidates = [
    { name: 'A. Nair', votes: 47, color: 'var(--color-accent)' },
    { name: 'R. Shah', votes: 31, color: 'var(--color-aqua)' },
    { name: 'M. Iyer', votes: 18, color: 'var(--color-sun)' },
  ];
  return (
    <SceneShell style={{ background: 'linear-gradient(132deg, #e8e1d3 0%, #f2eee5 58%, #d5e7e0 100%)' }}>
      <SceneTag index="04 / 05" label="the solidity ledger" />
      <motion.div className="absolute left-[6vw] top-[17vh] w-[28vw]" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1, duration: .75, ease }}>
        <Kicker>04 / election.sol</Kicker>
        <h2 className="display mt-[2vh] text-[4.75vw] leading-[.88] font-semibold">The ledger<br /><span style={{ color: 'var(--color-accent)' }}>only counts.</span></h2>
        <p className="mt-[3vh] max-w-[22vw] text-[1.25vw] leading-[1.4]" style={{ color: 'var(--color-secondary)' }}>The Solidity contract knows candidates, status, wallet uniqueness, and vote counts — nothing about a face.</p>
      </motion.div>
      <motion.div className="absolute right-[6vw] top-[15vh] w-[54vw] h-[53vh] rounded-[.8vw] overflow-hidden soft-shadow" style={{ background: '#101b32' }} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .22, duration: .85, ease }}>
        <div className="flex justify-between items-center px-[1.4vw] py-[1.3vh]" style={{ borderBottom: '1px solid rgba(242,238,229,.16)' }}>
          <span className="mono text-[.7vw]" style={{ color: 'rgba(242,238,229,.6)' }}>contracts / Election.sol</span>
          <span className="mono text-[.65vw] px-[.65vw] py-[.3vw] rounded-full" style={{ color: 'var(--color-aqua)', background: 'rgba(82,197,189,.12)' }}>LOCAL EVM / ACTIVE</span>
        </div>
        <div className="grid grid-cols-[1fr_1.1fr] h-[45vh]">
          <div className="p-[1.5vw] mono text-[.72vw] leading-[1.8]" style={{ color: 'rgba(242,238,229,.64)' }}>
            <div><span className="code-bracket">contract</span> Election {'{'}</div>
            <div className="pl-[1vw]">bool <span style={{ color: 'var(--color-sun)' }}>votingOpen</span>;</div>
            <div className="pl-[1vw]">mapping(address =&gt; bool)</div>
            <div className="pl-[1vw]"><span style={{ color: 'var(--color-sun)' }}>hasVoted</span>;</div>
            <div className="pl-[1vw] mt-[1vh]"><span className="code-bracket">function</span> castVote(</div>
            <div className="pl-[2vw]">candidateId) external {'{'}</div>
            <div className="pl-[3vw]" style={{ color: 'var(--color-aqua)' }}>require(!hasVoted[msg.sender]);</div>
            <div className="pl-[3vw]" style={{ color: 'var(--color-aqua)' }}>voteCount += 1;</div>
            <div className="pl-[2vw]">{'}'}</div>
            <div>{'}'}</div>
          </div>
          <div className="p-[1.5vw]" style={{ borderLeft: '1px solid rgba(242,238,229,.16)' }}>
            <div className="flex justify-between items-center"><span className="mono text-[.7vw]" style={{ color: 'rgba(242,238,229,.6)' }}>vote counts</span><span className="mono text-[.65vw]" style={{ color: 'var(--color-accent)' }}>EVENTS / LIVE</span></div>
            <div className="mt-[3vh] space-y-[2.4vh]">
              {candidates.map((candidate, i) => (
                <div key={candidate.name}>
                  <div className="flex justify-between mono text-[.68vw]" style={{ color: 'rgba(242,238,229,.72)' }}><span>{candidate.name}</span><span style={{ color: candidate.color }}>{candidate.votes}</span></div>
                  <div className="mt-[.8vh] h-[.62vw] rounded-full overflow-hidden" style={{ background: 'rgba(242,238,229,.12)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: candidate.color }} initial={{ width: 0 }} animate={{ width: `${candidate.votes * 1.55}%` }} transition={{ delay: .7 + i * .18, duration: 1, ease }} />
                  </div>
                </div>
              ))}
            </div>
            <motion.div className="mt-[4vh] grid grid-cols-2 gap-[.7vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35 }}>
              <div className="rounded-[.4vw] p-[.8vw]" style={{ border: '1px solid rgba(82,197,189,.46)' }}><div className="mono text-[.6vw]" style={{ color: 'rgba(242,238,229,.5)' }}>VOTING STATUS</div><div className="mt-[.5vh] text-[1.05vw]" style={{ color: 'var(--color-aqua)' }}>OPEN</div></div>
              <div className="rounded-[.4vw] p-[.8vw]" style={{ border: '1px solid rgba(229,97,77,.46)' }}><div className="mono text-[.6vw]" style={{ color: 'rgba(242,238,229,.5)' }}>DUPLICATE BALLOT</div><div className="mt-[.5vh] text-[1.05vw]" style={{ color: 'var(--color-accent)' }}>BLOCKED</div></div>
            </motion.div>
          </div>
        </div>
      </motion.div>
      <motion.div className="absolute left-[6vw] bottom-[6vh] right-[6vw] flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.35, duration: .6 }}>
        <Wordmark />
        <div className="flex items-center gap-[.7vw]"><span className="mono text-[.7vw]" style={{ color: 'var(--color-secondary)' }}>IDENTITY OFF-CHAIN</span><span className="w-[3vw] h-px" style={{ background: 'var(--color-accent)' }} /><span className="mono text-[.7vw]" style={{ color: 'var(--color-secondary)' }}>BALLOT ON-CHAIN</span></div>
        <span className="mono text-[.68vw]" style={{ color: 'var(--color-secondary)' }}>05—AUDITABLE BY DESIGN</span>
      </motion.div>
    </SceneShell>
  );
}