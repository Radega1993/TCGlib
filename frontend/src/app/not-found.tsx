import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl bg-white px-4 py-10 text-center ring-1 ring-stone-200">
      <p className="text-sm text-stone-700">Esta carta no está en el catálogo.</p>
      <Link
        href="/"
        className="mt-3 inline-flex text-sm font-medium text-rose-800 underline-offset-4 hover:underline"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
