import Link from "next/link";
import { redirect } from "next/navigation";
import { CatalogSync } from "@/components/catalog-sync";
import { SuggestedDecks } from "@/components/suggested-decks";
import { getAdminOverview } from "@/lib/admin";
import { formatCount, formatDuration } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { AdminCardRank, AdminDayPoint, AdminOverview, AdminViewRank } from "@/lib/types";

const SYNC_STATUS = {
  running: "En curso",
  completed: "Completada",
  failed: "Fallida",
};

export async function AdminView() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=%2Fadmin");
  if (!user.admin) redirect("/biblioteca");

  let overview: AdminOverview | null;
  try {
    overview = await getAdminOverview();
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar la administración. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!overview) redirect("/biblioteca");

  const average =
    overview.activity.averageMs > 0
      ? formatDuration(overview.activity.averageMs)
      : "Sin datos";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-stone-500">One Piece</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
            Administración
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Las cartas deseadas y guardadas salen de las listas actuales. Las búsquedas, las fichas abiertas y el tiempo de uso se anotan desde ahora.
          </p>
        </div>
        <Link
          href="/admin/usuarios"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
        >
          Usuarios · {formatCount(overview.users.total)}
        </Link>
      </div>

      <CatalogSync
        games={overview.games.map((game) => ({
          slug: game.slug,
          name: game.name,
          status: game.sync?.status ?? null,
          detail: syncDetail(game.sync),
          error: game.sync?.error,
        }))}
        cards={overview.catalog.cards}
        sets={overview.catalog.sets}
      />
      <SuggestedDecks total={overview.suggestedDecks} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Usuarios" value={formatCount(overview.users.total)} detail={`${formatCount(overview.users.blocked)} bloqueados · ${formatCount(overview.users.sharing)} con enlace`} />
        <Metric label="Activos 7 días" value={formatCount(overview.users.activeWeek)} detail={`${formatCount(overview.users.activeToday)} hoy · ${formatCount(overview.users.activeMonth)} en 30 días`} />
        <Metric label="Tiempo de uso" value={average} detail={overview.activity.users > 0 ? `Media de ${formatCount(overview.activity.users)} usuarios en 30 días` : "Aún no hay uso seguido"} />
        <Metric label="Nuevos" value={formatCount(overview.users.newWeek)} detail={`${formatCount(overview.users.newMonth)} en 30 días`} />
        <Metric label="Bibliotecas" value={formatCount(overview.library.owned.copies)} detail={listDetail(overview.library.owned)} />
        <Metric label="Deseados" value={formatCount(overview.library.wanted.copies)} detail={listDetail(overview.library.wanted)} />
        <Metric label="Sesiones" value={formatCount(overview.sessions)} detail="Sesiones que todavía no han caducado" />
        <Metric label="Catálogo" value={formatCount(overview.catalog.cards)} detail={`${formatCount(overview.catalog.sets)} sets · ${syncValue(overview)}`} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Chart title="Altas" note="Usuarios nuevos por día." points={overview.signups} />
        <Chart title="Actividad" note="Personas distintas que han usado la app ese día." points={overview.visits} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <CardRank title="Más deseadas" empty="Todavía no hay cartas en deseados." items={overview.wanted} />
        <CardRank title="Más guardadas" empty="Todavía no hay cartas en bibliotecas." items={overview.owned} />
        <SearchRank title="Más buscadas" empty="Las búsquedas del catálogo se irán anotando." items={overview.searched} />
        <ViewRank title="Más consultadas" empty="Las fichas abiertas se irán anotando." items={overview.viewed} />
      </section>
    </div>
  );
}

function listDetail(list: { cards: number; users?: number }) {
  const users = list.users ?? 0;
  const average = users > 0 ? Math.round(list.cards / users) : 0;
  return `${formatCount(list.cards)} cartas · ${formatCount(users)} usuarios · ${formatCount(average)} de media`;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{value}</p>
      <p className="mt-1 text-sm text-stone-600">{detail}</p>
    </article>
  );
}

function Chart({ title, note, points }: { title: string; note: string; points: AdminDayPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.count));
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      <p className="mt-1 text-sm text-stone-600">{note}</p>
      <div className="mt-4 flex items-end gap-1">
        {points.map((point) => (
          <div key={point.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end">
              <div
                className="w-full rounded-t bg-stone-900"
                style={{ height: `${Math.max(point.count > 0 ? 8 : 2, (point.count / max) * 100)}%` }}
                title={`${point.label}: ${formatCount(point.count)}`}
              />
            </div>
            <span className="truncate text-[10px] text-stone-500">{point.label.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function CardRank({ title, empty, items }: { title: string; empty: string; items: AdminCardRank[] }) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">{empty}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.externalId}>
              <Link href={`/products/${item.externalId}`} className="flex items-center gap-3">
                <span className="w-5 text-sm text-stone-500">{index + 1}</span>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-14 w-10 rounded object-cover" />
                ) : (
                  <span className="h-14 w-10 rounded bg-stone-100" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-stone-950">{item.name}</span>
                  <span className="block truncate text-xs text-stone-500">
                    {item.code ? `${item.code} · ` : ""}
                    {formatCount(item.users)} {item.users === 1 ? "usuario" : "usuarios"} · {formatCount(item.copies)} {item.copies === 1 ? "copia" : "copias"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function ViewRank({ title, empty, items }: { title: string; empty: string; items: AdminViewRank[] }) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">{empty}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.externalId}>
              <Link href={`/products/${item.externalId}`} className="flex items-center gap-3">
                <span className="w-5 text-sm text-stone-500">{index + 1}</span>
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-14 w-10 rounded object-cover" />
                ) : (
                  <span className="h-14 w-10 rounded bg-stone-100" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-stone-950">{item.name}</span>
                  <span className="block truncate text-xs text-stone-500">
                    {item.code ? `${item.code} · ` : ""}
                    {formatCount(item.views)} {item.views === 1 ? "consulta" : "consultas"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function SearchRank({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { term: string; count: number }[];
}) {
  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="text-base font-semibold text-stone-950">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">{empty}</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={item.term} className="flex items-center gap-3">
              <span className="w-5 text-sm text-stone-500">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-950">{item.term}</span>
              <span className="text-xs text-stone-500">{formatCount(item.count)}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function syncDetail(sync: AdminOverview["sync"]) {
  if (!sync) return "Todavía no se ha actualizado.";
  const moment = syncWhen.format(new Date(sync.finishedAt ?? sync.startedAt));
  if (sync.status === "running") {
    return `Actualizando… ${formatCount(sync.cards)} cartas guardadas.`;
  }
  if (sync.status === "failed") return `Fallida el ${moment}.`;
  return `Completada el ${moment} · ${formatCount(sync.cards)} cartas · ${formatCount(sync.sealed)} sellados.`;
}

const syncWhen = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function syncValue(overview: AdminOverview) {
  if (!overview.sync) return "sin sincronizar";
  return SYNC_STATUS[overview.sync.status].toLowerCase();
}
