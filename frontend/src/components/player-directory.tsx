import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { formatCount } from "@/lib/format";
import { getPlayers } from "@/lib/players";

export async function PlayerDirectory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 40) || undefined;
  const requested = Number(first(params.page) ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

  let players: Awaited<ReturnType<typeof getPlayers>>;
  try {
    players = await getPlayers({ q, page });
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el listado. Comprueba que la API sigue en marcha.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-stone-500">One Piece</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Jugadores</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Perfiles públicos. Desde aquí se abre su biblioteca, lo que intercambian y lo que buscan. El email no se muestra.
        </p>
      </div>
      <form action="/jugadores" className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nombre público</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nombre público"
            maxLength={40}
            className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 outline-none ring-rose-700 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </form>
      {players.data.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          {q ? `Nadie público coincide con “${q}”.` : "Todavía no hay perfiles públicos."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.data.map((player) => (
            <li key={player.slug}>
              <Link
                href={`/u/${player.slug}`}
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-stone-200"
              >
                {player.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-stone-200 text-sm font-medium text-stone-700">
                    {player.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium text-stone-950">{player.name}</span>
                  <span className="mt-1 block text-sm text-stone-500">
                    {formatCount(player.owned)} en biblioteca · {formatCount(player.trades)} intercambio · {formatCount(player.wanted)} deseados
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {players.total > players.limit ? (
        <Pagination
          page={players.page}
          total={players.total}
          limit={players.limit}
          hrefFor={(next) => playersHref(q, next)}
          label="Paginación de jugadores"
        />
      ) : null}
    </div>
  );
}

function playersHref(q: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/jugadores?${search}` : "/jugadores";
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
