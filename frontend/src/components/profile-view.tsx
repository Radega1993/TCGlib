import Link from "next/link";
import { redirect } from "next/navigation";
import { LibraryList } from "@/components/library-list";
import { formatCount } from "@/lib/format";
import { getCurrentUser, getLibrary } from "@/lib/session";
import { LibraryList as LibraryListName } from "@/lib/types";

export async function ProfileView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=/perfil");

  const params = await searchParams;
  const list: LibraryListName = first(params.lista) === "buscando" ? "wanted" : "owned";
  let library: Awaited<ReturnType<typeof getLibrary>>;
  try {
    library = await getLibrary(list);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar tu biblioteca. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!library) redirect("/entrar?return=/perfil");

  const summary = library.counts[list];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
            Hola, {user.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">{user.email}</p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
          >
            Salir
          </button>
        </form>
      </div>

      <nav aria-label="Listas del perfil" className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-200 p-1">
        <Tab
          href="/perfil"
          current={list === "owned"}
          label="Biblioteca"
          count={library.counts.owned.cards}
        />
        <Tab
          href="/perfil?lista=buscando"
          current={list === "wanted"}
          label="Buscando"
          count={library.counts.wanted.cards}
        />
      </nav>

      <p className="text-sm text-stone-700">
        {formatCount(summary.cards)} {summary.cards === 1 ? "carta" : "cartas"} ·{" "}
        {formatCount(summary.copies)} {summary.copies === 1 ? "copia" : "copias"}
      </p>

      <LibraryList entries={library.data} list={list} />
    </div>
  );
}

function Tab({
  href,
  current,
  label,
  count,
}: {
  href: string;
  current: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium ${
        current ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"
      }`}
    >
      {label}
      <span className={current ? "text-stone-500" : "text-stone-400"}>
        {formatCount(count)}
      </span>
    </Link>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
