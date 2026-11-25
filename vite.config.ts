import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readdirSync } from 'fs';
import { basename, extname, resolve } from 'path';

const CHRONO_AUDIO_VIRTUAL_ID = 'virtual:chrono-audio';
const RESOLVED_CHRONO_AUDIO_ID = `\0${CHRONO_AUDIO_VIRTUAL_ID}`;
const VORTEX_AUDIO_VIRTUAL_ID = 'virtual:vortex-audio';
const RESOLVED_VORTEX_AUDIO_ID = `\0${VORTEX_AUDIO_VIRTUAL_ID}`;
const STRIKEBREAKER_AUDIO_VIRTUAL_ID = 'virtual:strikebreaker-audio';
const RESOLVED_STRIKEBREAKER_AUDIO_ID = `\0${STRIKEBREAKER_AUDIO_VIRTUAL_ID}`;

function scanAudioDir(audioDir: string, urlPrefix: string): Record<string, string> {
  if (!existsSync(audioDir)) return {};
  const supported = new Set(['.mp3', '.ogg', '.wav', '.m4a']);
  const tracks: Record<string, string> = {};
  for (const file of readdirSync(audioDir)) {
    const ext = extname(file).toLowerCase();
    if (!supported.has(ext)) continue;
    const key = basename(file, extname(file));
    // Prefer .mp3 if multiple formats share a stem
    if (!tracks[key] || ext === '.mp3') {
      tracks[key] = `${urlPrefix}${file}`;
    }
  }
  return tracks;
}

function gameAudioManifestPlugin(): Plugin {
  const chronoAudioDir = resolve(__dirname, 'public/assets/chrono/audio');
  const chronoSfxDir = resolve(__dirname, 'public/assets/chrono/sfx');
  const vortexAudioDir = resolve(__dirname, 'public/assets/vortex/audio');
  const vortexSfxDir = resolve(__dirname, 'public/assets/vortex/sfx');
  const strikeAudioDir = resolve(__dirname, 'public/assets/strikebreaker/audio');
  const strikeSfxDir = resolve(__dirname, 'public/assets/strikebreaker/sfx');

  return {
    name: 'game-audio-manifest',
    resolveId(id) {
      if (id === CHRONO_AUDIO_VIRTUAL_ID) return RESOLVED_CHRONO_AUDIO_ID;
      if (id === VORTEX_AUDIO_VIRTUAL_ID) return RESOLVED_VORTEX_AUDIO_ID;
      if (id === STRIKEBREAKER_AUDIO_VIRTUAL_ID) return RESOLVED_STRIKEBREAKER_AUDIO_ID;
    },
    load(id) {
      if (id === RESOLVED_CHRONO_AUDIO_ID) {
        const tracks = scanAudioDir(chronoAudioDir, '/assets/chrono/audio/');
        const sfx = scanAudioDir(chronoSfxDir, '/assets/chrono/sfx/');
        return [
          `export const AVAILABLE_CHRONO_TRACKS = ${JSON.stringify(tracks)};`,
          `export const AVAILABLE_CHRONO_SFX = ${JSON.stringify(sfx)};`,
        ].join('\n');
      }
      if (id === RESOLVED_VORTEX_AUDIO_ID) {
        const tracks = scanAudioDir(vortexAudioDir, '/assets/vortex/audio/');
        const sfx = scanAudioDir(vortexSfxDir, '/assets/vortex/sfx/');
        return [
          `export const AVAILABLE_VORTEX_TRACKS = ${JSON.stringify(tracks)};`,
          `export const AVAILABLE_VORTEX_SFX = ${JSON.stringify(sfx)};`,
        ].join('\n');
      }
      if (id === RESOLVED_STRIKEBREAKER_AUDIO_ID) {
        const tracks = scanAudioDir(strikeAudioDir, '/assets/strikebreaker/audio/');
        const sfx = scanAudioDir(strikeSfxDir, '/assets/strikebreaker/sfx/');
        return [
          `export const AVAILABLE_STRIKEBREAKER_TRACKS = ${JSON.stringify(tracks)};`,
          `export const AVAILABLE_STRIKEBREAKER_SFX = ${JSON.stringify(sfx)};`,
        ].join('\n');
      }
    },
    configureServer(server) {
      server.watcher.add(chronoAudioDir);
      server.watcher.add(chronoSfxDir);
      server.watcher.add(vortexAudioDir);
      server.watcher.add(vortexSfxDir);
      server.watcher.add(strikeAudioDir);
      server.watcher.add(strikeSfxDir);

      const invalidate = (file: string) => {
        if (file.startsWith(chronoAudioDir) || file.startsWith(chronoSfxDir)) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_CHRONO_AUDIO_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        if (file.startsWith(vortexAudioDir) || file.startsWith(vortexSfxDir)) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_VORTEX_AUDIO_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        if (file.startsWith(strikeAudioDir) || file.startsWith(strikeSfxDir)) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_STRIKEBREAKER_AUDIO_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
      };

      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gameAudioManifestPlugin()],
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        controller: resolve(__dirname, 'controller.html'),
      },
    },
  },
});
