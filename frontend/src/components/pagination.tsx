import Link from "next/link";
import { formatCount } from "@/lib/format";

export function Pagination({
  page,
  total,
  limit,
  hrefFor,
  label = "Paginación del catálogo",
}: {
  page: number;
  total: number;
  limit: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (current - 1) * limit + 1;
  const to = Math.min(current * limit, total);

  return (
    <nav
      aria-label={label}
      className="mt-6 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-stone-600">
        {total === 0
          ? "Sin resultados"
          : `${formatCount(from)}–${formatCount(to)} de ${formatCount(total)}`}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <PageLink
          href={hrefFor(current - 1)}
          disabled={current <= 1}
        >
          Anterior
        </PageLink>
        <p className="px-2 text-center text-sm font-medium text-stone-800">
          {current} / {formatCount(totalPages)}
        </p>
        <PageLink
          href={hrefFor(current + 1)}
          disabled={current >= totalPages}
          align="end"
        >
          Siguiente
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  align = "start",
  children,
}: {
  href: string;
  disabled: boolean;
  align?: "start" | "end";
  children: string;
}) {
  const className = `inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium ${
    align === "end" ? "justify-self-end" : "justify-self-start"
  }`;

  if (disabled) {
    return (
      <span className={`${className} text-stone-300`} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${className} bg-white text-stone-900 ring-1 ring-stone-300`}
    >
      {children}
    </Link>
  );
}
