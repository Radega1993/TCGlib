export type SuggestionQuery = {
  q: string;
  falta: "" | "0" | "10" | "20";
  colors: string[];
  leader: string;
  view: "album" | "list";
  page: number;
};

export function parseSuggestionQuery(
  params: Record<string, string | string[] | undefined>,
): SuggestionQuery {
  const falta = first(params.falta);
  const page = Number(first(params.pagina));
  return {
    q: first(params.q).trim().slice(0, 80),
    falta: falta === "0" || falta === "10" || falta === "20" ? falta : "",
    colors: [...new Set(many(params.color))].slice(0, 8),
    leader: first(params.lider).slice(0, 20),
    view: first(params.vista) === "lista" ? "list" : "album",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function many(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().slice(0, 40))
    .filter(Boolean);
}
