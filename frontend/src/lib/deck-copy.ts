import { ConstructionIssue, DeckFormat, DeckLegality } from "@/lib/types";

export function formatName(format: DeckFormat) {
  return format === "standard" ? "Standard" : "Extra";
}

export function issueText(issue: ConstructionIssue) {
  if (issue.code === "leader-missing") return "Elige un líder.";
  if (issue.code === "leader-unknown") return "Ese líder no está en el catálogo.";
  if (issue.code === "leader-type") return "La carta elegida como líder no es un líder.";
  if (issue.code === "size") return `La lista tiene ${issue.have} de 50 cartas.`;
  if (issue.code === "copies") {
    return `${issue.card} tiene ${issue.quantity} copias. El máximo es 4.`;
  }
  if (issue.code === "color") return `${issue.card} no coincide con los colores del líder.`;
  if (issue.code === "type") return `${issue.card} no entra en las 50.`;
  return `${issue.card} no está en el catálogo.`;
}

export function legalityTitle(status: DeckLegality["status"]) {
  if (status === "legal") return "Legal";
  if (status === "illegal") return "No legal";
  return "Por comprobar";
}

export function legalityNote(format: DeckFormat, legality: DeckLegality, rulesLabel: string | null) {
  const list = rulesLabel ? `Lista del ${rulesLabel}.` : "No hay una lista de reglas para este mazo.";
  if (format === "standard" && legality.status === "unchecked") {
    return `${list} Standard exige el icono de bloque y el catálogo todavía no lo tiene.`;
  }
  if (format === "standard" && legality.status === "illegal") {
    return `${list} Hay prohibiciones conocidas. El icono de bloque sigue sin comprobarse.`;
  }
  if (legality.status === "legal") {
    return `${list} Extra admite el resto de cartas publicadas.`;
  }
  if (legality.status === "unchecked") return list;
  return `${list} Incluye cartas o pares prohibidos.`;
}
