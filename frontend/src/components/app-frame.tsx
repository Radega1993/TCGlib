"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { AliasForm } from "@/components/alias-form";
import { Sidebar } from "@/components/sidebar";
import { PublicUser } from "@/lib/types";

export function AppChrome({ user }: { user: PublicUser | null }) {
  return (
    <Suspense fallback={<Chrome user={user} pathname={null} />}>
      <ChromeLive user={user} />
    </Suspense>
  );
}

function ChromeLive({ user }: { user: PublicUser | null }) {
  const pathname = usePathname();
  return <Chrome user={user} pathname={pathname} />;
}

function Chrome({
  user,
  pathname,
}: {
  user: PublicUser | null;
  pathname: string | null;
}) {
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const open = menuPath === pathname;

  return (
    <>
      <div className="md:row-span-2 md:min-h-screen">
        {open ? (
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-30 bg-stone-950/40 md:hidden"
            onClick={() => setMenuPath(null)}
          />
        ) : null}
        <Sidebar
          user={user}
          pathname={pathname}
          open={open}
          onClose={() => setMenuPath(null)}
        />
      </div>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f6f3ee] md:col-start-2">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            <button
              type="button"
              aria-expanded={open}
              aria-controls="app-sidebar"
              className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
              onClick={() => setMenuPath(pathname)}
            >
              Menú
            </button>
            <Link href="/" className="flex min-w-0">
              <Image
                src="/logo-mark.png"
                alt="TCGlib"
                width={640}
                height={578}
                priority
                className="h-10 w-auto"
              />
            </Link>
          </div>
          <div className="ml-auto hidden min-w-0 md:block">
            <AccountBar user={user} inputId="public-alias" showLabel />
          </div>
          <div className="ml-auto md:hidden">
            {user ? <LogoutButton /> : <LoginLink />}
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-2 px-4 pb-3 md:hidden">
            <UserMark user={user} />
            <AliasForm alias={user.alias ?? ""} id="public-alias-mobile" showLabel />
          </div>
        ) : null}
      </header>
    </>
  );
}

function AccountBar({
  user,
  inputId,
  showLabel = false,
}: {
  user: PublicUser | null;
  inputId: string;
  showLabel?: boolean;
}) {
  if (!user) return <LoginLink />;

  return (
    <div className="flex min-w-0 items-center justify-end gap-2">
      <UserMark user={user} />
      <AliasForm alias={user.alias ?? ""} id={inputId} showLabel={showLabel} />
      <LogoutButton />
    </div>
  );
}

function LoginLink() {
  return (
    <Link
      href="/entrar"
      className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-3 text-sm font-medium text-white"
    >
      Entrar
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-stone-700 ring-1 ring-stone-300"
      >
        Salir
      </button>
    </form>
  );
}

function UserMark({ user }: { user: PublicUser }) {
  if (user.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.picture}
        alt=""
        referrerPolicy="no-referrer"
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-medium text-white">
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
