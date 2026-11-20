#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCodixelNature } from './codixel-nature.mjs';
import { generateCodixelVfx } from './codixel-vfx.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const PXL_BIN = path.resolve(ROOT, 'tools/pixel-pipeline/claude-pxl/bin/pxl.js');
const PXL_DIR = path.resolve(__dirname, 'pxl');
const STAGING_DIR = path.resolve(__dirname, 'out/staging');
const PREVIEW_DIR = path.resolve(__dirname, 'out/_preview');
const CHRONO_PUBLIC_DIR = path.resolve(ROOT, 'public/assets/chrono');
const PALETTE_JSON = path.resolve(ROOT, 'tools/pixel-pipeline/agent-skill-pixel-art/palettes/resurrect-64.json');
const SANITIZE_PY = path.resolve(__dirname, 'sanitize_png.py');
const BATCH_AUDIT_PY = path.resolve(ROOT, 'tools/pixel-pipeline/agent-skill-pixel-art/scripts/batch_audit.py');

const COLOR_CATEGORIES = [
  'heroes',
  'npcs',
  'enemies',
  'bosses',
  'buildings',
  'nature',
  'tiles',
  'backdrops',
  'portraits',
  'vfx',
];

const ALL_DIRS = [...COLOR_CATEGORIES, 'normals'];

const PXL_MODULES = [
  { file: 'heroes.px.js', defaultCategory: 'heroes' },
  { file: 'npcs.px.js', defaultCategory: 'npcs' },
  { file: 'enemies.px.js', defaultCategory: 'enemies' },
  { file: 'bosses.px.js', defaultCategory: 'bosses' },
  { file: 'architecture.px.js', defaultCategory: 'buildings' },
  { file: 'tilesets.px.js', defaultCategory: 'tiles' },
];

function cleanDirs() {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  fs.mkdirSync(STAGING_DIR, { recursive: true });
  fs.rmSync(PREVIEW_DIR, { recursive: true, force: true });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  for (const dir of ALL_DIRS) {
    const abs = path.join(CHRONO_PUBLIC_DIR, dir);
    fs.rmSync(abs, { recursive: true, force: true });
    fs.mkdirSync(abs, { recursive: true });
  }
}

function runPxlBuild(moduleFile, moduleStagingDir) {
  const srcPath = path.join(PXL_DIR, moduleFile);
  console.log(`[pxl] Building ${moduleFile}...`);
  execFileSync(
    process.execPath,
    [PXL_BIN, 'build', srcPath, '--out', moduleStagingDir, '--no-preview'],
    { stdio: 'inherit', cwd: ROOT },
  );
}

function collectPxlAssets() {
  const sanitizeItems = [];
  const manifestDraft = new Map();
  const normalSources = new Map(); // id -> srcPath

  for (const mod of PXL_MODULES) {
    const modName = mod.file.replace('.px.js', '');
    const modStaging = path.join(STAGING_DIR, modName);
    runPxlBuild(mod.file, modStaging);

    // Collect normal maps first
    const spritesDir = path.join(modStaging, 'sprites');
    if (fs.existsSync(spritesDir)) {
      for (const file of fs.readdirSync(spritesDir)) {
        if (!file.endsWith('.png')) continue;
        if (file.endsWith('_n.png')) {
          const baseId = file.slice(0, -6);
          const dstNorm = path.join(CHRONO_PUBLIC_DIR, 'normals', file);
          fs.copyFileSync(path.join(spritesDir, file), dstNorm);
          normalSources.set(baseId, `normals/${file}`);
          continue;
        }
        const id = file.slice(0, -4);
        if (id.endsWith('_preview')) continue;
        const category = id.startsWith('portrait_') ? 'portraits' : mod.defaultCategory;
        const dstRel = `${category}/${file}`;
        const dstAbs = path.join(CHRONO_PUBLIC_DIR, dstRel);
        sanitizeItems.push({
          id,
          category,
          src: path.join(spritesDir, file),
          dst: dstAbs,
          dstRel,
          frames: 1,
          fw: 0,
          fh: 0,
          strip_orphans: category !== 'tiles' && category !== 'portraits',
        });
        manifestDraft.set(id, {
          id,
          category,
          file: dstRel,
          frames: 1,
        });
      }
    }

    // Collect animated strips from anims/
    const animsDir = path.join(modStaging, 'anims');
    if (fs.existsSync(animsDir)) {
      for (const file of fs.readdirSync(animsDir)) {
        if (!file.endsWith('.png') || file.endsWith('_n.png')) continue;
        const id = file.slice(0, -4);
        if (id.endsWith('_preview')) continue;
        const jsonPath = path.join(animsDir, `${id}.json`);
        let framesCount = 1;
        let fw = 0;
        let fh = 0;
        let fps = 8;
        if (fs.existsSync(jsonPath)) {
          const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          const frameVals = Object.values(meta.frames || {});
          framesCount = frameVals.length || 1;
          if (frameVals[0]?.sourceSize) {
            fw = frameVals[0].sourceSize.w;
            fh = frameVals[0].sourceSize.h;
          }
          if (frameVals[0]?.duration) {
            fps = Math.max(1, Math.round(1000 / frameVals[0].duration));
          }
        }
        const category = mod.defaultCategory;
        const dstRel = `${category}/${file}`;
        const dstAbs = path.join(CHRONO_PUBLIC_DIR, dstRel);
        sanitizeItems.push({
          id,
          category,
          src: path.join(animsDir, file),
          dst: dstAbs,
          dstRel,
          frames: framesCount,
          fw,
          fh,
          strip_orphans: category !== 'tiles',
        });
        manifestDraft.set(id, {
          id,
          category,
          file: dstRel,
          frames: framesCount,
          fps,
        });
      }
    }
  }

  return { sanitizeItems, manifestDraft, normalSources };
}

function runBatchAudit() {
  console.log('\n[audit] Running agent-skill-pixel-art batch_audit.py across all color folders...');
  let totalFiles = 0;
  let totalFailures = 0;

  for (const cat of COLOR_CATEGORIES) {
    const dir = path.join(CHRONO_PUBLIC_DIR, cat);
    if (!fs.existsSync(dir)) {
      console.error(`[audit] Missing folder: ${dir}`);
      totalFailures += 1;
      continue;
    }
    const pngs = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));
    if (pngs.length === 0) {
      console.warn(`[audit] Warning: empty folder ${cat}/`);
      continue;
    }
    const proc = spawnSync(
      'python3',
      [BATCH_AUDIT_PY, '--dir', dir, '--grid', '8', '--max-colors', '64', '--json'],
      { encoding: 'utf8', cwd: ROOT },
    );
    let parsed = null;
    try {
      parsed = JSON.parse(proc.stdout);
    } catch {
      console.error(`[audit] Failed to parse JSON for ${cat}:\n${proc.stdout}\n${proc.stderr}`);
      totalFailures += 1;
      continue;
    }

    const filesList = Array.isArray(parsed) ? parsed : parsed.results || parsed.files || [];
    const failed = filesList.filter((r) => !r.passed && r.status !== 'pass' && r.ok !== true);
    // Double check generic JSON schema from batch_audit.py
    let failCount = 0;
    if (typeof parsed.failed === 'number') {
      failCount = parsed.failed;
    } else if (typeof parsed.fail_count === 'number') {
      failCount = parsed.fail_count;
    } else if (Array.isArray(filesList) && filesList.length > 0) {
      failCount = failed.length;
    } else if (proc.status !== 0) {
      failCount = 1;
    }

    totalFiles += pngs.length;
    if (failCount > 0 || proc.status !== 0) {
      totalFailures += Math.max(1, failCount);
      console.error(`[audit] FAIL in ${cat}/ (${failCount} issues out of ${pngs.length} files):`);
      console.error(proc.stdout);
    } else {
      console.log(`[audit] PASS ${cat}/ (${pngs.length} files cleanly audited)`);
    }
  }

  console.log(`[audit] Summary: ${totalFiles} color PNGs checked, ${totalFailures} failures.`);
  return totalFailures === 0;
}

function buildAll() {
  cleanDirs();

  const { sanitizeItems, manifestDraft, normalSources } = collectPxlBuildPhase();
  const sanitizeSpecPath = path.join(STAGING_DIR, 'sanitize-spec.json');
  fs.writeFileSync(
    sanitizeSpecPath,
    JSON.stringify({ palette: PALETTE_JSON, items: sanitizeItems }, null, 2),
  );

  console.log(`[sanitize] Quantizing & aligning ${sanitizeItems.length} pxl assets to Resurrect-64...`);
  const sanOut = execFileSync(
    'python3',
    [SANITIZE_PY, '--mode', 'sanitize-batch', '--spec', sanitizeSpecPath],
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 20 * 1024 * 1024 },
  );
  const sanDims = JSON.parse(sanOut);

  const manifestAssets = {};
  for (const [id, entry] of manifestDraft.entries()) {
    const dims = sanDims[id];
    const obj = {
      file: `/assets/chrono/${entry.file}`,
      w: dims.w,
      h: dims.h,
      fw: dims.fw,
      fh: dims.fh,
      frames: entry.frames,
    };
    if (entry.fps) obj.fps = entry.fps;
    if (normalSources.has(id)) obj.normal = `/assets/chrono/${normalSources.get(id)}`;
    manifestAssets[id] = obj;
  }

  console.log('[codixel] Generating nature trees, rocks, gems, and seamless backdrops...');
  const natureRes = generateCodixelNature(CHRONO_PUBLIC_DIR);
  for (const item of [...natureRes.nature, ...natureRes.backdrops]) {
    manifestAssets[item.id] = {
      file: `/assets/chrono/${item.file}`,
      w: item.w,
      h: item.h,
      fw: item.fw,
      fh: item.fh,
      frames: item.frames,
      ...(item.frames > 1 ? { fps: item.id.startsWith('gem_') ? 8 : 4 } : {}),
    };
  }

  console.log('[codixel] Generating animated VFX, projectiles, and deployables...');
  const vfxList = generateCodixelVfx(CHRONO_PUBLIC_DIR);
  for (const item of vfxList) {
    manifestAssets[item.id] = {
      file: `/assets/chrono/${item.file}`,
      w: item.w,
      h: item.h,
      fw: item.fw,
      fh: item.fh,
      frames: item.frames,
      ...(item.frames > 1 ? { fps: 10 } : {}),
    };
  }

  const manifest = {
    version: 1,
    palette: 'Resurrect-64',
    assetCount: Object.keys(manifestAssets).length,
    assets: manifestAssets,
  };
  fs.writeFileSync(
    path.join(CHRONO_PUBLIC_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`[manifest] Wrote public/assets/chrono/manifest.json (${manifest.assetCount} assets).`);

  // Generate contact sheets in out/_preview/ for visual inspection
  const categoriesSpec = {};
  for (const cat of COLOR_CATEGORIES) {
    const entries = Object.entries(manifestAssets)
      .filter(([, v]) => v.file.startsWith(`/assets/chrono/${cat}/`))
      .map(([id, v]) => ({
        id,
        abs_path: path.join(ROOT, 'public', v.file.replace(/^\//, '')),
        fw: v.fw,
        fh: v.fh,
        frames: v.frames,
      }));
    if (entries.length > 0) {
      categoriesSpec[cat] = {
        dst: path.join(PREVIEW_DIR, `${cat}.png`),
        scale: cat === 'backdrops' ? 1 : 2,
        cols: cat === 'backdrops' ? 2 : cat === 'bosses' ? 2 : cat === 'tiles' ? 10 : 6,
        entries,
      };
    }
  }
  const sheetSpecPath = path.join(STAGING_DIR, 'contact-spec.json');
  fs.writeFileSync(sheetSpecPath, JSON.stringify({ categories: categoriesSpec }, null, 2));
  execFileSync(
    'python3',
    [SANITIZE_PY, '--mode', 'contact-sheets', '--spec', sheetSpecPath],
    { stdio: 'inherit', cwd: ROOT },
  );

  // Clean up temporary staging PNG copies to keep repo tidy
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });

  const ok = runBatchAudit();
  if (!ok) process.exit(1);
}

function collectPxlBuildPhase() {
  return collectPxlAssets();
}

const isAuditOnly = process.argv.includes('--audit-only');
if (isAuditOnly) {
  const ok = runBatchAudit();
  process.exit(ok ? 0 : 1);
} else {
  buildAll();
}
