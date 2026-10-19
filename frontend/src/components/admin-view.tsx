import { redirect } from "next/navigation";
import { AdminUserCard } from "@/components/admin-user-card";
import { Pagination } from "@/components/pagination";
import { getAdminOverview, getAdminUsers } from "@/lib/admin";
import { formatCount } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { AdminOverview } from "@/lib/types";

const SYNC_STATUS = {
  running: "En curso",
  completed: "Completada",
  failed: "Fallida",
};

export async function AdminView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=%2Fadmin");
  if (!user.admin) redirect("/biblioteca");

  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 80) || "";
  const requested = Number(first(params.page) ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

  let overview: AdminOverview | null;
  let users: Awaited<ReturnType<typeof getAdminUsers>>;
  try {
    [overview, users] = await Promise.all([
      getAdminOverview(),
      getAdminUsers({ q: q || undefined, page }),
    ]);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar la administración. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!overview || !users) redirect("/biblioteca");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-stone-500">One Piece</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">
          Administración
        </h1>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Usuarios" value={formatCount(overview.users.total)} detail={`${formatCount(overview.users.blocked)} bloqueados`} />
        <Metric label="Enlaces públicos" value={formatCount(overview.users.sharing)} detail={`${formatCount(overview.sessions)} sesiones activas`} />
        <Metric label="Catálogo" value={formatCount(overview.catalog.cards)} detail={`${formatCount(overview.catalog.sets)} sets · ${formatCount(overview.catalog.sealed)} sellado`} />
        <Metric
          label="Bibliotecas"
          value={formatCount(overview.library.owned.copies)}
          detail={`${formatCount(overview.library.owned.cards)} cartas · ${formatCount(overview.library.owned.users ?? 0)} usuarios`}
        />
        <Metric
          label="Deseados"
          value={formatCount(overview.library.wanted.copies)}
          detail={`${formatCount(overview.library.wanted.cards)} cartas · ${formatCount(overview.library.wanted.users ?? 0)} usuarios`}
        />
        <Metric label="Sincronización" value={syncValue(overview)} detail={syncDetail(overview)} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-stone-950">Usuarios</h2>
          <form action="/admin" className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Buscar usuarios</span>
              <input
                name="q"
                defaultValue={q}
                placeholder="Nombre o email"
                className="h-11 w-full rounded-xl bg-white px-3 text-sm text-stone-950 ring-1 ring-stone-300 outline-none sm:w-64"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
            >
              Buscar
            </button>
          </form>
        </div>

        {users.data.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-600 ring-1 ring-stone-200">
            {q ? "Ningún usuario coincide con la búsqueda." : "Todavía no hay usuarios."}
          </p>
        ) : (
          <div className="grid gap-3">
            {users.data.map((account) => (
              <AdminUserCard
                key={account.id}
                user={account}
                currentUserId={user.id}
                joined={account.createdAt ? dateLabel(account.createdAt) : "sin fecha"}
              />
            ))}
          </div>
        )}
        <Pagination
          page={users.page}
          total={users.total}
          limit={users.limit}
          label="Paginación de usuarios"
          hrefFor={(nextPage) => adminHref(q, nextPage)}
        />
      </section>
    </div>
  );
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

function syncValue(overview: AdminOverview) {
  if (!overview.sync) return "Sin datos";
  return SYNC_STATUS[overview.sync.status];
}

function syncDetail(overview: AdminOverview) {
  const sync = overview.sync;
  if (!sync) return "Todavía no hay una sincronización.";
  const when = dateLabel(sync.finishedAt ?? sync.startedAt);
  if (sync.status === "failed") return sync.error ? `${when}. ${sync.error}` : when;
  return `${when} · ${formatCount(sync.cards)} cartas`;
}

function adminHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin?${search}` : "/admin";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
