// ui/event-handler.js
import { panelIds, selectedPokemons, selectedMoves, panelStats } from './main.js'; // main.js から状態をインポート
import { pokemonData, moveData } from './data-loader.js';
import { updatePanelStats, showAbilities, updateMoveDetails, changeRank as updateRank } from './ui-updater.js';

function initializeAutoComplete(elementId, dataSrc, key, onSelectionCallback) {
  const inputElement = document.getElementById(elementId);
  if (!inputElement) return;

  new autoComplete({
      selector: `#${elementId}`,
      placeHolder: inputElement.placeholder,
      data: { src: dataSrc, keys: [key], cache: true },
      resultsList: {
          element: (list, data) => {
              if (!data.results.length) {
                  const message = document.createElement("div");
                  message.setAttribute("class", "no-results");
                  message.textContent = "見つかりませんでした";
                  list.prepend(message);
              }
          },
          noResults: true,
          maxResults: 10,
      },
      resultItem: {
          highlight: true,
          element: (item, data) => {
              item.innerHTML = `<span>${data.value[key]}</span>`;
          }
      },
      events: {
          input: {
              selection: (event) => {
                  const feedback = event.detail;
                  const selectedValue = feedback.selection.value[key];
                  inputElement.value = selectedValue;
                  if (onSelectionCallback) {
                    onSelectionCallback(selectedValue);
                  }
              }
          }
      },
      searchEngine: (query, record) => {
        const normalizedQuery = toHiragana(query.toLowerCase());
        const recordValue = record && record[key] ? record[key] : "";
        const normalizedRecordKey = toHiragana(recordValue.toLowerCase());
        return normalizedRecordKey.includes(normalizedQuery);
      },
       threshold: 1,
       debounce: 300
  });
}

function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function setupNatureControl(panelId, statKeyOrType, controlId, hiddenInputId, callback) {
    const control = document.getElementById(controlId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!control || !hiddenInput) return;

    let targetStatKeyInPanelStats;

    if (statKeyOrType === 'main-offensive') {
        targetStatKeyInPanelStats = 'attack'; // Default
    } else {
        targetStatKeyInPanelStats = statKeyOrType;
    }
     if (!panelStats[panelId] || !panelStats[panelId].stats[targetStatKeyInPanelStats] && statKeyOrType !== 'main-offensive') {
        console.warn(`panelStats for ${panelId}.${targetStatKeyInPanelStats} not found.`);
        return;
    }

    let initialNature = 1.0;
    if (statKeyOrType === 'main-offensive') {
        initialNature = panelStats[panelId].stats.attack.nature;
    } else {
        initialNature = panelStats[panelId].stats[targetStatKeyInPanelStats].nature;
    }
    hiddenInput.value = initialNature;
    control.querySelectorAll('button').forEach(button => {
        button.classList.toggle('active', parseFloat(button.dataset.value) === initialNature);
    });
    
    control.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            control.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const newNature = parseFloat(button.dataset.value);
            hiddenInput.value = newNature;

            if (statKeyOrType === 'main-offensive') {
                const move = selectedMoves[panelId];
                const actualTargetKey = (move && move.category === "特殊") ? 'spAttack' : 'attack';
                panelStats[panelId].stats[actualTargetKey].nature = newNature;
            } else {
                panelStats[panelId].stats[targetStatKeyInPanelStats].nature = newNature;
            }
            if (callback) callback();
        });
    });
}

function setupSegmentedControl(controlId, onChangeCallback) {
  const control = document.getElementById(controlId);
  if (!control) return;
  const buttons = control.querySelectorAll('button');
  
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const isActive = button.classList.contains('active');
      const selectedValue = button.dataset.value;

      if (isActive && selectedValue !== "none") {
          if(controlId === 'center-weatherControl' || controlId === 'center-fieldControl'){
            // No toggle off for weather/field unless 'none' is clicked again
          } else {
            return;
          }
      }
      
      let valueToCallBack = selectedValue;
      if (isActive && selectedValue === "none" && (controlId === 'center-weatherControl' || controlId === 'center-fieldControl') ) {
          return;
      }

      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      if (onChangeCallback) {
        onChangeCallback(valueToCallBack);
      }
    });
  });
}

export function setupEventListeners() {
    panelIds.forEach(panelId => {
        initializeAutoComplete(`${panelId}-pokemon-name`, pokemonData, 'name', (selectedName) => {
            selectedPokemons[panelId] = pokemonData.find(p => p.name === selectedName);
            panelStats[panelId].pokemonName = selectedName;
            showAbilities(panelId, selectedPokemons[panelId]);
            updatePanelStats(panelId);
        });

        initializeAutoComplete(`${panelId}-move`, moveData, 'name', (selectedName) => {
            selectedMoves[panelId] = moveData.find(m => m.name === selectedName);
            panelStats[panelId].moveName = selectedName;
            updateMoveDetails(panelId);
            updatePanelStats(panelId);
        });

        ['hp', 'defense', 'sp-defense'].forEach(statPart => {
            const jsStatKey = statPart.replace('sp-defense', 'spDefense');
            const ivEl = document.getElementById(`${panelId}-${statPart}-iv`);
            const evEl = document.getElementById(`${panelId}-${statPart}-ev`);
            if (ivEl) ivEl.addEventListener('input', () => { panelStats[panelId].stats[jsStatKey].iv = parseInt(ivEl.value) || 0; updatePanelStats(panelId); });
            if (evEl) evEl.addEventListener('input', () => { panelStats[panelId].stats[jsStatKey].ev = parseInt(evEl.value) || 0; updatePanelStats(panelId); });
        });

        const mainOffensiveIvEl = document.getElementById(`${panelId}-main-offensive-iv`);
        const mainOffensiveEvEl = document.getElementById(`${panelId}-main-offensive-ev`);

        if (mainOffensiveIvEl) mainOffensiveIvEl.addEventListener('input', () => {
            const move = selectedMoves[panelId];
            const targetStatKey = (move && move.category === "特殊") ? 'spAttack' : 'attack';
            panelStats[panelId].stats[targetStatKey].iv = parseInt(mainOffensiveIvEl.value) || 0;
            updatePanelStats(panelId);
        });
        if (mainOffensiveEvEl) mainOffensiveEvEl.addEventListener('input', () => {
            const move = selectedMoves[panelId];
            const targetStatKey = (move && move.category === "特殊") ? 'spAttack' : 'attack';
            panelStats[panelId].stats[targetStatKey].ev = parseInt(mainOffensiveEvEl.value) || 0;
            updatePanelStats(panelId);
        });
        
        ['attack', 'defense', 'sp-attack', 'sp-defense'].forEach(statName => {
            const jsStatKey = statName.replace('sp-attack', 'spAttack').replace('sp-defense', 'spDefense');
            setupNatureControl(panelId, jsStatKey, `${panelId}-${statName}-nature-control`, `${panelId}-${statName}-nature`, () => updatePanelStats(panelId));
        });
        setupNatureControl(panelId, 'main-offensive', `${panelId}-main-offensive-nature-control`, `${panelId}-main-offensive-nature`, () => updatePanelStats(panelId));

        const abilityNullifiedCheckbox = document.getElementById(`${panelId}-ability-nullified`);
        if (abilityNullifiedCheckbox) {
            abilityNullifiedCheckbox.addEventListener('change', () => {
                panelStats[panelId].ability.nullified = abilityNullifiedCheckbox.checked;
                if (abilityNullifiedCheckbox.checked) {
                    panelStats[panelId].ability.name = "";
                    panelStats[panelId].ability.custom = "";
                    panelStats[panelId].ability.selectedButton = null;
                    const choiceContainer = document.getElementById(`${panelId}-ability-choice`);
                    if(choiceContainer) choiceContainer.querySelectorAll(".ability-btn.selected").forEach(b => b.classList.remove("selected"));
                    const customInput = choiceContainer ? choiceContainer.querySelector(".custom-ability-input") : null;
                    if(customInput) customInput.value = "";
                }
                console.log(`${panelId} Ability Nullified: ${panelStats[panelId].ability.nullified}`);
            });
        }

        const typeChangeEl = document.getElementById(`${panelId}-type-change`);
        if (typeChangeEl) typeChangeEl.addEventListener('change', () => { panelStats[panelId].typeChange = typeChangeEl.value; });
        
        const moveTimesEl = document.getElementById(`${panelId}-move-times`);
        if (moveTimesEl) moveTimesEl.addEventListener('input', () => { panelStats[panelId].moveTimes = parseInt(moveTimesEl.value) || 1; });
        
        const doubleDamageCheckbox = document.getElementById(`${panelId}-double-damage-checkbox`);
        if (doubleDamageCheckbox) doubleDamageCheckbox.addEventListener('change', () => { panelStats[panelId].doubleDamage = doubleDamageCheckbox.checked; });

        // Rank change buttons (assuming changeRank is globally available or imported if it's moved)
        // Ensure changeRank function is accessible, it's currently in ui-updater.js
        // We'll expose it globally for the inline onclick or refactor HTML to use addEventListener
        // For simplicity, we will make `updateRank` (alias for changeRank) globally available from main.js
        // Or, better, we select the buttons here and add event listeners.
        const rankUpButtons = document.querySelectorAll(`button[onclick^="changeRank('${panelId}-"]`); // Rough selector
        const rankDownButtons = document.querySelectorAll(`button[onclick^="changeRank('${panelId}-"]`); // Rough selector

        // Example for one rank button type, repeat for others or make a more generic selector
        // This part needs careful refactoring of how changeRank is called from HTML or a new setup here.
        // For now, we rely on the global `changeRank` which will be attached to window object in main.js
    });

    setupSegmentedControl('center-weatherControl', selectedValue => console.log('Selected Weather:', selectedValue));
    setupSegmentedControl('center-fieldControl', selectedValue => console.log('Selected Field:', selectedValue));
}

// Expose changeRank to global scope for inline HTML onclick attributes.
// This is generally not recommended, but for compatibility with existing HTML:
window.changeRank = updateRank;