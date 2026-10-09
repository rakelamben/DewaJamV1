import { describe, it, expect } from "vitest";
import { routeRegistry, type RouteConfig } from "./registry";

describe("routeRegistry", () => {
  it("harus mendaftarkan area marketplace dan portal internal", () => {
    expect(routeRegistry).toHaveLength(7);
  });

  it("harus mendaftarkan area marketplace /", () => {
    const entry = routeRegistry.find((r) => r.path === "/");
    expect(entry).toBeDefined();
    expect(entry?.authMode).toBe("lazy");
  });

  it("harus mendaftarkan area /inplace", () => {
    const entry = routeRegistry.find((r) => r.path === "/inplace");
    expect(entry).toBeDefined();
    expect(entry?.authMode).toBe("lazy");
  });

  it("harus mendaftarkan area /internal", () => {
    const entry = routeRegistry.find((r) => r.path === "/internal");
    expect(entry).toBeDefined();
    expect(entry?.authMode).toBe("hard");
  });

  it("harus mendaftarkan area /internal/pos", () => {
    const entry = routeRegistry.find((r) => r.path === "/internal/pos");
    expect(entry).toBeDefined();
    expect(entry?.authMode).toBe("hard");
  });

  it("harus mendaftarkan area /internal/warehouse", () => {
    const entry = routeRegistry.find((r) => r.path === "/internal/warehouse");
    expect(entry).toBeDefined();
    expect(entry?.authMode).toBe("hard");
  });

  it("harus mendaftarkan area /internal/management", () => {
    const entry = routeRegistry.find((r) => r.path === "/internal/management");
    expect(entry).toBeDefined();
    expect(entry?.authMode).toBe("hard");
  });

  describe("setiap entri harus memiliki field yang wajib", () => {
    it.each(routeRegistry)(
      "entri $path harus punya field path, label, allowedRoles, authMode, component",
      (entry: RouteConfig) => {
        expect(typeof entry.path).toBe("string");
        expect(entry.path.length).toBeGreaterThan(0);

        expect(typeof entry.label).toBe("string");
        expect(entry.label.length).toBeGreaterThan(0);

        expect(Array.isArray(entry.allowedRoles)).toBe(true);
        expect(entry.allowedRoles.length).toBeGreaterThan(0);
        entry.allowedRoles.forEach((role) => expect(typeof role).toBe("string"));

        expect(["lazy", "hard"]).toContain(entry.authMode);

        expect(entry.component).toBeDefined();
        expect(typeof entry.component).toBe("object");
      },
    );
  });

  it("allowedRoles hanya berisi role yang valid", () => {
    const validRoles = new Set([
      "customer",
      "kasir",
      "gudang",
      "manager",
      "admin",
    ]);
    routeRegistry.forEach((entry) => {
      entry.allowedRoles.forEach((role) => {
        expect(validRoles.has(role)).toBe(true);
      });
    });
  });

  it("menambah entri baru ke registry langsung tersedia", () => {
    const originalLength = routeRegistry.length;

    const newEntry: RouteConfig = {
      path: "/test-route",
      label: "Test",
      allowedRoles: ["admin"],
      authMode: "hard",
      component: routeRegistry[0].component,
    };

    routeRegistry.push(newEntry);

    expect(routeRegistry).toHaveLength(originalLength + 1);
    expect(routeRegistry.find((r) => r.path === "/test-route")).toEqual(newEntry);

    // Bersihkan setelah test agar tidak memengaruhi test lain
    routeRegistry.pop();
    expect(routeRegistry).toHaveLength(originalLength);
  });
});
