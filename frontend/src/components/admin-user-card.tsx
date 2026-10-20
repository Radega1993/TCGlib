"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminUser, setUserBlocked, updateAdminUser } from "@/lib/admin-actions";
import { collectionLabel, displayName } from "@/lib/format";
import { AdminUser } from "@/lib/types";

export function AdminUserCard({
  user,
  currentUserId,
  joined,
  seen,
}: {
  user: AdminUser;
  currentUserId: string;
  joined: string;
  seen: string;
}) {
  const router = useRouter();
  const [alias, setAlias] = useState(user.alias ?? "");
  const [seenAlias, setSeenAlias] = useState(user.alias ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mine = user.id === currentUserId;
  const shown = displayName(user);

  if ((user.alias ?? "") !== seenAlias) {
    setSeenAlias(user.alias ?? "");
    setAlias(user.alias ?? "");
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "No se pudo completar la acción");
        return;
      }
      router.refresh();
    });
  }

  return (
    <article className="rounded-2xl bg-white px-3 py-3 ring-1 ring-stone-200">
      <div className="flex items-start gap-3">
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-stone-200 text-sm font-medium text-stone-700">
            {shown.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-stone-950">{shown}</p>
            {user.admin ? <Badge>Admin</Badge> : null}
            {user.blocked ? <Badge tone="danger">Bloqueado</Badge> : null}
            {user.shareEnabled ? <Badge>Público</Badge> : <Badge>Privado</Badge>}
          </div>
          <p className="truncate text-xs text-stone-500">{user.email}</p>
          {user.alias ? <p className="truncate text-xs text-stone-500">Google: {user.name}</p> : null}
          <p className="mt-1 text-xs text-stone-500">
            Alta {joined} · Activo {seen}
          </p>
          <p className="mt-1 text-xs text-stone-700">
            Biblioteca {collectionLabel(user.owned.cards, user.owned.copies)}
            {" · "}
            Deseados {collectionLabel(user.wanted.cards, user.wanted.copies)}
            {" · "}
            Intercambio {collectionLabel(user.trades.cards, user.trades.copies)}
          </p>
          {user.shareEnabled && user.publicSlug ? (
            <Link href={`/u/${user.publicSlug}`} className="mt-1 inline-flex text-xs font-medium text-stone-700 underline">
              Ver en Jugadores
            </Link>
          ) : null}
        </div>
      </div>

      <details className="mt-3">
        <summary className="inline-flex h-11 cursor-pointer list-none items-center rounded-xl px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300">
          Gestionar
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => updateAdminUser(user.id, { alias: alias.trim() }));
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Alias</span>
              <input
                value={alias}
                maxLength={24}
                placeholder="Alias público"
                onChange={(event) => setAlias(event.target.value)}
                className="h-11 w-full rounded-xl bg-stone-50 px-3 text-sm ring-1 ring-stone-300 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={pending || alias.trim() === (user.alias ?? "")}
              className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white disabled:bg-stone-300"
            >
              Alias
            </button>
          </form>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => updateAdminUser(user.id, { shareEnabled: !user.shareEnabled }))}
              className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-medium ring-1 ring-stone-300 disabled:text-stone-400"
            >
              {user.shareEnabled ? "Pasar a privado" : "Hacer público"}
            </button>
            {mine ? (
              <p className="inline-flex h-11 items-center justify-center text-sm text-stone-500">
                Esta es tu cuenta
              </p>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setUserBlocked(user.id, !user.blocked))}
                className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-medium ring-1 ring-stone-300 disabled:text-stone-400"
              >
                {user.blocked ? "Desbloquear" : "Bloquear"}
              </button>
            )}
            {mine || user.admin ? null : (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`¿Eliminar la cuenta de ${shown}? Se borran su biblioteca y sus deseados.`)) {
                    return;
                  }
                  run(() => deleteAdminUser(user.id));
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-900 ring-1 ring-rose-200 disabled:text-stone-400 sm:col-span-2"
              >
                Eliminar cuenta
              </button>
            )}
          </div>
          {error ? <p className="text-sm text-rose-800">{error}</p> : null}
        </div>
      </details>
    </article>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "danger";
}) {
  const className =
    tone === "danger"
      ? "bg-rose-50 text-rose-900 ring-rose-200"
      : "bg-stone-100 text-stone-700 ring-stone-200";
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2 text-xs font-medium ring-1 ${className}`}>
      {children}
    </span>
  );
}
