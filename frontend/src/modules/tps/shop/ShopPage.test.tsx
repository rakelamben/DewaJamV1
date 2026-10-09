import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ShopPage from "./ShopPage";
import publicApiClient from "@/shared/public-api-client";
import type { Product } from "@/shared/types/catalog";

vi.mock("@/shared/public-api-client", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("./components/MarketplaceHeader", () => ({
  MarketplaceHeader: () => null,
}));
vi.mock("./components/CategoryNavStrip", () => ({
  CategoryNavStrip: () => null,
}));
vi.mock("./components/HeroBanner", () => ({
  HeroBanner: () => null,
}));
vi.mock("./components/BrandShowcase", () => ({
  BrandShowcase: () => null,
}));
vi.mock("./components/CategoryPromoBanner", () => ({
  CategoryPromoBanner: () => null,
}));
vi.mock("./components/ValuePropositions", () => ({
  ValuePropositions: () => null,
}));
vi.mock("./components/MarketplaceFooter", () => ({
  MarketplaceFooter: () => null,
}));
vi.mock("@/modules/auth/CustomerLoginModal", () => ({
  default: () => null,
}));
vi.mock("./components/ProductCarouselRow", () => ({
  ProductCarouselRow: ({ products }: { products: Product[] }) => (
    <div>
      {products.map((product) => (
        <article data-testid="product-card" key={product.product_id}>
          {product.nama_barang}
        </article>
      ))}
    </div>
  ),
}));

const product: Product = {
  product_id: "product-1",
  nama_barang: "Jam Test",
  kategori: "Jam Tangan Pria",
  harga: 2500000,
  stok: 8,
  deskripsi: "Jam contoh untuk pengujian",
  gambar_url: "https://example.com/watch.png",
  tags: ["otomatis"],
  created_at: "2026-01-01T00:00:00Z",
};

describe("ShopPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders products from the public catalog endpoint in guest mode", async () => {
    vi.mocked(publicApiClient.get).mockResolvedValue({
      data: { items: [product], total: 1 },
    });

    render(<ShopPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId("product-card").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Jam Test").length).toBeGreaterThan(0);
    expect(publicApiClient.get).toHaveBeenCalledWith(
      "/api/v1/tps/catalog/products",
      { params: { limit: 15 } },
    );
  });

  it("shows an error message when the public catalog request fails", async () => {
    vi.mocked(publicApiClient.get).mockRejectedValue(new Error("Network error"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ShopPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Katalog produk gagal dimuat.",
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
