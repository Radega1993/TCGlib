import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminUserCard } from "@/components/admin-user-card";
import { Pagination } from "@/components/pagination";
import { getAdminUsers } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activos 7 días" },
  { value: "blocked", label: "Bloqueados" },
  { value: "sharing", label: "Con enlace" },
] as const;

const SORTS = [
  { value: "recent", label: "Más recientes" },
  { value: "activity", label: "Última actividad" },
  { value: "name", label: "Nombre" },
] as const;

export async function AdminUsersView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?return=%2Fadmin%2Fusuarios");
  if (!user.admin) redirect("/biblioteca");

  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 80) || "";
  const status = oneOf(first(params.status), STATUSES.map((item) => item.value));
  const sort = oneOf(first(params.sort), SORTS.map((item) => item.value)) || "recent";
  const requested = Number(first(params.page) ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;

  let users: Awaited<ReturnType<typeof getAdminUsers>>;
  try {
    users = await getAdminUsers({
      q: q || undefined,
      page,
      status: status || undefined,
      sort,
    });
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudieron cargar los usuarios. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!users) redirect("/biblioteca");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/admin" className="text-sm font-medium text-stone-600">
          Administración
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">Usuarios</h1>
      </div>

      <form action="/admin/usuarios" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
        <label>
          <span className="sr-only">Buscar usuarios</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre, alias o email"
            className="h-11 w-full rounded-xl bg-white px-3 text-sm text-stone-950 ring-1 ring-stone-300 outline-none"
          />
        </label>
        <label>
          <span className="sr-only">Estado</span>
          <select
            name="status"
            defaultValue={status}
            className="h-11 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300 outline-none"
          >
            {STATUSES.map((item) => (
              <option key={item.value || "all"} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Orden</span>
          <select
            name="sort"
            defaultValue={sort}
            className="h-11 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-stone-300 outline-none"
          >
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
        >
          Buscar
        </button>
      </form>

      {users.data.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-600 ring-1 ring-stone-200">
          {q || status ? "Ningún usuario coincide con estos filtros." : "Todavía no hay usuarios."}
        </p>
      ) : (
        <div className="grid gap-2">
          {users.data.map((account) => (
            <AdminUserCard
              key={account.id}
              user={account}
              currentUserId={user.id}
              joined={account.createdAt ? dateLabel(account.createdAt) : "sin fecha"}
              seen={account.lastSeenAt ? dateLabel(account.lastSeenAt) : "sin actividad"}
            />
          ))}
        </div>
      )}
      <Pagination
        page={users.page}
        total={users.total}
        limit={users.limit}
        label="Paginación de usuarios"
        hrefFor={(nextPage) => usersHref({ q, status, sort, page: nextPage })}
      />
    </div>
  );
}

function usersHref(query: { q: string; status: string; sort: string; page: number }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.sort && query.sort !== "recent") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `/admin/usuarios?${search}` : "/admin/usuarios";
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

function oneOf(value: string | undefined, allowed: readonly string[]) {
  return value && allowed.includes(value) ? value : "";
}
