#!/usr/bin/env node
/**
 * Generates the static brand assets that live in public/:
 *   favicon.svg          – vector mark (also used as the mask-icon source)
 *   apple-touch-icon.png – 180×180 rasterised from the svg
 *   images/og-cover.jpg  – 1200×630 social share card
 *
 * Usage: node scripts/generate-og.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#c2410c"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="#1c1917"/>
  <rect x="6" y="6" width="52" height="52" rx="13" fill="url(#g)"/>
  <path d="M20 26h24v20a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M26 26v-4a6 6 0 0 1 12 0v4" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
</svg>`;

async function main() {
  await writeFile(path.join(ROOT, 'public', 'favicon.svg'), FAVICON_SVG.trim());

  await sharp(Buffer.from(FAVICON_SVG), { density: 384 })
    .resize(180, 180)
    .png()
    .toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'));

  const picks = [
    'images/clothing/denim-jacket-men.jpg',
    'images/watch/steel-chronograph-watch.jpg',
    'images/bag/leather-tote-bag-tan.jpg',
  ];

  const panels = [];
  const panelW = 300;
  const panelH = 470;
  const gap = 18;
  const startX = 1200 - 64 - (panelW * 3 + gap * 2);

  for (const [index, rel] of picks.entries()) {
    const file = path.join(ROOT, 'public', rel);
    const tile = await sharp(file, { failOn: 'none' })
      .rotate()
      .resize(panelW, panelH, { fit: 'cover', position: 'attention' })
      .toBuffer();
    panels.push({ input: tile, left: startX + index * (panelW + gap), top: 84 });
  }

  const label = `MODARA`;
  const sub = `FASHION &amp; ACCESSORIES`;

  const overlay = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="veil" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#14100d" stop-opacity="0.96"/>
        <stop offset="0.55" stop-color="#14100d" stop-opacity="0.82"/>
        <stop offset="1" stop-color="#14100d" stop-opacity="0.15"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#veil)"/>
    <text x="72" y="300" font-family="DejaVu Sans" font-size="118" font-weight="bold" fill="#fafaf9" letter-spacing="10">${label}</text>
    <rect x="76" y="332" width="120" height="5" fill="#f59e0b"/>
    <text x="72" y="392" font-family="DejaVu Sans" font-size="30" fill="#d6d3d1" letter-spacing="7">${sub}</text>
    <text x="72" y="548" font-family="DejaVu Sans" font-size="24" fill="#a8a29e" letter-spacing="3">modara.shop</text>
  </svg>`;

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: '#14100d',
    },
  })
    .composite([
      ...panels,
      { input: Buffer.from(overlay), top: 0, left: 0 },
    ])
    .jpeg({ quality: 86, progressive: true })
    .toFile(path.join(ROOT, 'public', 'images', 'og-cover.jpg'));

  // Keep the font reference honest even when the file is missing on other machines.
  const fontOk = await readFile(FONT).then(() => true).catch(() => false);
  if (!fontOk) console.warn('[og] DejaVu Sans not found; text may render with a fallback font.');

  console.log('[og] favicon.svg, apple-touch-icon.png and images/og-cover.jpg written');
}

await main();
