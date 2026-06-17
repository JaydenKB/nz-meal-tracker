"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScanMode = "native" | "zxing" | "manual";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function useBarcodeScanner(onDetected: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingRef = useRef<{ stop: () => void } | null>(null);
  const [mode, setMode] = useState<ScanMode>("manual");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const detectedRef = useRef(false);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    zxingRef.current?.stop();
    zxingRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const handleDetection = useCallback(
    (code: string) => {
      if (detectedRef.current) return;
      const digits = code.replace(/\D/g, "");
      if (digits.length < 7) return;
      detectedRef.current = true;
      stop();
      onDetected(digits);
    },
    [onDetected, stop],
  );

  const startNativeLoop = useCallback(
    async (detector: InstanceType<NonNullable<typeof window.BarcodeDetector>>) => {
      const tick = async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            handleDetection(codes[0].rawValue);
            return;
          }
        } catch {
          /* frame skip */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [handleDetection],
  );

  const startZxing = useCallback(async () => {
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const reader = new BrowserMultiFormatReader();
    const video = videoRef.current;
    if (!video) return;

    const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (result) handleDetection(result.getText());
    });

    zxingRef.current = {
      stop: () => {
        controls.stop();
      },
    };
  }, [handleDetection]);

  const start = useCallback(async () => {
    detectedRef.current = false;
    setCameraError(null);
    stop();

    if (!navigator.mediaDevices?.getUserMedia) {
      setMode("manual");
      setCameraError("Camera not supported in this browser — enter the barcode manually.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setActive(true);

      if (typeof window.BarcodeDetector !== "undefined") {
        try {
          const detector = new window.BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });
          setMode("native");
          await startNativeLoop(detector);
          return;
        } catch {
          /* fall through to zxing */
        }
      }

      setMode("zxing");
      await startZxing();
    } catch (err) {
      setMode("manual");
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setCameraError(
        denied
          ? "Camera access denied — enter the barcode manually below."
          : "Couldn't open the camera — enter the barcode manually.",
      );
    }
  }, [startNativeLoop, startZxing, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    videoRef,
    start,
    stop,
    active,
    mode,
    cameraError,
  };
}
