/**
 * Translation dictionaries + the `t()` lookup.
 *
 * Keys are dot-namespaced message ids. English is the source of truth and the
 * fallback: if a locale is missing a key, `t` falls back to English, then to
 * the key itself — so a partially-translated surface degrades gracefully and
 * never shows a blank. `{var}` placeholders are interpolated. Pure + tested.
 *
 * This seeds a representative set (nav, common actions, the dashboard header).
 * Translating a new surface = add its keys here; no other wiring needed.
 */

import { DEFAULT_LOCALE, type Locale } from "./config";

export type Messages = Record<string, string>;

const en: Messages = {
  "nav.protection": "Protection",
  "nav.overview": "Overview",
  "nav.assistant": "AI Assistant",
  "nav.exposures": "Exposure Inventory",
  "nav.removals": "Broker Removals",
  "nav.reports": "Reports",
  "nav.settings": "Settings",
  "nav.advanced": "Advanced tools",
  "nav.hideAdvanced": "Hide advanced tools",
  "common.protecting": "Protecting {name}",
  "common.liveData": "Live data",
  "common.demoData": "Demo data",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.signOut": "Sign out",
  "lang.label": "Language",
};

const fr: Messages = {
  "nav.protection": "Protection",
  "nav.overview": "Aperçu",
  "nav.assistant": "Assistant IA",
  "nav.exposures": "Inventaire des expositions",
  "nav.removals": "Suppressions courtiers",
  "nav.reports": "Rapports",
  "nav.settings": "Paramètres",
  "nav.advanced": "Outils avancés",
  "nav.hideAdvanced": "Masquer les outils avancés",
  "common.protecting": "Protection de {name}",
  "common.liveData": "Données en direct",
  "common.demoData": "Données de démo",
  "common.save": "Enregistrer",
  "common.cancel": "Annuler",
  "common.signOut": "Se déconnecter",
  "lang.label": "Langue",
};

const es: Messages = {
  "nav.protection": "Protección",
  "nav.overview": "Resumen",
  "nav.assistant": "Asistente IA",
  "nav.exposures": "Inventario de exposición",
  "nav.removals": "Eliminación de brókers",
  "nav.reports": "Informes",
  "nav.settings": "Ajustes",
  "nav.advanced": "Herramientas avanzadas",
  "nav.hideAdvanced": "Ocultar herramientas avanzadas",
  "common.protecting": "Protegiendo a {name}",
  "common.liveData": "Datos en vivo",
  "common.demoData": "Datos de demo",
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.signOut": "Cerrar sesión",
  "lang.label": "Idioma",
};

const de: Messages = {
  "nav.protection": "Schutz",
  "nav.overview": "Übersicht",
  "nav.assistant": "KI-Assistent",
  "nav.exposures": "Expositionsübersicht",
  "nav.removals": "Broker-Entfernungen",
  "nav.reports": "Berichte",
  "nav.settings": "Einstellungen",
  "nav.advanced": "Erweiterte Tools",
  "nav.hideAdvanced": "Erweiterte Tools ausblenden",
  "common.protecting": "Schutz von {name}",
  "common.liveData": "Live-Daten",
  "common.demoData": "Demo-Daten",
  "common.save": "Speichern",
  "common.cancel": "Abbrechen",
  "common.signOut": "Abmelden",
  "lang.label": "Sprache",
};

export const DICTIONARIES: Record<Locale, Messages> = { en, fr, es, de };

/** Translate a key for a locale, interpolating `{var}` placeholders. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const template = DICTIONARIES[locale]?.[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}
