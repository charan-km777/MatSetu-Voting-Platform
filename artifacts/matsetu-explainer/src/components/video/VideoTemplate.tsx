import {
  SafeFrame,
  VideoCanvas,
  VideoPausedContext,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  opening: 6200,
  identity: 7200,
  services: 7200,
  journey: 7600,
  ledger: 7600,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_COMPONENTS: Record<string, ComponentType> = {
  opening: Scene1,
  identity: Scene2,
  services: Scene3,
  journey: Scene4,
  ledger: Scene5,
};

export interface VideoTemplateProps {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  onSceneChange?: (sceneKey: string) => void;
}

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  onSceneChange,
}: VideoTemplateProps = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Math.max(0, Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey));
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas
        className="video-shell"
        aspectRatio={VIDEO_ASPECT_RATIO}
        style={{ backgroundColor: 'var(--color-bg-light)' }}
      >
        <SafeFrame style={{ zIndex: 5 }}>
          <motion.div
            className="absolute inset-0"
            animate={{
              background: sceneIndex === 3
                ? 'linear-gradient(125deg, rgba(16,27,50,.05), rgba(82,197,189,.12))'
                : 'linear-gradient(125deg, rgba(229,97,77,.03), rgba(82,197,189,.08))',
            }}
            transition={{ duration: 1.2 }}
          />
          <motion.div
            className="absolute rounded-full border-[.08vw]"
            style={{ width: '49vw', height: '49vw', right: '-17vw', top: '-24vw', borderColor: 'rgba(82,197,189,.35)' }}
            animate={{ rotate: sceneIndex * 38, scale: sceneIndex === 3 ? 1.12 : 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="absolute rounded-full border-[.06vw]"
            style={{ width: '29vw', height: '29vw', left: sceneIndex === 3 ? '-10vw' : '78vw', bottom: sceneIndex === 3 ? '-15vw' : '-8vw', borderColor: 'rgba(229,97,77,.34)' }}
            animate={{ rotate: -sceneIndex * 24, opacity: sceneIndex === 3 ? .55 : .8 }}
            transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute left-[6vw] right-[6vw] top-[11.5vh] thin-rule opacity-40" />
          <div className="absolute left-[6vw] right-[6vw] bottom-[4vh] thin-rule opacity-40" />
          <div className="absolute left-[6vw] top-[7vh] right-[6vw] flex items-center justify-between" style={{ zIndex: 4 }}>
            <span className="mono text-[.62vw] tracking-[.12em]" style={{ color: 'var(--color-secondary)' }}>MATSETU / VOTING OPERATIONS</span>
            <span className="mono text-[.62vw]" style={{ color: 'var(--color-secondary)' }}>FIELD NOTE 01 — 16:9</span>
          </div>
          <AnimatePresence mode="sync" initial={false}>
            {SceneComponent && <SceneComponent key={currentSceneKey} />}
          </AnimatePresence>
        </SafeFrame>
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}
