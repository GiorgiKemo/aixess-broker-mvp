import { getWorkbookAvailableCount } from "./reveranceInventory.js";

// Homepage project showcase, following Lasha Bakashvili's "Current project in Batumi"
// frame: one large render with a thumbnail strip, four metric tiles and a dark
// project card. Only projects with a confirmed name and approved imagery belong
// here; future projects are added to UPCOMING_PROJECTS once their name, renders,
// pricing and handover date are supplied, and nothing renders until then.
const image = (slug, sizes, thumb = `/assets/projects/${slug}-600.webp`) => ({
  src: `/assets/projects/${slug}-${sizes[sizes.length - 1]}.webp`,
  srcSet: sizes.map((width) => `/assets/projects/${slug}-${width}.webp ${width}w`).join(", "),
  thumb,
});

const galleryImage = (slug, sizes = [960, 1600, 2400]) => ({
  src: `/assets/projects/gallery/${slug}-${sizes[sizes.length - 1]}.webp`,
  srcSet: sizes.map((width) => `/assets/projects/gallery/${slug}-${width}.webp ${width}w`).join(", "),
  thumb: `/assets/projects/gallery/${slug}-480.webp`,
});

export const FEATURED_PROJECT = {
  id: "reverance",
  startingPrice: 45000,
  currency: "EUR",
  availableResidences: getWorkbookAvailableCount(),
  completionYear: 2028,
  gallery: [
    image("reverance-front", [700, 1400], "/assets/projects/reverance-front-700.webp"),
    image("reverance-hero", [600, 1200]),
    image("reverance-entrance", [600, 1200]),
    image("reverance-aerial", [600, 1200]),
    image("reverance-facade", [600, 1200]),
    // Official 4K renders from the project gallery; they replaced two 700px apartment cut-aways
    // that were soft and cropped in the frame (Kemo, 17 October 2026).
    galleryImage("lobby"),
    galleryImage("garden-pool"),
  ],
};

/** @type {Array<{ id: string, name: string, location: Record<string, string>, image: string }>} */
export const UPCOMING_PROJECTS = [];
