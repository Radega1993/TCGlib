const counts = new Intl.NumberFormat("es-ES");

const COLOR_CLASS: Record<string, string> = {
  Red: "bg-red-600",
  Green: "bg-emerald-600",
  Blue: "bg-blue-600",
  Purple: "bg-violet-600",
  Black: "bg-stone-900",
  Yellow: "bg-amber-400",
};

const percents = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCount(value: number) {
  return counts.format(value);
}

export function formatPercent(value: number) {
  return `${percents.format(value)} %`;
}

export function displayName(user: { name: string; alias?: string | null }) {
  const alias = user.alias?.trim();
  return alias || user.name;
}

export function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${formatCount(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 48) return rest ? `${formatCount(hours)} h ${formatCount(rest)} min` : `${formatCount(hours)} h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${formatCount(days)} d ${formatCount(remHours)} h` : `${formatCount(days)} d`;
}

export function collectionLabel(cards: number, copies: number) {
  return `${formatCount(cards)} ${cards === 1 ? "carta" : "cartas"} · ${formatCount(copies)} ${copies === 1 ? "copia" : "copias"}`;
}

export function typeLabel(type?: string) {
  if (type === "card") return "Carta";
  if (type === "sealed") return "Sellado";
  if (type === "accessory") return "Accesorio";
  if (!type) return "Producto";
  return type;
}

export function splitColors(color?: string) {
  if (!color) return [];
  return color
    .split(/[;/]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const COLOR_LABEL: Record<string, string> = {
  Red: "Rojo",
  Green: "Verde",
  Blue: "Azul",
  Purple: "Morado",
  Black: "Negro",
  Yellow: "Amarillo",
};

const RARITY_LABEL: Record<string, string> = {
  C: "Común",
  UC: "Poco común",
  R: "Rara",
  SR: "Super rara",
  SEC: "Secreta",
  L: "Líder",
  PR: "Promo",
  TR: "Tesoro raro",
  "DON!!": "DON!!",
};

const CARD_TYPE_LABEL: Record<string, string> = {
  Leader: "Líder",
  Character: "Personaje",
  Event: "Evento",
  Stage: "Escenario",
  "DON!!": "DON!!",
};

const ATTRIBUTE_LABEL: Record<string, string> = {
  Slash: "Cortante",
  Strike: "Golpe",
  Ranged: "Distancia",
  Special: "Especial",
  Wisdom: "Sabiduría",
};

export function colorClass(color: string) {
  return COLOR_CLASS[color] ?? "bg-stone-400";
}

export function colorLabel(color: string) {
  return COLOR_LABEL[color] ?? color;
}

export function rarityLabel(rarity: string) {
  return RARITY_LABEL[rarity] ?? rarity;
}

export function cardTypeLabel(cardType: string) {
  return CARD_TYPE_LABEL[cardType] ?? cardType;
}

export function attributeLabel(attribute: string) {
  return ATTRIBUTE_LABEL[attribute] ?? attribute;
}

const ALLOWED_TAG = /^(em|strong|br|b|i)$/i;

export function sanitizeCardHtml(html: string) {
  return html.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tag: string) => {
    if (!ALLOWED_TAG.test(tag)) return "";
    const name = tag.toLowerCase();
    if (name === "br") return "<br />";
    return match.startsWith("</") ? `</${name}>` : `<${name}>`;
  });
}
