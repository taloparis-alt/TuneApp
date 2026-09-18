# Afinador — guitarra, ukelele y charango

App de celular para afinar por micrófono, con metrónomo y frecuencia de referencia
ajustable. Está escrita como app web (HTML/CSS/JS, sin frameworks ni compilación) y se
empaqueta como **APK de Android con Capacitor**, sin reescribir nada.

## Qué hace

| Pantalla | Qué hace |
|---|---|
| **Afinador** | Elegís instrumento y ves el clavijero con la nota de cada clavija. Tocás una cuerda al aire y detecta sola cuál es, marca la desviación en cents y suena una confirmación cuando queda afinada. Tocando una clavija se fija esa cuerda y sólo mide contra ella. |
| **Manual** | *Cromático*: te dice qué nota estás tocando y cuánto te desviás, marcándola en la grilla. *Nota fija*: elegís nota y octava y medís contra esa. |
| **Metrónomo** | 30–300 BPM, compás de 1 a 12 tiempos, acento en el 1, tap tempo, indicador visual y vibración. |
| **Ajustes** | Tema (Noche, Madera, Día, Grafito), frecuencia de referencia La4 de 415 a 466 Hz con paso de 0,1 — arranca en 440,0 y se puede volver ahí de un toque —, margen de afinado (±3 / ±5 / ±10 cents), nombres Do-Re-Mi o C-D-E, sonido y vibración. |

### Afinaciones

- **Guitarra** — Mi2 · La2 · Re3 · Sol3 · Si3 · Mi4
- **Ukelele** — Sol4 · Do4 · Mi4 · La4 (soprano/concierto, reentrante)
- **Charango** — 5ª Sol4 · 4ª Do5 · 3ª Mi5 + Mi4 (octavada) · 2ª La4 · 1ª Mi5

Todas las frecuencias se recalculan solas al cambiar la referencia.

## Probarla en la computadora

```bash
python devserver.py
```

Y abrí `http://localhost:5181`. El micrófono sólo funciona en `localhost` o por HTTPS,
por eso el servidor apunta ahí.

## Generar el APK

El proyecto nativo ya está armado en `android/`, con el permiso de micrófono, orientación
vertical, pantalla que no se apaga y los iconos generados. Falta compilarlo, y para eso
hacen falta JDK 17 y el SDK de Android. Hay dos caminos.

### En la nube, con GitHub Actions (no requiere instalar nada)

Ya está el workflow en `.github/workflows/apk.yml`. Subís el proyecto a un repositorio de
GitHub y en cada push a `main` —o a mano desde la pestaña **Actions** → *APK* → *Run
workflow*— compila y deja el APK para descargar como artifact.

```bash
git init
git add .
git commit -m "Afinador"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/afinador.git
git push -u origin main
```

Después, en GitHub: **Actions** → última corrida → **afinador-apk** → descargar, pasar el
`.apk` al celular e instalarlo (hay que permitir *Instalar apps de origen desconocido*).

### En la máquina

Instalando **JDK 17** y las *command-line tools* del SDK de Android (no hace falta el IDE
completo). Con eso configurado:

```bash
npm install
npx cap sync android
npm run apk
```

El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

> Es un APK *debug*, firmado con la clave de depuración: sirve para instalarlo en tu
> celular, pero no para publicarlo en Play Store. Para eso hay que generar una clave de
> firma y compilar `assembleRelease`.

### Cada vez que cambies algo de la app

Los archivos web viven en `www/`. Después de editarlos hay que copiarlos al proyecto
nativo antes de compilar:

```bash
npx cap sync android
```

## También funciona como PWA

Sin compilar nada: subís la carpeta `www/` a cualquier hosting estático con HTTPS (Netlify
Drop, GitHub Pages, Vercel), la abrís en el celular y usás *Agregar a pantalla de inicio*.
Queda con su ícono, a pantalla completa y andando sin conexión.

## Cómo está hecho

```
www/                       la app web (esto es lo que se empaqueta)
  index.html               estructura y navegación por pestañas
  css/styles.css           los cuatro temas y todo el diseño
  js/notes.js              matemática de notas (MIDI ↔ Hz ↔ cents)
  js/instruments.js        afinaciones y geometría de cada clavijero
  js/headstock.js          dibuja el clavijero en SVG
  js/pitch.js              detección de tono (NSDF / McLeod) + suavizado
  js/audio.js              micrófono, AudioContext y sonidos
  js/gauge.js              medidor de aguja
  js/tuner.js              pantalla del afinador
  js/manual.js             pantalla de afinación manual
  js/metronome.js          metrónomo
  js/store.js              ajustes persistentes
  js/app.js                temas, bucle de análisis, ajustes y permisos
  sw.js                    caché para uso sin conexión (sólo en modo PWA)
android/                   proyecto nativo de Capacitor
tools/mkicons.py           genera los iconos de la PWA y de Android
devserver.py               servidor local sin caché (sólo desarrollo)
.github/workflows/apk.yml  compila el APK en la nube
```

### Detalles que importan

- **Detección**: NSDF (McLeod Pitch Method) con interpolación parabólica. Medido contra
  tonos sintéticos da menos de 0,01 cents de error en todas las notas de los tres
  instrumentos, y no se confunde de octava en las cuerdas graves, que es donde fallan los
  detectores por autocorrelación simple. Al fijar una clavija, la búsqueda se acota a ±3
  semitonos de esa nota: más rápido y sin ambigüedad.
- **Micrófono**: se piden `echoCancellation`, `noiseSuppression` y `autoGainControl`
  en `false` — los procesados del navegador deforman el tono y arruinan la medición.
- **Metrónomo**: los clics se programan contra el reloj del `AudioContext` con ventana de
  anticipación, no con `setTimeout`, así no se desfasa aunque el navegador se trabe.
- **El clavijero es SVG dibujado por código**, no una imagen: se ve nítido en cualquier
  pantalla, pesa poco, cada clavija es tocable y no hay problemas de licencia.
- **El análisis corre sobre `requestAnimationFrame`**, así que se pausa solo cuando la app
  queda en segundo plano y no gasta batería de más.
- **El service worker se saltea en `localhost`**, que es también el origen que usa el
  WebView de Capacitor: dentro del APK los archivos ya son locales y no hace falta caché.

## Iconos

`www/icons/icon.svg` es la referencia del dibujo. Los PNG de la PWA y los del lanzador de
Android se regeneran con:

```bash
python tools/mkicons.py
```
