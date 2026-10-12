/**
 * Spatial Navigation (Directional Keypad & Gamepad Focus Engine)
 * Built according to `modern-web-guidance` spatial-navigation standards:
 * - Uses live bounding geometries (`getBoundingClientRect()`)
 * - Uses edge-based direction filtering with perpendicular overlap priority
 * - Manages Roving Tabindex (`tabIndex=0` on active, `-1` on inactive)
 * - Scrolls focused candidate smoothly into view (`scrollIntoView({ block: 'nearest', inline: 'nearest' })`)
 */

import type { MenuDirection } from './gameEngineBridge';

const TOLERANCE = 4;
const PERPENDICULAR_WEIGHT = 2.5;

function getFocusableCandidates(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>('.spatial-focusable:not([disabled])')
  );
  return nodes.filter((el) => {
    if (typeof el.checkVisibility === 'function') {
      return el.checkVisibility();
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function applyRovingTabIndex(
  container: HTMLElement,
  nextTarget: HTMLElement,
  focusDom = true
): void {
  const candidates = getFocusableCandidates(container);
  for (const el of candidates) {
    if (el === nextTarget) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('data-spatial-focused', 'true');
    } else {
      el.setAttribute('tabindex', '-1');
      el.setAttribute('data-spatial-focused', 'false');
    }
  }
  if (focusDom) {
    nextTarget.focus({ preventScroll: true });
    nextTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

export function findNextSpatialCandidate(
  container: HTMLElement,
  current: HTMLElement | null,
  direction: MenuDirection
): HTMLElement | null {
  const candidates = getFocusableCandidates(container);
  if (candidates.length === 0) return null;

  if (!current || !candidates.includes(current)) {
    return candidates[0];
  }

  const curRect = current.getBoundingClientRect();
  const curCenterX = curRect.left + curRect.width / 2;
  const curCenterY = curRect.top + curRect.height / 2;

  const aligned: { el: HTMLElement; gap: number; perpOffset: number }[] = [];
  const fallback: { el: HTMLElement; score: number }[] = [];

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const rect = candidate.getBoundingClientRect();
    const candCenterX = rect.left + rect.width / 2;
    const candCenterY = rect.top + rect.height / 2;

    let isInDirection = false;
    let gap = 0;
    let overlapsPerp = false;
    let perpOffset = 0;

    if (direction === 'right') {
      isInDirection = rect.left >= curRect.right - TOLERANCE;
      gap = Math.max(0, rect.left - curRect.right);
      overlapsPerp = rect.bottom > curRect.top && rect.top < curRect.bottom;
      perpOffset = Math.abs(candCenterY - curCenterY);
    } else if (direction === 'left') {
      isInDirection = rect.right <= curRect.left + TOLERANCE;
      gap = Math.max(0, curRect.left - rect.right);
      overlapsPerp = rect.bottom > curRect.top && rect.top < curRect.bottom;
      perpOffset = Math.abs(candCenterY - curCenterY);
    } else if (direction === 'down') {
      isInDirection = rect.top >= curRect.bottom - TOLERANCE;
      gap = Math.max(0, rect.top - curRect.bottom);
      overlapsPerp = rect.right > curRect.left && rect.left < curRect.right;
      perpOffset = Math.abs(candCenterX - curCenterX);
    } else if (direction === 'up') {
      isInDirection = rect.bottom <= curRect.top + TOLERANCE;
      gap = Math.max(0, curRect.top - rect.bottom);
      overlapsPerp = rect.right > curRect.left && rect.left < curRect.right;
      perpOffset = Math.abs(candCenterX - curCenterX);
    }

    if (!isInDirection) continue;

    if (overlapsPerp) {
      aligned.push({ el: candidate, gap, perpOffset });
    } else {
      fallback.push({
        el: candidate,
        score: gap + PERPENDICULAR_WEIGHT * perpOffset,
      });
    }
  }

  if (aligned.length > 0) {
    aligned.sort((a, b) => (a.gap !== b.gap ? a.gap - b.gap : a.perpOffset - b.perpOffset));
    return aligned[0].el;
  }

  if (fallback.length > 0) {
    fallback.sort((a, b) => a.score - b.score);
    return fallback[0].el;
  }

  return null;
}
