// billing.js — compra única "TuneApp Pro" contra Google Play Billing.
//
// Toda la app habla con este módulo y no con la tienda, así que ninguna pantalla
// sabe qué plugin hay detrás ni en qué estado está la conexión con Play.
//
// El plugin (cordova-plugin-purchase) sólo existe dentro del APK: Capacitor lo
// inyecta en el WebView junto con cordova.js. En el navegador y en el APK de
// prueba instalado a mano no hay tienda, así que `disponible` queda en false y
// la pantalla de ajustes lo explica en vez de abrir un flujo que iba a fallar.

import { settings } from './store.js';

const ID_PRODUCTO = 'tuneapp_pro';

// El plugin avisa que terminó una compra por evento, no como respuesta al
// pedido, así que después de ordenar hay que esperar a que llegue.
const ESPERA_CONFIRMACION = 12000;
const PASO_ESPERA = 250;

// deviceready tarda lo que tarde el puente de Capacitor. Si no llegó en este
// tiempo, algo anda mal y conviene seguir sin tienda antes que colgar la app.
const ESPERA_PLUGIN = 8000;

function esNativo() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function esperarPlugin() {
  return new Promise((resolve) => {
    if (window.CdvPurchase) return resolve(window.CdvPurchase);
    if (!esNativo()) return resolve(null);
    let resuelto = false;
    const fin = () => {
      if (resuelto) return;
      resuelto = true;
      resolve(window.CdvPurchase || null);
    };
    document.addEventListener('deviceready', fin, { once: true });
    setTimeout(fin, ESPERA_PLUGIN);
  });
}

function dormir(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export const billing = {
  ID_PRODUCTO,

  /** Precio ya localizado por Play ("$ 1.900,00"). null hasta que la tienda responde. */
  precio: null,

  /** Último error de la tienda, para que ajustes muestre algo concreto. */
  ultimoError: null,

  _listo: false,
  _cdv: null,
  _oyentes: new Set(),

  /** true sólo si hay tienda viva: APK de Play, plugin cargado e inicializado. */
  get disponible() {
    return this._listo === true;
  },

  /** Avisa cuando llega el precio o cambia el estado. Devuelve cómo desuscribirse. */
  onChange(fn) {
    this._oyentes.add(fn);
    return () => this._oyentes.delete(fn);
  },

  async init() {
    const cdv = await esperarPlugin();
    if (!cdv) return;
    this._cdv = cdv;

    const store = cdv.store;
    try {
      store.verbosity = cdv.LogLevel.WARNING;
      store.register([
        {
          id: ID_PRODUCTO,
          type: cdv.ProductType.NON_CONSUMABLE,
          platform: cdv.Platform.GOOGLE_PLAY,
        },
      ]);

      store
        .when()
        // Sin validador de recibos propio: se aprueba y se cierra en el acto.
        // Play ya garantiza que la compra es real; un servidor de validación
        // sería otra pieza que mantener y otro dato saliendo del teléfono.
        .approved((t) => t.finish())
        .finished((t) => {
          if (this._esNuestro(t)) this._conceder();
        })
        .productUpdated(() => this._refrescar())
        .receiptsReady(() => this._sincronizar());

      store.error((e) => {
        this.ultimoError = e;
      });

      await store.initialize([cdv.Platform.GOOGLE_PLAY]);
      this._listo = true;
      this._refrescar();
      this._sincronizar();
    } catch (e) {
      // Que no haya tienda no puede romper el afinador, que es gratis.
      this._listo = false;
      this.ultimoError = e;
    }
    this._avisar();
  },

  /** @returns {Promise<boolean>} true si al terminar el usuario tiene Pro. */
  async comprar() {
    this.ultimoError = null;
    if (!this.disponible) return false;

    // Ya comprado en otro teléfono o reinstalado: no hay nada que cobrar.
    if (this._duenio()) {
      this._conceder();
      return true;
    }

    const oferta = this._oferta();
    if (!oferta) {
      this.ultimoError = { message: 'El producto todavía no está disponible.' };
      return false;
    }

    const err = await this._cdv.store.order(oferta);
    if (err) {
      this.ultimoError = err;
      return false;
    }
    return this._esperarPro();
  },

  /** Recupera una compra previa: reinstalación, teléfono nuevo. */
  async restaurar() {
    this.ultimoError = null;
    if (!this.disponible) return false;
    try {
      const err = await this._cdv.store.restorePurchases();
      if (err) this.ultimoError = err;
    } catch (e) {
      this.ultimoError = e;
      return false;
    }
    this._sincronizar();
    if (settings.premium) return true;
    return this._esperarPro(3000);
  },

  /** true si el intento anterior lo canceló el usuario y no falló nada. */
  get cancelada() {
    const e = this.ultimoError;
    const codigos = this._cdv && this._cdv.ErrorCode;
    return !!(e && codigos && e.code === codigos.PAYMENT_CANCELLED);
  },

  /** Texto para mostrar cuando la compra no salió. */
  mensajeDeError() {
    if (this.cancelada) return 'Compra cancelada.';
    const e = this.ultimoError;
    const codigos = this._cdv && this._cdv.ErrorCode;
    if (e && codigos) {
      if (e.code === codigos.PAYMENT_NOT_ALLOWED) {
        return 'Esta cuenta de Google no tiene habilitadas las compras.';
      }
      if (e.code === codigos.PRODUCT_NOT_AVAILABLE) {
        return 'El producto no está disponible en tu país todavía.';
      }
    }
    return 'No se pudo completar la compra. Probá de nuevo en un rato.';
  },

  /** Sólo para desarrollo: permite ver cómo queda la app ya comprada. */
  simular(activo) {
    settings.set('premium', activo === true);
  },

  /* ---------------------------------------------------------------- internos */

  _producto() {
    try {
      return this._cdv.store.get(ID_PRODUCTO, this._cdv.Platform.GOOGLE_PLAY) || null;
    } catch (e) {
      return null;
    }
  },

  _oferta() {
    const p = this._producto();
    if (!p) return null;
    try {
      return p.getOffer() || (p.offers && p.offers[0]) || null;
    } catch (e) {
      return (p.offers && p.offers[0]) || null;
    }
  },

  _duenio() {
    const p = this._producto();
    if (p && p.owned) return true;
    try {
      return this._cdv.store.owned(ID_PRODUCTO) === true;
    } catch (e) {
      return false;
    }
  },

  _esNuestro(t) {
    if (!t || !Array.isArray(t.products)) return this._duenio();
    return t.products.some((p) => p && p.id === ID_PRODUCTO);
  },

  _conceder() {
    if (!settings.premium) settings.set('premium', true);
    this._avisar();
  },

  // Nunca se quita Pro automáticamente. La app funciona sin conexión, así que
  // "Play no contesta" es un estado normal y no prueba que no se haya comprado:
  // sacarle la compra a alguien por un falso negativo es peor que regalarla
  // alguna vez de más tras un reembolso.
  _sincronizar() {
    if (this._duenio()) this._conceder();
  },

  _refrescar() {
    const p = this._producto();
    const precio = p && p.pricing ? p.pricing.price : null;
    if (precio && precio !== this.precio) {
      this.precio = precio;
      this._avisar();
    }
  },

  async _esperarPro(limite) {
    const fin = Date.now() + (limite || ESPERA_CONFIRMACION);
    while (Date.now() < fin) {
      if (settings.premium) return true;
      if (this._duenio()) {
        this._conceder();
        return true;
      }
      await dormir(PASO_ESPERA);
    }
    return settings.premium;
  },

  _avisar() {
    this._oyentes.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        /* un oyente roto no puede frenar a los demás */
      }
    });
  },
};
