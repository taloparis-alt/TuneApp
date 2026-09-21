"""Genera el gráfico destacado de Play Store (1024x500).

    python tools/mkgrafico.py

Play lo muestra encabezando la ficha, recortado de formas distintas según el lugar
—a veces sólo la franja central—, así que lo importante va al centro y los bordes
quedan libres.
"""

import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(ROOT, 'store', 'grafico-destacado.png')

W, H = 1024, 500
SS = 3  # supermuestreo para que las curvas no queden dentadas

BG = (11, 14, 20)
PANEL = (17, 22, 31)
TEXTO = (233, 239, 248)
MUTED = (138, 151, 171)
VERDE = (41, 217, 140)
RING = (36, 46, 64)
AZUL = (86, 168, 255)

FUENTES = 'C:/Windows/Fonts/'


def fuente(nombre, tam):
    return ImageFont.truetype(FUENTES + nombre, tam)


def medidor(d, cx, cy, radio, grosor, fondo):
    """El mismo medidor de aguja del ícono, para que la marca sea reconocible."""
    r_ext, r_int = radio, radio - grosor
    # Arco gris de fondo, de -64 a +64 grados respecto de la vertical.
    for lado, color in ((RING, RING),):
        d.pieslice(
            [cx - r_ext, cy - r_ext, cx + r_ext, cy + r_ext],
            start=-154, end=-26, fill=color,
        )
    # Zona afinada, en verde, en el centro del arco.
    d.pieslice(
        [cx - r_ext, cy - r_ext, cx + r_ext, cy + r_ext],
        start=-107, end=-73, fill=VERDE,
    )
    # Se vacía el interior para que quede un arco y no una porción de torta.
    d.ellipse([cx - r_int, cy - r_int, cx + r_int, cy + r_int], fill=fondo)

    # Aguja apenas inclinada: da sensación de que está midiendo, no apagada.
    ang = math.radians(-90 - 7)
    largo = radio - grosor * 0.4
    d.line(
        [cx, cy, cx + largo * math.cos(ang), cy + largo * math.sin(ang)],
        fill=TEXTO, width=int(grosor * 0.36),
    )
    hub = int(grosor * 0.42)
    d.ellipse([cx - hub, cy - hub, cx + hub, cy + hub], fill=TEXTO)


def main():
    img = Image.new('RGB', (W * SS, H * SS), BG)
    d = ImageDraw.Draw(img)

    # Panel redondeado a la derecha, donde vive el medidor.
    px0, py0, px1, py1 = 618 * SS, 78 * SS, 964 * SS, 422 * SS
    d.rounded_rectangle([px0, py0, px1, py1], radius=28 * SS, fill=PANEL)
    medidor(d, (px0 + px1) // 2, 320 * SS, 132 * SS, 30 * SS, PANEL)

    # Texto a la izquierda.
    x = 96 * SS
    d.text((x, 150 * SS), 'TuneApp', font=fuente('segoeuib.ttf', 76 * SS), fill=TEXTO)
    d.text((x, 248 * SS), 'Afiná guitarra, ukelele', font=fuente('segoeui.ttf', 34 * SS), fill=MUTED)
    d.text((x, 292 * SS), 'y charango', font=fuente('segoeui.ttf', 34 * SS), fill=MUTED)

    # Línea de cierre, con los diferenciales reales.
    d.text((x, 360 * SS), 'Sin publicidad  ·  Sin conexión', font=fuente('segoeuib.ttf', 22 * SS), fill=VERDE)

    # Filete de color al costado del título, como acento de marca.
    d.rounded_rectangle([x - 26 * SS, 152 * SS, x - 18 * SS, 232 * SS], radius=4 * SS, fill=AZUL)

    img = img.resize((W, H), Image.LANCZOS)
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    img.save(SALIDA)
    print('generado:', SALIDA, img.size)


if __name__ == '__main__':
    main()
