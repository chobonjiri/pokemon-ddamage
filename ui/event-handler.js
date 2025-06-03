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

// ローマ字からひらがなへの変換関数 (ユーザー提供のマップを含む)
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
    // ユーザー提供の追加マップ
    'tya': 'ちゃ', 'tyi': 'ちぃ', 'tyu': 'ちゅ', 'tye': 'ちぇ', 'tyo': 'ちょ',
    'zya': 'じゃ', 'zyi': 'じぃ', 'zyu': 'じゅ', 'zye': 'じぇ', 'zyo': 'じょ',
    'fa': 'ふぁ', /* 'fu': 'ふ' は重複 */ 'fo': 'ふぉ',
    'la': 'ぁ', 'li': 'ぃ', 'lu': 'ぅ', 'le': 'ぇ', 'lo': 'ぉ', // これらは小文字の「あいうえお」
    '-': 'ー',
    // 'n': 'ん' は末尾または子音の前で処理
  };

  let hiragana = '';
  let i = 0;
  while (i < romaji.length) {
    let foundMatch = false;
    // 促音: 連続する同じ子音 (k,s,t,p,c,h - c,hはcha,shiなどのため注意)
    if (i + 1 < romaji.length && romaji[i] === romaji[i+1] && "kstpc".includes(romaji[i])) {
        // ssh (っし), cch (っち) は map での tiga-graph でカバーされるべきだが、
        // マップに ssh, cch がない場合は、ここで 'っ' を追加し、次の文字は通常通り処理。
        let isSpecialDouble = (romaji[i] === 's' && romaji[i+1] === 's' && i + 2 < romaji.length && romaji[i+2] === 'h'); // ssh
        isSpecialDouble = isSpecialDouble || (romaji[i] === 'c' && romaji[i+1] === 'c' && i + 2 < romaji.length && romaji[i+2] === 'h'); // cch

        if (!isSpecialDouble) {
            hiragana += 'っ';
            i++; // 1文字進める
            // foundMatch は false のままにして、次の文字 (例: "ka") を map から探させる
        }
    }

    // 最長の候補から順に試す (3文字、2文字、1文字)
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

    // 'n' の処理: 次が母音・'y'・'n' でなく、文末の場合に「ん」
    if (romaji[i] === 'n') {
      if (i + 1 === romaji.length || (!"aiueoyn'".includes(romaji[i + 1]))) {
        hiragana += 'ん';
      } else {
        // 'n' が母音の前に来るが na, ni などで処理されなかった場合 (例: 単独のn)
        // 基本的にはありえないが、フォールバックとして 'n' をそのまま残すか、エラーとするか。
        // ここでは、他の変換にかからなかった 'n' は 'ん' とする。
        hiragana += 'ん';
      }
    } else {
      hiragana += romaji[i]; // マップにない文字はそのまま出力
    }
    i++;
  }
  return hiragana;
}


// --- オートコンプリート候補のフィルタリング ---
function filterSuggestions(query, dataArray, key) {
  if (!query) {
    return [];
  }
  const queryLower = query.toLowerCase();
  const queryAsHiraganaFromRomaji = romajiToHiragana(queryLower);
  const finalQueryAsHiragana = toHiragana(queryAsHiraganaFromRomaji);

  const suggestions = [];
  for (const item of dataArray) {
    const recordValue = item[key] || "";
    const recordValueAsHiragana = toHiragana(recordValue.toLowerCase());

    if (recordValueAsHiragana.startsWith(finalQueryAsHiragana)) {
      suggestions.push(recordValue);
      if (suggestions.length >= 10) {
        break;
      }
    }
  }
  return suggestions;
}

// --- オートコンプリート候補の表示とハイライト更新 ---
function updateSuggestionHighlight(listItems, highlightedIndex) {
  listItems.forEach((item, index) => {
    if (index === highlightedIndex) {
      item.classList.add('suggestion-highlight');
    } else {
      item.classList.remove('suggestion-highlight');
    }
  });
}

function displaySuggestions(inputElement, suggestions, onSelectCallback, highlightedIndexState) {
  let suggestionsList = inputElement.parentNode.querySelector('.suggestions-list');
  if (suggestionsList) {
    suggestionsList.remove();
  }
  highlightedIndexState.index = -1;

  if (suggestions.length === 0 && inputElement.value.trim() !== "") {
    suggestionsList = document.createElement('ul');
    suggestionsList.className = 'suggestions-list no-results';
    const listItem = document.createElement('li');
    listItem.textContent = "見つかりませんでした";
    listItem.classList.add('no-results-message'); // CSSでカーソルなどを調整するため
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
    listItem.dataset.index = index;
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
  // updateSuggestionHighlight(suggestionsList.querySelectorAll('li'), highlightedIndexState.index); // 初期ハイライトなし

  // 他の場所をクリックしたらリストを削除 (既存のものを改善)
  if (inputElement.clickOutsideHandler) {
      document.removeEventListener('click', inputElement.clickOutsideHandler, true);
  }
  inputElement.clickOutsideHandler = (event) => {
    const currentSuggestionsList = inputElement.parentNode.querySelector('.suggestions-list');
    if (currentSuggestionsList && !inputElement.contains(event.target) && !currentSuggestionsList.contains(event.target)) {
      currentSuggestionsList.remove();
      highlightedIndexState.index = -1;
      document.removeEventListener('click', inputElement.clickOutsideHandler, true); // 自身を削除
      inputElement.clickOutsideHandler = null; // ハンドラ参照をクリア
    }
  };
  document.addEventListener('click', inputElement.clickOutsideHandler, true);
}

// --- Nature Control, Segmented Control (変更なし) ---
function setupNatureControl(panelId, statKeyOrType, controlId, hiddenInputId, callback) {
    const control = document.getElementById(controlId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!control || !hiddenInput) return;
    let targetStatKeyInPanelStats;
    if (statKeyOrType === 'main-offensive') {
        targetStatKeyInPanelStats = 'attack'; 
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

// --- メインのイベントリスナー設定 ---
export function setupEventListeners() {
    panelIds.forEach(panelId => {
        const setupAutocompleteForInput = (inputId, data, dataKey, onSelect) => {
            const inputElement = document.getElementById(inputId);
            if (!inputElement) return;

            let highlightedIndexState = { index: -1 };

            inputElement.addEventListener('input', () => {
                const query = inputElement.value;
                highlightedIndexState.index = -1; // 入力変更時はハイライトリセット
                const suggestions = filterSuggestions(query, data, dataKey);
                displaySuggestions(inputElement, suggestions, onSelect, highlightedIndexState);
            });

            inputElement.addEventListener('keydown', (event) => {
                const suggestionsListElement = inputElement.parentNode.querySelector('.suggestions-list');
                if (!suggestionsListElement || suggestionsListElement.classList.contains('no-results')) {
                     // 候補がない、または「見つかりませんでした」メッセージの場合はキー操作を無視
                    if (event.key === 'Enter') { // Enterキーは通常の動作を許可 (例: フォーム送信など)
                        // displaySuggestionsでリストが消えているはずなので、ここでは何もしないか、明示的に消す
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
                        newHighlightedIndex = (highlightedIndexState.index + 1) % listItems.length;
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        newHighlightedIndex = (highlightedIndexState.index - 1 + listItems.length) % listItems.length;
                        break;
                    case 'Enter':
                        event.preventDefault();
                        if (highlightedIndexState.index >= 0 && highlightedIndexState.index < listItems.length) {
                            listItems[highlightedIndexState.index].click();
                        } else if (listItems.length > 0 && inputElement.value.trim() !== "" && suggestions.length > 0) {
                            // ハイライトがないが、入力があり候補が1つ以上ある場合、最初の候補を選択するなどの挙動も考えられる
                            // 今回はハイライトされているもののみEnterで選択
                        }
                        // Enter後はリストが消えるのでハイライトもリセット
                        highlightedIndexState.index = -1; 
                        return; // updateSuggestionHighlight を呼ばない
                    case 'Escape':
                        event.preventDefault();
                        if (suggestionsListElement) {
                            suggestionsListElement.remove();
                        }
                        highlightedIndexState.index = -1;
                        return; // updateSuggestionHighlight を呼ばない
                    default:
                        return; // 他のキーはハイライト処理に影響しない
                }
                highlightedIndexState.index = newHighlightedIndex;
                updateSuggestionHighlight(listItems, highlightedIndexState.index);
            });
        };

        setupAutocompleteForInput(`${panelId}-pokemon-name`, pokemonData, 'name', (selectedName) => {
            selectedPokemons[panelId] = pokemonData.find(p => p.name === selectedName);
            panelStats[panelId].pokemonName = selectedName;
            showAbilities(panelId, selectedPokemons[panelId]);
            updatePanelStats(panelId);
        });

        setupAutocompleteForInput(`${panelId}-move`, moveData, 'name', (selectedName) => {
            selectedMoves[panelId] = moveData.find(m => m.name === selectedName);
            panelStats[panelId].moveName = selectedName;
            updateMoveDetails(panelId);
            updatePanelStats(panelId);
        });

        // (その他のイベントリスナー設定)
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

window.changeRank = updateRank;