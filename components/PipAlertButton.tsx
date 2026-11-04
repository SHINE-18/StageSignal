"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PictureInPicture, AlertCircle } from "lucide-react";

export function PipAlertButton({
  openCount,
  hasSos,
  roomCode,
}: {
  openCount: number;
  hasSos: boolean;
  roomCode: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check support on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = document.createElement("canvas");
    const video = document.createElement("video");

    const hasPip =
      "pictureInPictureEnabled" in document &&
      Boolean((document as any).pictureInPictureEnabled) &&
      typeof video.requestPictureInPicture === "function";

    const hasCaptureStream =
      typeof (canvas as any).captureStream === "function" ||
      typeof (canvas as any).mozCaptureStream === "function";

    setIsSupported(hasPip && hasCaptureStream);
  }, []);

  // Continuous canvas render loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = hasSos ? "#450a0a" : "#0C0D0E";
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = hasSos ? "#DC143C" : "#F97316";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Header: Room Code
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(`STAGE: ${roomCode}`, 14, 24);

    // SOS or Normal Banner
    if (hasSos) {
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("🚨 URGENT SOS", 14, 56);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText("Check mixing booth now", 14, 80);
    } else {
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(`${openCount} OPEN`, 14, 62);
      ctx.fillStyle = "#22c55e";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(openCount === 0 ? "✓ Queue all clear" : "Live stage cues waiting", 14, 82);
    }
  }, [openCount, hasSos, roomCode]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  const togglePip = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    setErrorMessage(null);

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
        return;
      }

      drawFrame();

      if (!video.srcObject) {
        const stream = (canvas as any).captureStream ? (canvas as any).captureStream(10) : null;
        if (!stream) {
          throw new Error("Canvas captureStream is not supported on this browser.");
        }
        video.srcObject = stream;
        await video.play();
      }

      await video.requestPictureInPicture();
      setIsPipActive(true);

      video.addEventListener(
        "leavepictureinpicture",
        () => {
          setIsPipActive(false);
        },
        { once: true }
      );
    } catch (err: any) {
      console.warn("Picture-in-Picture failed:", err);
      setErrorMessage(
        err?.message || "PiP streaming is restricted by browser policy on this device."
      );
    }
  };

  if (!isSupported) {
    return null; // Gracefully hidden on unsupported engines (e.g. mobile Safari canvas restriction)
  }

  return (
    <div className="relative inline-flex items-center">
      {/* Hidden canvas & video stream pipeline */}
      <canvas ref={canvasRef} width={260} height={100} className="hidden" />
      <video ref={videoRef} muted playsInline className="hidden" />

      <button
        onClick={togglePip}
        title="Pop out a floating Picture-in-Picture badge (Experimental)"
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
          isPipActive
            ? "border-orange-500/50 bg-orange-500/20 text-[#FFA726]"
            : "border-white/10 bg-[#1E1815] text-slate-300 hover:border-orange-500/40 hover:text-white"
        }`}
      >
        <PictureInPicture size={13} />
        <span>{isPipActive ? "PiP Active" : "PiP Badge"}</span>
      </button>

      {errorMessage && (
        <span
          title={errorMessage}
          className="ml-1.5 text-amber-400 hover:text-amber-300 cursor-pointer"
        >
          <AlertCircle size={14} />
        </span>
      )}
    </div>
  );
}

