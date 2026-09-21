import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from './useSceneControls';

const SCENE_DETAILS: Record<string, { title: string; filePath: string }> = {
  opening: { title: 'Trust thesis', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
  identity: { title: 'Biometric gate', filePath: 'src/components/video/video_scenes/Scene2.tsx' },
  services: { title: 'Service topology', filePath: 'src/components/video/video_scenes/Scene3.tsx' },
  journey: { title: 'Voter journey', filePath: 'src/components/video/video_scenes/Scene4.tsx' },
  ledger: { title: 'Solidity ledger', filePath: 'src/components/video/video_scenes/Scene5.tsx' },
};

function announceSceneSelection(index: number, sceneKeys: string[]) {
  const key = sceneKeys[index];
  const details = SCENE_DETAILS[key];
  if (!details) return;

  window.parent.postMessage({
    type: 'REPLIT_VIDEO_SCENE_SELECTED',
    payload: {
      sceneIndex: index,
      sceneCount: sceneKeys.length,
      sceneTitle: details.title,
      filePath: details.filePath,
      lineNumber: 1,
    },
  }, '*');
}

const PROGRESS_TICK_MS = 60;

function formatPlaybackTime(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function PlaybackStatus({
  sceneKeys,
  activeIndex,
  activeDuration,
  activeStartTime,
  totalDuration,
  tick,
  paused,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  activeStartTime: number;
  totalDuration: number;
  tick: number;
  paused: boolean;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const elapsedBaseRef = useRef(0);

  useEffect(() => {
    setElapsed(0);
    elapsedBaseRef.current = 0;
  }, [tick]);

  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setElapsed(elapsedBaseRef.current + performance.now() - startedAt);
    }, PROGRESS_TICK_MS);

    return () => {
      window.clearInterval(interval);
      elapsedBaseRef.current += performance.now() - startedAt;
    };
  }, [paused, tick]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;
  const totalElapsed = Math.min(totalDuration, activeStartTime + Math.min(elapsed, activeDuration));

  return (
    <>
      <div className="flex flex-1 items-center gap-1.5">
        {sceneKeys.map((key, index) => (
          <button
            key={key}
            type="button"
            onClick={() => onJumpTo(index)}
            className="relative h-3 min-h-3 flex-1 overflow-hidden rounded-full bg-white/20 transition-all hover:h-4 hover:bg-white/30"
            aria-label={`Jump to scene ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-white/90"
              style={{ width: `${index === activeIndex ? progress * 100 : 0}%` }}
            />
          </button>
        ))}
      </div>
      <div className="shrink-0 font-mono text-sm tabular-nums text-white/65">
        {activeIndex + 1}/{sceneKeys.length}
      </div>
      <div className="min-w-[8ch] shrink-0 text-right font-mono text-sm tabular-nums text-white/80">
        {formatPlaybackTime(totalElapsed)} / {formatPlaybackTime(totalDuration)}
      </div>
    </>
  );
}

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const sensorRef = useRef<HTMLDivElement | null>(null);
  const {
    sceneKeys,
    activeIndex,
    locked,
    paused,
    mountKey,
    tick,
    durations,
    activeDuration,
    activeStartTime,
    totalDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
    togglePause,
  } = useSceneControls(SCENE_DURATIONS);

  const handleJumpTo = useCallback((index: number) => {
    jumpTo(index);
    announceSceneSelection(index, sceneKeys);
  }, [jumpTo, sceneKeys]);

  useEffect(() => {
    if (!paused) return;
    const running = document.getAnimations().filter((animation) => animation.playState === 'running');
    running.forEach((animation) => animation.pause());
    return () => running.forEach((animation) => animation.play());
  }, [paused]);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (sensorRef.current && !sensorRef.current.contains(event.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [collapsed, tapPinned]);

  if (!isIframed) return <VideoTemplate />;

  const visible = !collapsed || hovering || tapPinned;

  return (
    <div className="relative h-screen w-full">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        paused={paused}
        loop
        onSceneChange={onSceneChange}
      />
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex h-1/4 flex-col justify-end"
        onPointerEnter={(event) => event.pointerType === 'mouse' && setHovering(true)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setHovering(false)}
        onPointerDown={(event) => event.pointerType !== 'mouse' && collapsed && setTapPinned(true)}
      >
        <div className="flex-1" aria-hidden="true" />
        <div
          className={`flex items-center gap-2 bg-[#101b32]/85 px-3 py-2 backdrop-blur-md transition-all duration-200 ${
            visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
          aria-hidden={!visible}
        >
          <button
            type="button"
            onClick={togglePause}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            title={paused ? 'Play' : 'Pause'}
            aria-label={paused ? 'Play' : 'Pause'}
          >
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            type="button"
            onClick={toggleLock}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
              locked ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
            aria-label={locked ? 'Loop current scene: on' : 'Loop current scene: off'}
            aria-pressed={locked}
          >
            <Repeat size={18} />
          </button>
          <div className="h-6 w-px bg-white/15" aria-hidden="true" />
          <PlaybackStatus
            sceneKeys={sceneKeys}
            activeIndex={activeIndex}
            activeDuration={activeDuration}
            activeStartTime={activeStartTime}
            totalDuration={totalDuration}
            tick={tick}
            paused={paused}
            onJumpTo={handleJumpTo}
          />
          <button
            type="button"
            onClick={() => {
              setCollapsed((value) => !value);
              setHovering(false);
              setTapPinned(false);
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
            title={collapsed ? 'Show controls' : 'Hide controls'}
            aria-label={collapsed ? 'Show controls' : 'Hide controls'}
          >
            {collapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}