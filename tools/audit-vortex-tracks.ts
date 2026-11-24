import { TRACK_ROSTER } from '../src/games/vortexDrift/vortexTypes';
import { createTrackSamplesForSpec } from '../src/games/vortexDrift/vortexTrackMath';

let failed = 0;

for (const track of TRACK_ROSTER) {
  const built = createTrackSamplesForSpec(track);
  const { samples, shortcuts, totalLength } = built;
  const n = samples.length;
  const closed = !track.isPointToPoint;
  const issues: string[] = [];

  // 1. Check NaN on any vector
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const vals = [
      s.pos.x, s.pos.y, s.pos.z,
      s.tangent.x, s.tangent.y, s.tangent.z,
      s.right.x, s.right.y, s.right.z,
      s.up.x, s.up.y, s.up.z,
    ];
    if (vals.some((v) => !Number.isFinite(v))) {
      issues.push(`NaN vector at sample ${i}`);
      break;
    }
  }

  // 2. Check main track self-intersections (respecting loop entry vs exit lateral gap)
  let minNonAdjClearance = Infinity;
  let worstPair = '';
  const minSampleSep = 20;
  for (let i = 0; i < n; i++) {
    const a = samples[i];
    for (let j = i + minSampleSep; j < n; j++) {
      if (closed && n - (j - i) < minSampleSep) continue;
      const b = samples[j];

      // Allow vertical crossings on explicit 360-loop corkscrews as long as XY lateral OR vertical clears cleanly
      const distSq3D = a.pos.distanceToSquared(b.pos);
      const dist3D = Math.sqrt(distSq3D);
      const requiredClearance = a.halfWidth + b.halfWidth + 2.0; // e.g. 26m for 12m halfWidth

      // If at least one is elevated inside a loop and vertical diff >= 7m OR lateral >= required, ok
      if (Math.abs(a.pos.y - b.pos.y) >= 8.0 && (a.isLoop || b.isLoop)) {
        continue;
      }

      const clearance = dist3D - (a.halfWidth + b.halfWidth);
      if (clearance < minNonAdjClearance) {
        minNonAdjClearance = clearance;
        worstPair = `main[${i}](${a.pos.x.toFixed(0)},${a.pos.y.toFixed(0)},${a.pos.z.toFixed(0)}) vs main[${j}](${b.pos.x.toFixed(0)},${b.pos.y.toFixed(0)},${b.pos.z.toFixed(0)})`;
      }
      if (dist3D < requiredClearance) {
        issues.push(
          `Main track overlap: dist3D=${dist3D.toFixed(1)}m < req=${requiredClearance.toFixed(1)}m at ${worstPair}`
        );
      }
    }
  }

  // 3. Check shortcut portal angles & interior road clearance against main track
  for (const sc of shortcuts) {
    const entryMain = samples[sc.entryIdx];
    const exitMain = samples[sc.exitIdx];
    const scStart = sc.samples[0];
    const scEnd = sc.samples[sc.samples.length - 1];

    const dotEntry = scStart.tangent.dot(entryMain.tangent);
    const dotExit = scEnd.tangent.dot(exitMain.tangent);
    if (dotEntry < 0.55) {
      issues.push(`Shortcut ${sc.def.id} entry angle sharp: dot=${dotEntry.toFixed(2)}`);
    }
    if (dotExit < 0.55) {
      issues.push(`Shortcut ${sc.def.id} exit angle sharp: dot=${dotExit.toFixed(2)}`);
    }

    // Check middle interior samples of shortcut don't plow across non-portal main track
    for (let k = 10; k < sc.samples.length - 10; k++) {
      const sp = sc.samples[k];
      for (let m = 0; m < n; m++) {
        const dEntry = Math.abs(m - sc.entryIdx);
        const dExit = Math.abs(m - sc.exitIdx);
        if (Math.min(dEntry, n - dEntry) <= 12 || Math.min(dExit, n - dExit) <= 12) continue;
        const mp = samples[m];
        const dist3D = sp.pos.distanceTo(mp.pos);
        const vertGap = Math.abs(sp.pos.y - mp.pos.y);
        if (vertGap < 6.0 && dist3D < sp.halfWidth + mp.halfWidth + 1.0) {
          issues.push(
            `Shortcut ${sc.def.id}[${k}] collides with main[${m}] (dist=${dist3D.toFixed(1)}m, dy=${vertGap.toFixed(1)}m)`
          );
          break;
        }
      }
    }
  }

  // 4. Check tangent smoothness (detect kinks)
  let minAdjacentTanDot = 1;
  for (let i = 0; i < n - 1; i++) {
    const d = samples[i].tangent.dot(samples[i + 1].tangent);
    if (d < minAdjacentTanDot) minAdjacentTanDot = d;
    if (d < 0.72) {
      issues.push(`Sharp road kink between sample ${i} and ${i + 1}: tanDot=${d.toFixed(2)}`);
    }
  }

  const status = issues.length === 0 ? 'PASS' : 'FAIL';
  if (issues.length > 0) failed += 1;
  console.log(
    `[${status}] ${track.id}: ${(totalLength / 1000).toFixed(2)}km | ${n} samples | loops=${
      track.loops?.length ?? 0
    } | shortcuts=${shortcuts.length} | minClearance=${minNonAdjClearance.toFixed(
      1
    )}m | minTanDot=${minAdjacentTanDot.toFixed(3)}`
  );
  if (issues.length > 0) {
    issues.slice(0, 6).forEach((iss) => console.log(`   - ${iss}`));
    if (issues.length > 6) console.log(`   ... +${issues.length - 6} more`);
  }
}

console.log(`\nAudit Summary: ${TRACK_ROSTER.length - failed}/${TRACK_ROSTER.length} tracks PASS`);
process.exit(failed > 0 ? 1 : 0);
