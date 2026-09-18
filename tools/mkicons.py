"""Genera los iconos de la app (PWA y Android) desde el mismo dibujo.

    python tools/mkicons.py            # PWA + Android
    python tools/mkicons.py pwa        # sólo www/icons
    python tools/mkicons.py android    # sólo android/app/src/main/res

El dibujo es el medidor de aguja: arco con la zona afinada en verde y la aguja al centro.
"""

import math
import os
import struct
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PWA_DIR = os.path.join(ROOT, 'www', 'icons')
RES_DIR = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

BG = (0x11, 0x16, 0x1f)
RING = (0x24, 0x2e, 0x40)
GREEN = (0x29, 0xd9, 0x8c)
LIGHT = (0xe9, 0xef, 0xf8)

# Densidades de Android: (carpeta, lado del icono legacy, lado del foreground adaptativo)
DENSITIES = [
    ('mdpi', 48, 108),
    ('hdpi', 72, 162),
    ('xhdpi', 96, 216),
    ('xxhdpi', 144, 324),
    ('xxxhdpi', 192, 432),
]


def write_png(path, size, px):
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        raw += px[y * stride:(y + 1) * stride]

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    out += chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as fh:
        fh.write(out)


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    t = max(0.0, min(1.0, (wx * vx + wy * vy) / (vx * vx + vy * vy)))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def inside_shape(x, y, shape):
    """x, y en [-1, 1]."""
    if shape == 'none':
        return True
    if shape == 'circle':
        return math.hypot(x, y) <= 1.0
    r = 0.44  # esquinas redondeadas
    dx = max(abs(x) - (1 - r), 0.0)
    dy = max(abs(y) - (1 - r), 0.0)
    return math.hypot(dx, dy) <= r if (dx or dy) else True


def render(size, shape='rounded', bg=BG, scale=1.02):
    """shape: 'rounded' | 'circle' | 'none'. bg=None deja el fondo transparente."""
    SS = 3
    px = bytearray(size * size * 4)
    cy = 0.30 * scale
    r_out, r_in = 0.72 * scale, 0.54 * scale
    needle_y = cy - 0.52 * scale
    hub = 0.085 * scale
    nw = 0.058 * scale

    for j in range(size):
        for i in range(size):
            acc = [0.0, 0.0, 0.0]
            alpha = 0.0
            for sj in range(SS):
                for si in range(SS):
                    x = ((i + (si + 0.5) / SS) / size) * 2 - 1
                    y = ((j + (sj + 0.5) / SS) / size) * 2 - 1
                    if not inside_shape(x, y, shape):
                        continue

                    d = math.hypot(x, y - cy)
                    ang = math.degrees(math.atan2(x, -(y - cy)))
                    on_arc = r_in <= d <= r_out and abs(ang) <= 64
                    on_needle = seg_dist(x, y, 0.0, cy, 0.0, needle_y) <= nw or d <= hub

                    if on_needle:
                        col = LIGHT
                    elif on_arc:
                        col = GREEN if abs(ang) <= 17 else RING
                    elif bg is not None:
                        col = bg
                    else:
                        continue  # foreground adaptativo: fuera del dibujo queda transparente

                    acc[0] += col[0]
                    acc[1] += col[1]
                    acc[2] += col[2]
                    alpha += 1.0

            if alpha == 0:
                continue
            o = (j * size + i) * 4
            px[o] = int(acc[0] / alpha)
            px[o + 1] = int(acc[1] / alpha)
            px[o + 2] = int(acc[2] / alpha)
            px[o + 3] = int(255 * alpha / (SS * SS))
    return px


def build_pwa():
    for size, shape, name in [
        (192, 'rounded', 'icon-192.png'),
        (512, 'rounded', 'icon-512.png'),
        (512, 'none', 'icon-maskable-512.png'),
    ]:
        # El maskable va a sangre y con el dibujo más chico, porque Android lo recorta.
        scale = 0.72 if name.startswith('icon-maskable') else 1.02
        write_png(os.path.join(PWA_DIR, name), size, render(size, shape, BG, scale))
        print('pwa     ', name)


def build_android():
    for folder, legacy, fg in DENSITIES:
        base = os.path.join(RES_DIR, 'mipmap-' + folder)
        write_png(os.path.join(base, 'ic_launcher.png'), legacy, render(legacy, 'rounded', BG, 1.02))
        write_png(os.path.join(base, 'ic_launcher_round.png'), legacy, render(legacy, 'circle', BG, 1.02))
        # El foreground adaptativo se recorta: el dibujo va dentro del 66 % central.
        write_png(os.path.join(base, 'ic_launcher_foreground.png'), fg, render(fg, 'none', None, 0.62))
        print('android  mipmap-' + folder)


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'pwa'):
        build_pwa()
    if what in ('all', 'android'):
        build_android()
