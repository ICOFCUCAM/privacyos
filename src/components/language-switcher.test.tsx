// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { LanguageSwitcher } from "@/components/language-switcher";
import { LocaleProvider } from "@/lib/i18n/provider";

afterEach(() => { cleanup(); refresh.mockClear(); });

describe("<LanguageSwitcher>", () => {
  it("lists the supported locales with the active one selected", () => {
    render(<LocaleProvider locale="fr"><LanguageSwitcher /></LocaleProvider>);
    const select = screen.getByLabelText(/Langue|Language/i) as HTMLSelectElement;
    expect(select.value).toBe("fr");
    const codes = Array.from(select.options).map((o) => o.value);
    expect(codes).toEqual(expect.arrayContaining(["en", "fr", "es", "de"]));
  });
});
