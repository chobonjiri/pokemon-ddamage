// ui/script.js

let pokemonData = [];
let moveData = [];

const panelIds = ['red1', 'red2', 'blue1', 'blue2'];
let selectedPokemons = {}; // { red1: pokemonObject, red2: ..., ... }
let selectedMoves = {};    // { red1: moveObject, red2: ..., ... }
let panelStats = {};       // { panelId: { pokemonName: '', moveName: '', ability: {...}, stats: { hp: {}, attack: {}, ... } } }

panelIds.forEach(id => {
    selectedPokemons[id] = null;
    selectedMoves[id] = null;
    panelStats[id] = {
        pokemonName: '',
        moveName: '',
        ability: { name: '', custom: '', nullified: false, selectedButton: null },
        typeChange: '',
        moveTimes: 1,
        doubleDamage: false,
        stats: { // 'sp-attack' や 'sp-defense' ではなくキャメルケースで統一
            hp: { iv: 31, ev: 0, actual: 0 },
            attack: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 },
            defense: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 },
            spAttack: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 }, // spAttack
            spDefense: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 } // spDefense
        },
        currentHP: 0, 
        maxHP: 0
    };
});

// --- データのフェッチ共通関数 ---
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTPエラー！ステータス: ${response.status} URL: ${url}`);
      throw new Error(`HTTP error! status: ${response.status} from ${url}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching JSON from ${url}:`, error);
    return [];
  }
}

// --- 実数値計算系 ---
function calcHPStat(base, iv, ev, level = 50) {
  if (isNaN(base) || isNaN(iv) || isNaN(ev)) return 0;
  return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

function calcActualStat(baseStat, iv, ev, nature, rank, level = 50, statName = "") {
  if (statName === "HP") {
      return calcHPStat(baseStat, iv, ev, level);
  }
  if (isNaN(baseStat) || isNaN(iv) || isNaN(ev) || isNaN(nature) || isNaN(rank)) return 0;
  
  let val = Math.floor(((baseStat * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  val = Math.floor(val * nature);
  const rankMultiplier = rank >= 0 ? (2 + rank) / 2 : 2 / (2 - rank);
  return Math.floor(val * rankMultiplier);
}

// --- UI更新系 ---
function updatePanelStats(panelId) {
    const pokemon = selectedPokemons[panelId];
    const currentPanelInternalStats = panelStats[panelId].stats; // JS内部のステータスオブジェクト
    const move = selectedMoves[panelId];

    if (!pokemon) {
        // ポケモン未選択時のリセット処理
        document.getElementById(`${panelId}-pokemon-type`).textContent = 'Type';
        ['hp', 'attack', 'defense', 'sp-attack', 'sp-defense', 'main-offensive'].forEach(statPart => {
            const actualEl = document.getElementById(`${panelId}-${statPart}-actual`);
            if (actualEl) actualEl.textContent = '-';
            if (statPart === 'main-offensive') {
                 const labelEl = document.getElementById(`${panelId}-main-offensive-label`);
                 if(labelEl) labelEl.textContent = 'A or C';
            }
        });
        updatePokemonHPBar(panelId, 0, 1);
        const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
        if (hpTableNameEl) hpTableNameEl.textContent = '-';
        const iconEl = document.getElementById(`${panelId}-icon`);
        if (iconEl) iconEl.style.backgroundImage = ''; // アイコンリセット
        return;
    }

    // タイプ表示
    document.getElementById(`${panelId}-pokemon-type`).textContent = pokemon.Type2 ? `${pokemon.Type1}/${pokemon.Type2}` : pokemon.Type1;
    
    // ポケモンアイコン (仮。実際は画像URLなどをpokemonDataから取得)
    const iconEl = document.getElementById(`${panelId}-icon`);
    if (iconEl) {
        // iconEl.style.backgroundImage = `url('path_to_pokemon_icon/${pokemon.id}.png')`; // 例
        iconEl.style.backgroundColor = '#888'; // ポケモン選択時は色を変えるなど
    }


    // HP計算と表示
    currentPanelInternalStats.hp.actual = calcHPStat(parseInt(pokemon.H), currentPanelInternalStats.hp.iv, currentPanelInternalStats.hp.ev);
    document.getElementById(`${panelId}-hp-actual`).textContent = currentPanelInternalStats.hp.actual;
    panelStats[panelId].maxHP = currentPanelInternalStats.hp.actual;
    panelStats[panelId].currentHP = currentPanelInternalStats.hp.actual; // 初期HPは最大値
    updatePokemonHPBar(panelId, panelStats[panelId].currentHP, panelStats[panelId].maxHP);
    const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
    if (hpTableNameEl) hpTableNameEl.textContent = pokemon.name;

    // A, B, C, D の計算と表示
    const statKeyMapping = { attack: 'A', defense: 'B', spAttack: 'C', spDefense: 'D' };
    for (const [jsKey, dataKey] of Object.entries(statKeyMapping)) { // jsKey: attack, spAttack 등, dataKey: A, C 등
        const htmlStatPart = jsKey.replace('spAttack', 'sp-attack').replace('spDefense', 'sp-defense'); // sp-attack
        currentPanelInternalStats[jsKey].actual = calcActualStat(
            parseInt(pokemon[dataKey]),
            currentPanelInternalStats[jsKey].iv,
            currentPanelInternalStats[jsKey].ev,
            currentPanelInternalStats[jsKey].nature,
            currentPanelInternalStats[jsKey].rank
        );
        document.getElementById(`${panelId}-${htmlStatPart}-actual`).textContent = currentPanelInternalStats[jsKey].actual;
    }
    
    // 「A or C」(main-offensive) ブロックの表示更新
    const mainOffensiveLabelEl = document.getElementById(`${panelId}-main-offensive-label`);
    const mainOffensiveActualEl = document.getElementById(`${panelId}-main-offensive-actual`);
    // main-offensiveブロックのIV, EV, Nature, Rankの各入力要素も技に応じて値を設定し直す
    const mainOffensiveIvEl = document.getElementById(`${panelId}-main-offensive-iv`);
    const mainOffensiveEvEl = document.getElementById(`${panelId}-main-offensive-ev`);
    const mainOffensiveNatureHiddenEl = document.getElementById(`${panelId}-main-offensive-nature`);
    const mainOffensiveNatureControlEl = document.getElementById(`${panelId}-main-offensive-nature-control`);
    const mainOffensiveRankValEl = document.getElementById(`${panelId}-main-offensive-rank-val`);

    if (move) {
        let sourceStatKey = '';
        if (move.category === "物理") {
            mainOffensiveLabelEl.textContent = "A";
            mainOffensiveActualEl.textContent = currentPanelInternalStats.attack.actual;
            sourceStatKey = 'attack';
        } else if (move.category === "特殊") {
            mainOffensiveLabelEl.textContent = "C";
            mainOffensiveActualEl.textContent = currentPanelInternalStats.spAttack.actual;
            sourceStatKey = 'spAttack';
        } else { // 不明または変化技
            mainOffensiveLabelEl.textContent = "A or C";
            mainOffensiveActualEl.textContent = "-";
        }

        if (sourceStatKey && currentPanelInternalStats[sourceStatKey]) {
            mainOffensiveIvEl.value = currentPanelInternalStats[sourceStatKey].iv;
            mainOffensiveEvEl.value = currentPanelInternalStats[sourceStatKey].ev;
            mainOffensiveNatureHiddenEl.value = currentPanelInternalStats[sourceStatKey].nature;
            mainOffensiveNatureControlEl.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.value) === currentPanelInternalStats[sourceStatKey].nature);
            });
            mainOffensiveRankValEl.textContent = currentPanelInternalStats[sourceStatKey].rank;
        }
    } else {
        mainOffensiveLabelEl.textContent = "A or C";
        mainOffensiveActualEl.textContent = "-";
        // 技未選択時、main-offensive の入力欄は attack の値を表示しておく (例)
        mainOffensiveIvEl.value = currentPanelInternalStats.attack.iv;
        mainOffensiveEvEl.value = currentPanelInternalStats.attack.ev;
        mainOffensiveNatureHiddenEl.value = currentPanelInternalStats.attack.nature;
        mainOffensiveNatureControlEl.querySelectorAll('button').forEach(btn => {
             btn.classList.toggle('active', parseFloat(btn.dataset.value) === currentPanelInternalStats.attack.nature);
        });
        mainOffensiveRankValEl.textContent = currentPanelInternalStats.attack.rank;
    }
}

function updateAllPanelStats() {
    panelIds.forEach(id => updatePanelStats(id));
}

function updatePokemonHPBar(panelId, currentHP, maxHP) {
    const hpBarEl = document.getElementById(`${panelId}-hp-bar`);
    if (hpBarEl && maxHP > 0) {
        const percentage = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
        hpBarEl.style.width = `${percentage}%`;
        hpBarEl.textContent = `${Math.round(percentage)}%`;
        if (percentage <= 20) hpBarEl.style.backgroundColor = 'red';
        else if (percentage <= 50) hpBarEl.style.backgroundColor = 'orange';
        else hpBarEl.style.backgroundColor = '#4CAF50';
    } else if (hpBarEl) {
        hpBarEl.style.width = '0%';
        hpBarEl.textContent = '0%';
         hpBarEl.style.backgroundColor = '#4CAF50'; // Reset color
    }
}

function showAbilities(panelId, pokemon) {
    const container = document.getElementById(`${panelId}-ability-choice`);
    const nullifiedCheckbox = document.getElementById(`${panelId}-ability-nullified`); // HTMLに直接配置
    
    if (!container) return;
    container.innerHTML = ""; // クリア
    
    const currentPanelAbility = panelStats[panelId].ability;

    if (!pokemon) { // ポケモンが選択されていない場合は何もしない（またはクリア）
        if (nullifiedCheckbox) nullifiedCheckbox.checked = false;
        currentPanelAbility.name = '';
        currentPanelAbility.custom = '';
        currentPanelAbility.nullified = false;
        currentPanelAbility.selectedButton = null;
        return;
    }

    const abilities = [pokemon.Ability1, pokemon.Ability2, pokemon.Ability3].filter(Boolean);
    
    abilities.forEach((abilityName) => {
        const btn = document.createElement("button");
        btn.textContent = abilityName;
        btn.className = "ability-btn";
        btn.type = "button";
        btn.dataset.ability = abilityName;

        if (currentPanelAbility.selectedButton === abilityName && !currentPanelAbility.custom && !currentPanelAbility.nullified) {
            btn.classList.add("selected");
        }

        btn.onclick = () => {
            container.querySelectorAll(".ability-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            currentPanelAbility.name = abilityName;
            currentPanelAbility.custom = "";
            currentPanelAbility.nullified = false;
            currentPanelAbility.selectedButton = abilityName;
            if (customInput) customInput.value = "";
            if (nullifiedCheckbox) nullifiedCheckbox.checked = false;
            console.log(`${panelId} Ability: ${currentPanelAbility.name}`);
        };
        container.appendChild(btn);
    });

    // カスタム特性入力欄 (動的に生成するか、HTMLにプレースホルダを置く)
    // ここでは動的に生成する例
    const customInputId = `${panelId}-custom-ability-input-dynamic`; // 動的生成なのでIDもユニークに
    let customInput = container.querySelector(`#${customInputId}`); // 既に存在するか確認
    if (!customInput) {
        customInput = document.createElement("input");
        customInput.type = "text";
        customInput.id = customInputId;
        customInput.placeholder = "特性入力";
        customInput.className = "custom-ability-input";
        customInput.style.flexGrow = "1"; // 他のボタンとのバランス
        customInput.style.minWidth = "80px";
        container.appendChild(customInput); // コンテナに追加
    }
    customInput.value = currentPanelAbility.custom;
    customInput.oninput = () => {
        container.querySelectorAll(".ability-btn").forEach(b => b.classList.remove("selected"));
        currentPanelAbility.name = customInput.value;
        currentPanelAbility.custom = customInput.value;
        currentPanelAbility.nullified = false;
        currentPanelAbility.selectedButton = null;
        if (nullifiedCheckbox) nullifiedCheckbox.checked = false;
        console.log(`${panelId} Custom Ability: ${currentPanelAbility.name}`);
    };


    // 無効化チェックボックスのイベントリスナーは setupEventListeners で設定済み
    if (nullifiedCheckbox) {
        nullifiedCheckbox.checked = currentPanelAbility.nullified;
    }
}


function updateMoveDetails(panelId) {
    const move = selectedMoves[panelId];
    const doubleDamageSection = document.getElementById(`${panelId}-move-double-damage-section`);
    const moveTypeDisplay = document.getElementById(`${panelId}-move-type`);

    if (move) {
        if (moveTypeDisplay) moveTypeDisplay.textContent = move.Type || "???";
        if (doubleDamageSection) {
            doubleDamageSection.style.display = (move.memo && move.memo.includes("全体")) ? "block" : "none";
            if (!(move.memo && move.memo.includes("全体"))) {
                document.getElementById(`${panelId}-double-damage-checkbox`).checked = false;
                panelStats[panelId].doubleDamage = false;
            }
        }
    } else {
        if (moveTypeDisplay) moveTypeDisplay.textContent = "MoveType";
        if (doubleDamageSection) {
            doubleDamageSection.style.display = "none";
            document.getElementById(`${panelId}-double-damage-checkbox`).checked = false;
            panelStats[panelId].doubleDamage = false;
        }
    }
}


// --- イベントリスナー設定 ---
function setupEventListeners() {
    panelIds.forEach(panelId => {
        // Pokemon Name Autocomplete
        initializeAutoComplete(`${panelId}-pokemon-name`, pokemonData, 'name', (selectedName) => {
            selectedPokemons[panelId] = pokemonData.find(p => p.name === selectedName);
            panelStats[panelId].pokemonName = selectedName;
            showAbilities(panelId, selectedPokemons[panelId]); // ポケモン選択時に特性表示更新
            updatePanelStats(panelId);
        });

        // Move Name Autocomplete
        initializeAutoComplete(`${panelId}-move`, moveData, 'name', (selectedName) => {
            selectedMoves[panelId] = moveData.find(m => m.name === selectedName);
            panelStats[panelId].moveName = selectedName;
            updateMoveDetails(panelId);
            updatePanelStats(panelId); // AorC表示更新のため
        });

        // Stat Inputs (IV, EV for H, B, D and also A, C separately for direct input)
        // HP, B, D は専用の入力欄がある
        ['hp', 'defense', 'sp-defense'].forEach(statPart => {
            const jsStatKey = statPart.replace('sp-defense', 'spDefense'); // spDefense
            const ivEl = document.getElementById(`${panelId}-${statPart}-iv`);
            const evEl = document.getElementById(`${panelId}-${statPart}-ev`);
            if (ivEl) ivEl.addEventListener('input', () => { panelStats[panelId].stats[jsStatKey].iv = parseInt(ivEl.value) || 0; updatePanelStats(panelId); });
            if (evEl) evEl.addEventListener('input', () => { panelStats[panelId].stats[jsStatKey].ev = parseInt(evEl.value) || 0; updatePanelStats(panelId); });
        });

        // A or C (main-offensive) block inputs
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
        
        // Nature Controls for A, B, C, D, and main-offensive (which delegates to A or C)
        ['attack', 'defense', 'sp-attack', 'sp-defense'].forEach(statName => {
            const jsStatKey = statName.replace('sp-attack', 'spAttack').replace('sp-defense', 'spDefense');
            setupNatureControl(panelId, jsStatKey, `${panelId}-${statName}-nature-control`, `${panelId}-${statName}-nature`, () => updatePanelStats(panelId));
        });
        // main-offensiveの性格コントロール
        setupNatureControl(panelId, 'main-offensive', `${panelId}-main-offensive-nature-control`, `${panelId}-main-offensive-nature`, () => updatePanelStats(panelId));


        // Ability Nullified Checkbox
        const abilityNullifiedCheckbox = document.getElementById(`${panelId}-ability-nullified`);
        if (abilityNullifiedCheckbox) {
            abilityNullifiedCheckbox.addEventListener('change', () => {
                panelStats[panelId].ability.nullified = abilityNullifiedCheckbox.checked;
                if (abilityNullifiedCheckbox.checked) {
                    panelStats[panelId].ability.name = "";
                    panelStats[panelId].ability.custom = "";
                    panelStats[panelId].ability.selectedButton = null;
                    // ボタンとカスタム入力の選択状態を解除
                    const choiceContainer = document.getElementById(`${panelId}-ability-choice`);
                    if(choiceContainer) choiceContainer.querySelectorAll(".ability-btn.selected").forEach(b => b.classList.remove("selected"));
                    const customInput = choiceContainer ? choiceContainer.querySelector(".custom-ability-input") : null;
                    if(customInput) customInput.value = "";
                }
                console.log(`${panelId} Ability Nullified: ${panelStats[panelId].ability.nullified}`);
            });
        }

        // Type Change, Move Times, Double Damage
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


function changeRank(panelAndStat, change) {
    const parts = panelAndStat.split('-'); // e.g., "red1-main-offensive" or "blue2-defense"
    const panelId = parts[0];
    let statKeyForPanelStats = parts.slice(1).join('-'); // e.g., "main-offensive", "defense", "sp-attack"

    let actualStatKey = ""; // 'attack', 'spAttack', 'defense', 'spDefense', 'hp'
    let rankSpanIdSuffix = statKeyForPanelStats; // HTMLのIDに使われる部分

    if (statKeyForPanelStats === 'main-offensive') {
        const move = selectedMoves[panelId];
        if (move && move.category === "物理") {
            actualStatKey = 'attack';
        } else if (move && move.category === "特殊") {
            actualStatKey = 'spAttack';
        } else {
            return; // 技未選択またはカテゴリ不明時はランク変更不可
        }
    } else if (statKeyForPanelStats === 'sp-attack') {
        actualStatKey = 'spAttack';
    } else if (statKeyForPanelStats === 'sp-defense') {
        actualStatKey = 'spDefense';
    } else {
        actualStatKey = statKeyForPanelStats; // 'hp', 'attack', 'defense'
    }
    
    if (!panelStats[panelId] || !panelStats[panelId].stats[actualStatKey]) {
        console.warn(`Stats object not found for ${panelId}.${actualStatKey}`);
        return;
    }

    const rankSpanId = `${panelId}-${rankSpanIdSuffix}-rank-val`;
    const rankSpan = document.getElementById(rankSpanId);
     if (!rankSpan) {
        console.warn(`Rank span not found for ID: ${rankSpanId}`);
        return;
    }

    let currentRank = panelStats[panelId].stats[actualStatKey].rank;
    currentRank = Math.max(-6, Math.min(6, currentRank + change));
    
    panelStats[panelId].stats[actualStatKey].rank = currentRank;
    rankSpan.textContent = currentRank;
    updatePanelStats(panelId);
}

function setupNatureControl(panelId, statKeyOrType, controlId, hiddenInputId, callback) {
    const control = document.getElementById(controlId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!control || !hiddenInput) return;

    let targetStatKeyInPanelStats; // 'attack', 'spAttack', 'defense', 'spDefense'

    if (statKeyOrType === 'main-offensive') {
        // main-offensive の性格コントロールは、技に応じて A または C の性格に影響を与える
        // この関数が呼び出される時点では技が未定の場合もあるため、
        // イベント発生時に技カテゴリを確認して適切なステータスを更新する。
        // ただし、表示の初期化は A に合わせておくなど工夫が必要。
        // ここでは、イベント時に技に応じてpanelStatsの該当箇所を更新すると仮定。
        // 初期表示はAに合わせておく。
        targetStatKeyInPanelStats = 'attack'; // デフォルト
    } else {
        targetStatKeyInPanelStats = statKeyOrType; // 'attack', 'defense', 'spAttack', 'spDefense'
    }
     if (!panelStats[panelId] || !panelStats[panelId].stats[targetStatKeyInPanelStats] && statKeyOrType !== 'main-offensive') {
        // main-offensive以外でpanelStatsに該当キーがなければ何もしない
        console.warn(`panelStats for ${panelId}.${targetStatKeyInPanelStats} not found.`);
        return;
    }


    // 初期値設定
    let initialNature = 1.0;
    if (statKeyOrType === 'main-offensive') {
        initialNature = panelStats[panelId].stats.attack.nature; // デフォルトはAの性格
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

      if (isActive && selectedValue !== "none") { // 「なし」以外でアクティブなものを再度クリックしても解除しない
          if(controlId === 'center-weatherControl' || controlId === 'center-fieldControl'){
              // 天候・フィールドはトグルオフ（「なし」に戻る）を許可しない
          } else {
            return;
          }
      }
      
      let valueToCallBack = selectedValue;
      if (isActive && selectedValue === "none" && (controlId === 'center-weatherControl' || controlId === 'center-fieldControl') ) {
          // 「なし」がアクティブな時に「なし」をクリックしても何も変わらない
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
          element: (item, data) => { // Ensure this matches autoComplete.js v10.x API
              item.innerHTML = `<span>${data.value[key]}</span>`; // Display the full name
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

async function initializeApp() {
  pokemonData = await fetchJson('data/pokemonList.json');
  moveData = await fetchJson('data/moveList.json');

  panelIds.forEach(panelId => {
      const currentPanelInternalStats = panelStats[panelId].stats;
      // IVs
      document.getElementById(`${panelId}-hp-iv`).value = currentPanelInternalStats.hp.iv;
      document.getElementById(`${panelId}-main-offensive-iv`).value = currentPanelInternalStats.attack.iv; // Default main offensive to attack
      document.getElementById(`${panelId}-defense-iv`).value = currentPanelInternalStats.defense.iv;
      document.getElementById(`${panelId}-sp-defense-iv`).value = currentPanelInternalStats.spDefense.iv;
      // HTMLに 'attack-iv', 'sp-attack-iv' があればそれらも初期化
      if(document.getElementById(`${panelId}-attack-iv`)) document.getElementById(`${panelId}-attack-iv`).value = currentPanelInternalStats.attack.iv;
      if(document.getElementById(`${panelId}-sp-attack-iv`)) document.getElementById(`${panelId}-sp-attack-iv`).value = currentPanelInternalStats.spAttack.iv;


      // EVs
      document.getElementById(`${panelId}-hp-ev`).value = currentPanelInternalStats.hp.ev;
      document.getElementById(`${panelId}-main-offensive-ev`).value = currentPanelInternalStats.attack.ev; // Default main offensive to attack
      document.getElementById(`${panelId}-defense-ev`).value = currentPanelInternalStats.defense.ev;
      document.getElementById(`${panelId}-sp-defense-ev`).value = currentPanelInternalStats.spDefense.ev;
      if(document.getElementById(`${panelId}-attack-ev`)) document.getElementById(`${panelId}-attack-ev`).value = currentPanelInternalStats.attack.ev;
      if(document.getElementById(`${panelId}-sp-attack-ev`)) document.getElementById(`${panelId}-sp-attack-ev`).value = currentPanelInternalStats.spAttack.ev;

      // Natures (hidden inputs and button states)
      // (setupNatureControl 内で初期化されるが、panelStats の値が正しいことが前提)
      // Ranks
      document.getElementById(`${panelId}-main-offensive-rank-val`).textContent = currentPanelInternalStats.attack.rank; // Default
      document.getElementById(`${panelId}-defense-rank-val`).textContent = currentPanelInternalStats.defense.rank;
      document.getElementById(`${panelId}-sp-defense-rank-val`).textContent = currentPanelInternalStats.spDefense.rank;
      if(document.getElementById(`${panelId}-attack-rank-val`)) document.getElementById(`${panelId}-attack-rank-val`).textContent = currentPanelInternalStats.attack.rank;
      if(document.getElementById(`${panelId}-sp-attack-rank-val`)) document.getElementById(`${panelId}-sp-attack-rank-val`).textContent = currentPanelInternalStats.spAttack.rank;


      // Initial HP Bar and Icon
      updatePokemonHPBar(panelId, 0, 1);
      const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
      if(hpTableNameEl) hpTableNameEl.textContent = '-';
      const iconEl = document.getElementById(`${panelId}-icon`);
      if (iconEl) iconEl.style.backgroundColor = '#cccccc'; // Default grey
      
      // Initialize ability section as empty
      showAbilities(panelId, null);
  });
  
  setupEventListeners(); // Call after panelStats might be referenced in setupNatureControl
  updateAllPanelStats(); 
}

document.addEventListener("DOMContentLoaded", initializeApp);