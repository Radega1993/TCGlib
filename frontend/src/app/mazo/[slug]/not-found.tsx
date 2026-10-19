import Link from "next/link";

export default function DeckNotFound() {
  return (
    <div className="rounded-2xl bg-white px-4 py-10 text-center ring-1 ring-stone-200">
      <h1 className="text-lg font-semibold text-stone-950">Este enlace no está disponible</h1>
      <p className="mt-2 text-sm text-stone-600">El mazo no existe o su dueño ha dejado de compartirlo.</p>
      <Link
        href="/"
        className="mt-4 inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
      >
        Ir al catálogo
      </Link>
    </div>
  );
}
