import {
  SafeFrame,
  VideoCanvas,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  opening: 6200,
  identity: 7200,
  services: 7200,
  journey: 7600,
  ledger: 7600,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <VideoCanvas
      className="video-shell"
      aspectRatio={VIDEO_ASPECT_RATIO}
      style={{ backgroundColor: 'var(--color-bg-light)' }}
    >
      <SafeFrame style={{ zIndex: 5 }}>
        <motion.div
          className="absolute inset-0"
          animate={{
            background: currentScene === 3
              ? 'linear-gradient(125deg, rgba(16,27,50,.05), rgba(82,197,189,.12))'
              : 'linear-gradient(125deg, rgba(229,97,77,.03), rgba(82,197,189,.08))',
          }}
          transition={{ duration: 1.2 }}
        />
        <motion.div
          className="absolute rounded-full border-[.08vw]"
          style={{ width: '49vw', height: '49vw', right: '-17vw', top: '-24vw', borderColor: 'rgba(82,197,189,.35)' }}
          animate={{ rotate: currentScene * 38, scale: currentScene === 3 ? 1.12 : 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute rounded-full border-[.06vw]"
          style={{ width: '29vw', height: '29vw', left: currentScene === 3 ? '-10vw' : '78vw', bottom: currentScene === 3 ? '-15vw' : '-8vw', borderColor: 'rgba(229,97,77,.34)' }}
          animate={{ rotate: -currentScene * 24, opacity: currentScene === 3 ? .55 : .8 }}
          transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute left-[6vw] right-[6vw] top-[11.5vh] thin-rule opacity-40" />
        <div className="absolute left-[6vw] right-[6vw] bottom-[4vh] thin-rule opacity-40" />
        <div className="absolute left-[6vw] top-[7vh] right-[6vw] flex justify-between items-center" style={{ zIndex: 4 }}>
          <span className="mono text-[.62vw] tracking-[.12em]" style={{ color: 'var(--color-secondary)' }}>MATSETU / VOTING OPERATIONS</span>
          <span className="mono text-[.62vw]" style={{ color: 'var(--color-secondary)' }}>FIELD NOTE 01 — 16:9</span>
        </div>
        <AnimatePresence mode="sync" initial={false}>
          {currentScene === 0 && <Scene1 key="opening" />}
          {currentScene === 1 && <Scene2 key="identity" />}
          {currentScene === 2 && <Scene3 key="services" />}
          {currentScene === 3 && <Scene4 key="journey" />}
          {currentScene === 4 && <Scene5 key="ledger" />}
        </AnimatePresence>
      </SafeFrame>
    </VideoCanvas>
  );
}
