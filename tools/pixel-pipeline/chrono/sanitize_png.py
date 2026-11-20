#!/usr/bin/env python3
"""
Sanitizes pixel-art sprite PNGs and horizontal animation strips against Resurrect-64,
enforces binary alpha (0 or 255), removes isolated 1px orphan specks on non-tile sprites,
ensures each animation frame aligns to an exact multiple of 8px, and creates contact sheets.
"""
import argparse
import json
import math
import os
from pathlib import Path
from PIL import Image


def load_palette(palette_path: str):
    raw = json.loads(Path(palette_path).read_text(encoding="utf-8"))
    colors = raw if isinstance(raw, list) else raw["colors"]
    out = []
    for h in colors:
        c = h.lstrip("#")
        out.append((int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)))
    return out


def nearest_rgb(rgb, palette, cache):
    if rgb in cache:
        return cache[rgb]
    r, g, b = rgb
    best = palette[0]
    best_d = 10**9
    for pr, pg, pb in palette:
        d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if d < best_d:
            best_d = d
            best = (pr, pg, pb)
            if d == 0:
                break
    cache[rgb] = best
    return best


def round_up_8(v: int) -> int:
    return ((v + 7) // 8) * 8


def sanitize_image(
    src_path: Path,
    dst_path: Path,
    palette,
    cache,
    frames: int = 1,
    fw: int = 0,
    fh: int = 0,
    strip_orphans: bool = True,
):
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size
    if frames <= 1:
        fw = w
        fh = h
    else:
        if fw <= 0:
            fw = w // frames
        if fh <= 0:
            fh = h

    target_fw = round_up_8(fw)
    target_fh = round_up_8(fh)
    pad_x = (target_fw - fw) // 2
    pad_y = (target_fh - fh) // 2

    out_w = target_fw * frames
    out_h = target_fh
    out = Image.new("RGBA", (out_w, out_h), (0, 0, 0, 0))
    src_px = im.load()
    out_px = out.load()

    for f in range(frames):
        ox_src = f * fw
        ox_dst = f * target_fw
        for y in range(fh):
            for x in range(fw):
                r, g, b, a = src_px[ox_src + x, y]
                if a < 128:
                    continue
                qr, qg, qb = nearest_rgb((r, g, b), palette, cache)
                out_px[ox_dst + pad_x + x, pad_y + y] = (qr, qg, qb, 255)

        if strip_orphans:
            to_clear = []
            for y in range(target_fh):
                for x in range(target_fw):
                    gx = ox_dst + x
                    if out_px[gx, y][3] == 0:
                        continue
                    neighbors = 0
                    for dy in (-1, 0, 1):
                        ny = y + dy
                        if ny < 0 or ny >= target_fh:
                            continue
                        for dx in (-1, 0, 1):
                            if dx == 0 and dy == 0:
                                continue
                            nx = x + dx
                            if nx < 0 or nx >= target_fw:
                                continue
                            if out_px[ox_dst + nx, ny][3] > 0:
                                neighbors += 1
                    if neighbors == 0:
                        to_clear.append((gx, y))
            for gx, gy in to_clear:
                out_px[gx, gy] = (0, 0, 0, 0)

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_path, "PNG")
    return out_w, out_h, target_fw, target_fh


def make_contact_sheet(entries, dst_path: Path, scale: int = 2, cols: int = 6):
    if not entries:
        return
    pad = 8
    cells = []
    max_w = 1
    max_h = 1
    for item in entries:
        im = Image.open(item["abs_path"]).convert("RGBA")
        # For wide animation strips, show first frame + max 4 frames so contact sheet stays legible
        fw = item.get("fw", im.width)
        fh = item.get("fh", im.height)
        frames = item.get("frames", 1)
        show_frames = min(frames, 4) if im.width > 160 else frames
        crop_w = fw * show_frames if frames > 1 else im.width
        crop = im.crop((0, 0, min(im.width, crop_w), fh))
        up = crop.resize((crop.width * scale, crop.height * scale), Image.Resampling.NEAREST)
        cells.append(up)
        max_w = max(max_w, up.width)
        max_h = max(max_h, up.height)

    eff_cols = max(1, min(cols, len(cells)))
    rows = math.ceil(len(cells) / eff_cols)
    sheet_w = eff_cols * (max_w + pad) + pad
    sheet_h = rows * (max_h + pad) + pad
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (24, 22, 32, 255))

    for idx, cell in enumerate(cells):
        c = idx % eff_cols
        r = idx // eff_cols
        cx = pad + c * (max_w + pad) + (max_w - cell.width) // 2
        cy = pad + r * (max_h + pad) + (max_h - cell.height) // 2
        sheet.paste(cell, (cx, cy), cell)

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dst_path, "PNG")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["sanitize-batch", "contact-sheets"], required=True)
    parser.add_argument("--spec", required=True, help="Path to JSON spec file")
    args = parser.parse_args()

    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))

    if args.mode == "sanitize-batch":
        palette = load_palette(spec["palette"])
        cache = {}
        results = {}
        for item in spec["items"]:
            w, h, fw, fh = sanitize_image(
                Path(item["src"]),
                Path(item["dst"]),
                palette,
                cache,
                frames=item.get("frames", 1),
                fw=item.get("fw", 0),
                fh=item.get("fh", 0),
                strip_orphans=item.get("strip_orphans", True),
            )
            results[item["id"]] = {"w": w, "h": h, "fw": fw, "fh": fh}
        print(json.dumps(results))
    elif args.mode == "contact-sheets":
        for cat, info in spec["categories"].items():
            make_contact_sheet(
                info["entries"],
                Path(info["dst"]),
                scale=info.get("scale", 2),
                cols=info.get("cols", 6),
            )
        print(json.dumps({"ok": True}))


if __name__ == "__main__":
    main()
