"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PopUpload(props: { orderId: string; already: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file || busy) return;

    setBusy(true);
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("orderId", props.orderId);
      fd.append("file", file);

      const res = await fetch("/api/eft/upload-pop", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Upload failed");
        return;
      }

      setFile(null);
      setMsg("Uploaded. An admin must approve your POP before tickets are issued and emailed.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border bg-white p-4 text-sm">
      <div className="font-semibold">Proof of Payment upload</div>
      {props.already ? (
        <div className="mt-2 text-green-700">POP already uploaded.</div>
      ) : (
        <>
          <input
            className="mt-2 block w-full"
            type="file"
            accept="image/*,application/pdf"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={upload}
            disabled={!file || busy}
            className="mt-2 rounded bg-blue-600 px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {busy ? "Uploading..." : "Upload POP"}
          </button>
        </>
      )}
      {msg ? <div className="mt-2 text-gray-700">{msg}</div> : null}
    </div>
  );
}
