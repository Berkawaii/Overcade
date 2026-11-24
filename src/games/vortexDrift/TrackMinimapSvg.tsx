import React, { useMemo } from 'react';
import { MinimapCarMarker, TrackSpec } from './vortexTypes';
import { createTrackSamplesForSpec } from './vortexTrackMath';

interface ProjectedShortcut {
  id: string;
  color: string;
  pathD: string;
}

interface ProjectedTrack {
  pathD: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isPointToPoint: boolean;
  shortcuts: ProjectedShortcut[];
  viewW: number;
  viewH: number;
  project: (wx: number, wz: number) => [number, number];
}

function buildProjectedTrack(track: TrackSpec, viewW = 200, viewH = 128): ProjectedTrack {
  const closed = !track.isPointToPoint;
  const built = createTrackSamplesForSpec(track);
  const samples = built.samples;

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i].pos;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  for (const sc of built.shortcuts) {
    for (let i = 0; i < sc.samples.length; i++) {
      const p = sc.samples[i].pos;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
  }

  const pad = 16;
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  const scale = Math.min((viewW - pad * 2) / spanX, (viewH - pad * 2) / spanZ);
  const offsetX = (viewW - spanX * scale) * 0.5 - minX * scale;
  const offsetY = (viewH - spanZ * scale) * 0.5 - minZ * scale;

  const project = (wx: number, wz: number): [number, number] => [
    wx * scale + offsetX,
    wz * scale + offsetY,
  ];

  const mainStride = Math.max(1, Math.floor(samples.length / 110));
  const mainIdxList: number[] = [];
  for (let i = 0; i < samples.length; i += mainStride) {
    mainIdxList.push(i);
  }
  if (!closed && mainIdxList[mainIdxList.length - 1] !== samples.length - 1) {
    mainIdxList.push(samples.length - 1);
  }

  const commands = mainIdxList.map((idx, step) => {
    const p = samples[idx].pos;
    const [sx, sy] = project(p.x, p.z);
    return `${step === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
  });
  if (closed) {
    commands.push('Z');
  }

  const shortcuts: ProjectedShortcut[] = built.shortcuts.map((sc) => {
    const scStride = Math.max(1, Math.floor(sc.samples.length / 16));
    const scIdxList: number[] = [];
    for (let k = 0; k < sc.samples.length; k += scStride) {
      scIdxList.push(k);
    }
    if (scIdxList[scIdxList.length - 1] !== sc.samples.length - 1) {
      scIdxList.push(sc.samples.length - 1);
    }
    const cmds = scIdxList.map((idx, step) => {
      const sp = sc.samples[idx].pos;
      const [sx, sy] = project(sp.x, sp.z);
      return `${step === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    });
    return { id: sc.def.id, color: sc.def.color, pathD: cmds.join(' ') };
  });

  const [startX, startY] = project(samples[0].pos.x, samples[0].pos.z);
  const last = samples[samples.length - 1].pos;
  const [endX, endY] = project(last.x, last.z);

  return {
    pathD: commands.join(' '),
    startX,
    startY,
    endX,
    endY,
    isPointToPoint: Boolean(track.isPointToPoint),
    shortcuts,
    viewW,
    viewH,
    project,
  };
}

export const TrackMinimapSvg: React.FC<{
  track: TrackSpec;
  cars?: MinimapCarMarker[];
  highlightCarId?: number;
  animatePreviewDot?: boolean;
  className?: string;
}> = ({
  track,
  cars,
  highlightCarId,
  animatePreviewDot = false,
  className = '',
}) => {
  const projected = useMemo(() => buildProjectedTrack(track), [track]);
  const filterId = `glow-${track.id}`;

  return (
    <svg
      viewBox={`0 0 ${projected.viewW} ${projected.viewH}`}
      className={className}
      aria-label={`${track.name} Circuit Map`}
    >
      <defs>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer Track Aura Stroke */}
      <path
        d={projected.pathD}
        fill="none"
        stroke={track.leftBarrierColor}
        strokeWidth="7"
        strokeOpacity="0.22"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Asphalt Road Spine */}
      <path
        d={projected.pathD}
        fill="none"
        stroke="#0F172A"
        strokeWidth="4.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Crisp Neon Racing Line */}
      <path
        d={projected.pathD}
        fill="none"
        stroke={track.rightBarrierColor}
        strokeWidth="2.1"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${filterId})`}
      />

      {/* Shortcut Bypass Curves */}
      {projected.shortcuts.map((sc) => (
        <path
          key={sc.id}
          d={sc.pathD}
          fill="none"
          stroke={sc.color}
          strokeWidth="1.9"
          strokeDasharray="3 2.5"
          strokeLinecap="round"
        />
      ))}

      {/* Start Gate Marker */}
      <circle
        cx={projected.startX}
        cy={projected.startY}
        r="3.8"
        fill="#10B981"
        stroke="#09090B"
        strokeWidth="1.2"
      />

      {/* Finish Gate Marker on Point-to-Point Downhill */}
      {projected.isPointToPoint && (
        <rect
          x={projected.endX - 3.6}
          y={projected.endY - 3.6}
          width="7.2"
          height="7.2"
          fill="#F59E0B"
          stroke="#09090B"
          strokeWidth="1.2"
        />
      )}

      {/* Animated Preview Pulse Along Circuit in Lobby Cards */}
      {animatePreviewDot && (
        <circle r="4" fill="#F8FAFC" filter={`url(#${filterId})`}>
          <animateMotion dur="7s" repeatCount="indefinite" path={projected.pathD} />
        </circle>
      )}

      {/* Live Car Markers During Active Race */}
      {cars?.map((car) => {
        const [cx, cy] = projected.project(car.x, car.z);
        const isSelf = car.id === highlightCarId;
        return (
          <g key={car.id}>
            {isSelf && (
              <circle
                cx={cx}
                cy={cy}
                r="7.2"
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity="0.85"
                strokeWidth="1.5"
              />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={isSelf ? 4.4 : 3.1}
              fill={car.color}
              stroke="#09090B"
              strokeWidth="1"
            />
          </g>
        );
      })}
    </svg>
  );
};
