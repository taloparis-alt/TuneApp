# Declaraciones de "Contenido de la aplicación" — Play Console

Respuestas acordadas, para no rehacerlas si hay que volver a cargarlas.

| Declaración | Respuesta |
|---|---|
| Anuncios | No contiene — **ya cargada** |
| Datos de inicio de sesión | Sí — **bloqueada, ver abajo** |
| ID de publicidad | No se usa |
| Aplicaciones gubernamentales | No |
| Funciones financieras | No |
| Aplicaciones de salud | No |
| Contenido y audiencia objetivo | 13 o más |
| Seguridad de los datos | No se recopila ni comparte nada |
| Clasificaciones del contenido | Cuestionario, todo "no" |

---

## Datos de inicio de sesión

La pregunta es "¿Alguna parte de tu aplicación está restringida?". Va **Sí**: entre
los casos que listan está "pagos, como productos únicos", y TuneApp tiene las
funciones Pro detrás de una compra única. La opción "No" exige explícitamente que
*ningún contenido requiera pago*.

**Nombre** (39/60):

```
Pro features (one-time in-app purchase)
```

**Usuario y contraseña**: vacíos. La app no tiene cuentas ni credenciales.

**Cualquier otra información necesaria** (498/500, el formulario exige inglés):

```
No sign-in is required: the app works fully with no account, no registration and no password.

The only restricted part is the optional "TuneApp Pro" upgrade, a one-time Google Play purchase (tuneapp_pro). It unlocks convenience settings only: extra themes, reference pitch 415-466 Hz, tuning tolerance, metronome time signature, accent, tap tempo, and tuning to a fixed note.

Tuning all three instruments and the basic metronome are free, so the whole app can be reviewed in full without buying anything.
```

### Por qué esta declaración va al final

Para guardarla hay que tildar una casilla que afirma que *"los detalles de inicio
de sesión de esta declaración proporcionan acceso completo a todas las funciones y
todo el contenido de esta aplicación, incluido contenido premium o de pago"*, y la
misma página aclara que los revisores **no pueden** usar cuentas propias ni pruebas
gratuitas. Tal como está la app hoy, esa casilla sería falsa: el revisor ve Pro
bloqueado como cualquiera. Firmarla en falso es motivo de retiro de la app.

La solución es un **código promocional de Play para `tuneapp_pro`**: el revisor lo
canjea, accede a Pro sin pagar, y la casilla pasa a ser cierta. Hay que sumar al
texto de arriba una línea con el código, dentro de los 500 caracteres.

Orden obligado, porque cada paso habilita al siguiente:

1. Subir el AAB (versionCode 3, ya con el cobro) a prueba cerrada.
2. Crear el producto `tuneapp_pro` en Productos integrados y ponerle precio.
3. Generar el código promocional.
4. Volver acá, pegar el código y guardar.

La alternativa —dejar un código de desbloqueo escondido dentro de la app— se
descartó: cualquiera que abra el APK lo encuentra y se queda con Pro gratis.
