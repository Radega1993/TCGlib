"use client";

import Link from "next/link";
import { SharePanel } from "@/components/share-panel";
import { PublicUser } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Catálogo", match: (path: string) => path === "/" || path.startsWith("/products") },
  { href: "/biblioteca", label: "Biblioteca", match: (path: string) => path.startsWith("/biblioteca") },
  { href: "/deseados", label: "Deseados", match: (path: string) => path.startsWith("/deseados") },
];

export function Sidebar({
  user,
  pathname,
  open,
  onClose,
}: {
  user: PublicUser | null;
  pathname: string | null;
  open: boolean;
  onClose: () => void;
}) {

  return (
    <aside
      id="app-sidebar"
      className={`${open ? "max-md:translate-x-0" : "max-md:-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-[#f6f3ee] px-3 py-4 transition-transform md:sticky md:top-0 md:z-auto md:h-screen md:w-full`}
    >
      <div className="flex items-center justify-between px-2">
        <Link href="/" className="text-lg font-semibold tracking-tight" onClick={onClose}>
          TCGlib
        </Link>
        <button
          type="button"
          className="inline-flex h-11 items-center px-2 text-sm font-medium text-stone-600 md:hidden"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>

      <p className="mt-6 px-2 text-xs font-medium uppercase tracking-wide text-stone-500">
        Juegos
      </p>
      <Link
        href="/"
        onClick={onClose}
        className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
      >
        <span className="size-2.5 rounded-full bg-rose-400" />
        One Piece
      </Link>

      <nav aria-label="One Piece" className="mt-3 flex flex-col gap-1">
        {LINKS.map((link) => {
          const current = pathname ? link.match(pathname) : false;
          const href = user || link.href === "/" ? link.href : `/entrar?return=${encodeURIComponent(link.href)}`;
          return (
            <Link
              key={link.href}
              href={href}
              aria-current={current ? "page" : undefined}
              onClick={onClose}
              className={`inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium ${
                current ? "bg-white text-stone-950 ring-1 ring-stone-200" : "text-stone-700"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        {user ? <SharePanel enabled={user.shareEnabled} slug={user.publicSlug} /> : null}
        {user ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-2">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-8 rounded-full object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
                <p className="truncate text-xs text-stone-500">{user.email}</p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700"
              >
                Salir
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/entrar"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
          >
            Entrar
          </Link>
        )}
      </div>
    </aside>
  );
}
