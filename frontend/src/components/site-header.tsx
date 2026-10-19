import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { PublicUser } from "@/lib/types";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return <HeaderBar user={user} />;
}

export function SiteHeaderFallback() {
  return <HeaderBar user={null} />;
}

function HeaderBar({ user }: { user: PublicUser | null }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TCGlib
        </Link>
        <p className="hidden text-sm text-stone-500 sm:block">One Piece</p>
      </div>
      <nav className="flex items-center gap-1 text-sm">
        <Link
          href="/"
          className="inline-flex h-11 items-center px-2 font-medium text-stone-700"
        >
          Catálogo
        </Link>
        {user ? (
          <Link
            href="/perfil"
            className="inline-flex h-11 max-w-40 items-center gap-2 rounded-xl px-2 font-medium text-stone-900"
          >
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="size-7 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate">{user.name}</span>
          </Link>
        ) : (
          <Link
            href="/entrar"
            className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 font-medium text-white"
          >
            Entrar
          </Link>
        )}
      </nav>
    </header>
  );
}
