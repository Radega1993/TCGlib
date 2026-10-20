import Link from "next/link";
import { redirect } from "next/navigation";
import { LibraryAlbum } from "@/components/library-album";
import { Pagination } from "@/components/pagination";
import { TradeList } from "@/components/trade-list";
import { collectionLabel } from "@/lib/format";
import { getCurrentUser, getTrades } from "@/lib/session";
import { LibraryEntry } from "@/lib/types";

export async function TradeView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = positive(first(params.page));
  const view = first(params.vista) === "lista" ? "list" : "album";
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=%2Fintercambio");

  let trades: Awaited<ReturnType<typeof getTrades>>;
  try {
    trades = await getTrades(page);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el intercambio. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!trades) redirect("/entrar?return=%2Fintercambio");

  const summary = trades.counts.trades ?? { cards: 0, copies: 0 };
  const returnTo = tradeHref(trades.page, view);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">One Piece</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Intercambio</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Copias que has marcado como disponibles. El resto de la biblioteca sigue reservado.
          </p>
        </div>
        {summary.cards > 0 ? <TradeViewToggle view={view} page={trades.page} /> : null}
      </div>
      <p className="text-sm text-stone-700">{collectionLabel(summary.cards, summary.copies)}</p>
      {trades.data.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-10 text-center ring-1 ring-stone-200">
          <p className="text-sm text-stone-700">Todavía no has marcado copias para intercambio.</p>
          <p className="mt-1 text-sm text-stone-500">
            Abre una carta y ajusta Intercambio. No se calcula a partir de las repetidas.
          </p>
          <Link
            href="/biblioteca"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
          >
            Ir a la biblioteca
          </Link>
        </div>
      ) : view === "album" ? (
        <LibraryAlbum entries={trades.data.map(offeredCopy)} returnTo={returnTo} />
      ) : (
        <TradeList
          entries={trades.data.map((entry) => ({
            entry,
            wanted: entry.wanted,
          }))}
        />
      )}
      {trades.total > trades.limit ? (
        <Pagination
          page={trades.page}
          total={trades.total}
          limit={trades.limit}
          hrefFor={(next) => tradeHref(next, view)}
          label="Paginación del intercambio"
        />
      ) : null}
    </div>
  );
}

function offeredCopy(entry: LibraryEntry): LibraryEntry {
  return { ...entry, quantity: entry.forTrade ?? entry.quantity, forTrade: 0 };
}

function TradeViewToggle({ view, page }: { view: "album" | "list"; page: number }) {
  const options = [
    { id: "album" as const, label: "Álbum" },
    { id: "list" as const, label: "Lista" },
  ];
  return (
    <div className="flex shrink-0 rounded-xl bg-white p-1 ring-1 ring-stone-200" role="group" aria-label="Vista del intercambio">
      {options.map((option) => (
        <Link
          key={option.id}
          href={tradeHref(page, option.id)}
          aria-current={view === option.id ? "page" : undefined}
          className={`inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium ${
            view === option.id ? "bg-stone-900 text-white" : "text-stone-600"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

function tradeHref(page: number, view: "album" | "list") {
  const params = new URLSearchParams();
  if (view === "list") params.set("vista", "lista");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/intercambio?${search}` : "/intercambio";
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positive(value: string | undefined) {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
