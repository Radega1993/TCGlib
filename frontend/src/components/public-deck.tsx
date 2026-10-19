import Image from "next/image";
import Link from "next/link";
import { productHref } from "@/lib/catalog-query";
import { formatName, issueText, legalityNote, legalityTitle } from "@/lib/deck-copy";
import { cardTypeLabel, colorClass, colorLabel, splitColors } from "@/lib/format";
import { DeckCard, PublicDeck } from "@/lib/types";

export function PublicDeckView({ deck }: { deck: PublicDeck }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-stone-500">Mazo público · {formatName(deck.format)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">{deck.name}</h1>
        <p className="mt-1 text-sm text-stone-600">{deck.owner}</p>
      </div>
      <p className="text-sm text-stone-600">Los 10 DON!! van aparte y no cuentan entre las 50.</p>
      <StatusCopy
        ok={deck.construction.ok}
        size={deck.construction.size}
        target={deck.construction.target}
        issues={deck.construction.issues}
        format={deck.format}
        legality={deck.legality}
        rulesLabel={deck.rulesLabel}
      />
      <section className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <h2 className="text-sm font-medium text-stone-950">Líder</h2>
        {deck.leader ? (
          <CardRow card={deck.leader} meta={deck.leader.code} />
        ) : (
          <p className="mt-2 text-sm text-stone-500">Sin líder.</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-950">
          Lista {deck.construction.size}/{deck.construction.target}
        </h2>
        {deck.lines.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-sm text-stone-600 ring-1 ring-stone-200">
            Este mazo todavía no tiene cartas.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {deck.lines.map((line) => (
              <li key={line.code}>
                <CardRow card={line} meta={`${line.code} · x${line.quantity}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <DeckBreakdown summary={deck.summary} />
    </div>
  );
}

export function StatusCopy({
  ok,
  size,
  target,
  issues,
  format,
  legality,
  rulesLabel,
}: {
  ok: boolean;
  size: number;
  target: number;
  issues: PublicDeck["construction"]["issues"];
  format: PublicDeck["format"];
  legality: PublicDeck["legality"];
  rulesLabel: string | null;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Construcción</p>
        <p className="mt-1 text-sm font-medium text-stone-950">{ok ? "Válida" : "No válida"}</p>
        <p className="mt-1 text-sm text-stone-600">
          {size}/{target} cartas de personaje, evento o escenario.
        </p>
        {issues.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-stone-700">
            {issues.slice(0, 6).map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issueText(issue)}</li>
            ))}
          </ul>
        ) : null}
      </article>
      <article className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Legalidad</p>
        <p className="mt-1 text-sm font-medium text-stone-950">
          {legalityTitle(legality.status)} · {formatName(format)}
        </p>
        <p className="mt-1 text-sm text-stone-600">{legalityNote(format, legality, rulesLabel)}</p>
        {legality.banned.length > 0 ? (
          <p className="mt-2 text-sm text-stone-700">Prohibidas: {legality.banned.join(", ")}</p>
        ) : null}
        {legality.pairs.length > 0 ? (
          <p className="mt-1 text-sm text-stone-700">
            Pares: {legality.pairs.map((pair) => pair.join(" + ")).join("; ")}
          </p>
        ) : null}
      </article>
    </div>
  );
}

export function DeckBreakdown({ summary }: { summary: PublicDeck["summary"] }) {
  const peak = Math.max(1, ...summary.curve.map((bucket) => bucket.copies));
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Breakdown title="Colores">
        {summary.colors.length === 0 ? (
          <Empty />
        ) : (
          summary.colors.map((item) => (
            <p key={item.color} className="flex items-center gap-2 text-sm text-stone-700">
              <ColorDots color={item.color} />
              {colorLabel(item.color)} · {item.copies}
            </p>
          ))
        )}
      </Breakdown>
      <Breakdown title="Tipos">
        {summary.types.length === 0 ? (
          <Empty />
        ) : (
          summary.types.map((item) => (
            <p key={item.cardType} className="text-sm text-stone-700">
              {cardTypeLabel(item.cardType)} · {item.copies}
            </p>
          ))
        )}
      </Breakdown>
      <Breakdown title="Curva de coste">
        {summary.curve.length === 0 ? (
          <Empty />
        ) : (
          summary.curve.map((bucket) => (
            <p key={bucket.cost} className="flex items-center gap-2 text-sm text-stone-700">
              <span className="w-8 shrink-0">{bucket.cost}</span>
              <span className="h-2 flex-1 rounded-full bg-stone-100">
                <span
                  className="block h-2 rounded-full bg-stone-900"
                  style={{ width: `${Math.round((bucket.copies / peak) * 100)}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums">{bucket.copies}</span>
            </p>
          ))
        )}
      </Breakdown>
    </section>
  );
}

function Breakdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
      <div className="mt-2 flex flex-col gap-1">{children}</div>
    </article>
  );
}

function Empty() {
  return <p className="text-sm text-stone-500">Sin cartas todavía.</p>;
}

function CardRow({ card, meta }: { card: DeckCard; meta: string }) {
  const body = (
    <span className="flex min-w-0 gap-3">
      <span className="relative block h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
        {card.image ? <Image src={card.image} alt="" fill sizes="56px" className="object-contain" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-stone-950">{card.name}</span>
        <span className="mt-1 flex items-center gap-2 text-xs text-stone-500">
          <ColorDots color={card.color} />
          {meta}
          {card.cardType ? ` · ${cardTypeLabel(card.cardType)}` : ""}
        </span>
      </span>
    </span>
  );
  return (
    <div className="mt-2">
      {card.externalId ? (
        <Link href={productHref(card.externalId, "/")} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

function ColorDots({ color }: { color: string | null }) {
  const colors = splitColors(color ?? undefined);
  if (colors.length === 0) return null;
  return (
    <span className="inline-flex gap-1">
      {colors.map((item) => (
        <span key={item} className={`size-2.5 rounded-full ${colorClass(item)}`} title={colorLabel(item)} />
      ))}
    </span>
  );
}
