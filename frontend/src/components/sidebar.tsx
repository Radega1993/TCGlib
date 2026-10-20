"use client";

import Image from "next/image";
import Link from "next/link";
import { SharePanel } from "@/components/share-panel";
import { PublicUser } from "@/lib/types";

const LINKS: {
  href: string;
  label: string;
  icon: NavIconName;
  match: (path: string) => boolean;
}[] = [
  { href: "/", label: "Catálogo", icon: "catalog", match: (path) => path === "/" || path.startsWith("/products") },
  { href: "/jugadores", label: "Jugadores", icon: "players", match: (path) => path.startsWith("/jugadores") },
  { href: "/biblioteca", label: "Biblioteca", icon: "library", match: (path) => path.startsWith("/biblioteca") },
  { href: "/progreso", label: "Progreso", icon: "progress", match: (path) => path.startsWith("/progreso") },
  { href: "/deseados", label: "Deseados", icon: "wanted", match: (path) => path.startsWith("/deseados") },
  { href: "/intercambio", label: "Intercambio", icon: "trade", match: (path) => path.startsWith("/intercambio") },
  { href: "/mazos", label: "Mazos", icon: "decks", match: (path) => path.startsWith("/mazos") },
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
        <Link href="/" className="block min-w-0 px-1" onClick={onClose}>
          <Image
            src="/logo-mark.png"
            alt="TCGlib"
            width={640}
            height={578}
            priority
            className="h-24 w-auto"
          />
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
          const href =
            user || link.href === "/" || link.href === "/jugadores"
              ? link.href
              : `/entrar?return=${encodeURIComponent(link.href)}`;
          return (
            <Link
              key={link.href}
              href={href}
              aria-current={current ? "page" : undefined}
              onClick={onClose}
              className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium ${
                current ? "bg-white text-stone-950 ring-1 ring-stone-200" : "text-stone-700"
              }`}
            >
              <NavIcon name={link.icon} />
              {link.label}
            </Link>
          );
        })}
        {user?.admin ? (
          <Link
            href="/admin"
            aria-current={pathname?.startsWith("/admin") ? "page" : undefined}
            onClick={onClose}
            className={`inline-flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-medium ${
              pathname?.startsWith("/admin")
                ? "bg-white text-stone-950 ring-1 ring-stone-200"
                : "text-stone-700"
            }`}
          >
            <NavIcon name="admin" />
            Administración
          </Link>
        ) : null}
      </nav>

      {user ? (
        <div className="mt-auto pt-6">
          <SharePanel enabled={user.shareEnabled} slug={user.publicSlug} />
        </div>
      ) : null}
    </aside>
  );
}

type NavIconName = "catalog" | "players" | "library" | "progress" | "wanted" | "trade" | "decks" | "admin";

function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "catalog" ? (
        <>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </>
      ) : null}
      {name === "players" ? (
        <>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16" cy="10" r="2" />
          <path d="M4.5 18.5c.6-2.4 2.4-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
          <path d="M13 15.2c1.4-.2 2.8.4 3.6 2.3" />
        </>
      ) : null}
      {name === "library" ? (
        <>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 8H19" />
        </>
      ) : null}
      {name === "progress" ? (
        <>
          <path d="M4 16.5 9 11l3.5 3.5L20 7" />
          <path d="M14 7h6v6" />
        </>
      ) : null}
      {name === "wanted" ? (
        <path d="M12 19s-6.5-4.1-6.5-8.2A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 6.5 2.8C18.5 14.9 12 19 12 19z" />
      ) : null}
      {name === "trade" ? (
        <>
          <path d="M7 7h12l-3.5-3.5" />
          <path d="M17 17H5l3.5 3.5" />
        </>
      ) : null}
      {name === "decks" ? (
        <>
          <rect x="7" y="7" width="11" height="13" rx="1.5" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5V15" />
        </>
      ) : null}
      {name === "admin" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
        </>
      ) : null}
    </svg>
  );
}
