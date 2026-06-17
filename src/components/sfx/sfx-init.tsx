"use client";

import { useEffect } from "react";
import { initSfxOnFirstGesture } from "@/lib/sfx";

/** Installs one-time gesture listeners so Web Audio can resume on mobile. */
export function SfxInit() {
  useEffect(() => {
    initSfxOnFirstGesture();
  }, []);
  return null;
}
