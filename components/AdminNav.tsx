import Link from "next/link";

export function AdminNav() {
  return (
    <div className="flex flex-wrap gap-3 rounded border bg-white p-3 text-sm">
      <Link className="hover:underline" href="/admin/dashboard">Dashboard</Link>
      <Link className="hover:underline" href="/admin/eft-approvals">EFT approvals</Link>
      <Link className="hover:underline" href="/admin/band-colours">Band colours</Link>
      <Link className="hover:underline" href="/admin/scan-logs">Scan logs</Link>
      <Link className="hover:underline" href="/admin/settings/ticket-types">Ticket types</Link>
      <a className="ml-auto rounded border px-2 py-1 hover:bg-gray-50" href="/api/admin/logout">
        Logout
      </a>
    </div>
  );
}
