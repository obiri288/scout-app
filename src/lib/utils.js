import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPosition(pos) {
  if (!pos) return "";
  
  const mapping = {
    "Torwart": "TW",
    "Innenverteidiger": "IV",
    "Außenverteidiger": "AV",
    "Linker Verteidiger": "LV",
    "Rechter Verteidiger": "RV",
    "Defensives Mittelfeld": "ZDM",
    "Zentrales Mittelfeld": "ZM",
    "Offensives Mittelfeld": "ZOM",
    "Rechtes Mittelfeld": "RM",
    "Linkes Mittelfeld": "LM",
    "Linksaußen": "LA",
    "Rechtsaußen": "RA",
    "Mittelstürmer": "MS",
    "Stürmer": "ST",
    "Hängende Spitze": "HS",
  };

  return mapping[pos] || pos;
}
