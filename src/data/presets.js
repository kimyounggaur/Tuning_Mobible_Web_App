export const A4_DEFAULT = 440;

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
