"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCount, formatPercent } from "@/lib/format";
import { SetProgress } from "@/lib/types";

export function SetProgressList({
  sets,
  base = "",
  placeholder = "OP01, Romance Dawn…",
  emptyLabel = "Ningún set coincide con esta búsqueda.",
}: {
  sets: SetProgress[];
  base?: string;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("es");
  const visible = needle
    ? sets.filter((set) => setLabel(set).toLocaleLowerCase("es").includes(needle))
    : sets;

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-xs font-medium text-stone-500" htmlFor="set-search">
        Buscar set
        <input
          id="set-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm text-stone-950 ring-1 ring-stone-200"
        />
      </label>
      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-stone-700 ring-1 ring-stone-200">
          {emptyLabel}
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3 sm:hidden">
            {visible.map((set) => (
              <li key={set.externalId}>
                <Link
                  href={`${base}/progreso/${set.externalId}`}
                  className="block rounded-2xl bg-white p-4 ring-1 ring-stone-200"
                >
                  <SetHeading set={set} />
                  <ProgressBar percent={set.percent} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-stone-200 sm:block">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-medium">Colección</th>
                  <th className="px-3 py-3 text-right font-medium">Conseguido</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((set) => (
                  <tr key={set.externalId} className="border-t border-stone-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`${base}/progreso/${set.externalId}`}
                        className="font-medium text-stone-950"
                      >
                        {setLabel(set)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-stone-800">
                      {formatCount(set.obtained)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-stone-800">
                      {formatCount(set.total)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-right font-medium tabular-nums text-stone-950">
                        {formatPercent(set.percent)}
                      </p>
                      <ProgressBar percent={set.percent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SetHeading({ set }: { set: SetProgress }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-stone-950">{setLabel(set)}</p>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-stone-950">{formatPercent(set.percent)}</p>
        <p className="text-xs tabular-nums text-stone-500">
          {formatCount(set.obtained)} de {formatCount(set.total)}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-stone-200">
      <span
        className="block h-full rounded-full bg-stone-900"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </span>
  );
}

function setLabel(set: SetProgress) {
  return set.code ? `${set.code} – ${set.name}` : set.name;
}
