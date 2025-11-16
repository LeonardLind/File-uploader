declare module "https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/ffmpeg.min.mjs" {
  export function createFFmpeg(options?: any): any;
  export function fetchFile(path: string | File | Blob): Promise<Uint8Array>;
}
