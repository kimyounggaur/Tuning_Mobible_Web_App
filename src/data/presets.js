import { LOW_RANGE_THRESHOLD_HZ } from '../config.js';
export const A4_DEFAULT = 440;
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const midiToFreq = (m, a4 = A4_DEFAULT) => a4 * Math.pow(2, (m - 69) / 12);

export const INSTRUMENTS = [
  { id: 'guitar', name: '기타', lowRange: false, tunings: [
    { id: 'standard', name: 'Standard',
      strings: [{ n: 'E2', m: 40 }, { n: 'A2', m: 45 }, { n: 'D3', m: 50 }, { n: 'G3', m: 55 }, { n: 'B3', m: 59 }, { n: 'E4', m: 64 }] },
    { id: 'drop-d', name: 'Drop D',
      strings: [{ n: 'D2', m: 38 }, { n: 'A2', m: 45 }, { n: 'D3', m: 50 }, { n: 'G3', m: 55 }, { n: 'B3', m: 59 }, { n: 'E4', m: 64 }] },
    { id: 'half-down', name: 'Half-step Down',
      strings: [{ n: 'D#2', m: 39 }, { n: 'G#2', m: 44 }, { n: 'C#3', m: 49 }, { n: 'F#3', m: 54 }, { n: 'A#3', m: 58 }, { n: 'D#4', m: 63 }] },
    { id: 'dadgad', name: 'DADGAD',
      strings: [{ n: 'D2', m: 38 }, { n: 'A2', m: 45 }, { n: 'D3', m: 50 }, { n: 'G3', m: 55 }, { n: 'A3', m: 57 }, { n: 'D4', m: 62 }] },
    { id: 'open-g', name: 'Open G',
      strings: [{ n: 'D2', m: 38 }, { n: 'G2', m: 43 }, { n: 'D3', m: 50 }, { n: 'G3', m: 55 }, { n: 'B3', m: 59 }, { n: 'D4', m: 62 }] },
  ] },
  { id: 'bass', name: '베이스', lowRange: true, tunings: [
    { id: '4-string', name: '4현 Standard',
      strings: [{ n: 'E1', m: 28 }, { n: 'A1', m: 33 }, { n: 'D2', m: 38 }, { n: 'G2', m: 43 }] },
    { id: '5-string', name: '5현 Standard',
      strings: [{ n: 'B0', m: 23 }, { n: 'E1', m: 28 }, { n: 'A1', m: 33 }, { n: 'D2', m: 38 }, { n: 'G2', m: 43 }] },
  ] },
  { id: 'ukulele', name: '우쿨렐레', lowRange: false, tunings: [
    { id: 'high-g', name: 'High-G (표준)',
      strings: [{ n: 'G4', m: 67 }, { n: 'C4', m: 60 }, { n: 'E4', m: 64 }, { n: 'A4', m: 69 }] },
    { id: 'low-g', name: 'Low-G',
      strings: [{ n: 'G3', m: 55 }, { n: 'C4', m: 60 }, { n: 'E4', m: 64 }, { n: 'A4', m: 69 }] },
  ] },
  { id: 'violin', name: '바이올린', lowRange: false, tunings: [
    { id: 'standard', name: 'Standard',
      strings: [{ n: 'G3', m: 55 }, { n: 'D4', m: 62 }, { n: 'A4', m: 69 }, { n: 'E5', m: 76 }] },
  ] },
  { id: 'viola', name: '비올라', lowRange: false, tunings: [
    { id: 'standard', name: 'Standard',
      strings: [{ n: 'C3', m: 48 }, { n: 'G3', m: 55 }, { n: 'D4', m: 62 }, { n: 'A4', m: 69 }] },
  ] },
  { id: 'cello', name: '첼로', lowRange: true, tunings: [
    { id: 'standard', name: 'Standard',
      strings: [{ n: 'C2', m: 36 }, { n: 'G2', m: 43 }, { n: 'D3', m: 50 }, { n: 'A3', m: 57 }] },
  ] },
  { id: 'doublebass', name: '콘트라베이스', lowRange: true, tunings: [
    { id: 'standard', name: 'Standard',
      strings: [{ n: 'E1', m: 28 }, { n: 'A1', m: 33 }, { n: 'D2', m: 38 }, { n: 'G2', m: 43 }] },
  ] },
  { id: 'mandolin', name: '만돌린', lowRange: false, tunings: [
    { id: 'standard', name: 'Standard (4복현)',
      strings: [{ n: 'G3', m: 55 }, { n: 'D4', m: 62 }, { n: 'A4', m: 69 }, { n: 'E5', m: 76 }] },
  ] },
  { id: 'banjo', name: '밴조', lowRange: false, tunings: [
    { id: 'open-g', name: 'Open G (5현)',
      strings: [{ n: 'G4', m: 67 }, { n: 'D3', m: 50 }, { n: 'G3', m: 55 }, { n: 'B3', m: 59 }, { n: 'D4', m: 62 }] },
  ] },
  { id: 'chromatic', name: '크로매틱', lowRange: false, tunings: [] },
];

const additions = {
  guitar: [
    ['drop-c', 'Drop C', [36, 43, 48, 53, 57, 62]],
    ['d-standard', 'D Standard', [38, 43, 48, 53, 57, 62]],
    ['double-drop-d', 'Double Drop D', [38, 45, 50, 55, 59, 62]],
    ['open-d', 'Open D', [38, 45, 50, 54, 57, 62]],
    ['open-e', 'Open E', [40, 47, 52, 56, 59, 64]],
    ['7-string', '7-string Standard', [35, 40, 45, 50, 55, 59, 64]],
  ],
  bass: [['drop-d', 'Drop D', [26, 33, 38, 43]], ['half-down', 'Half-step Down', [27, 32, 37, 42]], ['6-string', '6-string Standard', [23, 28, 33, 38, 43, 48]]],
  ukulele: [['baritone', 'Baritone', [50, 55, 59, 64]], ['d-tuning', 'D tuning', [69, 62, 66, 71]]],
  doublebass: [['solo', 'Solo', [30, 35, 40, 45]], ['5-string-c', '5-string (Low C)', [24, 28, 33, 38, 43]]],
  banjo: [['double-c', 'Double C', [67, 48, 55, 60, 62]], ['open-d', 'Open D', [66, 50, 54, 57, 62]]],
};
export function stringsFromMidi(midis) {
  return midis.map((m) => ({ m, n: `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}` }));
}
for (const instrument of INSTRUMENTS) {
  for (const [id, name, midis] of additions[instrument.id] ?? []) instrument.tunings.push({ id, name, strings: stringsFromMidi(midis) });
}
// TODO: 연주자에게 유파, 청, 현별 간격 검수 필요. 아래 간격은 구조 확인용 임시 예시다.
for (const [id, name, reference, intervals] of [
  ['gayageum', '가야금', 36, [0, 2, 5, 7, 9, 12, 14, 17, 19, 21, 24, 26]],
  ['geomungo', '거문고', 36, [0, 7, 12, 19, 24, 31]],
  ['haegeum', '해금', 55, [0, 7]],
]) INSTRUMENTS.splice(INSTRUMENTS.length - 1, 0, { id, name, reference, lowRange: false, tunings: [
  { id: 'relative-example', name: '상대 조현 (임시)', relative: true, provisional: true,
    source: '사용자 제공 v2 설계서의 구조 예시. 음정 간격 및 기준음은 연주자 검수 전.',
    strings: intervals.map((i) => ({ i })) },
] });

export function resolveTuning(tuning, reference = 48) {
  if (!tuning?.relative) return tuning;
  return { ...tuning, strings: stringsFromMidi(tuning.strings.map((string) => reference + string.i)) };
}
export function isLowRange(tuning, a4 = A4_DEFAULT) {
  return Boolean(tuning?.strings.some((string) => midiToFreq(string.m, a4) < LOW_RANGE_THRESHOLD_HZ));
}
