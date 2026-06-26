import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Balizador de Jardim LED")).toBe("balizador-de-jardim-led");
  });

  it("strips Portuguese diacritics", () => {
    expect(slugify("Armário de Cozinha")).toBe("armario-de-cozinha");
    expect(slugify("Grelha de Drenagem Aço Inox")).toBe("grelha-de-drenagem-aco-inox");
  });

  it("collapses punctuation, symbols and repeated separators", () => {
    expect(slugify("Grelha – Aço / Inox")).toBe("grelha-aco-inox");
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces");
    expect(slugify("Já! @#$ ok")).toBe("ja-ok");
  });

  it("returns empty string for input with no alphanumerics", () => {
    expect(slugify("—  @#  ")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when not taken", () => {
    expect(uniqueSlug("foo", new Set())).toBe("foo");
  });

  it("appends an incrementing suffix when taken", () => {
    expect(uniqueSlug("foo", new Set(["foo"]))).toBe("foo-2");
    expect(uniqueSlug("foo", new Set(["foo", "foo-2"]))).toBe("foo-3");
  });
});
