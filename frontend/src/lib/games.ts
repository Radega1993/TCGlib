export type GameSlug = "one-piece" | "riftbound";

export function gameOf(value?: string): GameSlug {
  return value === "riftbound" ? "riftbound" : "one-piece";
}

export function riftboundPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname.startsWith("/riftbound") || /^\/u\/[^/]+\/riftbound(?:\/|$)/.test(pathname);
}

export function gameProfile(game: GameSlug = "one-piece") {
  if (game === "riftbound") {
    return {
      slug: game,
      name: "Riftbound",
      base: "/riftbound",
      productBase: "/riftbound/cartas",
      publicPath: (slug: string) => `/u/${slug}/riftbound`,
      searchPlaceholder: "Jinx, 030/298…",
      colorLabelText: "Dominio",
      attributeLabelText: "Etiqueta",
      costLabelText: "Energía",
      setLabelText: "Colección",
      setPlaceholder: "Todas las colecciones",
      editionSortLabel: "Colecciones",
      colorSortLabel: "Dominios",
      setSearchPlaceholder: "OGN, Origins…",
    };
  }
  return {
    slug: "one-piece" as const,
    name: "One Piece",
    base: "",
    productBase: "/products",
    publicPath: (slug: string) => `/u/${slug}`,
    searchPlaceholder: "Luffy, OP03-070…",
    colorLabelText: "Color",
    attributeLabelText: "Atributo",
    costLabelText: "Coste",
    setLabelText: "Set",
    setPlaceholder: "Todos los sets",
    editionSortLabel: "Ediciones",
    colorSortLabel: "Colores",
    setSearchPlaceholder: "OP01, Romance Dawn…",
  };
}
