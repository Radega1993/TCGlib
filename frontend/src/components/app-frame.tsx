"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { displayName } from "@/lib/format";
import { PublicUser } from "@/lib/types";

export function AppChrome({ user }: { user: PublicUser | null }) {
  return (
    <Suspense fallback={<ChromeStatic user={user} />}>
      <ChromeLive user={user} />
    </Suspense>
  );
}

function ChromeLive({ user }: { user: PublicUser | null }) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;

  return (
    <Chrome
      user={user}
      pathname={pathname}
      open={open}
      onOpen={() => setMenuPath(pathname)}
      onClose={() => setMenuPath(null)}
    />
  );
}

function ChromeStatic({ user }: { user: PublicUser | null }) {
  return (
    <Chrome user={user} pathname={null} open={false} onOpen={() => undefined} onClose={() => undefined} />
  );
}

function Chrome({
  user,
  pathname,
  open,
  onOpen,
  onClose,
}: {
  user: PublicUser | null;
  pathname: string | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-stone-950/40 md:hidden"
          onClick={onClose}
        />
      ) : null}
      <Sidebar user={user} pathname={pathname} open={open} onClose={onClose} />
      <header className="flex h-14 items-center justify-between gap-3 border-b border-stone-200 px-4 md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
          onClick={onOpen}
        >
          Menú
        </button>
        <Link href="/" className="flex min-w-0 justify-center">
          <Image
            src="/logo-mark.png"
            alt="TCGlib"
            width={640}
            height={578}
            priority
            className="h-10 w-auto"
          />
        </Link>
        {user ? (
          <Link href="/biblioteca" className="max-w-28 truncate text-sm font-medium">
            {displayName(user)}
          </Link>
        ) : (
          <Link
            href="/entrar"
            className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
          >
            Entrar
          </Link>
        )}
      </header>
    </>
  );
}
