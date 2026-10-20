import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LibraryAlbum } from "@/components/library-album";
import { LibraryList } from "@/components/library-list";
import { LibraryLayout, LibraryViewToggle } from "@/components/library-view-toggle";
import { collectionLabel, formatCount } from "@/lib/format";
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
  const layout = list === "owned" ? await libraryLayout() : "list";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">One Piece</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
            {title}
          </h1>
        </div>
        {list === "owned" && library.data.length > 0 ? <LibraryViewToggle view={layout} /> : null}
      </div>
      <div>
        <p className="text-sm text-stone-700">{collectionLabel(summary.cards, summary.copies)}</p>
        {list === "owned" && library.counts.trades.copies > 0 ? (
          <p className="mt-1 text-sm text-stone-500">
            {formatCount(Math.max(0, summary.copies - library.counts.trades.copies))} reservadas y{" "}
            {formatCount(library.counts.trades.copies)} en intercambio. El total las incluye.
          </p>
        ) : null}
      </div>
      {layout === "album" ? (
        <LibraryAlbum entries={library.data} returnTo={returnTo} />
      ) : (
        <LibraryList entries={library.data} list={list} returnTo={returnTo} />
      )}
    </div>
  );
}

async function libraryLayout(): Promise<LibraryLayout> {
  const jar = await cookies();
  return jar.get("tcglib_library_view")?.value === "album" ? "album" : "list";
}
