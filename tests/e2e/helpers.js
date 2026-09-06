import { chromium } from '@playwright/test';
import path from 'node:path';
export function fakeBrowser(fixture) {
  return chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${path.resolve(`tests/fixtures/${fixture}.wav`)}`] });
}
export async function instrumentAudio(page) {
  await page.addInitScript(() => {
    window.__micCalls = 0; window.__contextCount = 0; window.__workers = []; window.__workerTimings = []; window.__transferred = true;
    const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (...args) => { window.__micCalls += 1; const stream = await gum(...args); window.__testStream = stream; return stream; };
    const Context = window.AudioContext;
    window.AudioContext = class extends Context { constructor(...args) { super(...args); window.__contextCount += 1; window.__testContext = this; } };
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(url, ...args) {
        super(url, ...args); window.__workers.push(String(url));
        this.addEventListener('message', ({ data }) => { if (data.sentAt) window.__workerTimings.push({ elapsed: performance.now() - data.sentAt, processing: data.processingMs }); });
      }
      postMessage(data, transfer) { super.postMessage(data, transfer); if (data.input) window.__transferred = window.__transferred && data.input.byteLength === 0; }
    };
  });
}
