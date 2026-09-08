/**
 * Client-side video assembly. Real text-to-video models take minutes (well
 * past a serverless function's limit), so instead we render the finished
 * short in the browser: a Ken-Burns slideshow of the generated scene images
 * with crossfades, mixed with the voice-over, captured via MediaRecorder.
 *
 * Output is WebM (VP9/Opus) — the only format MediaRecorder produces
 * reliably across browsers. Plays in every browser and VLC; re-wrap to MP4
 * later if a platform needs it.
 */

export type AssembleInput = {
  imageUrls: string[];
  audioUrl?: string | null;
  aspectRatio: "9:16" | "16:9" | "1:1";
  durationSeconds: number;
  title?: string;
  onProgress?: (fraction: number) => void;
};

export type AssembleResult = { blob: Blob; mimeType: string; durationSeconds: number };

const DIMS: Record<AssembleInput["aspectRatio"], [number, number]> = {
  "9:16": [1080, 1920],
  "16:9": [1920, 1080],
  "1:1": [1080, 1080],
};

export function canAssembleVideo(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${url}`));
    img.src = url;
  });
}

/** cover-fit draw with a slow zoom/pan (Ken Burns), t in [0,1] over the shot. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  t: number,
  dir: number,
) {
  const zoom = 1.06 + 0.06 * t;
  const scale = Math.max(W / img.width, H / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const panX = (dir % 2 === 0 ? 1 : -1) * (dw - W) * 0.5 * (t - 0.5);
  const panY = (dir < 2 ? 1 : -1) * (dh - H) * 0.12 * (t - 0.5);
  ctx.drawImage(img, (W - dw) / 2 + panX, (H - dh) / 2 + panY, dw, dh);
}

export async function assembleVideo(input: AssembleInput): Promise<AssembleResult> {
  const { imageUrls, audioUrl, aspectRatio, durationSeconds, onProgress } = input;
  if (!canAssembleVideo()) throw new Error("This browser can't record video.");
  if (imageUrls.length === 0) throw new Error("No scene images to assemble.");

  const [W, H] = DIMS[aspectRatio];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#07070c";
  ctx.fillRect(0, 0, W, H);

  const settled = await Promise.allSettled(imageUrls.map(loadImage));
  const images = settled
    .filter((r): r is PromiseFulfilledResult<HTMLImageElement> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((img) => img && img.width > 0 && img.height > 0);
  if (images.length === 0) throw new Error("None of the scene images could be loaded.");
  onProgress?.(0.15);

  // Audio graph (optional).
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  if (audioUrl) {
    try {
      audioEl = new Audio();
      audioEl.crossOrigin = "anonymous";
      audioEl.src = audioUrl;
      await new Promise<void>((res, rej) => {
        audioEl!.onloadedmetadata = () => res();
        audioEl!.onerror = () => rej(new Error("audio load failed"));
        setTimeout(res, 4000);
      });
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
      audioDest = audioCtx.createMediaStreamDestination();
      audioCtx.createMediaElementSource(audioEl).connect(audioDest);
    } catch {
      audioEl = null; // silent video is fine
    }
  }

  const fps = 30;
  const stream = canvas.captureStream(fps);
  if (audioDest) for (const tr of audioDest.stream.getAudioTracks()) stream.addTrack(tr);

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

  const totalMs = Math.max(6, durationSeconds) * 1000;
  const perShot = totalMs / images.length;
  const fade = Math.min(500, perShot * 0.35);

  const done = new Promise<AssembleResult>((resolve) => {
    recorder.onstop = () => {
      audioCtx?.close().catch(() => {});
      resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType, durationSeconds });
    };
  });

  recorder.start();
  audioEl?.play().catch(() => {});
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      try {
        const elapsed = performance.now() - start;
        if (elapsed >= totalMs) {
          resolve();
          return;
        }
        const idx = Math.min(images.length - 1, Math.max(0, Math.floor(elapsed / perShot)));
        const cur = images[idx];
        const local = elapsed - idx * perShot;
        const t = Math.min(1, local / perShot);

        ctx.fillStyle = "#07070c";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        if (cur) drawCover(ctx, cur, W, H, t, idx);

        const next = images[idx + 1];
        if (next && local > perShot - fade) {
          ctx.globalAlpha = Math.min(1, (local - (perShot - fade)) / fade);
          drawCover(ctx, next, W, H, 0, idx + 1);
          ctx.globalAlpha = 1;
        }

        onProgress?.(0.15 + 0.8 * (elapsed / totalMs));
      } catch {
        // one bad frame shouldn't hang the whole render
      }
      // setTimeout, not rAF: rAF is throttled to ~0 in a background/headless tab.
      setTimeout(tick, 1000 / fps);
    };
    tick();
  });

  recorder.stop();
  audioEl?.pause();
  onProgress?.(0.97);
  return done;
}
