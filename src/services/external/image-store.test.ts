import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { CloudinaryImageStore, publicIdFromUrl } from "./image-store.js";

/**
 * `publicIdFromUrl` est la pièce fragile : c'est elle qui traduit une URL de
 * livraison en identifiant supprimable. `destroy` s'appuie dessus et refuse de
 * toucher à ce qui n'est pas un média téléversé depuis le back-office.
 */

describe("publicIdFromUrl", () => {
  it("extrait l'identifiant d'une URL Cloudinary versionnée", () => {
    assert.equal(
      publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1712345678/huwstore/produits/sac-123.jpg"),
      "huwstore/produits/sac-123",
    );
  });

  it("gère une URL sans segment de version", () => {
    assert.equal(
      publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/huwstore/categories/cabas.png"),
      "huwstore/categories/cabas",
    );
  });

  it("gère une vidéo", () => {
    assert.equal(
      publicIdFromUrl("https://res.cloudinary.com/demo/video/upload/v9/huwstore/produits/clip.mp4"),
      "huwstore/produits/clip",
    );
  });

  it("renvoie null pour un fichier local ou un lien externe", () => {
    assert.equal(publicIdFromUrl("/univers/toile-coton.webp"), null);
    assert.equal(publicIdFromUrl("https://images.unsplash.com/photo-1520"), null);
  });
});

type DestroyResult = { result: string };

const storeWith = (destroy: (publicId: string, options: Record<string, unknown>) => Promise<DestroyResult>) => {
  const uploader = {
    upload: async () => ({ secure_url: "", public_id: "", width: 0, height: 0, bytes: 0 }),
    destroy: mock.fn(destroy),
  };
  return { store: new CloudinaryImageStore(uploader as never), destroy: uploader.destroy };
};

describe("CloudinaryImageStore.destroy", () => {
  it("supprime un média téléversé depuis le back-office", async () => {
    const { store, destroy } = storeWith(async () => ({ result: "ok" }));
    await store.destroy("https://res.cloudinary.com/demo/image/upload/v1/huwstore/produits/sac-1.jpg");

    assert.equal(destroy.mock.callCount(), 1);
    assert.equal(destroy.mock.calls[0].arguments[0], "huwstore/produits/sac-1");
    assert.equal(destroy.mock.calls[0].arguments[1].resource_type, "image");
  });

  it("traite « not found » comme un succès (déjà absent)", async () => {
    const { store } = storeWith(async () => ({ result: "not found" }));
    await assert.doesNotReject(
      store.destroy("https://res.cloudinary.com/demo/image/upload/v1/huwstore/produits/sac-2.jpg"),
    );
  });

  it("remonte une réponse inattendue pour que la file rejoue", async () => {
    const { store } = storeWith(async () => ({ result: "error" }));
    await assert.rejects(
      store.destroy("https://res.cloudinary.com/demo/image/upload/v1/huwstore/produits/sac-3.jpg"),
    );
  });

  it("ne touche jamais à un visuel de seed partagé", async () => {
    const { store, destroy } = storeWith(async () => ({ result: "ok" }));
    await store.destroy("https://res.cloudinary.com/demo/image/upload/v1/huwstore/univers/toile.webp");
    assert.equal(destroy.mock.callCount(), 0);
  });

  it("ne touche jamais à un fichier local", async () => {
    const { store, destroy } = storeWith(async () => ({ result: "ok" }));
    await store.destroy("/univers/toile-coton.webp");
    assert.equal(destroy.mock.callCount(), 0);
  });
});
