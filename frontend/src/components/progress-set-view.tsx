import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddMissingButton } from "@/components/add-missing-button";
import { Pagination } from "@/components/pagination";
import { collectionPage, collectionView, getCollectionSet } from "@/lib/collection";
import { productHref } from "@/lib/catalog-query";
import { cardTypeLabel, formatCount, formatPercent, rarityLabel } from "@/lib/format";
import { gameProfile, GameSlug } from "@/lib/games";
import { getCurrentUser } from "@/lib/session";
import { CollectionCardRow, CollectionView } from "@/lib/types";

const FILTERS: { id: CollectionView; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "faltan", label: "Faltan" },
  { id: "tienes", label: "Tienes" },
  { id: "repetidas", label: "Repetidas" },
  { id: "deseadas", label: "Deseadas" },
];

const GOAL_LABEL: Record<string, string> = {
  base: "Base",
  master: "Master set",
  playset: "Playset",
  custom: "Personalizado",
};

export async function ProgressSetView({
  params,
  searchParams,
  game = "one-piece",
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  game?: GameSlug;
}) {
  const profile = gameProfile(game);
  const { setId } = await params;
  const query = await searchParams;
  const externalId = decodeURIComponent(setId);
  const view = collectionView(first(query.vista));
  const page = collectionPage(first(query.page));
  const returnTo = setHref(externalId, view, page, profile.base);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?return=${encodeURIComponent(returnTo)}`);

  let detail: Awaited<ReturnType<typeof getCollectionSet>>;
  try {
    detail = await getCollectionSet(externalId, view, page, profile.slug);
  } catch {
    return (
      <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-rose-200">
        No se pudo cargar el set. Comprueba que la API sigue en marcha.
      </p>
    );
  }
  if (!detail) redirect(`/entrar?return=${encodeURIComponent(returnTo)}`);
  if (detail.missing) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink href={`${profile.base}/progreso`} />
        <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-700 ring-1 ring-stone-200">
          Este set no está en el catálogo.
        </p>
      </div>
    );
  }

  const { set, goal, counts, cards, total, limit } = detail.data;
  const title = set.code ? `${set.code} – ${set.name}` : set.name;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink href={`${profile.base}/progreso`} />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">{title}</h1>
        <p className="mt-2 text-sm text-stone-600">
          Objetivo {GOAL_LABEL[goal.mode] ?? goal.mode}
          {goal.mode === "custom" ? ` · ${formatCount(goal.customCopies)} copias` : ""}
        </p>
      </div>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-stone-950">
          {formatPercent(set.percent)}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {formatCount(set.obtained)} de {formatCount(set.total)}
        </p>
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-stone-200">
          <span
            className="block h-full rounded-full bg-stone-900"
            style={{ width: `${Math.min(100, Math.max(0, set.percent))}%` }}
          />
        </span>
      </section>
      <AddMissingButton setId={externalId} missing={set.missing} tcg={profile.slug} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const current = filter.id === view;
          return (
            <Link
              key={filter.id}
              href={setHref(externalId, filter.id, 1, profile.base)}
              aria-current={current ? "page" : undefined}
              className={`inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium ${
                current ? "bg-stone-900 text-white" : "bg-white text-stone-800 ring-1 ring-stone-200"
              }`}
            >
              {filter.label}
              <span className={`ml-2 tabular-nums ${current ? "text-stone-300" : "text-stone-500"}`}>
                {formatCount(counts[filter.id])}
              </span>
            </Link>
          );
        })}
      </div>
      {cards.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-stone-700 ring-1 ring-stone-200">
          {view === "todas" ? "Este set no tiene cartas." : "Ninguna carta coincide con este filtro."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <CardRow
              key={card.externalId}
              card={card}
              returnTo={returnTo}
              playset={goal.mode === "playset"}
              productBase={profile.productBase}
            />
          ))}
        </ul>
      )}
      <Pagination
        page={detail.data.page}
        total={total}
        limit={limit}
        label="Paginación del set"
        hrefFor={(next) => setHref(externalId, view, next, profile.base)}
      />
    </div>
  );
}

function CardRow({
  card,
  returnTo,
  playset,
  productBase,
}: {
  card: CollectionCardRow;
  returnTo: string;
  playset: boolean;
  productBase: string;
}) {
  const href = productHref(card.externalId, returnTo, productBase);
  return (
    <li className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <Link href={href} className="relative block h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {card.image ? (
          <Image src={card.image} alt="" fill sizes="64px" className="object-contain" />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="line-clamp-2 text-sm font-medium text-stone-950">
          {card.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-stone-500">
          {card.code ? <span>{card.code}</span> : null}
          {card.cardType ? <span>{cardTypeLabel(card.cardType)}</span> : null}
          {card.rarity ? <span>{rarityLabel(card.rarity)}</span> : null}
          {card.variantLabel ? <span>{card.variantLabel}</span> : null}
        </p>
        <p className="mt-2 text-sm text-stone-800">{cardStatus(card, playset)}</p>
      </div>
    </li>
  );
}

function cardStatus(card: CollectionCardRow, playset: boolean) {
  const parts: string[] = [];
  if (card.inGoal) {
    parts.push(`Tienes ${formatCount(card.counted)}/${formatCount(card.target)}`);
    if (playset && card.owned !== card.counted) {
      parts.push(`de esta carta ${formatCount(card.owned)}`);
    }
  } else {
    parts.push(card.owned > 0 ? `Tienes ${formatCount(card.owned)}` : "Fuera del objetivo");
  }
  if (card.wanted > 0) parts.push(`Buscas ${formatCount(card.wanted)}`);
  if (card.inGoal && card.counted > card.target) {
    parts.push(`de más ${formatCount(card.counted - card.target)}`);
  } else if (!card.inGoal && card.owned > 1) {
    parts.push("repetida");
  }
  return parts.join(" · ");
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex h-11 items-center text-sm font-medium text-stone-700">
      Todos los sets
    </Link>
  );
}

function setHref(setId: string, view: CollectionView, page = 1, base = "") {
  const params = new URLSearchParams();
  if (view !== "todas") params.set("vista", view);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  const path = `${base}/progreso/${setId}`;
  return search ? `${path}?${search}` : path;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
