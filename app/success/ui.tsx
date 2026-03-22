"use client";

import { useState } from "react";

export function PopUpload(props: { orderId: string; already: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");

  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append("orderId", props.orderId);
    fd.append("file", file);

    const res = await fetch("/api/eft/upload-pop", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) setMsg(data.error ?? "Upload failed");
    else setMsg("Uploaded. An admin will review your EFT proof.");
  }

  return (
    <div className="rounded border bg-white p-4 text-sm">
      <div className="font-semibold">Proof of Payment upload</div>
      {props.already ? (
        <div className="mt-2 text-green-700">POP already uploaded ✅</div>
      ) : (
        <>
          <input
            className="mt-2 block w-full"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button onClick={upload} className="mt-2 rounded bg-blue-600 px-3 py-2 font-semibold text-white">
            Upload POP
          </button>
        </>
      )}
      {msg ? <div className="mt-2 text-gray-700">{msg}</div> : null}
    </div>
  );
}
