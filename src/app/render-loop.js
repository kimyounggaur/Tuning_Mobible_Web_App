// 프레임 시각과 렌더 콜백을 안다.
// 음정 계산과 오디오 엔진은 모른다.
export function createRenderLoop({ render, tick, env = globalThis }) {
  let frame = null;
  let previous = 0;
  function loop(time) {
    const dt = previous ? Math.min(100, time - previous) : 1000 / 60;
    previous = time; render(time); tick(dt);
    frame = env.requestAnimationFrame(loop);
  }
  function stop() { if (frame !== null) env.cancelAnimationFrame(frame); frame = null; previous = 0; }
  function start() { if (frame === null) frame = env.requestAnimationFrame(loop); }
  return { start, stop };
}
