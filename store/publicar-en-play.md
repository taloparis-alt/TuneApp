# Publicar una app en Google Play Console operando el navegador

Guía para un agente que tenga que hacer esto manejando Play Console por el navegador.
Escrita después de publicar TuneApp: no es teoría, es lo que efectivamente pasó, con los
lugares donde se pierde tiempo.

Contexto de origen: cuenta de desarrollador **personal** creada después del 13/11/2023,
app gratis, Capacitor sobre una app web, compilada en GitHub Actions.

---

## 1. Lo primero: los límites

Antes de tocar nada, dejar en claro con la persona qué hace el agente y qué no.
Lo que funcionó:

| El agente | La persona |
|---|---|
| Completa formularios | Marca las casillas de declaración jurada |
| Sube el AAB, carga la ficha | Define precios |
| Deja todo listo para enviar | **Aprieta "Enviar a revisión"** |
| | Carga datos bancarios y fiscales |

**No cargar datos bancarios ni de identidad**, ni aunque la persona los pase por el chat.
Tampoco aceptar los términos de Play en su nombre.

Un detalle real: **el autocompletado de Chrome metió solo un número de teléfono** en los
datos de contacto de la ficha, que son públicos. Revisar siempre los campos que uno no
escribió antes de guardar.

---

## 2. El orden que funciona

Cada paso habilita al siguiente. Saltearse el orden hace perder vueltas.

1. **Ficha de Play Store** — título, descripciones, ícono, gráfico destacado, capturas.
2. **Configuración de la tienda** — categoría **y datos de contacto**.
3. **Declaraciones de contenido** (ver abajo, tienen su propia cadena).
4. **Canal de prueba cerrada** — países, testers.
5. **Subir el AAB** y crear la versión.
6. **Revisar y confirmar** la versión.
7. **Enviar a revisión** desde *Resumen de publicación*. Lo aprieta la persona.

### La cadena de las declaraciones

No son independientes. En este orden:

```
Datos de inicio de sesión
        ↓ habilita
Contenido y audiencia objetivo
        ↓ habilita
Clasificación del contenido  +  Seguridad de los datos
```

Si "Datos de inicio de sesión" está trabada, **todo lo demás queda bloqueado** y la
consola no lo explica bien.

### La trampa de "Datos de inicio de sesión"

La pregunta es "¿alguna parte de tu aplicación está restringida?". Entre los casos que
listan para responder **Sí** está *"pagos, como productos únicos"*.

Si la app tiene cualquier compra integrada, la respuesta es Sí. Y ahí aparece una casilla
que afirma que *los datos provistos dan acceso completo a todo el contenido, **incluido el
premium o de pago***, mientras la página aclara que los revisores **no pueden** usar
cuentas propias ni pruebas gratuitas.

Si la app cobra, esa casilla es falsa salvo que se le dé al revisor una forma real de
entrar: un **código promocional de Play** para el producto. Pero el código necesita que el
producto exista, el producto necesita un AAB subido **y una cuenta de comercio con cuenta
bancaria cargada**. Son días.

**Decisión que destrabó todo en TuneApp**: publicar la primera versión **gratis** y dejar
el cobro para una actualización. Ahí la respuesta pasa a ser **No** con total honestidad y
la cadena entera se libera. El código del cobro quedó escrito detrás de una bandera.

Si se toma ese camino, no alcanza con desactivar la compra: hay que **sacar el permiso
`com.android.vending.BILLING`** del manifiesto, o la ficha muestra "Compras desde la app"
en una app que no vende nada.

---

## 3. Lo que bloquea y no se ve

Síntoma: en *Resumen de publicación* aparece un candado y dice *"Para enviar cambios a
revisión, completa los pasos necesarios en el panel de control"*, sin decir cuál falta.

Ir al **Panel de control** y mirar el contador de tareas (*"Completadas: X de 11"*). El
que faltaba en nuestro caso era **"Selecciona una categoría y proporciona datos de
contacto"**: la categoría estaba cargada, el **correo de contacto no**.

Otro caso: la ficha puede quedar como **borrador con cambios sin guardar** y parecer
completa. Revisar que el botón *Guardar* esté deshabilitado — si está activo, hay algo sin
guardar.

---

## 4. Operar la consola por el navegador

Play Console es muy hostil a la automatización. Esto cuesta varias vueltas si no se sabe:

- **Los `ref` se vuelven obsoletos en segundos.** Hacer `find` justo antes de cada click.
  Nunca reutilizar un ref de dos pasos atrás: se puede terminar clickeando otra cosa.
- **Los diálogos viven en el DOM aunque estén ocultos.** Buscar `[role="dialog"]` a secas
  devuelve uno invisible. Filtrar por `getBoundingClientRect().width > 0`.
- **`.click()` por JavaScript no abre los menús de Angular Material** ni marca radios.
  Para menús y radios hay que usar el click real del navegador contra un `ref`.
  Para *escribir* en campos sí conviene JS: tipear con el teclado salta de campo y parte
  el texto en dos.
- **Las capturas fallan seguido** con el renderer colgado. Leer el estado por JS
  (`innerText`, valores de inputs) es más confiable que mirar pantallas.
- **No navegar sin guardar**: el borrador se pierde entero.
- **Subir un `.aab` tarda minutos.** Hasta que no termina, el diálogo "Añadir de la
  biblioteca" aparece **vacío**, y parece que falló.
- **Quitar un bundle de una versión pide confirmación** en un diálogo aparte que tarda.
- Para escribir en un campo, poner el valor con el setter nativo y disparar los eventos:

```js
function setear(el, v) {
  const proto = el.tagName === 'TEXTAREA'
    ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur',   { bubbles: true }));
}
```

### Las URLs

Son de la forma:

```
play.google.com/console/u/N/developers/<idDesarrollador>/app/<idApp>/<seccion>
```

**Inventar un slug redirige a la lista de apps**, sin error. Slugs confirmados:
`app-dashboard`, `store-settings`, `main-store-listing`, `publishing`, `bundle-explorer`,
`app-content/overview`, `app-content/privacy-policy`, `app-content/ads-declaration`,
`app-content/testing-credentials`, `app-content/target-audience-content`,
`app-content/data-privacy-security`, `app-content/ad-id-declaration`,
`tracks/<idCanal>`, `closed-testing`, `vitals/crashes`, `paymentssettings`.

El `u/N` importa: es el índice de la cuenta de Google en el navegador. Con la cuenta
equivocada se ven otras apps y parece que la app desapareció.

---

## 5. Guardar ≠ enviar

Guardar una declaración **no** la manda a revisión: queda acumulada en *Resumen de
publicación* y todo se envía junto. Por eso guardar es reversible y el agente puede
hacerlo sin consultar cada respuesta; las casillas de declaración jurada sí son de la
persona.

Al enviar, Play corre **comprobaciones rápidas** (avisa "hasta 13 minutos") y recién
después encola la revisión de verdad, que tarda de horas a días.

---

## 6. El error que costó una versión rota en producción

Esto no es de Play Console, pero es la lección más cara del proceso.

**Se publicó una versión que se cerraba al abrir.** Causa: una regla del `.gitignore` sin
anclar al raíz (`TuneApp/` en vez de `/TuneApp/`) se tragó la carpeta del código fuente
cuando se renombró el paquete, porque Git en Windows ignora mayúsculas. `MainActivity.java`
nunca entró al repositorio y CI compilaba la app **sin su clase principal**.

Dos cosas que dejar montadas desde el principio:

**Compilar también un APK de release instalable.** El `.aab` no se instala a mano, así que
sin esto la única forma de probar la compilación de release es publicarla. Por eso el crash
lo descubrió un tester y no el equipo. Con `./gradlew bundleRelease assembleRelease` sale
el `.apk` firmado, el mismo build que va a la tienda.

**Probarlo en un teléfono real antes de subir.** No hace falta instalar el SDK: las
platform-tools se bajan sueltas de
`dl.google.com/android/repository/platform-tools-latest-windows.zip`.

```bash
adb install -r app-release.apk
adb logcat -c
adb shell am start -n <paquete>/.MainActivity
adb logcat -b crash -d          # el stack trace, sin adivinar
adb exec-out screencap -p > pantalla.png
```

**Ante un crash, buscar el log antes que deducir.** En TuneApp se culpó primero a una
dependencia por descarte y se publicó un arreglo que no arreglaba nada. El log lo resolvió
en un minuto. Play Vitals no sirve para esto: tarda horas en mostrar datos.

---

## 7. Requisito de los 12 testers

Las cuentas personales creadas después del 13/11/2023 necesitan **12 testers inscriptos de
forma continua durante 14 días** antes de poder pedir acceso a producción.

- Es **por única vez**: una vez concedido el acceso, las actualizaciones van directo.
- Los testers tienen que **instalar desde Play**. Un APK a mano no cuenta.
- Conviene juntar **15**: siempre hay alguno que acepta y nunca instala.
- Se pueden **agregar correos después** sin reiniciar nada.
- El reloj arranca con la invitación, así que conviene tener la lista completa antes.
- El link del canal **no cambia entre versiones**:
  `play.google.com/apps/testing/<paquete>`

---

## 8. Checklist corto

- [ ] Límites acordados con la persona
- [ ] Ficha cargada **y guardada** (botón Guardar deshabilitado)
- [ ] Categoría **y correo de contacto**
- [ ] Declaraciones, en orden, empezando por Datos de inicio de sesión
- [ ] Panel de control sin tareas pendientes
- [ ] Países y testers del canal
- [ ] **APK de release probado en un teléfono real**
- [ ] AAB subido, versión confirmada, cero errores
- [ ] La persona aprieta enviar
