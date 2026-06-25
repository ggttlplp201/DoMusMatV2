import { describe, it, expect } from "vitest";
import { routeAccess } from "./roles";

describe("routeAccess", () => {
  it("allows a manager into /admin and nested admin routes", () => {
    expect(routeAccess("/admin", "manager")).toBe("allow");
    expect(routeAccess("/admin/orders", "manager")).toBe("allow");
  });
  it("denies a customer from /admin", () => {
    expect(routeAccess("/admin", "customer")).toBe("deny");
  });
  it("sends an anonymous visitor on /admin to login", () => {
    expect(routeAccess("/admin", null)).toBe("login");
  });
  it("allows any authenticated user into /account", () => {
    expect(routeAccess("/account", "customer")).toBe("allow");
    expect(routeAccess("/account/orders", "manager")).toBe("allow");
  });
  it("sends an anonymous visitor on /account to login", () => {
    expect(routeAccess("/account", null)).toBe("login");
  });
  it("allows all roles (and anonymous) on unguarded routes", () => {
    expect(routeAccess("/catalogue", null)).toBe("allow");
    expect(routeAccess("/configurator", null)).toBe("allow");
    expect(routeAccess("/", "customer")).toBe("allow");
  });
});
