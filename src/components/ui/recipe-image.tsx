"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { getRecipeAccent } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function RecipeImage({
  recipeId,
  name,
  imageUrl,
  accentIndex = 0,
  className,
  sizes = "(max-width: 430px) 50vw",
}: {
  recipeId: number;
  name: string;
  imageUrl: string | null;
  accentIndex?: number;
  className?: string;
  sizes?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!imageUrl) {
    return (
      <div
        className={cn("h-full w-full", className)}
        style={{ backgroundColor: getRecipeAccent(recipeId + accentIndex) }}
        aria-hidden
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "recipe-image-placeholder absolute inset-0",
          loaded && "opacity-0",
        )}
        style={{ backgroundColor: getRecipeAccent(recipeId + accentIndex) }}
        aria-hidden
      />
      <Image
        src={imageUrl}
        alt={name}
        fill
        className={cn(
          "recipe-image-enter object-cover",
          loaded && "recipe-image-loaded",
          className,
        )}
        sizes={sizes}
        unoptimized
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}

export function RecipeImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[var(--mint-hero)] text-[var(--primary)]/40",
        className,
      )}
    >
      <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
    </div>
  );
}
