# Ficha de Play Store — TuneApp

Textos para copiar y pegar en Play Console.

---

## Título

```
TuneApp: Afinador y Metrónomo
```

---

## Descripción corta

```
Afinador de guitarra, ukelele y charango. Simple, preciso y sin publicidad.
```

---

## Descripción larga

```
Un afinador que te dice todo lo que necesitás saber de un vistazo: qué cuerda estás tocando, si está alta o baja, y cuánto te falta. Cuando queda afinada, suena un tono de confirmación.

TRES INSTRUMENTOS

• Guitarra — Mi La Re Sol Si Mi
• Ukelele — Sol Do Mi La
• Charango — los cinco órdenes, con la octava del tercero

Elegís el instrumento y aparece el clavijero dibujado en pantalla, con la nota de cada clavija, para saber exactamente cuál girar.

CÓMO FUNCIONA

Tocás una cuerda al aire y TuneApp reconoce sola cuál es: no hay que elegirla de una lista. La aguja se acerca al centro a medida que vas afinando, y te indica si tenés que tensar o aflojar. Si querés trabajar una cuerda puntual, tocás su clavija en la pantalla y mide sólo esa.

TAMBIÉN TRAE

• Afinación manual cromática: te dice qué nota estás tocando, sea del instrumento que sea
• Metrónomo de 30 a 300 BPM, con compás, acento y tap tempo
• Frecuencia de referencia ajustable de 415 a 466 Hz, para tocar junto a otros instrumentos o en afinaciones alternativas
• Margen de afinado configurable, para exigirle más o menos al oído
• Cuatro temas visuales, incluido uno claro para tocar con luz de día
• Nombres de notas en Do Re Mi o en C D E, con sostenidos o bemoles

SIN VUELTAS

• Gratis y sin publicidad
• No recolecta ningún dato: el audio se analiza dentro de tu teléfono, no se graba ni se envía a ningún lado
• Funciona sin conexión a internet
• No pide cuenta ni registro
```

---

## Notas sobre las decisiones

**El texto no etiqueta a quien lo lee.** Se apunta a gente que recién empieza con
cualquiera de los tres instrumentos, pero eso se logra con un lenguaje simple y directo,
no diciendo "para principiantes". Decirlo espanta a quien tiene experiencia sin ganar
nada a cambio: el que recién empieza igual entiende que la app es para él.

**Nada de jerga.** No se mencionan cents, NSDF ni precisión en cents. "Te indica si
tenés que tensar o aflojar" comunica mejor que cualquier número, y a nadie le suma leer
el nombre del algoritmo.

**El charango va tercero pero es el diferencial.** Casi ninguna app lo trae. Va después
de guitarra y ukelele porque esas dos son las que más se buscan, pero mencionarlo desde
la descripción corta capta a un público que hoy no tiene opciones.

**"Sin publicidad" y "no recolecta datos" son verdad y son ventaja.** Casi todos los
afinadores gratis están llenos de avisos. Conviene decirlo, pero sólo mientras siga
siendo cierto: si algún día se agrega AdMob, hay que corregir este texto y la política
de privacidad el mismo día.

**La primera versión sale gratis y completa.** El cobro quedó para una actualización
posterior: activarlo exige una cuenta de cobro en Play Console que todavía no está, y no
tenía sentido retener una app terminada por eso. El código del cobro está escrito y
probado, detrás de la bandera `PRO_ACTIVO` en `www/js/store.js`.

**Cuando se active Pro hay que volver a tocar este archivo y la ficha de Play**, porque
estos textos van a dejar de ser ciertos: hoy prometen todas las funciones sin pagar. Lo
mismo que con la publicidad, el día que cambie el producto cambia la ficha.

**Quien instaló la versión gratis conserva las funciones para siempre.** La fecha de
instalación se guarda desde ahora para poder distinguirlos; sólo paga el que llegue
después de que Pro empiece a regir.
