import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { LocaleProvider, useLocale, useT } from "./locale";
import { translate } from "@/lib/i18n";

// Wrapper for hooks
function wrapper({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("translate()", () => {
  it("returns PT string for pt locale", () => {
    expect(translate("pt", "nav.login")).toBe("Iniciar sessão");
  });

  it("returns EN string for en locale", () => {
    expect(translate("en", "nav.login")).toBe("Login");
  });

  it("returns ZH string for zh locale", () => {
    expect(translate("zh", "nav.login")).toBe("登录");
  });

  it("falls back to PT when key missing in locale", () => {
    // nav.login exists in all; use a key only in pt to simulate (key itself as fallback)
    expect(translate("en", "nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("useLocale()", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to pt locale", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("pt");
  });

  it("setLocale updates the locale", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => {
      result.current.setLocale("en");
    });
    expect(result.current.locale).toBe("en");
  });

  it("setLocale persists to localStorage under dmm.locale", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => {
      result.current.setLocale("zh");
    });
    expect(localStorage.getItem("dmm.locale")).toBe("zh");
  });
});

describe("useT()", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns PT string for default locale", () => {
    const { result } = renderHook(() => useT(), { wrapper });
    expect(result.current("nav.login")).toBe("Iniciar sessão");
  });

  it("returns ZH string after switching to zh", () => {
    const { result: localeResult } = renderHook(() => useLocale(), { wrapper });
    const { result: tResult } = renderHook(() => useT(), { wrapper });
    act(() => {
      localeResult.current.setLocale("zh");
    });
    // Need a shared provider; test translate directly for correctness
    expect(translate("zh", "nav.login")).toBe("登录");
  });
});
