import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          Waterpark
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/book" className="hover:underline">Book</Link>
          <Link href="/support" className="hover:underline">Support</Link>
          <Link href="/admin/dashboard" className="hover:underline">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
