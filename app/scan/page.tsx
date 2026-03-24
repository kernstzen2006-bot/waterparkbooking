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

type PreviewAvailable = {
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
  availableTickets: PreviewAvailable[];
};

type PreviewErr = { ok: false; reason: string };

type AdmitOk = {
  ok: true;
  order: {
    id: string;
    visitDate: string;
    admittedCount: number;
  };
  admittedTickets: Array<{
    id: string;
    ticketTypeCode: string;
    ticketTypeName: string;
    hasSwimmingPass: boolean;
    visitDate: string;
  }>;
  wristbandGroups: Array<{
    ticketTypeCode: string;
    ticketTypeName: string;
    hasSwimmingPass: boolean;
    count: number;
    wristband: { label: string; colour: string | null };
  }>;
};

type AdmitErr = { ok: false; reason: string };

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
      setMessage("Starting camera...");

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

            setMessage("Loading order...");

            try {
              const res = await fetch("/api/scan/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token: tokenText,
                  scannerId: scannerIdRef.current,
                }),
              });

              const data: PreviewOk | PreviewErr = await res.json();
              setLastToken(tokenText);

              if (data.ok) {
                setPreview(data);
                setPreviewError(null);
                setAdmitResult(null);
                setPhase("review");
                setMessage("Review order");
              } else {
                setPreview(null);
                setPreviewError(data.reason);
                setAdmitResult(null);
                setPhase("result");
                setMessage("Invalid QR");
              }
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Unknown error";
              setPreview(null);
              setPreviewError(msg);
              setAdmitResult(null);
              setPhase("result");
              setMessage("Error");
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

    const rearmTimer = window.setInterval(() => {
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
      window.clearInterval(rearmTimer);

      try {
        const r = reader as unknown as { stopContinuousDecode?: () => void; reset?: () => void };
        if (typeof r.stopContinuousDecode === "function") r.stopContinuousDecode();
        if (typeof r.reset === "function") r.reset();
      } catch {
        /* ignore */
      }

      const video = videoRef.current;
      const stream = (video?.srcObject as MediaStream | null) ?? streamRef.current;

      if (stream) stream.getTracks().forEach((track) => track.stop());
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
      setTorchOn((value) => !value);
    } catch {
      alert("Could not toggle torch.");
    }
  }

  function resetScan() {
    setPreview(null);
    setPreviewError(null);
    setAdmitResult(null);
    setLastToken(null);
    setPhase("scan");
    setMessage("Ready to scan");
    armedRef.current = true;
    lastTokenRef.current = null;
  }

  function denyAdmission() {
    setPreview(null);
    setPreviewError(null);
    setAdmitResult({
      ok: false,
      reason: "Order denied by staff. No tickets were used.",
    });
    setPhase("result");
    setMessage("Order denied");
  }

  async function acceptAdmission() {
    if (!lastToken) return;
    setMessage("Confirming order...");
    try {
      const res = await fetch("/api/scan/admit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: lastToken,
          scannerId: scannerIdRef.current,
        }),
      });
      const data: AdmitOk | AdmitErr = await res.json();
      setAdmitResult(data);
      setPhase("result");
      setMessage(data.ok ? "Order admitted" : "Order denied");
      setPreview(null);
      setPreviewError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAdmitResult({ ok: false, reason: msg });
      setPhase("result");
      setMessage("Error");
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
            <div className="text-sm opacity-90">Available tickets: {preview.availableTickets.length}</div>

            <div className="mt-3 space-y-2">
              <div className="font-semibold">Order summary</div>
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
                    {preview.groups.map((group) => (
                      <tr key={`${group.ticketTypeCode}-${group.hasSwimmingPass}`} className="border-t border-white/10">
                        <td className="p-2">{group.ticketTypeName}</td>
                        <td className="p-2">{group.hasSwimmingPass ? "Yes" : "No"}</td>
                        <td className="p-2 text-right">{group.total}</td>
                        <td className="p-2 text-right">{group.used}</td>
                        <td className="p-2 text-right font-semibold">{group.remaining}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold">Available tickets on this order</div>
              <div className="overflow-hidden rounded border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="p-2">Ticket</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Swim</th>
                      <th className="p-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.availableTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-t border-white/10">
                        <td className="p-2 font-mono text-xs">{ticket.id}</td>
                        <td className="p-2">{ticket.ticketTypeName}</td>
                        <td className="p-2">{ticket.hasSwimmingPass ? "Yes" : "No"}</td>
                        <td className="p-2 text-right">R{(ticket.totalPriceCents / 100).toFixed(0)}</td>
                      </tr>
                    ))}
                    {preview.availableTickets.length === 0 ? (
                      <tr>
                        <td className="p-3 text-gray-300" colSpan={4}>No available tickets left on this order.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={denyAdmission}
                className="flex-1 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold"
              >
                Deny order
              </button>
              <button
                type="button"
                onClick={acceptAdmission}
                disabled={preview.availableTickets.length === 0}
                className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold disabled:opacity-40"
              >
                Accept order
              </button>
            </div>
            <p className="text-xs opacity-60">
              Accept admits every available ticket on this order in one step.
            </p>
          </div>
        )}

        {phase === "result" && admitResult?.ok && (
          <div className="mt-4 space-y-3 rounded-xl bg-green-900/40 p-4">
            <div className="text-lg font-bold">Order admitted</div>
            <div className="text-sm opacity-90">Order ID: {admitResult.order.id}</div>
            <div className="text-sm opacity-90">Visit date: {admitResult.order.visitDate}</div>
            <div className="text-sm opacity-90">Tickets admitted: {admitResult.order.admittedCount}</div>

            <div className="space-y-2">
              <div className="font-semibold">Wristbands to issue</div>
              <div className="overflow-hidden rounded border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Swim</th>
                      <th className="p-2 text-right">Count</th>
                      <th className="p-2">Wristband</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admitResult.wristbandGroups.map((group) => (
                      <tr key={`${group.ticketTypeCode}-${group.hasSwimmingPass}`} className="border-t border-white/10">
                        <td className="p-2">{group.ticketTypeName}</td>
                        <td className="p-2">{group.hasSwimmingPass ? "Yes" : "No"}</td>
                        <td className="p-2 text-right">{group.count}</td>
                        <td className="p-2 font-semibold">
                          {group.wristband.colour ? group.wristband.colour.toUpperCase() : "NO WRISTBAND"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold">Admitted tickets</div>
              <div className="overflow-hidden rounded border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="p-2">Ticket</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Swim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admitResult.admittedTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-t border-white/10">
                        <td className="p-2 font-mono text-xs">{ticket.id}</td>
                        <td className="p-2">{ticket.ticketTypeName}</td>
                        <td className="p-2">{ticket.hasSwimmingPass ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="button"
              onClick={resetScan}
              className="w-full rounded-lg bg-white/15 px-4 py-3 text-sm font-semibold"
            >
              Scan next order
            </button>
          </div>
        )}

        {phase === "result" && admitResult && !admitResult.ok && (
          <div className="mt-4 rounded-xl bg-red-900/40 p-4">
            <div className="text-lg font-bold">Order not admitted</div>
            <div className="mt-1 text-sm opacity-90">{admitResult.reason}</div>
            <button
              type="button"
              onClick={resetScan}
              className="mt-4 w-full rounded-lg bg-white/15 px-4 py-3 text-sm font-semibold"
            >
              Scan next order
            </button>
          </div>
        )}

        {phase === "result" && previewError && !admitResult && (
          <div className="mt-4 rounded-xl bg-red-900/40 p-4">
            <div className="text-lg font-bold">Invalid QR</div>
            <div className="mt-1 text-sm opacity-90">{previewError}</div>
            <button
              type="button"
              onClick={resetScan}
              className="mt-4 w-full rounded-lg bg-white/15 px-4 py-3 text-sm font-semibold"
            >
              Scan next order
            </button>
          </div>
        )}

        <div className="mt-3 text-xs opacity-60">Tip: Use Chrome on Android. Allow camera permission.</div>
      </div>
    </div>
  );
}
