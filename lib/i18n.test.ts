import { describe, it, expect } from "vitest";
import { localizedName } from "./i18n";

describe("localizedName", () => {
  const obj = { name: "Nome PT", name_en: "English Name", name_zh: "中文名称" };

  it("returns name_zh for zh locale", () => {
    expect(localizedName(obj, "zh")).toBe("中文名称");
  });

  it("returns name_en for en locale", () => {
    expect(localizedName(obj, "en")).toBe("English Name");
  });

  it("returns name (PT) for pt locale", () => {
    expect(localizedName(obj, "pt")).toBe("Nome PT");
  });

  it("falls back to name when name_en is missing", () => {
    const noEn = { name: "Nome PT", name_zh: "中文名称" };
    expect(localizedName(noEn, "en")).toBe("Nome PT");
  });

  it("falls back to name when name_zh is missing", () => {
    const noZh = { name: "Nome PT", name_en: "English Name" };
    expect(localizedName(noZh, "zh")).toBe("Nome PT");
  });

  it("falls back to name when name_en is empty string", () => {
    const emptyEn = { name: "Nome PT", name_en: "", name_zh: "中文名称" };
    expect(localizedName(emptyEn, "en")).toBe("Nome PT");
  });

  it("falls back to name when name_zh is empty string", () => {
    const emptyZh = { name: "Nome PT", name_en: "English Name", name_zh: "" };
    expect(localizedName(emptyZh, "zh")).toBe("Nome PT");
  });
});
