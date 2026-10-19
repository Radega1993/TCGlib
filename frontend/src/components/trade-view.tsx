import Link from "next/link";
import { redirect } from "next/navigation";
import { TradeList } from "@/components/trade-list";
import { collectionLabel } from "@/lib/format";
import { getCurrentUser, getLibrary } from "@/lib/session";

export async function TradeView() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=%2Fintercambio");

  let owned: Awaited<ReturnType<typeof getLibrary>>;
  let wanted: Awaited<ReturnType<typeof getLibrary>>;
  try {
    [owned, wanted] = await Promise.all([getLibrary("owned"), getLibrary("wanted")]);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el intercambio. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!owned || !wanted) redirect("/entrar?return=%2Fintercambio");

  const wantedById = new Map(wanted.data.map((entry) => [entry.product.externalId, entry.quantity]));
  const entries = owned.data
    .filter((entry) => (entry.forTrade ?? 0) > 0)
    .map((entry) => ({
      entry,
      wanted: wantedById.get(entry.product.externalId) ?? 0,
    }));
  const summary = owned.counts.trades ?? { cards: 0, copies: 0 };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-stone-500">One Piece</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Intercambio</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Copias que has marcado como disponibles. El resto de la biblioteca sigue reservado.
        </p>
      </div>
      <p className="text-sm text-stone-700">{collectionLabel(summary.cards, summary.copies)}</p>
      {entries.length === 0 ? (
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
      ) : (
        <TradeList entries={entries} />
      )}
    </div>
  );
}
