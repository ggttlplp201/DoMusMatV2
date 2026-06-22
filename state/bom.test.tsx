import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { BomProvider, useBom } from "./bom";

beforeEach(() => localStorage.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <BomProvider>{children}</BomProvider>;

describe("useBom", () => {
  it("adds, increments, and counts items", () => {
    const { result } = renderHook(() => useBom(), { wrapper });
    act(() => result.current.add("R1", 2));
    act(() => result.current.add("R1", 3));
    expect(result.current.items.find(i => i.ref === "R1")?.quantity).toBe(5);
    expect(result.current.count).toBe(5);
  });
  it("persists to dmm.bom in localStorage", () => {
    const { result } = renderHook(() => useBom(), { wrapper });
    act(() => result.current.add("R2", 1));
    expect(localStorage.getItem("dmm.bom")).toContain("R2");
  });
  it("removes an item", () => {
    const { result } = renderHook(() => useBom(), { wrapper });
    act(() => result.current.add("R3", 2));
    act(() => result.current.remove("R3"));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.count).toBe(0);
  });
  it("clears all items", () => {
    const { result } = renderHook(() => useBom(), { wrapper });
    act(() => result.current.add("R4", 1));
    act(() => result.current.add("R5", 2));
    act(() => result.current.clear());
    expect(result.current.items).toHaveLength(0);
  });
  it("setQty updates a specific item quantity", () => {
    const { result } = renderHook(() => useBom(), { wrapper });
    act(() => result.current.add("R6", 1));
    act(() => result.current.setQty("R6", 10));
    expect(result.current.items.find(i => i.ref === "R6")?.quantity).toBe(10);
  });
});
