import Link from "next/link";

export default function RiftboundMazosPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-stone-500">Riftbound</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Mazos</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Esta funcionalidad saldrá próximamente.
        </p>
      </div>
      <Link
        href="/riftbound"
        className="inline-flex h-11 w-fit items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
      >
        Ir al catálogo
      </Link>
    </div>
  );
}
