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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#19191b] p-6 sm:p-8 text-[#ededed]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border border-white/[0.08] bg-[#232325] p-1.5 text-[#a1a1a6] hover:text-[#ededed] transition"
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#232325] text-[#fc3b00] border border-white/[0.08]">
            <QrCode size={20} />
          </div>
          <p className="text-xs font-medium text-[#fc3b00]">
            Musician invitation QR
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#ededed] tracking-tight">{roomName}</h2>
          <p className="mt-1 text-xs text-[#a1a1a6] leading-relaxed">
            Musicians can scan this code with their smartphone camera to connect to the stage queue.
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="rounded-lg border border-white/[0.08] bg-white p-3">
            <canvas ref={canvasRef} className="rounded" />
          </div>
          <div className="mt-4 text-center">
            <span className="text-[11px] text-[#85858b] font-medium">
              Stage room code
            </span>
            <div className="font-mono text-3xl font-bold tracking-[0.15em] text-[#fc3b00] mt-0.5 tabular-nums">
              {roomCode}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#232325] py-2.5 text-xs font-semibold text-[#ededed] hover:bg-[#2c2c2f] transition active:translate-y-px"
          >
            {copiedLink ? <Check size={14} className="text-[#4cc38a]" /> : <Copy size={14} />}
            <span>{copiedLink ? "Link copied" : "Copy link"}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#232325] py-2.5 text-xs font-semibold text-[#ededed] hover:bg-[#2c2c2f] transition active:translate-y-px"
          >
            {copiedCode ? <Check size={14} className="text-[#4cc38a]" /> : <Copy size={14} />}
            <span>{copiedCode ? "Code copied" : "Copy code"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#fc3b00] hover:bg-[#e03500] py-2.5 text-xs font-semibold text-white transition active:translate-y-px min-h-[40px]"
        >
          <Download size={14} /> <span>Save QR image (PNG)</span>
        </button>

        <div className="mt-4 rounded-lg bg-[#0f0f10] px-3 py-2 border border-white/[0.08] flex items-center justify-between text-[11px] text-[#85858b] font-mono">
          <span className="truncate mr-2">{joinUrl}</span>
          <ExternalLink size={12} className="shrink-0 text-[#85858b]" />
        </div>
      </div>
    </div>
  );
}
