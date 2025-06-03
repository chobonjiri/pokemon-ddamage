// ui/main.js
import { panelIds as P_IDS, initialPanelStatsTemplate } from './config.js';
import { loadAllData, pokemonData as pData, moveData as mData } from './data-loader.js';
import { setupEventListeners } from './event-handler.js';
import { updateAllPanelStats, updatePokemonHPBar, showAbilities, changeRank as updateRankFromUI } from './ui-updater.js';

// --- Global State Variables ---
export const panelIds = P_IDS;
export let selectedPokemons = {};
export let selectedMoves = {};
export let panelStats = {};

// Initialize states
panelIds.forEach(id => {
    selectedPokemons[id] = null;
    selectedMoves[id] = null;
    // Deep copy the template to avoid shared references
    panelStats[id] = JSON.parse(JSON.stringify(initialPanelStatsTemplate));
});


// Make pokemonData and moveData accessible to other modules that import them from here
// (though ui-updater and event-handler now import directly from data-loader)
export { pData as pokemonData, mData as moveData };


async function initializeApp() {
  await loadAllData(); // データロードを待つ

  panelIds.forEach(panelId => {
      const currentPanelInternalStats = panelStats[panelId].stats;
      
      // IVs
      const hpIvEl = document.getElementById(`${panelId}-hp-iv`);
      if (hpIvEl) hpIvEl.value = currentPanelInternalStats.hp.iv;
      
      const mainOffensiveIvEl = document.getElementById(`${panelId}-main-offensive-iv`);
      if (mainOffensiveIvEl) mainOffensiveIvEl.value = currentPanelInternalStats.attack.iv;
      
      const defenseIvEl = document.getElementById(`${panelId}-defense-iv`);
      if (defenseIvEl) defenseIvEl.value = currentPanelInternalStats.defense.iv;
      
      const spDefenseIvEl = document.getElementById(`${panelId}-sp-defense-iv`);
      if (spDefenseIvEl) spDefenseIvEl.value = currentPanelInternalStats.spDefense.iv;
      
      if(document.getElementById(`${panelId}-attack-iv`)) document.getElementById(`${panelId}-attack-iv`).value = currentPanelInternalStats.attack.iv;
      if(document.getElementById(`${panelId}-sp-attack-iv`)) document.getElementById(`${panelId}-sp-attack-iv`).value = currentPanelInternalStats.spAttack.iv;

      // EVs
      const hpEvEl = document.getElementById(`${panelId}-hp-ev`);
      if (hpEvEl) hpEvEl.value = currentPanelInternalStats.hp.ev;

      const mainOffensiveEvEl = document.getElementById(`${panelId}-main-offensive-ev`);
      if (mainOffensiveEvEl) mainOffensiveEvEl.value = currentPanelInternalStats.attack.ev;
      
      const defenseEvEl = document.getElementById(`${panelId}-defense-ev`);
      if (defenseEvEl) defenseEvEl.value = currentPanelInternalStats.defense.ev;

      const spDefenseEvEl = document.getElementById(`${panelId}-sp-defense-ev`);
      if (spDefenseEvEl) spDefenseEvEl.value = currentPanelInternalStats.spDefense.ev;

      if(document.getElementById(`${panelId}-attack-ev`)) document.getElementById(`${panelId}-attack-ev`).value = currentPanelInternalStats.attack.ev;
      if(document.getElementById(`${panelId}-sp-attack-ev`)) document.getElementById(`${panelId}-sp-attack-ev`).value = currentPanelInternalStats.spAttack.ev;
      
      // Ranks
      const mainOffensiveRankEl = document.getElementById(`${panelId}-main-offensive-rank-val`);
      if (mainOffensiveRankEl) mainOffensiveRankEl.textContent = currentPanelInternalStats.attack.rank;

      const defenseRankEl = document.getElementById(`${panelId}-defense-rank-val`);
      if (defenseRankEl) defenseRankEl.textContent = currentPanelInternalStats.defense.rank;
      
      const spDefenseRankEl = document.getElementById(`${panelId}-sp-defense-rank-val`);
      if (spDefenseRankEl) spDefenseRankEl.textContent = currentPanelInternalStats.spDefense.rank;

      if(document.getElementById(`${panelId}-attack-rank-val`)) document.getElementById(`${panelId}-attack-rank-val`).textContent = currentPanelInternalStats.attack.rank;
      if(document.getElementById(`${panelId}-sp-attack-rank-val`)) document.getElementById(`${panelId}-sp-attack-rank-val`).textContent = currentPanelInternalStats.spAttack.rank;

      updatePokemonHPBar(panelId, 0, 1);
      const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
      if(hpTableNameEl) hpTableNameEl.textContent = '-';
      const iconEl = document.getElementById(`${panelId}-icon`);
      if (iconEl) iconEl.style.backgroundColor = '#cccccc';
      
      showAbilities(panelId, null);
  });
  
  setupEventListeners();
  updateAllPanelStats();
}

// Expose functions to global scope if they are called from inline HTML attributes
// This is generally not recommended for new code, but helps with existing HTML.
window.changeRank = updateRankFromUI; // ui-updater.js からインポートした changeRank をグローバルに

document.addEventListener("DOMContentLoaded", initializeApp);