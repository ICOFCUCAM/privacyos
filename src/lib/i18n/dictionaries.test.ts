import { describe, it, expect } from "vitest";
import { translate, DICTIONARIES } from "./dictionaries";
import { LOCALES } from "./config";

describe("i18n translate", () => {
  it("translates a key per locale", () => {
    expect(translate("en", "nav.settings")).toBe("Settings");
    expect(translate("fr", "nav.settings")).toBe("Paramètres");
    expect(translate("de", "nav.protection")).toBe("Schutz");
  });

  it("interpolates {var} placeholders", () => {
    expect(translate("en", "common.protecting", { name: "Jordan" })).toBe("Protecting Jordan");
    expect(translate("fr", "common.protecting", { name: "Jordan" })).toBe("Protection de Jordan");
  });

  it("falls back to English, then the key itself", () => {
    // simulate a missing key: unknown id returns the key
    expect(translate("fr", "nonexistent.key")).toBe("nonexistent.key");
  });

  it("every locale defines the same key set as English (no gaps in the seed)", () => {
    const enKeys = Object.keys(DICTIONARIES.en).sort();
    for (const { code } of LOCALES) {
      expect(Object.keys(DICTIONARIES[code]).sort(), code).toEqual(enKeys);
    }
  });
});
