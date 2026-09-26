#!/usr/bin/env node
/**
 * Category frame builder + product-to-image mapper.
 *
 * Every commissioned source photo (`scripts/image-sources.json`) is turned into
 * three editorial frames:
 *   <name>.jpg          – full frame (the commissioned shot)
 *   <name>-frame-b.jpg  – tight detail crop
 *   <name>-frame-c.jpg  – mirrored full frame
 *
 * Products are then matched to the most relevant frame inside their own
 * category (garment type > colour > audience), so each card shows imagery that
 * belongs to its category and product, and no two cards show the same frame.
 *
 * The mapping is written back into src/lib/demoSeed.ts (image_url values).
 * Re-run after commissioning new sources — the assignment improves as the
 * library grows.
 *
 * Usage: node scripts/build-category-frames.mjs [--dry-run]
 */
import { readFile, writeFile, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const IMAGES = path.join(ROOT, 'public', 'images');
const SEED = path.join(ROOT, 'src', 'lib', 'demoSeed.ts');

const manifest = JSON.parse(await readFile(path.join(ROOT, 'scripts', 'image-sources.json'), 'utf8'));
const seed = await readFile(SEED, 'utf8');

const FRAME_SUFFIXES = ['', '-frame-b', '-frame-c'];

/* ------------------------------------------------------------ frame build */

async function buildFrames() {
  let built = 0;
  for (const source of manifest.sources) {
    const abs = path.join(IMAGES, `${source.file}.jpg`);
    if (!existsSync(abs)) {
      console.warn(`[frames] missing source: ${source.file}.jpg`);
      continue;
    }
    const image = sharp(abs, { failOn: 'none' }).rotate();
    const meta = await image.metadata();
    const width = meta.width ?? 1000;
    const height = meta.height ?? 1250;

    if (!DRY_RUN) {
      // Frame B: tight detail crop around the visual centre.
      const side = Math.round(Math.min(width, height) * 0.46);
      const left = Math.max(0, Math.round((width - side) / 2));
      const top = Math.max(0, Math.round((height - side) * 0.34));
      await sharp(abs, { failOn: 'none' })
        .rotate()
        .extract({ left, top, width: Math.min(side, width - left), height: Math.min(side, height - top) })
        .resize({ width: 900, withoutEnlargement: true })
        .jpeg({ quality: 86, progressive: true })
        .toFile(path.join(IMAGES, `${source.file}-frame-b.jpg`));

      // Frame C: mirrored full frame (a second editorial framing of the shot).
      await sharp(abs, { failOn: 'none' })
        .rotate()
        .flop()
        .resize({ width: 900, withoutEnlargement: true })
        .jpeg({ quality: 86, progressive: true })
        .toFile(path.join(IMAGES, `${source.file}-frame-c.jpg`));
      built += 2;
    }
  }
  console.log(`[frames] ${built} derived frames from ${manifest.sources.length} sources`);
}

/* ---------------------------------------------------------------- matching */

const productRe = /\{\s*"id": "(prod-[^"]+)",\s*"name": "([^"]+)",\s*"slug": "([^"]+)",\s*"description": "([^"]+)",\s*"price": (\d+),\s*"image_url": "([^"]+)",\s*"category_id": "([^"]+)"/g;

function parseProducts() {
  const products = [];
  for (const match of seed.matchAll(productRe)) {
    products.push({
      id: match[1],
      name: match[2],
      slug: match[3],
      description: match[4],
      image: match[6],
      category: match[7].replace(/^cat-/, ''),
    });
  }
  return products;
}

function audienceOf(name) {
  if (name.includes('مردانه')) return 'men';
  if (name.includes('زنانه')) return 'women';
  return 'unisex';
}

function typeOf(category, name) {
  const table = manifest.typeKeywords[category] ?? {};
  // Longest keyword first so "ژاکت جین" wins over "ژاکت".
  const entries = Object.entries(table).sort((a, b) => Math.max(...b[1].map((k) => k.length)) - Math.max(...a[1].map((k) => k.length)));
  for (const [type, keywords] of entries) {
    if (keywords.some((keyword) => name.includes(keyword))) return type;
  }
  return null;
}

function scoreProduct(source, product) {
  let score = 0;
  const productType = typeOf(source.category, product.name);
  if (productType && productType === source.type) score += 5;
  else if (productType && source.type && productType !== source.type) score -= 1;

  if (product.name.includes(source.color)) score += 3;
  if (audienceOf(product.name) === source.audience) score += 2;
  else if (audienceOf(product.name) !== 'unisex' && source.audience !== 'unisex') score -= 1;

  // Prefer sources whose file name shares a token with the product slug.
  const slugToken = product.slug.split('-')[0];
  if (source.file.split('/')[1].startsWith(slugToken)) score += 2;

  return score;
}

function assign() {
  const products = parseProducts();
  const byCategory = new Map();
  for (const product of products) {
    if (!byCategory.has(product.category)) byCategory.set(product.category, []);
    byCategory.get(product.category).push(product);
  }

  const assignments = new Map(); // slug -> image path
  const frameUse = new Map(); // frame path -> times used

  for (const [category, list] of byCategory) {
    const sources = manifest.sources.filter((source) => source.category === category);
    if (!sources.length) {
      console.log(`[map] ${category}: no commissioned sources yet — keeping existing imagery`);
      continue;
    }

    const frames = [];
    for (const source of sources) {
      for (const suffix of FRAME_SUFFIXES) {
        frames.push({ source, path: `/images/${source.file}${suffix}.jpg`, use: 0 });
      }
    }

    // Assign the most specific products first so scarce matches are used well.
    const ordered = [...list].sort((a, b) => scoreProduct(bestSource(sources, b), b) - scoreProduct(bestSource(sources, a), a));
    for (const product of ordered) {
      const ranked = sources
        .map((source) => ({ source, score: scoreProduct(source, product) }))
        .sort((a, b) => b.score - a.score);

      let chosen = null;
      for (const candidate of ranked.slice(0, 3)) {
        const free = frames.filter((frame) => frame.source === candidate.source && frame.use === 0);
        if (free.length) {
          chosen = free[0];
          break;
        }
      }
      if (!chosen) {
        // All frames of the best sources are taken: reuse the least-used frame.
        const bestSlug = ranked[0].source.file;
        chosen = frames.filter((frame) => frame.source.file === bestSlug).sort((a, b) => a.use - b.use)[0];
      }
      chosen.use += 1;
      frameUse.set(chosen.path, chosen.use);
      assignments.set(product.slug, chosen.path);
    }
    console.log(`[map] ${category}: ${list.length} products -> ${sources.length} sources (${frames.length} frames)`);
  }

  return { products, assignments };
}

function bestSource(sources, product) {
  return [...sources].sort((a, b) => scoreProduct(b, product) - scoreProduct(a, product))[0];
}

/* ------------------------------------------------------------------- main */

await buildFrames();
const { products, assignments } = assign();

if (DRY_RUN) {
  for (const product of products) {
    const next = assignments.get(product.slug);
    if (next && next !== product.image) console.log(`  ${product.slug}: ${product.image} -> ${next}`);
  }
  console.log('[dry-run] no files written');
} else {
  let updated = await writeSeed(assignments);
  console.log(`[map] updated ${updated} image_url values in demoSeed.ts`);
  await pruneUnusedFrames(assignments);
}

// Derived frames no card points at are removed so the build stays lean; the
// builder re-derives them on the next run whenever the mapping needs them.
async function pruneUnusedFrames(assignments) {
  const used = new Set(assignments.values());
  let removed = 0;
  for (const source of manifest.sources) {
    for (const suffix of ['-frame-b', '-frame-c']) {
      const target = path.join(IMAGES, `${source.file}${suffix}.jpg`);
      if (existsSync(target) && !used.has(`/images/${source.file}${suffix}.jpg`)) {
        await rm(target, { force: true });
        removed += 1;
      }
    }
  }
  if (removed) console.log(`[frames] pruned ${removed} unused derived frames`);
}

async function writeSeed(assignments) {
  let count = 0;
  const output = seed.replace(productRe, (full, id, name, slug, description, price, image, category) => {
    const next = assignments.get(slug);
    if (!next || next === image) return full;
    count += 1;
    return full.replace(`"image_url": "${image}"`, `"image_url": "${next}"`);
  });
  if (count) await writeFile(SEED, output, 'utf8');
  return count;
}
