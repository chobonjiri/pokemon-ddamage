// ui/stat-calculator.js

export function calcHPStat(base, iv, ev, level = 50) {
  if (isNaN(base) || isNaN(iv) || isNaN(ev)) return 0;
  return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calcActualStat(baseStat, iv, ev, nature, rank, level = 50, statName = "") {
  if (statName === "HP") {
      return calcHPStat(baseStat, iv, ev, level);
  }
  if (isNaN(baseStat) || isNaN(iv) || isNaN(ev) || isNaN(nature) || isNaN(rank)) return 0;

  let val = Math.floor(((baseStat * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  val = Math.floor(val * nature);
  const rankMultiplier = rank >= 0 ? (2 + rank) / 2 : 2 / (2 - rank);
  return Math.floor(val * rankMultiplier);
}