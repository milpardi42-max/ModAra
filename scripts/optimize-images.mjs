#!/usr/bin/env node
/**
 * Image pipeline for the ModAra storefront.
 *
 * For every source image under public/images it generates:
 *   <name>-640.webp    – card / thumbnail size
 *   <name>-1280.webp   – hero / gallery size (only when the source is wider)
 *   <name>-detail.webp – tight centre crop used as the gallery "detail shot"
 *
 * Originals are kept untouched as the <img> fallback for browsers without
 * WebP support. The script is incremental: existing outputs newer than their
 * source are skipped, so re-running is cheap.
 *
 * Usage: node scripts/optimize-images.mjs [--force]
 */
import { readdir, stat, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'images');
const FORCE = process.argv.includes('--force');

const SOURCE_RE = /\.(jpe?g|png)$/i;
const GENERATED_RE = /-(640|1280|detail)\.webp$/i;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (SOURCE_RE.test(entry.name) && !GENERATED_RE.test(entry.name)) files.push(full);
  }
  return files;
}

function baseName(file) {
  return file.replace(/\.(jpe?g|png)$/i, '');
}

async function isFresh(outPath, srcPath) {
  if (!existsSync(outPath)) return false;
  const [out, src] = await Promise.all([stat(outPath), stat(srcPath)]);
  return out.mtimeMs >= src.mtimeMs;
}

let sources = 0;
let generated = 0;
let skipped = 0;
let bytesBefore = 0;
let bytesAfter = 0;

async function emit(outPath, srcPath, pipeline) {
  if (!FORCE && (await isFresh(outPath, srcPath))) {
    skipped += 1;
    return;
  }
  await pipeline.toFile(outPath);
  generated += 1;
  bytesAfter += (await stat(outPath)).size;
}

for (const file of await walk(IMAGES_DIR)) {
  sources += 1;
  bytesBefore += (await stat(file)).size;
  const base = baseName(file);
  const image = sharp(file, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 1200;

  const jobs = [];

  // Both widths are always emitted (withoutEnlargement keeps small sources at
  // their native size) so the generated srcset is valid for every image.
  jobs.push(
    emit(`${base}-640.webp`, file, sharp(file, { failOn: 'none' }).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 78 })),
  );
  jobs.push(
    emit(`${base}-1280.webp`, file, sharp(file, { failOn: 'none' }).rotate().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 })),
  );

  // Gallery detail shot: 42% square crop around the visual centre, upscaled
  // only when the crop would end up smaller than 900px.
  const cropSide = Math.round(Math.min(width, meta.height ?? width) * 0.42);
  const left = Math.max(0, Math.round((width - cropSide) / 2));
  const top = Math.max(0, Math.round(((meta.height ?? width) - cropSide) * 0.38));
  jobs.push(
    emit(
      `${base}-detail.webp`,
      file,
      sharp(file, { failOn: 'none' })
        .rotate()
        .extract({ left, top, width: Math.min(cropSide, width - left), height: Math.min(cropSide, (meta.height ?? width) - top) })
        .resize({ width: 900, withoutEnlargement: true })
        .webp({ quality: 80 }),
    ),
  );

  await Promise.all(jobs);
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(
  `[images] ${sources} sources | ${generated} generated | ${skipped} up-to-date | new output ${mb(bytesAfter)} (sources ${mb(bytesBefore)})`,
);
await mkdir(path.join(ROOT, 'public'), { recursive: true });
