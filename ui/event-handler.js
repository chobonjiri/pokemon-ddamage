// ui/event-handler.js
import { panelIds, selectedPokemons, selectedMoves, panelStats, dispatchMoveCategoryUpdate, fieldState } from './main.js';
import { pokemonData, moveData } from './data-loader.js';
import { updatePanelStats, showAbilities, updateMoveDetails, updateRankDisplay } from './ui-updater.js';

// --- 文字変換ユーティリティ ---
function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// function toKatakana(str) { // 未使用のためコメントアウト
//   return str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
// }

function romajiToHiragana(romaji) {
  romaji = romaji.toLowerCase();
  const map = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wi': 'ゐ', 'we': 'ゑ', 'wo': 'を',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
    'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
    'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
    'dja': 'ぢゃ', 'dju': 'ぢゅ', 'djo': 'ぢょ',
    'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
    'tya': 'ちゃ', 'tyi': 'ちぃ', 'tyu': 'ちゅ', 'tye': 'ちぇ', 'tyo': 'ちょ',
    'zya': 'じゃ', 'zyi': 'じぃ', 'zyu': 'じゅ', 'zye': 'じぇ', 'zyo': 'じょ',
    'fa': 'ふぁ', 'fo': 'ふぉ',
    'la': 'ぁ', 'li': 'ぃ', 'lu': 'ぅ', 'le': 'ぇ', 'lo': 'ぉ',
    '-': 'ー',
  };

  let hiragana = '';
  let i = 0;
  while (i < romaji.length) {
    let foundMatch = false;
    if (i + 1 < romaji.length && romaji[i] === romaji[i+1] && "kstpc".includes(romaji[i])) {
        let isSpecialDouble = (romaji[i] === 's' && romaji[i+1] === 's' && i + 2 < romaji.length && romaji[i+2] === 'h');
        isSpecialDouble = isSpecialDouble || (romaji[i] === 'c' && romaji[i+1] === 'c' && i + 2 < romaji.length && romaji[i+2] === 'h');
        if (!isSpecialDouble) {
            hiragana += 'っ';
            i++;
        }
    }
    for (let len = 3; len >= 1; len--) {
      if (i + len <= romaji.length) {
        const sub = romaji.substring(i, i + len);
        if (map[sub]) {
          hiragana += map[sub];
          i += len;
          foundMatch = true;
          break;
        }
      }
    }
    if (foundMatch) continue;
    if (romaji[i] === 'n') {
      if (i + 1 === romaji.length || (!"aiueoyn'".includes(romaji[i + 1]))) {
        hiragana += 'ん';
      } else {
        hiragana += 'ん'; // Default to ん if not part of a valid sequence handled by the map
      }
    } else {
      hiragana += romaji[i];
    }
    i++;
  }
  return hiragana;
}

// --- オートコンプリート候補のフィルタリング ---
function filterSuggestions(query, dataArray, dataKey) {
  if (!query) {
    return [];
  }
  const queryLower = query.toLowerCase();
  const queryAsHiraganaFromRomaji = romajiToHiragana(queryLower);
  const finalQueryAsHiragana = toHiragana(queryAsHiraganaFromRomaji); // カタカナもひらがなに統一して比較

  const suggestions = [];
  for (const item of dataArray) {
    const recordValue = item[dataKey] || "";
    const recordValueAsHiragana = toHiragana(recordValue.toLowerCase()); // データもひらがなに統一

    if (recordValueAsHiragana.startsWith(finalQueryAsHiragana)) {
      suggestions.push(recordValue);
      if (suggestions.length >= 10) { // Limit to 10 suggestions
        break;
      }
    }
  }
  return suggestions;
}

// --- オートコンプリート候補の表示とハイライト更新 ---
function updateSuggestionHighlight(listItems, highlightedIndex) {
  listItems.forEach((item, index) => {
    item.classList.toggle('suggestion-highlight', index === highlightedIndex);
  });
}

function displaySuggestions(inputElement, suggestions, onSelectCallback, highlightedIndexState) {
  let suggestionsList = inputElement.parentNode.querySelector('.suggestions-list');
  if (suggestionsList) {
    suggestionsList.remove();
  }
  highlightedIndexState.index = -1; // Reset highlight index

  if (suggestions.length === 0 && inputElement.value.trim() !== "") {
    suggestionsList = document.createElement('ul');
    suggestionsList.className = 'suggestions-list no-results';
    const listItem = document.createElement('li');
    listItem.textContent = "見つかりませんでした";
    listItem.classList.add('no-results-message');
    suggestionsList.appendChild(listItem);
    inputElement.parentNode.insertBefore(suggestionsList, inputElement.nextSibling);
    return;
  }
  
  if (suggestions.length === 0) {
    return;
  }

  suggestionsList = document.createElement('ul');
  suggestionsList.className = 'suggestions-list';

  suggestions.forEach((suggestionText, index) => {
    const listItem = document.createElement('li');
    listItem.textContent = suggestionText;
    listItem.dataset.index = index; // For keyboard navigation
    listItem.addEventListener('click', () => {
      inputElement.value = suggestionText;
      if (onSelectCallback) {
        onSelectCallback(suggestionText);
      }
      const currentSuggestionsList = inputElement.parentNode.querySelector('.suggestions-list');
      if (currentSuggestionsList) {
        currentSuggestionsList.remove();
      }
      highlightedIndexState.index = -1;
    });
    suggestionsList.appendChild(listItem);
  });

  inputElement.parentNode.insertBefore(suggestionsList, inputElement.nextSibling);

  // Click outside to close suggestions
  if (inputElement.clickOutsideHandler) {
      document.removeEventListener('click', inputElement.clickOutsideHandler, true);
  }
  inputElement.clickOutsideHandler = (event) => {
    const currentSuggestionsList = inputElement.parentNode.querySelector('.suggestions-list');
    if (currentSuggestionsList && !inputElement.contains(event.target) && !currentSuggestionsList.contains(event.target)) {
      currentSuggestionsList.remove();
      highlightedIndexState.index = -1;
      document.removeEventListener('click', inputElement.clickOutsideHandler, true);
      inputElement.clickOutsideHandler = null;
    }
  };
  // Use `true` for capture phase to catch clicks on other elements sooner
  document.addEventListener('click', inputElement.clickOutsideHandler, true);
}


// --- Nature Control ---
function setupNatureControl(panelId, statKeyOrType, controlId, hiddenInputId, callback) {
    const control = document.getElementById(controlId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!control || !hiddenInput) {
        // console.warn(`Nature control elements not found for ${controlId} or ${hiddenInputId}`);
        return;
    }

    // Determine the actual stat key in panelStats (attack, defense, spAttack, spDefense)
    let targetStatKeyInPanelStats;
    if (statKeyOrType === 'main-offensive') {
        // For main-offensive, the actual target (attack or spAttack) depends on the move.
        // Initialize with 'attack' and update when move changes.
        // The event listener for move changes will handle updating the correct nature.
        const move = selectedMoves[panelId];
        targetStatKeyInPanelStats = (move && move.category === "特殊") ? 'spAttack' : 'attack';
    } else {
        targetStatKeyInPanelStats = statKeyOrType.replace('sp-attack', 'spAttack').replace('sp-defense', 'spDefense');
    }
    
    if (!panelStats[panelId] || !panelStats[panelId].stats[targetStatKeyInPanelStats]) {
        // console.warn(`panelStats for ${panelId}.${targetStatKeyInPanelStats} not found during nature control setup.`);
        // Fallback to attack if main-offensive and targetStatKeyInPanelStats is not set (e.g. no move selected yet)
        if (statKeyOrType === 'main-offensive') targetStatKeyInPanelStats = 'attack';
        else return;
    }

    let initialNature = panelStats[panelId].stats[targetStatKeyInPanelStats].nature;
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

            let actualTargetKeyForUpdate;
            if (statKeyOrType === 'main-offensive') {
                const move = selectedMoves[panelId];
                actualTargetKeyForUpdate = (move && move.category === "特殊") ? 'spAttack' : 'attack';
            } else {
                actualTargetKeyForUpdate = targetStatKeyInPanelStats;
            }
            panelStats[panelId].stats[actualTargetKeyForUpdate].nature = newNature;
            
            if (callback) callback();
        });
    });
}

// --- Rank Dropdown Setup ---
export function setupRankDropdowns() {
    panelIds.forEach(panelId => {
        ['main-offensive', 'defense', 'sp-defense'].forEach(statType => {
            const dropdownBtn = document.getElementById(`${panelId}-${statType}-dropdownBtn`);
            const dropdownMenu = document.getElementById(`${panelId}-${statType}-dropdownMenu`);
            const rankDisplaySpan = document.getElementById(`${panelId}-${statType}-rank-display`); // For dropdown button text
            const rankValSpan = document.getElementById(`${panelId}-${statType}-rank-val`); // Hidden span holding the value

            if (!dropdownBtn || !dropdownMenu || !rankDisplaySpan || !rankValSpan) {
                // console.warn(`Rank dropdown elements not found for ${panelId}-${statType}`);
                return;
            }

            // Populate dropdown menu
            dropdownMenu.innerHTML = ''; // Clear existing items
            for (let i = 6; i >= -6; i--) {
                const listItem = document.createElement('li');
                listItem.textContent = i === 0 ? '±0' : (i > 0 ? `+${i}` : `${i}`);
                listItem.dataset.value = i;
                listItem.addEventListener('click', (e) => {
                    const selectedRank = parseInt(e.target.dataset.value);
                    window.changeRank(`${panelId}-${statType}`, selectedRank - parseInt(rankValSpan.textContent)); // Pass the difference
                    dropdownMenu.classList.remove('show');
                    dropdownBtn.classList.remove('active');
                });
                dropdownMenu.appendChild(listItem);
            }

            // Toggle dropdown display
            dropdownBtn.addEventListener('click', () => {
                dropdownMenu.classList.toggle('show');
                dropdownBtn.classList.toggle('active');
            });

            // Click outside to close dropdown
            if (!dropdownBtn.clickOutsideHandler) {
                dropdownBtn.clickOutsideHandler = (event) => {
                    if (!dropdownBtn.contains(event.target) && !dropdownMenu.contains(event.target) && dropdownMenu.classList.contains('show')) {
                        dropdownMenu.classList.remove('show');
                        dropdownBtn.classList.remove('active');
                    }
                };
                document.addEventListener('click', dropdownBtn.clickOutsideHandler, true);
            }
        });
    });
}

// --- Field Control Listeners ---
export function setupFieldControlListeners() {
    // Weather
    const weatherControl = document.getElementById('center-weatherControl');
    if (weatherControl) {
        weatherControl.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                weatherControl.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                fieldState.weather = button.dataset.value;
                console.log('Weather updated:', fieldState.weather);
                // Potentially trigger recalculations if weather affects stats/damage
            });
        });
    }

    // Terrain
    const fieldControl = document.getElementById('center-fieldControl');
    if (fieldControl) {
        fieldControl.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                fieldControl.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                fieldState.terrain = button.dataset.value;
                console.log('Terrain updated:', fieldState.terrain);
                // Potentially trigger recalculations
            });
        });
    }

    // Walls
    ['red', 'blue'].forEach(teamColor => {
        const reflectCheckbox = document.getElementById(`${teamColor}-reflect-active`);
        const lightScreenCheckbox = document.getElementById(`${teamColor}-lightscreen-active`);

        if (reflectCheckbox) {
            reflectCheckbox.addEventListener('change', () => {
                if (teamColor === 'red') fieldState.teamRed.isReflectActive = reflectCheckbox.checked;
                if (teamColor === 'blue') fieldState.teamBlue.isReflectActive = reflectCheckbox.checked;
                console.log(`${teamColor} Reflect: ${reflectCheckbox.checked}`);
            });
        }
        if (lightScreenCheckbox) {
            lightScreenCheckbox.addEventListener('change', () => {
                if (teamColor === 'red') fieldState.teamRed.isLightScreenActive = lightScreenCheckbox.checked;
                if (teamColor === 'blue') fieldState.teamBlue.isLightScreenActive = lightScreenCheckbox.checked;
                console.log(`${teamColor} Light Screen: ${lightScreenCheckbox.checked}`);
            });
        }
    });
}


// --- Main Event Listener Setup ---
export function setupEventListeners() {
    panelIds.forEach(panelId => {
        // Autocomplete for Pokemon Name
        const pokemonNameInput = document.getElementById(`${panelId}-pokemon-name`);
        if (pokemonNameInput) {
            let highlightedIndexStatePokemons = { index: -1 };
            pokemonNameInput.addEventListener('input', () => {
                const query = pokemonNameInput.value;
                highlightedIndexStatePokemons.index = -1;
                const suggestions = filterSuggestions(query, pokemonData, 'name');
                displaySuggestions(pokemonNameInput, suggestions, (selectedName) => {
                    selectedPokemons[panelId] = pokemonData.find(p => p.name === selectedName);
                    panelStats[panelId].pokemonName = selectedName;
                    if(selectedPokemons[panelId]) { // Ensure a Pokemon is actually found
                        panelStats[panelId].ability.name = selectedPokemons[panelId].Ability1 || ''; // Default to first ability
                        panelStats[panelId].ability.selectedButton = selectedPokemons[panelId].Ability1 || null;
                        panelStats[panelId].ability.custom = '';
                        panelStats[panelId].ability.nullified = false;
                    } else {
                        panelStats[panelId].ability.name = '';
                        panelStats[panelId].ability.selectedButton = null;
                    }
                    showAbilities(panelId, selectedPokemons[panelId]);
                    updatePanelStats(panelId);
                }, highlightedIndexStatePokemons);
            });
            pokemonNameInput.addEventListener('keydown', (event) => {
                handleAutocompleteKeydown(event, pokemonNameInput, highlightedIndexStatePokemons);
            });
        }

        // Autocomplete for Move Name
        const moveInput = document.getElementById(`${panelId}-move`);
        if (moveInput) {
            let highlightedIndexStateMoves = { index: -1 };
            moveInput.addEventListener('input', () => {
                const query = moveInput.value;
                highlightedIndexStateMoves.index = -1;
                const suggestions = filterSuggestions(query, moveData, 'name');
                displaySuggestions(moveInput, suggestions, (selectedName) => {
                    selectedMoves[panelId] = moveData.find(m => m.name === selectedName);
                    panelStats[panelId].moveName = selectedName;
                    updateMoveDetails(panelId);
                    updatePanelStats(panelId); // This will also update main-offensive stat section
                    dispatchMoveCategoryUpdate(panelId);
                }, highlightedIndexStateMoves);
            });
            moveInput.addEventListener('keydown', (event) => {
                handleAutocompleteKeydown(event, moveInput, highlightedIndexStateMoves);
            });
        }

        // IV and EV inputs
        ['hp', 'main-offensive', 'defense', 'sp-defense'].forEach(statPart => {
            const ivEl = document.getElementById(`${panelId}-${statPart}-iv`);
            const evEl = document.getElementById(`${panelId}-${statPart}-ev`);
            let targetStatKey;

            if (statPart === 'main-offensive') {
                // This will be dynamically determined for 'main-offensive'
            } else {
                 targetStatKey = statPart.replace('sp-defense', 'spDefense');
            }


            if (ivEl) {
                ivEl.addEventListener('input', () => {
                    let currentTargetStatKey = targetStatKey;
                    if (statPart === 'main-offensive') {
                        const move = selectedMoves[panelId];
                        currentTargetStatKey = (move && move.category === "特殊") ? 'spAttack' : 'attack';
                    }
                    if (currentTargetStatKey && panelStats[panelId].stats[currentTargetStatKey]) {
                        panelStats[panelId].stats[currentTargetStatKey].iv = parseInt(ivEl.value) || 0;
                        updatePanelStats(panelId);
                    } else if (statPart === 'hp' && panelStats[panelId].stats.hp) { // HP specific handling
                         panelStats[panelId].stats.hp.iv = parseInt(ivEl.value) || 0;
                         updatePanelStats(panelId);
                    }
                });
            }
            if (evEl) {
                evEl.addEventListener('input', () => {
                     let currentTargetStatKey = targetStatKey;
                    if (statPart === 'main-offensive') {
                        const move = selectedMoves[panelId];
                        currentTargetStatKey = (move && move.category === "特殊") ? 'spAttack' : 'attack';
                    }
                    if (currentTargetStatKey && panelStats[panelId].stats[currentTargetStatKey]) {
                        panelStats[panelId].stats[currentTargetStatKey].ev = parseInt(evEl.value) || 0;
                        updatePanelStats(panelId);
                    } else if (statPart === 'hp' && panelStats[panelId].stats.hp) { // HP specific handling
                         panelStats[panelId].stats.hp.ev = parseInt(evEl.value) || 0;
                         updatePanelStats(panelId);
                    
                    }
                });
            }
        });
        
        // Nature Controls
        setupNatureControl(panelId, 'main-offensive', `${panelId}-main-offensive-nature-control`, `${panelId}-main-offensive-nature`, () => updatePanelStats(panelId));
        setupNatureControl(panelId, 'defense', `${panelId}-defense-nature-control`, `${panelId}-defense-nature`, () => updatePanelStats(panelId));
        setupNatureControl(panelId, 'spDefense', `${panelId}-sp-defense-nature-control`, `${panelId}-sp-defense-nature`, () => updatePanelStats(panelId));
        // Note: HP does not have nature. Attack and Sp. Attack natures are covered by main-offensive if it's the primary interface,
        // or would need separate controls if individual A/C stat blocks were present and used.

        // Ability Nullified Checkbox
        const abilityNullifiedCheckbox = document.getElementById(`${panelId}-ability-nullified`);
        if (abilityNullifiedCheckbox) {
            abilityNullifiedCheckbox.addEventListener('change', () => {
                panelStats[panelId].ability.nullified = abilityNullifiedCheckbox.checked;
                if (abilityNullifiedCheckbox.checked) {
                    panelStats[panelId].ability.name = ""; // Clear ability name if nullified
                    panelStats[panelId].ability.custom = "";
                    panelStats[panelId].ability.selectedButton = null;
                    // Deselect buttons and clear custom input visually
                    const choiceContainer = document.getElementById(`${panelId}-ability-choice`);
                    if (choiceContainer) {
                        choiceContainer.querySelectorAll(".ability-btn.selected").forEach(b => b.classList.remove("selected"));
                        const customInput = choiceContainer.querySelector(".custom-ability-input");
                        if (customInput) customInput.value = "";
                    }
                } else {
                    // If unchecking nullified, try to restore the selected ability if one was chosen before
                    if (panelStats[panelId].ability.selectedButton) {
                         panelStats[panelId].ability.name = panelStats[panelId].ability.selectedButton;
                    } else if (panelStats[panelId].ability.custom){
                        panelStats[panelId].ability.name = panelStats[panelId].ability.custom;
                    }
                    // Re-render abilities to reflect the change (buttons might need to be re-selected)
                    if(selectedPokemons[panelId]) showAbilities(panelId, selectedPokemons[panelId]);
                }
                // console.log(`${panelId} Ability Nullified: ${panelStats[panelId].ability.nullified}, Name: ${panelStats[panelId].ability.name}`);
                // updatePanelStats(panelId); // Recalculate if ability change affects stats (e.g. Guts) - usually not for raw stats
            });
        }

        // Type Change Select
        const typeChangeEl = document.getElementById(`${panelId}-type-change`);
        if (typeChangeEl) {
            typeChangeEl.addEventListener('change', () => {
                panelStats[panelId].typeChange = typeChangeEl.value;
                updatePanelStats(panelId); // Update type display
            });
        }

        // Move Times Input
        const moveTimesEl = document.getElementById(`${panelId}-move-times`);
        if (moveTimesEl) {
            moveTimesEl.addEventListener('input', () => {
                panelStats[panelId].moveTimes = parseInt(moveTimesEl.value) || 1;
                // This might affect damage calculation (e.g. metronome)
            });
        }
        
        // Double Damage Checkbox
        const doubleDamageCheckbox = document.getElementById(`${panelId}-double-damage-checkbox`);
        if (doubleDamageCheckbox) {
            doubleDamageCheckbox.addEventListener('change', () => {
                panelStats[panelId].doubleDamage = doubleDamageCheckbox.checked;
                // This affects damage calculation for spread moves
            });
        }

        // Other panel-specific inputs like item, status condition, critical hit
        const itemInput = document.getElementById(`${panelId}-item`);
        if (itemInput) {
            itemInput.addEventListener('input', () => {
                panelStats[panelId].item = itemInput.value;
                // console.log(`${panelId} Item: ${panelStats[panelId].item}`);
                // updatePanelStats(panelId); // if item affects visible stats
            });
        }

        // Example for a critical hit checkbox (assuming it exists with ID `${panelId}-critical-hit-checkbox`)
        const critCheckbox = document.getElementById(`${panelId}-critical-hit-checkbox`);
        if (critCheckbox) {
            critCheckbox.addEventListener('change', () => {
                panelStats[panelId].isCriticalHit = critCheckbox.checked;
            });
        }


    });
}

function handleAutocompleteKeydown(event, inputElement, highlightedIndexState) {
    const suggestionsListElement = inputElement.parentNode.querySelector('.suggestions-list');
    if (!suggestionsListElement || suggestionsListElement.classList.contains('no-results')) {
        if (event.key === 'Enter') {
            if (suggestionsListElement) suggestionsListElement.remove();
            highlightedIndexState.index = -1;
        }
        return;
    }

    const listItems = suggestionsListElement.querySelectorAll('li');
    if (listItems.length === 0) return;

    let newHighlightedIndex = highlightedIndexState.index;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            newHighlightedIndex = (newHighlightedIndex + 1) % listItems.length;
            break;
        case 'ArrowUp':
            event.preventDefault();
            newHighlightedIndex = (newHighlightedIndex - 1 + listItems.length) % listItems.length;
            break;
        case 'Enter':
            event.preventDefault();
            if (highlightedIndexState.index >= 0 && highlightedIndexState.index < listItems.length) {
                listItems[highlightedIndexState.index].click(); // Simulate click on highlighted item
            } else if (listItems.length > 0 && inputElement.value.trim() !== "") {
                // Optional: if no highlight but text matches a suggestion, select first one
                // Or simply do nothing, current behavior is to select only if highlighted.
            }
            highlightedIndexState.index = -1;
            // displaySuggestions should have removed the list on click
            return; 
        case 'Escape':
            event.preventDefault();
            if (suggestionsListElement) {
                suggestionsListElement.remove();
            }
            highlightedIndexState.index = -1;
            return; 
        default:
            return; // Don't update highlight for other keys
    }
    highlightedIndexState.index = newHighlightedIndex;
    updateSuggestionHighlight(listItems, highlightedIndexState.index);
}


// Note: window.changeRank is exposed in main.js
// If it were to be fully modularized here, main.js would need to import it and expose it,
// or the HTML would need to change to use event listeners set up here.