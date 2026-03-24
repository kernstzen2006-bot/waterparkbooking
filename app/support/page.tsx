export default function SupportPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Support</h1>
      <div className="rounded border bg-white p-4 text-sm text-gray-700 space-y-2">
        <p className="font-semibold">Bookings are online only.</p>
        <p>
          If you need tickets resent, use n8n automation (or ask support with your Order ID).
        </p>
        <p className="font-semibold">Manual fallback at the gate:</p>
        <ul className="list-disc pl-5">
          <li>Bring your Order ID or Ticket ID.</li>
          <li>Staff can search in Admin -&gt; Orders or use the offline lookup procedure.</li>
        </ul>
      </div>
    </div>
  );
}
