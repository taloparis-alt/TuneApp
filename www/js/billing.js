// billing.js — compra única "TuneApp Pro".
//
// Toda la app habla con este módulo y no con la tienda directamente, así que
// enchufar el cobro real después no obliga a tocar ninguna pantalla.
//
// PENDIENTE: conectar Google Play Billing. No se puede hacer todavía porque el
// cobro sólo funciona en apps instaladas desde Play Store y con el producto ya
// creado en Play Console. Mientras tanto, fuera de la app nativa el módulo se
// declara no disponible y la pantalla de ajustes lo explica.

import { settings } from './store.js';

const ID_PRODUCTO = 'tuneapp_pro';

function esNativo() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export const billing = {
  ID_PRODUCTO,

  /** Precio para mostrar. Cuando haya cobro real lo da la tienda, ya localizado. */
  precio: null,

  /** false mientras no haya tienda: en el navegador y en el APK de prueba. */
  get disponible() {
    return esNativo() && this._listo === true;
  },

  _listo: false,

  async init() {
    if (!esNativo()) {
      this._listo = false;
      return;
    }
    // Acá va la inicialización del plugin de compras y la consulta del precio.
    this._listo = false;
  },

  /** @returns {Promise<boolean>} true si la compra se concretó. */
  async comprar() {
    if (!this.disponible) return false;
    return false;
  },

  /** Recupera una compra previa (reinstalación, teléfono nuevo). */
  async restaurar() {
    if (!this.disponible) return false;
    return false;
  },

  /** Sólo para desarrollo: permite ver cómo queda la app ya comprada. */
  simular(activo) {
    settings.set('premium', activo === true);
  },
};
