import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readdirSync } from 'fs';
import { basename, extname, resolve } from 'path';

const CHRONO_AUDIO_VIRTUAL_ID = 'virtual:chrono-audio';
const RESOLVED_CHRONO_AUDIO_ID = `\0${CHRONO_AUDIO_VIRTUAL_ID}`;

function scanChronoAudioTracks(audioDir: string): Record<string, string> {
  if (!existsSync(audioDir)) return {};
  const supported = new Set(['.mp3', '.ogg', '.wav', '.m4a']);
  const tracks: Record<string, string> = {};
  for (const file of readdirSync(audioDir)) {
    const ext = extname(file).toLowerCase();
    if (!supported.has(ext)) continue;
    const key = basename(file, extname(file));
    // Prefer .mp3 if multiple formats share a stem
    if (!tracks[key] || ext === '.mp3') {
      tracks[key] = `/assets/chrono/audio/${file}`;
    }
  }
  return tracks;
}

function chronoAudioManifestPlugin(): Plugin {
  const audioDir = resolve(__dirname, 'public/assets/chrono/audio');
  return {
    name: 'chrono-audio-manifest',
    resolveId(id) {
      if (id === CHRONO_AUDIO_VIRTUAL_ID) return RESOLVED_CHRONO_AUDIO_ID;
    },
    load(id) {
      if (id === RESOLVED_CHRONO_AUDIO_ID) {
        const tracks = scanChronoAudioTracks(audioDir);
        return `export const AVAILABLE_CHRONO_TRACKS = ${JSON.stringify(tracks)};`;
      }
    },
    configureServer(server) {
      server.watcher.add(audioDir);
      const invalidate = (file: string) => {
        if (!file.startsWith(audioDir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_CHRONO_AUDIO_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), chronoAudioManifestPlugin()],
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
