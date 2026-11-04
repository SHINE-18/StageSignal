"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, QrCode, Download, ExternalLink } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  joinUrl: string;
  roomCode: string;
  roomName: string;
}

export function QRCodeModal({
  isOpen,
  onClose,
  joinUrl,
  roomCode,
  roomName,
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && joinUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        joinUrl,
        {
          width: 280,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("QR Code generation error:", err);
        }
      );
    }
  }, [isOpen, joinUrl]);

  if (!isOpen) return null;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleDownload() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `StageSignal-${roomCode}-QR.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0F0E11] p-6 sm:p-8 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-2 text-stone-400 hover:bg-white/10 hover:text-white transition"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FC3B00]/25 to-[#FF6129]/20 text-[#FC3B00] border border-[#FC3B00]/30 shadow-lg shadow-[#FC3B00]/10">
            <QrCode size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#FF7145]">
            Musician Invitation QR
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-white tracking-tight">{roomName}</h2>
          <p className="mt-1 text-xs text-stone-400 leading-relaxed">
            Musicians can scan this code with their smartphone camera to connect to the stage queue.
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="rounded-2xl border border-white/20 bg-white p-3.5 shadow-xl">
            <canvas ref={canvasRef} className="rounded-xl" />
          </div>
          <div className="mt-4 text-center">
            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
              Stage Room Code
            </span>
            <div className="font-mono text-3xl font-extrabold tracking-[0.2em] text-[#FF7145] mt-0.5">
              {roomCode}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copiedLink ? "Link Copied" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-xs font-semibold text-stone-200 hover:bg-white/10 hover:text-white transition active:scale-95"
          >
            {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copiedCode ? "Code Copied" : "Copy Code"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FC3B00] to-[#FF6129] py-3.5 text-xs font-bold text-white shadow-lg shadow-[#FC3B00]/25 hover:from-[#E03500] hover:to-[#F2551D] transition active:scale-95"
        >
          <Download size={16} /> Save QR Image (PNG)
        </button>

        <div className="mt-4 rounded-xl bg-white/[0.04] px-3.5 py-2.5 border border-white/10 flex items-center justify-between text-[11px] text-stone-400 font-mono">
          <span className="truncate mr-2">{joinUrl}</span>
          <ExternalLink size={12} className="shrink-0 text-stone-500" />
        </div>
      </div>
    </div>
  );
}
