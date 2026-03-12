#!/usr/bin/env python3
"""
Gera os ícones PNG da extensão Web to Picture.
Não requer dependências externas além da stdlib do Python.
"""

import struct
import zlib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(BASE_DIR, 'icons')


def make_png(size, draw_fn):
    """Gera bytes de um arquivo PNG com uma função de desenho personalizada."""

    def chunk(name: bytes, data: bytes) -> bytes:
        length = struct.pack('>I', len(data))
        crc = struct.pack('>I', zlib.crc32(name + data) & 0xFFFFFFFF)
        return length + name + data + crc

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)

    rows = []
    for y in range(size):
        row = bytearray([0])  # filter byte = None
        for x in range(size):
            r, g, b = draw_fn(x, y, size)
            row += bytes([r, g, b])
        rows.append(bytes(row))

    raw = b''.join(rows)
    idat = zlib.compress(raw, 9)

    return (
        signature
        + chunk(b'IHDR', ihdr_data)
        + chunk(b'IDAT', idat)
        + chunk(b'IEND', b'')
    )


def draw_icon(x, y, size):
    """
    Desenha o ícone da extensão:
    - Fundo escuro #0f0f0f
    - Retângulo central (representando monitor + janela PiP) em azul #2563eb
    """
    cx, cy = size / 2, size / 2
    pad = size * 0.08

    # Área útil do ícone
    left = pad
    right = size - pad
    top = pad
    bottom = size - pad

    BG = (15, 15, 15)          # #0f0f0f
    SCREEN = (30, 30, 40)      # monitor escuro
    PIP = (37, 99, 235)        # #2563eb azul
    BORDER = (55, 55, 70)      # borda do monitor
    STAND = (45, 45, 55)       # pé do monitor

    fx, fy = float(x), float(y)
    w = right - left
    h = bottom - top

    # Pé do monitor (apenas para ícones maiores)
    stand_cx = cx
    stand_top = top + h * 0.72
    stand_bottom = bottom
    stand_w = w * 0.25
    if (
        size >= 48
        and abs(fx - stand_cx) < stand_w / 2
        and fy >= stand_top
        and fy <= stand_bottom
    ):
        return STAND

    # Tela do monitor
    mon_left = left
    mon_right = right
    mon_top = top
    mon_bottom = top + h * 0.72

    in_monitor = (
        fx >= mon_left and fx <= mon_right
        and fy >= mon_top and fy <= mon_bottom
    )

    if in_monitor:
        # Borda do monitor
        border = max(1, size * 0.04)
        in_screen = (
            fx >= mon_left + border and fx <= mon_right - border
            and fy >= mon_top + border and fy <= mon_bottom - border
        )

        if not in_screen:
            return BORDER

        # Janela PiP (canto inferior direito da tela)
        pip_left = mon_left + w * 0.52
        pip_right = mon_right - border
        pip_top = mon_top + h * 0.35
        pip_bottom = mon_bottom - border

        in_pip = (
            fx >= pip_left and fx <= pip_right
            and fy >= pip_top and fy <= pip_bottom
        )

        return PIP if in_pip else SCREEN

    return BG


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)

    for size in [16, 48, 128]:
        png_bytes = make_png(size, draw_icon)
        filepath = os.path.join(ICONS_DIR, f'icon{size}.png')
        with open(filepath, 'wb') as f:
            f.write(png_bytes)
        print(f'✓  icons/icon{size}.png  ({len(png_bytes)} bytes)')

    print('\nÍcones gerados com sucesso em ./icons/')


if __name__ == '__main__':
    main()
