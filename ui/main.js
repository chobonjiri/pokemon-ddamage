// ui/main.js
import { panelIds as P_IDS, initialPanelStatsTemplate } from './config.js';
import { loadAllData, pokemonData as pData, moveData as mData, abilityData as aData, itemData as iData} from './data-loader.js';
import { setupEventListeners, setupRankDropdowns, setupFieldControlListeners } from './event-handler.js';
import { updateAllPanelStats, updatePokemonHPBar, showAbilities, updateRankDisplay, initializeRankValuesFromPanelStats } from './ui-updater.js';
// import { calculateDamage } from './damage-calculator.js'; // damage-calculator.js を後ほど作成・連携

// --- Global State Variables ---
export const panelIds = P_IDS;
export let selectedPokemons = {};
export let selectedMoves = {};
export let panelStats = {};

// Field State (場の状態)dfd
export let fieldState = {
    weather: 'none', // 'none', 'sun', 'rain', 'sand', 'snow'
    terrain: 'none', // 'none', 'electric', 'grassy', 'misty', 'psychic'
    teamRed: {
        isReflectActive: false,
        isLightScreenActive: false,
        isFriendGuardActive: false, // 将来的に特性から自動判定または手動設定
        // 他のチーム固有状態 (例: おいかぜの残りターンなど)
    },
    teamBlue: {
        isReflectActive: false,
        isLightScreenActive: false,
        isFriendGuardActive: false,
        // 他のチーム固有状態
    }
};


// Initialize panel-specific states
panelIds.forEach(id => {
    selectedPokemons[id] = null;
    selectedMoves[id] = null;
    panelStats[id] = JSON.parse(JSON.stringify(initialPanelStatsTemplate));
    // Initialize new properties for damage calculation if not in template
    panelStats[id].item = panelStats[id].item || '';
    panelStats[id].statusCondition = panelStats[id].statusCondition || 'none';
    panelStats[id].isCriticalHit = panelStats[id].isCriticalHit || false;
    // panelStats[id].terastalType = panelStats[id].terastalType || null; // typeChangeで管理
});

export { pData as pokemonData, mData as moveData, aData as abilityData, iData as itemData };

export function dispatchMoveCategoryUpdate(panelId) {
    const moveInputElement = document.getElementById(`${panelId}-move`);
    if (!moveInputElement) {
        return;
    }
    const selectedMoveObject = selectedMoves[panelId];
    let categoryForEvent = null;
    if (selectedMoveObject && typeof selectedMoveObject.category === 'string') {
        const actualCategory = selectedMoveObject.category;
        if (actualCategory === '物理' || actualCategory === '特殊') {
            categoryForEvent = actualCategory;
        }
    }
    const event = new CustomEvent('moveCategoryUpdated', { detail: categoryForEvent });
    moveInputElement.dispatchEvent(event);
}

function initializePanelDefaults(panelId) {
    const currentPanelInternalStats = panelStats[panelId].stats;

    // IVs
    const ivElements = {
        hp: `${panelId}-hp-iv`,
        'main-offensive': `${panelId}-main-offensive-iv`, //初期はattackの値を参照
        defense: `${panelId}-defense-iv`,
        'sp-defense': `${panelId}-sp-defense-iv`,
        // attack: `${panelId}-attack-iv`, // 個別表示する場合
        // 'sp-attack': `${panelId}-sp-attack-iv` // 個別表示する場合
    };
    for (const [key, id] of Object.entries(ivElements)) {
        const el = document.getElementById(id);
        if (el) {
            if (key === 'main-offensive') {
                el.value = currentPanelInternalStats.attack.iv;
            } else if (currentPanelInternalStats[key.replace('-','')]) {
                 el.value = currentPanelInternalStats[key.replace('sp-defense','spDefense').replace('sp-attack','spAttack')].iv;
            } else if (currentPanelInternalStats[key]) {
                 el.value = currentPanelInternalStats[key].iv;
            }
        }
    }

    // EVs
    const evElements = {
        hp: `${panelId}-hp-ev`,
        'main-offensive': `${panelId}-main-offensive-ev`, //初期はattackの値を参照
        defense: `${panelId}-defense-ev`,
        'sp-defense': `${panelId}-sp-defense-ev`,
    };
     for (const [key, id] of Object.entries(evElements)) {
        const el = document.getElementById(id);
        if (el) {
            if (key === 'main-offensive') {
                el.value = currentPanelInternalStats.attack.ev;
            } else if (currentPanelInternalStats[key.replace('-','')]) {
                 el.value = currentPanelInternalStats[key.replace('sp-defense','spDefense').replace('sp-attack','spAttack')].ev;
            } else if (currentPanelInternalStats[key]) {
                 el.value = currentPanelInternalStats[key].ev;
            }
        }
    }

    // Natures (Hidden input and Segmented control active state)
    const natureControlSetups = [
        { key: 'main-offensive', baseKey: 'attack', controlId: `${panelId}-main-offensive-nature-control`, hiddenId: `${panelId}-main-offensive-nature`},
        { key: 'defense', baseKey: 'defense', controlId: `${panelId}-defense-nature-control`, hiddenId: `${panelId}-defense-nature`},
        { key: 'sp-defense', baseKey: 'spDefense', controlId: `${panelId}-sp-defense-nature-control`, hiddenId: `${panelId}-sp-defense-nature`}
    ];

    natureControlSetups.forEach(setup => {
        const hiddenInput = document.getElementById(setup.hiddenId);
        const control = document.getElementById(setup.controlId);
        if(hiddenInput && control){
            const natureValue = panelStats[panelId].stats[setup.baseKey].nature;
            hiddenInput.value = natureValue;
            control.querySelectorAll('button').forEach(button => {
                button.classList.toggle('active', parseFloat(button.dataset.value) === natureValue);
            });
        }
    });


    // Ranks (Dropdown display and hidden span value)
    initializeRankValuesFromPanelStats(panelId);


    // HP Bar and Icon
    updatePokemonHPBar(panelId, 0, 1); // Initial empty bar
    const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
    if (hpTableNameEl) hpTableNameEl.textContent = '-';
    const iconEl = document.getElementById(`${panelId}-icon`);
    if (iconEl) iconEl.style.backgroundColor = '#cccccc';

    // Abilities
    showAbilities(panelId, null); // Initialize with no Pokemon

    // Move Times and Type Change
    const moveTimesEl = document.getElementById(`${panelId}-move-times`);
    if (moveTimesEl) moveTimesEl.value = panelStats[panelId].moveTimes;
    const typeChangeEl = document.getElementById(`${panelId}-type-change`);
    if (typeChangeEl) typeChangeEl.value = panelStats[panelId].typeChange;

}


async function initializeApp() {
  try {
    await loadAllData();
  } catch (error) {
    console.error("データのロード中にエラーが発生しました:", error);
    // Optionally, display an error message to the user in the UI
    return; // Stop initialization if data loading fails
  }

  panelIds.forEach(panelId => {
    initializePanelDefaults(panelId);
  });
  
  setupEventListeners(); // General event listeners for inputs, abilities, etc.
  setupRankDropdowns(); // Specific setup for rank dropdowns across all panels
  setupFieldControlListeners(); // Listeners for weather, terrain, and walls

  updateAllPanelStats(); // Initial calculation and display of all stats

  // Example: Damage Calculation Button (Illustrative)
  const calcButton = document.getElementById('calculate-damage-button');
  if (calcButton) {
      calcButton.addEventListener('click', () => {
          // TODO: Implement logic to determine attacker and defender(s)
          // For now, let's assume red2 attacks blue1 as a placeholder
          const attackerId = 'red2';
          const defenderIds = ['blue1']; // Could be multiple for spread moves

          if (!selectedPokemons[attackerId] || !selectedMoves[attackerId]) {
              alert(`${attackerId}のポケモンまたは技が選択されていません。`);
              return;
          }
          if (defenderIds.some(id => !selectedPokemons[id])) {
              alert(`防御側のポケモンが選択されていません。`);
              return;
          }
          
          // console.log("Damage calculation triggered for:", attackerId, "vs", defenderIds);
          // Example of how you might call a future calculateDamage function
          /*
          defenderIds.forEach(defenderId => {
              try {
                  const damageDetails = calculateDamage(panelStats[attackerId], panelStats[defenderId], selectedPokemons[attackerId], selectedPokemons[defenderId], selectedMoves[attackerId], fieldState);
                  console.log(`Damage from ${attackerId} to ${defenderId}:`, damageDetails);
                  // Update defender's HP bar
                  const defenderMaxHP = panelStats[defenderId].maxHP;
                  const defenderCurrentHP = panelStats[defenderId].currentHP - damageDetails.totalDamage; // Assuming totalDamage is calculated
                  panelStats[defenderId].currentHP = Math.max(0, defenderCurrentHP);
                  updatePokemonHPBar(defenderId, panelStats[defenderId].currentHP, defenderMaxHP);

              } catch (e) {
                  console.error(`Error calculating damage for ${defenderId}:`, e);
                  alert(`ダメージ計算中にエラーが発生しました: ${e.message}`);
              }
          });
          */
         alert("ダメージ計算機能は現在開発中です。");
      });
  }
}

// Expose changeRank to global scope for inline HTML, though ideally, this should be an event listener.
window.changeRank = (panelAndStat, change) => {
    const parts = panelAndStat.split('-');
    const panelId = parts[0];
    const statKeyForPanelStats = parts.slice(1, -1).join('-'); // e.g., "main-offensive", "defense"
    
    let actualStatKey = "";
    if (statKeyForPanelStats === 'main-offensive') {
        const move = selectedMoves[panelId];
        if (move && move.category === "物理") {
            actualStatKey = 'attack';
        } else if (move && move.category === "特殊") {
            actualStatKey = 'spAttack';
        } else {
            // If move category is not physical or special, or no move is selected,
            // default to 'attack' or do nothing. For now, let's do nothing if ambiguous.
            console.warn("Cannot determine main-offensive stat for rank change without a physical/special move.");
            return;
        }
    } else {
        actualStatKey = statKeyForPanelStats.replace('sp-defense', 'spDefense').replace('sp-attack', 'spAttack');
    }

    if (!panelStats[panelId] || !panelStats[panelId].stats[actualStatKey]) {
        console.warn(`Stats object not found for ${panelId}.${actualStatKey} in changeRank`);
        return;
    }

    let currentRank = panelStats[panelId].stats[actualStatKey].rank;
    currentRank = Math.max(-6, Math.min(6, currentRank + change));
    
    panelStats[panelId].stats[actualStatKey].rank = currentRank;
    
    updateRankDisplay(panelId, statKeyForPanelStats, currentRank); // Update only the visual display of the rank via ui-updater
    updatePanelStats(panelId); // Recalculate and update all stats for the panel
};


document.addEventListener("DOMContentLoaded", initializeApp);