import { defineConfig } from 'vite';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const buildTime = new Date().toISOString();
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_TIME__: JSON.stringify(buildTime) },
  plugins: [{
    name: 'tunestring-offline-build',
    async closeBundle() {
      const assets = (await readdir('dist/assets')).sort().map((file) => `/assets/${file}`);
      const hash = createHash('sha1');
      for (const asset of assets) hash.update(await readFile(path.join('dist', asset)));
      const id = hash.digest('hex').slice(0, 8);
      const publicFiles = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'];
      const precache = [...assets, ...publicFiles.map((name) => `/${name}`), '/build-info.json'];
      await writeFile('dist/build-info.json', JSON.stringify({ version: pkg.version, id, time: buildTime }));
      let worker = await readFile('dist/sw.js', 'utf8');
      worker = worker.replaceAll('__BUILD_ID__', id).replace("JSON.parse('__PRECACHE__')", JSON.stringify(precache));
      await writeFile('dist/sw.js', worker);
    },
  }],
});
