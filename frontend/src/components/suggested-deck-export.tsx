"use client";

import { useState } from "react";
import { opsimFileName, opsimJson, opsimText } from "@/lib/opsim";

export function SuggestedDeckExport({
  name,
  author,
  leaderCode,
  lines,
}: {
  name: string;
  author: string;
  leaderCode: string | null;
  lines: { code: string; quantity: number }[];
}) {
  const [copied, setCopied] = useState(false);
  const text = opsimText({ leaderCode, lines });

  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 items-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
      >
        {copied ? "Lista copiada" : "Copiar lista"}
      </button>
      <button
        type="button"
        onClick={() => download(opsimFileName(name, "txt"), text, "text/plain")}
        className="inline-flex h-11 items-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
      >
        Descargar texto
      </button>
      <button
        type="button"
        onClick={() =>
          download(
            opsimFileName(name, "json"),
            opsimJson({ name, author, leaderCode, lines }),
            "application/json",
          )
        }
        className="inline-flex h-11 items-center rounded-xl bg-white px-3 text-sm font-medium text-stone-900 ring-1 ring-stone-300"
      >
        Descargar JSON
      </button>
    </>
  );
}

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
