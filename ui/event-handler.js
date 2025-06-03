// ui/event-handler.js
import { panelIds, selectedPokemons, selectedMoves, panelStats } from './main.js';
import { pokemonData, moveData } from './data-loader.js';
import { updatePanelStats, showAbilities, updateMoveDetails, changeRank as updateRank } from './ui-updater.js';

// --- 文字変換ユーティリティ ---
function toHiragana(str) { //
  return str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

// --- オートコンプリート候補のフィルタリング ---
function filterSuggestions(query, dataArray, key) {
  if (!query) {
    return [];
  }
  const normalizedQueryHiragana = toHiragana(query.toLowerCase());
  const normalizedQueryKatakana = toKatakana(query.toLowerCase());
  
  const suggestions = [];
  for (const item of dataArray) {
    const recordValue = item[key] || "";
    const normalizedRecordHiragana = toHiragana(recordValue.toLowerCase());
    const normalizedRecordKatakana = toKatakana(recordValue.toLowerCase());

    if (normalizedRecordHiragana.startsWith(normalizedQueryHiragana) || 
        normalizedRecordKatakana.startsWith(normalizedQueryKatakana) ||
        normalizedRecordHiragana.startsWith(normalizedQueryKatakana) || // カタカナ入力 -> ひらがなデータ検索
        normalizedRecordKatakana.startsWith(normalizedQueryHiragana)    // ひらがな入力 -> カタカナデータ検索
       ) {
      suggestions.push(recordValue);
      if (suggestions.length >= 10) { // 最大候補数を10件に制限
        break;
      }
    }
  }
  return suggestions;
}

// --- オートコンプリート候補の表示 ---
function displaySuggestions(inputElement, suggestions, onSelectCallback) {
  // 既存の候補リストを削除
  let suggestionsList = inputElement.parentNode.querySelector('.suggestions-list');
  if (suggestionsList) {
    suggestionsList.remove();
  }

  if (suggestions.length === 0) {
    return;
  }

  suggestionsList = document.createElement('ul');
  suggestionsList.className = 'suggestions-list'; // CSSでスタイリングするため

  suggestions.forEach(suggestionText => {
    const listItem = document.createElement('li');
    listItem.textContent = suggestionText;
    listItem.addEventListener('click', () => {
      inputElement.value = suggestionText;
      if (onSelectCallback) {
        onSelectCallback(suggestionText);
      }
      suggestionsList.remove(); // 選択後にリストを削除
    });
    suggestionsList.appendChild(listItem);
  });

  // inputElementの直後に候補リストを挿入（または適切な親要素に）
  inputElement.parentNode.insertBefore(suggestionsList, inputElement.nextSibling);

  // 他の場所をクリックしたらリストを削除するイベントリスナー (一度だけ設定)
  const clickOutsideHandler = (event) => {
    if (!inputElement.contains(event.target) && !suggestionsList.contains(event.target)) {
      suggestionsList.remove();
      document.removeEventListener('click', clickOutsideHandler, true);
    }
  };
  // capture: true を使うことで、リストアイテムのクリックより先に発火し、
  // リストアイテムのクリックが正常に処理される前にリストが消えるのを防ぐ
  document.addEventListener('click', clickOutsideHandler, true); 
}

function setupNatureControl(panelId, statKeyOrType, controlId, hiddenInputId, callback) {
    // (既存の setupNatureControl 関数の内容は変更なし)
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
  // (既存の setupSegmentedControl 関数の内容は変更なし)
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
        const pokemonNameInput = document.getElementById(`${panelId}-pokemon-name`);
        if (pokemonNameInput) {
            pokemonNameInput.addEventListener('input', () => {
                const query = pokemonNameInput.value;
                const suggestions = filterSuggestions(query, pokemonData, 'name');
                displaySuggestions(pokemonNameInput, suggestions, (selectedName) => {
                    selectedPokemons[panelId] = pokemonData.find(p => p.name === selectedName);
                    panelStats[panelId].pokemonName = selectedName;
                    showAbilities(panelId, selectedPokemons[panelId]);
                    updatePanelStats(panelId);
                });
            });
        }

        const moveInput = document.getElementById(`${panelId}-move`);
        if (moveInput) {
            moveInput.addEventListener('input', () => {
                const query = moveInput.value;
                const suggestions = filterSuggestions(query, moveData, 'name');
                displaySuggestions(moveInput, suggestions, (selectedName) => {
                    selectedMoves[panelId] = moveData.find(m => m.name === selectedName);
                    panelStats[panelId].moveName = selectedName;
                    updateMoveDetails(panelId);
                    updatePanelStats(panelId);
                });
            });
        }

        // (既存のIV, EV, Nature, Ability, TypeChange, MoveTimes, DoubleDamageなどのイベントリスナー設定は変更なし)
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
    });

    setupSegmentedControl('center-weatherControl', selectedValue => console.log('Selected Weather:', selectedValue));
    setupSegmentedControl('center-fieldControl', selectedValue => console.log('Selected Field:', selectedValue));
}

// Expose changeRank to global scope for inline HTML onclick attributes.
window.changeRank = updateRank;