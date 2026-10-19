import { redirect } from "next/navigation";
import { LibraryList } from "@/components/library-list";
import { collectionLabel } from "@/lib/format";
import { getCurrentUser, getLibrary } from "@/lib/session";
import { LibraryList as LibraryName } from "@/lib/types";

export async function CollectionView({ list }: { list: LibraryName }) {
  const returnTo = list === "wanted" ? "/deseados" : "/biblioteca";
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?return=${encodeURIComponent(returnTo)}`);

  let library: Awaited<ReturnType<typeof getLibrary>>;
  try {
    library = await getLibrary(list);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar tu lista. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!library) redirect(`/entrar?return=${encodeURIComponent(returnTo)}`);

  const summary = library.counts[list];
  const title = list === "owned" ? "Biblioteca" : "Deseados";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-stone-500">One Piece</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
          {title}
        </h1>
      </div>
      <p className="text-sm text-stone-700">{collectionLabel(summary.cards, summary.copies)}</p>
      <LibraryList entries={library.data} list={list} returnTo={returnTo} />
    </div>
  );
}
