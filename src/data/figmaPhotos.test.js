import { describe, expect, it } from "vitest";
import { FIGMA_PHOTOS, figmaPhoto, figmaPhotoLight } from "./figmaPhotos.js";

describe("Figma photos by time of day", () => {
  it("shows a photo's own version for a theme when it has one", () => {
    expect(FIGMA_PHOTOS["reverance-hero"].themes.night).toBeTruthy();
    const night = figmaPhoto("reverance-hero", 2400, "night");
    expect(night.src).toBe("/assets/figma/reverance-hero-night-2400.webp");
    expect(night.srcSet).toContain("/assets/figma/reverance-hero-night-480.webp 480w");
    expect(figmaPhotoLight("reverance-hero", "night")).toBe("night");
  });

  it("keeps the Figma photo, and says which light it shows, where a theme has no version", () => {
    const entry = FIGMA_PHOTOS["downtown-map"];
    expect(entry.themes).toBeUndefined();
    expect(figmaPhoto("downtown-map", 1200, "night").src).toBe(figmaPhoto("downtown-map", 1200).src);
    expect(figmaPhotoLight("downtown-map", "night")).toBe("day");
    // The frame's Dubai renders are dusk scenes.
    expect(figmaPhotoLight("downtown-hero", "day")).toBe(FIGMA_PHOTOS["downtown-hero"].themes?.day ? "day" : "night");
  });

  it("gives every version the Figma photo's own size, so the theme cross-fade never moves", () => {
    for (const [name, entry] of Object.entries(FIGMA_PHOTOS)) {
      for (const version of Object.values(entry.themes ?? {})) {
        expect([name, version.width, version.height]).toEqual([name, entry.width, entry.height]);
      }
    }
  });
});
