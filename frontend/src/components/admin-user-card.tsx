"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminUser, setUserBlocked, updateAdminUser } from "@/lib/admin-actions";
import { collectionLabel } from "@/lib/format";
import { AdminUser } from "@/lib/types";

export function AdminUserCard({
  user,
  currentUserId,
  joined,
}: {
  user: AdminUser;
  currentUserId: string;
  joined: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [seenName, setSeenName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mine = user.id === currentUserId;

  if (user.name !== seenName) {
    setSeenName(user.name);
    setName(user.name);
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
    <article className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <div className="flex items-start gap-3">
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-11 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-11 place-items-center rounded-full bg-stone-200 text-sm font-medium text-stone-700">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-stone-950">{user.name}</p>
          <p className="truncate text-sm text-stone-500">{user.email}</p>
          <p className="mt-1 text-xs text-stone-500">Alta {joined}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {user.admin ? <Badge>Administrador</Badge> : null}
        {user.blocked ? <Badge tone="danger">Bloqueado</Badge> : null}
        {user.shareEnabled ? <Badge>Enlace público</Badge> : null}
      </div>

      <p className="mt-3 text-sm text-stone-700">
        Biblioteca: {collectionLabel(user.owned.cards, user.owned.copies)}
      </p>
      <p className="text-sm text-stone-700">
        Deseados: {collectionLabel(user.wanted.cards, user.wanted.copies)}
      </p>
      {user.shareEnabled && user.publicSlug ? (
        <p className="mt-1 truncate text-sm text-stone-500">/u/{user.publicSlug}</p>
      ) : null}

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const next = name.trim();
          if (!next) {
            setError("El nombre no puede estar vacío");
            return;
          }
          run(() => updateAdminUser(user.id, { name: next }));
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nombre</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="h-11 w-full rounded-xl bg-stone-50 px-3 text-sm text-stone-950 ring-1 ring-stone-300 outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending || name.trim() === user.name}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:bg-stone-300"
        >
          Guardar nombre
        </button>
      </form>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => updateAdminUser(user.id, { shareEnabled: !user.shareEnabled }))}
          className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300 disabled:text-stone-400"
        >
          {user.shareEnabled ? "Ocultar enlace" : "Activar enlace"}
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
            className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300 disabled:text-stone-400"
          >
            {user.blocked ? "Desbloquear" : "Bloquear"}
          </button>
        )}
        {mine || user.admin ? null : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Eliminar la cuenta de ${user.name}? Se borran su biblioteca y sus deseados.`)) {
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
      {error ? <p className="mt-3 text-sm text-rose-800">{error}</p> : null}
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
    <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium ring-1 ${className}`}>
      {children}
    </span>
  );
}
