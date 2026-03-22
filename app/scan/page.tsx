"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

type PreviewGroup = {
  ticketTypeCode: string;
  ticketTypeName: string;
  hasSwimmingPass: boolean;
  total: number;
  used: number;
  remaining: number;
};

type PreviewUnused = {
  id: string;
  ticketTypeCode: string;
  ticketTypeName: string;
  hasSwimmingPass: boolean;
  totalPriceCents: number;
};

type PreviewOk = {
  ok: true;
  order: { id: string; customerEmail: string; visitDate: string };
  groups: PreviewGroup[];
  unusedTickets: PreviewUnused[];
};

type PreviewErr = { ok: false; reason: string };

type AdmitOk = {
  ok: true;
  ticket: {
    id: string;
    orderId: string;
    ticketType: string;
    hasSwimmingPass: boolean;
    visitDate: string;
  };
  wristband: { label: string; colour: string | null };
};

type AdmitErr = { ok: false; reason: string; details?: { usedAt?: string; usedBy?: string } };

function todayISODateLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerIdRef = useRef("gate-1");

  const [scannerId, setScannerId] = useState("gate-1");
  scannerIdRef.current = scannerId;

  const [torchOn, setTorchOn] = useState(false);

  const [phase, setPhase] = useState<"scan" | "review" | "result">("scan");
  const [message, setMessage] = useState("Ready to scan");
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewOk | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [admitResult, setAdmitResult] = useState<AdmitOk | AdmitErr | null>(null);

  const reader = useMemo(() => new BrowserQRCodeReader(), []);

  const armedRef = useRef(true);
  const lastTokenRef = useRef<string | null>(null);
  const lastNoQrSeenAtRef = useRef<number>(Date.now());
  const processingRef = useRef(false);

  const REARM_AFTER_NO_QR_MS = 450;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    let stopped = false;

    async function start() {
      setMessage("Starting camera…");

      const video = videoRef.current;
      if (!video) return;

      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        const preferred = devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];

        reader.decodeFromVideoDevice(
          preferred?.deviceId,
          video,
          async (result: unknown, err: unknown) => {
            if (stopped) return;
            if (phaseRef.current !== "scan") return;

            if (!result && err instanceof NotFoundException) {
              lastNoQrSeenAtRef.current = Date.now();
              return;
            }
            if (!result) return;

            const tokenText = String((result as { getText?: () => string }).getText?.() || "").trim();
            if (!tokenText) return;

            if (!armedRef.current) {
              if (lastTokenRef.current && tokenText !== lastTokenRef.current) {
                armedRef.current = true;
              } else {
                return;
              }
            }

            if (processingRef.current) return;

            processingRef.current = true;
            armedRef.current = false;
            lastTokenRef.current = tokenText;

            setMessage("Loading order…");

            try {
              const res = await fetch("/api/scan/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: tokenText,
                  scannerId: scannerIdRef.current,
                  clientDate: todayISODateLocal(),
                }),
              });

              const data: PreviewOk | PreviewErr = await res.json();
              setLastToken(tokenText);

              if (data.ok) {
                setPreview(data);
                setPreviewError(null);
                setSelectedTicketId(data.unusedTickets[0]?.id ?? "");
                setPhase("review");
                setMessage("Review admission");
              } else {
                setPreview(null);
                setPreviewError(data.reason);
                setPhase("result");
                setMessage("INVALID ❌");
              }
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Unknown error";
              setPreviewError(msg);
              setPhase("result");
              setMessage("ERROR");
            } finally {
              processingRef.current = false;
            }
          }
        );

        setMessage("Ready to scan");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown";
        setMessage("Camera error: " + msg);
      }
    }

    start();

    const rearmTimer = setInterval(() => {
      if (stopped) return;
      if (armedRef.current) return;
      if (phaseRef.current !== "scan") return;

      const elapsed = Date.now() - lastNoQrSeenAtRef.current;
      if (elapsed >= REARM_AFTER_NO_QR_MS) {
        armedRef.current = true;
      }
    }, 120);

    return () => {
      stopped = true;
      clearInterval(rearmTimer);

      try {
        const r = reader as unknown as { stopContinuousDecode?: () => void; reset?: () => void };
        if (typeof r.stopContinuousDecode === "function") r.stopContinuousDecode();
        if (typeof r.reset === "function") r.reset();
      } catch {
        /* ignore */
      }

      const video = videoRef.current;
      const stream = (video?.srcObject as MediaStream | null) ?? streamRef.current;

      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [reader]);

  async function toggleTorch() {
    const video = videoRef.current;
    const stream = (video?.srcObject as MediaStream | null) ?? streamRef.current;
    const track = stream?.getVideoTracks?.()?.[0];
    if (!track) return;

    const caps = (track.getCapabilities ? track.getCapabilities() : {}) as MediaTrackCapabilities & { torch?: boolean };
    if (!caps.torch) {
      alert("Torch not supported on this device/browser.");
      return;
    }

    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] } as MediaTrackConstraints);
      setTorchOn((v) => !v);
    } catch {
      alert("Could not toggle torch.");
    }
  }

  function resetScan() {
    setPreview(null);
    setPreviewError(null);
    setAdmitResult(null);
    setLastToken(null);
    setSelectedTicketId("");
    setPhase("scan");
    setMessage("Ready to scan");
    armedRef.current = true;
    lastTokenRef.current = null;
  }

  function denyAdmission() {
    resetScan();
  }

  async function acceptAdmission() {
    if (!lastToken || !selectedTicketId) return;
    setMessage("Confirming…");
    try {
      const res = await fetch("/api/scan/admit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: lastToken,
          ticketId: selectedTicketId,
          scannerId: scannerIdRef.current,
        }),
      });
      const data: AdmitOk | AdmitErr = await res.json();
      setAdmitResult(data);
      setPhase("result");
      setMessage(data.ok ? "ADMITTED ✓" : "INVALID ❌");
      setPreview(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAdmitResult({ ok: false, reason: msg });
      setPhase("result");
      setMessage("ERROR");
    }
  }

  async function refreshPreviewSameOrder() {
    if (!lastToken) return;
    setMessage("Refreshing order…");
    try {
      const res = await fetch("/api/scan/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: lastToken, scannerId: scannerIdRef.current }),
      });
      const data: PreviewOk | PreviewErr = await res.json();
      if (data.ok) {
        setPreview(data);
        setPreviewError(null);
        setSelectedTicketId(data.unusedTickets[0]?.id ?? "");
        setAdmitResult(null);
        setPhase("review");
        setMessage("Review admission");
      } else {
        setPreviewError(data.reason);
        setPhase("result");
        setMessage("INVALID ❌");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setPreviewError(msg);
      setPhase("result");
      setMessage("ERROR");
    }
  }

  const bannerClass =
    phase === "result" && admitResult?.ok
      ? "bg-green-600"
      : phase === "result"
        ? "bg-red-600"
        : phase === "review"
          ? "bg-blue-800"
          : "bg-gray-900";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-lg p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm opacity-80">Scanner</div>
          <div className="flex items-center gap-2">
            <label className="text-xs opacity-80">Scanner ID</label>
            <input
              value={scannerId}
              onChange={(e) => setScannerId(e.target.value)}
              className="w-32 rounded-md bg-white/10 px-2 py-1 text-sm outline-none"
              placeholder="gate-1"
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <video ref={videoRef} className="h-[55vh] w-full object-cover" muted playsInline />
          <div className={"absolute bottom-0 left-0 right-0 p-3 " + bannerClass}>
            <div className="text-center text-2xl font-extrabold">{message}</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={toggleTorch} className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold">
            {torchOn ? "Torch: ON" : "Torch: OFF"}
          </button>
          <button type="button" onClick={resetScan} className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold">
            Clear
          </button>
        </div>

        {phase === "review" && preview && (
          <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-4">
            <div className="text-lg font-bold">Order</div>
            <div className="text-sm opacity-90">ID: {preview.order.id}</div>
            <div className="text-sm opacity-90">Email: {preview.order.customerEmail}</div>
            <div className="text-sm opacity-90">Visit date: {preview.order.visitDate}</div>

            <div className="mt-3 space-y-2">
              <div className="font-semibold">Allowed (by type)</div>
              <div className="overflow-hidden rounded border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Swim</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Used</th>
                      <th className="p-2 text-right">Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.groups.map((g) => (
                      <tr key={`${g.ticketTypeCode}-${g.hasSwimmingPass}`} className="border-t border-white/10">
                        <td className="p-2">{g.ticketTypeName}</td>
                        <td className="p-2">{g.hasSwimmingPass ? "Yes" : "No"}</td>
                        <td className="p-2 text-right">{g.total}</td>
                        <td className="p-2 text-right">{g.used}</td>
                        <td className="p-2 text-right font-semibold">{g.remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold">Admit this guest (ticket)</label>
              <select
                value={selectedTicketId}
                onChange={(e) => setSelectedTicketId(e.target.value)}
                className="w-full rounded bg-white/10 px-3 py-2 text-sm outline-none"
              >
                {preview.unusedTickets.length === 0 ? (
                  <option value="">No unused tickets left</option>
                ) : (
                  preview.unusedTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.ticketTypeName}
                      {t.hasSwimmingPass ? " · Swim" : ""} · R{(t.totalPriceCents / 100).toFixed(0)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={denyAdmission}
                className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold"
              >
                Deny
              </button>
              <button
                type="button"
                onClick={acceptAdmission}
                disabled={!selectedTicketId || preview.unusedTickets.length === 0}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold disabled:opacity-40"
              >
                Accept
              </button>
            </div>
            <p className="text-xs opacity-60">
              Choose the ticket that matches this guest, then Accept to hand out the wristband colour shown next.
            </p>
          </div>
        )}

        {phase === "result" && admitResult?.ok && (
          <div className="mt-4 space-y-3 rounded-xl bg-green-900/40 p-4">
            <div className="text-lg font-bold">Admitted</div>
            <div className="mt-1 text-sm opacity-90">Type: {admitResult.ticket.ticketType}</div>
            <div className="text-sm opacity-90">Swimming: {admitResult.ticket.hasSwimmingPass ? "YES" : "NO"}</div>
            <div className="mt-2 text-sm opacity-90">
              Wristband:{" "}
              {admitResult.wristband.colour ? (
                <span className="font-bold">{admitResult.wristband.colour.toUpperCase()}</span>
              ) : (
                <span className="font-bold">NO WRISTBAND</span>
              )}
            </div>
            <div className="mt-2 text-xs opacity-70">Ticket ID: {admitResult.ticket.id}</div>
            <button
              type="button"
              onClick={refreshPreviewSameOrder}
              className="w-full rounded-lg bg-white/15 px-4 py-3 text-sm font-semibold"
            >
              Next guest (same order)
            </button>
          </div>
        )}

        {phase === "result" && admitResult && !admitResult.ok && (
          <div className="mt-4 rounded-xl bg-red-900/40 p-4">
            <div className="text-lg font-bold">Not admitted</div>
            <div className="mt-1 text-sm opacity-90">{admitResult.reason}</div>
            {admitResult.details?.usedAt && (
              <div className="text-sm opacity-80">Used at: {admitResult.details.usedAt}</div>
            )}
          </div>
        )}

        {phase === "result" && previewError && !admitResult && (
          <div className="mt-4 rounded-xl bg-red-900/40 p-4">
            <div className="text-lg font-bold">Invalid QR</div>
            <div className="mt-1 text-sm opacity-90">{previewError}</div>
          </div>
        )}

        <div className="mt-3 text-xs opacity-60">Tip: Use Chrome on Android. Allow camera permission.</div>
      </div>
    </div>
  );
}
