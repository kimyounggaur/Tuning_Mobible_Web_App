import { readFile, readdir } from 'node:fs/promises';
import { dictionaries } from '../src/i18n/index.js';
import { INSTRUMENTS } from '../src/data/presets.js';
export async function checkTranslations() {
  const expected = Object.keys(dictionaries.ko).sort(); const errors = [];
  for (const [locale, values] of Object.entries(dictionaries)) {
    if (JSON.stringify(Object.keys(values).sort()) !== JSON.stringify(expected)) errors.push(`${locale}: mismatched keys`);
    for (const key of expected) {
      const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',');
      if (params(values[key] ?? '') !== params(dictionaries.ko[key])) errors.push(`${locale}.${key}: parameter mismatch`);
    }
  }
  const files = (await readdir('src', { recursive: true })).filter((file) => file.endsWith('.js') && !file.includes('.test.') && !file.replaceAll('\\', '/').startsWith('i18n/'));
  for (const file of files) {
    const source = await readFile(`src/${file}`, 'utf8');
    for (const match of source.matchAll(/\bt\('([^']+)'/g)) if (!expected.includes(match[1])) errors.push(`${file}: missing ${match[1]}`);
    for (const match of source.matchAll(/'(status\.[\w]+|mic\.[\w.]+|sw\.[\w]+)'/g)) if (!expected.includes(match[1])) errors.push(`${file}: missing ${match[1]}`);
  }
  const html = await readFile('index.html', 'utf8');
  for (const match of html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)) if (!expected.includes(match[1])) errors.push(`HTML: missing ${match[1]}`);
  for (const instrument of INSTRUMENTS) if (!expected.includes(`instrument.${instrument.id}`)) errors.push(`instrument.${instrument.id}`);
  return errors;
}
if (process.argv[1]?.endsWith('i18n-check.mjs')) {
  const errors = await checkTranslations(); console.log(errors.length ? errors.join('\n') : 'All translation keys and placeholders match (ko/en/ja).'); process.exitCode = errors.length ? 1 : 0;
}
