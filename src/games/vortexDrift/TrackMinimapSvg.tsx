import React, { useMemo } from 'react';
import * as THREE from 'three';
import { MinimapCarMarker, TrackSpec } from './vortexTypes';

interface ProjectedTrack {
  pathD: string;
  startX: number;
  startY: number;
  viewW: number;
  viewH: number;
  project: (wx: number, wz: number) => [number, number];
}

function buildProjectedTrack(track: TrackSpec, viewW = 200, viewH = 128): ProjectedTrack {
  const pts = track.waypoints.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);

  const sampleCount = 72;
  const worldPts: THREE.Vector3[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < sampleCount; i++) {
    const p = curve.getPointAt(i / sampleCount);
    worldPts.push(p);
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
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

  const commands = worldPts.map((p, idx) => {
    const [sx, sy] = project(p.x, p.z);
    return `${idx === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
  });
  commands.push('Z');

  const [startX, startY] = project(worldPts[0].x, worldPts[0].z);

  return {
    pathD: commands.join(' '),
    startX,
    startY,
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
      />

      {/* Asphalt Road Spine */}
      <path
        d={projected.pathD}
        fill="none"
        stroke="#0F172A"
        strokeWidth="4.6"
        strokeLinejoin="round"
      />

      {/* Crisp Neon Racing Line */}
      <path
        d={projected.pathD}
        fill="none"
        stroke={track.rightBarrierColor}
        strokeWidth="2.1"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />

      {/* Start / Finish Gate Marker */}
      <circle
        cx={projected.startX}
        cy={projected.startY}
        r="3.8"
        fill="#10B981"
        stroke="#09090B"
        strokeWidth="1.2"
      />

      {/* Animated Preview Pulse Along Circuit in Lobby Cards */}
      {animatePreviewDot && (
        <circle r="4" fill="#F8FAFC" filter={`url(#${filterId})`}>
          <animateMotion dur="7s" repeatCount="indefinite" path={projected.pathD} />
        </circle>
      )}

      {/* Live 6-Car Markers During Active Race */}
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
