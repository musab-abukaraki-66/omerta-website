/** Messages between the page (host) and the orbit-stage worker. */
export interface SerializableStageOptions {
  width: number;
  height: number;
  dpr: number;
  reducedMotion: boolean;
  coarse: boolean;
  textureSize: '1k' | '2k';
  baseUrl: string;
}
export type HostMessage =
  | { type: 'init'; canvas: OffscreenCanvas; options: SerializableStageOptions }
  | { type: 'progress'; value: number }
  | { type: 'active'; value: boolean }
  | { type: 'hidden'; value: boolean }
  | { type: 'pointer'; x: number; y: number }
  | { type: 'resize'; width: number; height: number }
  | { type: 'frames'; id: number }
  | { type: 'dispose' };
export type WorkerMessage =
  | { type: 'first-frame' }
  | { type: 'context-lost' }
  | { type: 'error'; message: string }
  | { type: 'frames'; id: number; value: number };
