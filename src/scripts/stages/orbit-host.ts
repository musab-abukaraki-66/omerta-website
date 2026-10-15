/**
 * Starts the orbit stage either in a Web Worker (OffscreenCanvas) or, where that is
 * unsupported, on the main thread. Both paths expose the same small interface.
 */
import type { HostMessage, SerializableStageOptions, WorkerMessage } from './orbit-protocol';

export interface StageHost {
  readonly mode: 'worker' | 'main';
  setProgress(p: number): void;
  setActive(a: boolean): void;
  setHidden(h: boolean): void;
  setPointer(x: number, y: number): void;
  resize(w: number, h: number): void;
  frames(): Promise<number>;
  dispose(): void;
}
interface Callbacks {
  onFirstFrame: () => void;
  onFailure: (reason: string) => void;
}

/**
 * Feature detection only — no WebGL context is created on the main thread (context
 * creation is expensive). If the worker turns out unable to create a WebGL2 context
 * (e.g. Safari 16 exposes OffscreenCanvas without WebGL), it reports an error and
 * the page keeps the poster.
 */
export const supportsWorkerStage = (canvas: HTMLCanvasElement): boolean =>
  typeof Worker !== 'undefined' &&
  typeof OffscreenCanvas !== 'undefined' &&
  typeof canvas.transferControlToOffscreen === 'function' &&
  typeof createImageBitmap === 'function';

export const startWorkerStage = (canvas: HTMLCanvasElement, options: SerializableStageOptions, cb: Callbacks): StageHost => {
  const worker = new Worker(new URL('./orbit-worker.ts', import.meta.url), { type: 'module', name: 'orbit-stage' });
  const offscreen = canvas.transferControlToOffscreen();
  const pending = new Map<number, (v: number) => void>();
  let seq = 0;
  const send = (m: HostMessage, transfer: Transferable[] = []): void => worker.postMessage(m, transfer);
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const m = e.data;
    if (m.type === 'first-frame') cb.onFirstFrame();
    else if (m.type === 'context-lost') cb.onFailure('context-lost');
    else if (m.type === 'error') cb.onFailure(m.message);
    else if (m.type === 'frames') pending.get(m.id)?.(m.value), pending.delete(m.id);
  };
  worker.onerror = (e) => cb.onFailure(e.message || 'worker error');
  send({ type: 'init', canvas: offscreen, options }, [offscreen]);
  return {
    mode: 'worker',
    setProgress: (value) => send({ type: 'progress', value }),
    setActive: (value) => send({ type: 'active', value }),
    setHidden: (value) => send({ type: 'hidden', value }),
    setPointer: (x, y) => send({ type: 'pointer', x, y }),
    resize: (width, height) => send({ type: 'resize', width, height }),
    frames: () =>
      new Promise((res) => {
        const id = ++seq;
        pending.set(id, res);
        send({ type: 'frames', id });
        setTimeout(() => pending.has(id) && (pending.delete(id), res(-1)), 2000); // worker gone
      }),
    dispose: () => {
      send({ type: 'dispose' });
      setTimeout(() => worker.terminate(), 200);
    },
  };
};

export const startMainThreadStage = async (canvas: HTMLCanvasElement, options: SerializableStageOptions, cb: Callbacks): Promise<StageHost> => {
  const { createOrbitStage } = await import('./orbit-stage');
  const stage = createOrbitStage({ ...options, canvas, onFirstFrame: cb.onFirstFrame, onContextLost: () => cb.onFailure('context-lost') });
  stage.ready.catch((err: unknown) => cb.onFailure(String(err)));
  return {
    mode: 'main',
    setProgress: (p) => stage.setProgress(p),
    setActive: (a) => stage.setActive(a),
    setHidden: (h) => stage.setHidden(h),
    setPointer: (x, y) => stage.setPointer(x, y),
    resize: (w, h) => stage.resize(w, h),
    frames: () => Promise.resolve(stage.frames),
    dispose: () => stage.dispose(),
  };
};
