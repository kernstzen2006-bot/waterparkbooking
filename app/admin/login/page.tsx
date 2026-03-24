"use client";

import { useState } from "react";

export default function AdminLoginPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const next = searchParams.next ?? "/admin/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function login() {
    setMsg("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const raw = await res.text();
      let data: { error?: string; ok?: boolean } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { error?: string; ok?: boolean };
        } catch {
          setMsg("Server returned an invalid response. Check the terminal / database connection.");
          return;
        }
      } else if (!res.ok) {
        setMsg(`Login failed (${res.status}). Empty response - often a database or env error.`);
        return;
      }
      if (!res.ok) {
        setMsg(data.error ?? "Login failed");
        return;
      }
      window.location.href = next;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Admin login</h1>
      <div className="rounded border bg-white p-4 space-y-3">
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold">Password</label>
          <input type="password" className="mt-1 w-full rounded border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button onClick={login} className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          Login
        </button>
        {msg ? <div className="text-sm text-red-700">{msg}</div> : null}
      </div>
    </div>
  );
}
