/**
 * Generate aset brand PNG dari SVG logo (sumber: assets/images/logo/).
 * Jalankan: bun run scripts/generate-brand-assets.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { join } from 'node:path';

const LOGO_DIR = join(import.meta.dir, '../assets/images/logo');
const OUT_DIR = join(import.meta.dir, '../assets/images');

const render = (svgText: string, width: number) =>
  new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render().asPng();

// Bungkus markup ikon putih (mono-light) di kanvas lebih besar + padding aman
// untuk adaptive icon / splash.
const whiteMark = (canvas: number, scale: number) => {
  const inner = readFileSync(join(LOGO_DIR, 'mudasmart-logo-crescent-scan-mono-light.svg'), 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
  const offset = ((canvas - 240 * scale) / 2).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}" width="${canvas}" height="${canvas}"><g transform="translate(${offset} ${offset}) scale(${scale})">${inner}</g></svg>`;
};

const appIconSvg = readFileSync(join(LOGO_DIR, 'mudasmart-logo-crescent-scan-appicon.svg'), 'utf8');

writeFileSync(join(OUT_DIR, 'icon.png'), Buffer.from(render(appIconSvg, 1024)));
writeFileSync(join(OUT_DIR, 'favicon.png'), Buffer.from(render(appIconSvg, 48)));
writeFileSync(join(OUT_DIR, 'android-icon-foreground.png'), Buffer.from(render(whiteMark(1024, 2.7), 1024)));
writeFileSync(join(OUT_DIR, 'android-icon-monochrome.png'), Buffer.from(render(whiteMark(1024, 2.7), 1024)));
writeFileSync(join(OUT_DIR, 'splash-icon.png'), Buffer.from(render(whiteMark(512, 1.5), 512)));

console.log('Brand assets generated ✓');
