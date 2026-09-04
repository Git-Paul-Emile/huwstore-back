import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { categoryRepository } from "../repositories/category.repository.js";
import { productRepository } from "../repositories/product.repository.js";
import { buildCategoryList } from "./category.service.js";

const category = (over: Record<string, unknown> = {}) =>
  ({
    id: "c1",
    name: "Cabas",
    slug: "cabas",
    image: "/univers/cabas.webp",
    description: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { products: 12 },
    ...over,
  }) as unknown as Awaited<ReturnType<typeof categoryRepository.findAll>>[number];

const product = (categoryId: string, name: string, variantImage?: string, productImage?: string) =>
  ({
    categoryId,
    name,
    images: productImage ? [{ url: productImage, alt: name }] : [],
    variants: variantImage ? [{ images: [{ url: variantImage, alt: name }] }] : [],
  }) as unknown as Awaited<ReturnType<typeof productRepository.findCategoryCoverSources>>[number];

const mockRepos = (categories: unknown[], products: unknown[]) => {
  mock.method(categoryRepository, "findAll", async () => categories);
  mock.method(productRepository, "findCategoryCoverSources", async () => products);
};

describe("buildCategoryList", () => {
  afterEach(() => mock.restoreAll());

  it("compose la couverture depuis les produits : image de déclinaison, sinon image de fiche", async () => {
    mockRepos(
      [category()],
      [product("c1", "Sac A", "https://cdn/a-variant.jpg"), product("c1", "Sac B", undefined, "https://cdn/b-produit.jpg")],
    );

    const [dto] = await buildCategoryList();
    assert.deepEqual(
      dto.preview.map((p) => p.url),
      ["https://cdn/a-variant.jpg", "https://cdn/b-produit.jpg"],
    );
  });

  it("dédoublonne et plafonne la couverture à 4 visuels", async () => {
    mockRepos(
      [category()],
      [
        product("c1", "A", "https://cdn/1.jpg"),
        product("c1", "B", "https://cdn/1.jpg"),
        product("c1", "C", "https://cdn/2.jpg"),
        product("c1", "D", "https://cdn/3.jpg"),
        product("c1", "E", "https://cdn/4.jpg"),
        product("c1", "F", "https://cdn/5.jpg"),
      ],
    );

    const [dto] = await buildCategoryList();
    assert.deepEqual(
      dto.preview.map((p) => p.url),
      ["https://cdn/1.jpg", "https://cdn/2.jpg", "https://cdn/3.jpg", "https://cdn/4.jpg"],
    );
  });

  it("une image choisie au back-office prime sur la mosaïque de produits", async () => {
    mockRepos(
      [category({ image: "https://res.cloudinary.com/x/image/upload/v1/huwstore/categories/cabas.png" })],
      [product("c1", "Sac A", "https://cdn/a.jpg")],
    );

    const [dto] = await buildCategoryList();
    assert.deepEqual(dto.preview, [
      { url: "https://res.cloudinary.com/x/image/upload/v1/huwstore/categories/cabas.png", alt: "Cabas" },
    ]);
  });

  it("garde la mosaïque produits quand l'image est le visuel de départ (local ou Cloudinary)", async () => {
    for (const image of [
      "/univers/toile-coton.webp",
      "https://res.cloudinary.com/x/image/upload/v1/huwstore/univers/toile-coton.webp",
    ]) {
      mock.restoreAll();
      mockRepos([category({ image })], [product("c1", "Sac A", "https://cdn/a.jpg")]);
      const [dto] = await buildCategoryList();
      assert.deepEqual(
        dto.preview.map((p) => p.url),
        ["https://cdn/a.jpg"],
        `échec pour image = ${image}`,
      );
    }
  });

  it("renvoie une couverture vide pour un univers sans produit ni image choisie, et ne fuit pas les colonnes ORM", async () => {
    mockRepos([category({ image: "/univers/cabas.webp" })], []);

    const [dto] = await buildCategoryList();
    assert.deepEqual(dto.preview, []);
    assert.equal(dto.image, "/univers/cabas.webp");
    assert.ok(!("createdAt" in dto));
    assert.ok(!("updatedAt" in dto));
  });
});
