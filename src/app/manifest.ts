import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NZ Meal Tracker",
    short_name: "Meals",
    description: "Track calories, recipes, and Auckland shopping lists",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0F6E56",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
