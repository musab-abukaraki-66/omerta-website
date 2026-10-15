/// <reference lib="webworker" />
/**
 * Dedicated worker that owns the WebGL orbit stage on a transferred OffscreenCanvas.
 * All three.js parsing, shader compilation, texture decoding and rendering happen
 * here, off the main thread.
 */
import { createOrbitStage, type OrbitStage } from './orbit-stage';
import type { HostMessage, WorkerMessage } from './orbit-protocol';

declare const self: DedicatedWorkerGlobalScope;
let stage: OrbitStage | null = null;
const post = (m: WorkerMessage): void => self.postMessage(m);

self.onmessage = (e: MessageEvent<HostMessage>) => {
  const m = e.data;
  try {
    switch (m.type) {
      case 'init':
        if (stage) return; // duplicate init guard
        stage = createOrbitStage({
          ...m.options,
          canvas: m.canvas,
          onFirstFrame: () => post({ type: 'first-frame' }),
          onContextLost: () => post({ type: 'context-lost' }),
        });
        stage.ready.catch((err: unknown) => post({ type: 'error', message: String(err) }));
        break;
      case 'progress':
        stage?.setProgress(m.value);
        break;
      case 'active':
        stage?.setActive(m.value);
        break;
      case 'hidden':
        stage?.setHidden(m.value);
        break;
      case 'pointer':
        stage?.setPointer(m.x, m.y);
        break;
      case 'resize':
        stage?.resize(m.width, m.height);
        break;
      case 'frames':
        post({ type: 'frames', id: m.id, value: stage?.frames ?? 0 });
        break;
      case 'dispose':
        stage?.dispose();
        stage = null;
        self.close();
        break;
    }
  } catch (err) {
    post({ type: 'error', message: String(err) });
  }
};
