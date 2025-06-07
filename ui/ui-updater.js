// ui/ui-updater.js
import { calcHPStat, calcActualStat } from './stat-calculator.js';
import { panelIds, selectedPokemons, selectedMoves, panelStats } from './main.js';

export function updatePokemonHPBar(panelId, currentHP, maxHP) {
    const hpBarEl = document.getElementById(`${panelId}-hp-bar`);
    if (hpBarEl && maxHP > 0) {
        const percentage = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
        hpBarEl.style.width = `${percentage}%`;
        hpBarEl.textContent = `${Math.round(percentage)}%`; // HP割合のテキスト表示
        if (percentage <= 20) {
            hpBarEl.style.backgroundColor = 'red';
        } else if (percentage <= 50) {
            hpBarEl.style.backgroundColor = 'orange';
        } else {
            hpBarEl.style.backgroundColor = '#4CAF50'; // Green
        }
    } else if (hpBarEl) {
        hpBarEl.style.width = '0%';
        hpBarEl.textContent = '0%';
        hpBarEl.style.backgroundColor = '#4CAF50'; // Reset color
    }
}

export function updatePanelStats(panelId) {
    const pokemon = selectedPokemons[panelId];
    const currentPanelStoredStats = panelStats[panelId].stats; // panelStatsから保存されたIV/EV/Nature/Rankを取得
    const move = selectedMoves[panelId];

    // ポケモンが選択されていない場合のUIリセット
    if (!pokemon) {
        document.getElementById(`${panelId}-pokemon-type`).textContent = 'Type';
        ['hp', 'main-offensive', 'defense', 'sp-defense'].forEach(statPart => {
            const actualEl = document.getElementById(`${panelId}-${statPart}-actual`);
            if (actualEl) actualEl.textContent = '-';
            if (statPart === 'main-offensive') {
                 const labelEl = document.getElementById(`${panelId}-main-offensive-label`);
                 if(labelEl) labelEl.textContent = 'A or C';
                 // main-offensiveの入力欄もリセット
                 const ivEl = document.getElementById(`${panelId}-main-offensive-iv`);
                 const evEl = document.getElementById(`${panelId}-main-offensive-ev`);
                 const natureHiddenEl = document.getElementById(`${panelId}-main-offensive-nature`);
                 const natureControlEl = document.getElementById(`${panelId}-main-offensive-nature-control`);

                 if(ivEl) ivEl.value = initialPanelStatsTemplate.stats.attack.iv;
                 if(evEl) evEl.value = initialPanelStatsTemplate.stats.attack.ev;
                 if(natureHiddenEl) natureHiddenEl.value = initialPanelStatsTemplate.stats.attack.nature;
                 if(natureControlEl) {
                    natureControlEl.querySelectorAll('button').forEach(btn => {
                        btn.classList.toggle('active', parseFloat(btn.dataset.value) === initialPanelStatsTemplate.stats.attack.nature);
                    });
                 }
            }
        });
        updatePokemonHPBar(panelId, 0, 1);
        const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
        if (hpTableNameEl) hpTableNameEl.textContent = '-';
        const iconEl = document.getElementById(`${panelId}-icon`);
        if (iconEl) {
            iconEl.style.backgroundImage = '';
            iconEl.style.backgroundColor = '#cccccc';
        }
        // ランク表示もリセット
        ['main-offensive', 'defense', 'sp-defense'].forEach(statType => {
            updateRankDisplay(panelId, statType, 0);
        });
        return;
    }

    // ポケモンタイプ表示
    document.getElementById(`${panelId}-pokemon-type`).textContent = pokemon.Type2 ? `${pokemon.Type1}/${pokemon.Type2}` : pokemon.Type1;
    
    // ポケモンアイコン (仮)
    const iconEl = document.getElementById(`${panelId}-icon`);
    if (iconEl) {
        // ToDo: ポケモンIDに応じたアイコンパスを設定する
        // iconEl.style.backgroundImage = `url('path_to_pokemon_icon/${pokemon.id}.png')`;
        iconEl.style.backgroundColor = '#888'; // Placeholder color
    }

    // HP実数値計算と表示
    currentPanelStoredStats.hp.actual = calcHPStat(
        parseInt(pokemon.H),
        currentPanelStoredStats.hp.iv,
        currentPanelStoredStats.hp.ev
    );
    document.getElementById(`${panelId}-hp-actual`).textContent = currentPanelStoredStats.hp.actual;
    panelStats[panelId].maxHP = currentPanelStoredStats.hp.actual;
    // currentHPはダメージ計算時に更新するので、ここではmaxHPに合わせるか、現状維持かを選択
    // 新規選択時はmaxHPに合わせるのが自然
    if (panelStats[panelId].currentHP === 0 || panelStats[panelId].currentHP > panelStats[panelId].maxHP) { // 初期化時やポケモン変更時
        panelStats[panelId].currentHP = panelStats[panelId].maxHP;
    }
    updatePokemonHPBar(panelId, panelStats[panelId].currentHP, panelStats[panelId].maxHP);
    const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
    if (hpTableNameEl) hpTableNameEl.textContent = pokemon.name;

    // B, D の実数値計算と表示
    const defensiveStats = { defense: 'B', spDefense: 'D' };
    for (const [jsKey, dataKey] of Object.entries(defensiveStats)) {
        const htmlStatPart = jsKey.replace('spDefense', 'sp-defense');
        currentPanelStoredStats[jsKey].actual = calcActualStat(
            parseInt(pokemon[dataKey]),
            currentPanelStoredStats[jsKey].iv,
            currentPanelStoredStats[jsKey].ev,
            currentPanelStoredStats[jsKey].nature,
            currentPanelStoredStats[jsKey].rank
        );
        document.getElementById(`${panelId}-${htmlStatPart}-actual`).textContent = currentPanelStoredStats[jsKey].actual;
    }
    
    // A, C の実数値計算 (main-offensiveとは別に行う)
    currentPanelStoredStats.attack.actual = calcActualStat(
        parseInt(pokemon.A),
        currentPanelStoredStats.attack.iv,
        currentPanelStoredStats.attack.ev,
        currentPanelStoredStats.attack.nature,
        currentPanelStoredStats.attack.rank
    );
    currentPanelStoredStats.spAttack.actual = calcActualStat(
        parseInt(pokemon.C),
        currentPanelStoredStats.spAttack.iv,
        currentPanelStoredStats.spAttack.ev,
        currentPanelStoredStats.spAttack.nature,
        currentPanelStoredStats.spAttack.rank
    );

    // main-offensive ブロックの更新
    const mainOffensiveLabelEl = document.getElementById(`${panelId}-main-offensive-label`);
    const mainOffensiveActualEl = document.getElementById(`${panelId}-main-offensive-actual`);
    const mainOffensiveIvEl = document.getElementById(`${panelId}-main-offensive-iv`);
    const mainOffensiveEvEl = document.getElementById(`${panelId}-main-offensive-ev`);
    const mainOffensiveNatureHiddenEl = document.getElementById(`${panelId}-main-offensive-nature`);
    const mainOffensiveNatureControlEl = document.getElementById(`${panelId}-main-offensive-nature-control`);
    // mainOffensiveRankDisplayEl と mainOffensiveRankValEl は updateRankDisplay で更新される

    let sourceStatKeyForMainOffensive = 'attack'; // デフォルトは攻撃
    if (move) {
        if (move.category === "物理") {
            mainOffensiveLabelEl.textContent = "A";
            mainOffensiveActualEl.textContent = currentPanelStoredStats.attack.actual;
            sourceStatKeyForMainOffensive = 'attack';
        } else if (move.category === "特殊") {
            mainOffensiveLabelEl.textContent = "C";
            mainOffensiveActualEl.textContent = currentPanelStoredStats.spAttack.actual;
            sourceStatKeyForMainOffensive = 'spAttack';
        } else { // 変化技や技なし
            mainOffensiveLabelEl.textContent = "A or C";
            mainOffensiveActualEl.textContent = "-";
            // 技がない場合や変化技の場合、main-offensiveの入力は攻撃(A)のものを表示・編集対象とする
            sourceStatKeyForMainOffensive = 'attack';
        }
    } else { // 技なし
        mainOffensiveLabelEl.textContent = "A or C";
        mainOffensiveActualEl.textContent = "-";
        sourceStatKeyForMainOffensive = 'attack';
    }

    // main-offensive のIV, EV, 性格, ランクの表示を sourceStatKeyForMainOffensive に合わせる
    if (mainOffensiveIvEl) mainOffensiveIvEl.value = currentPanelStoredStats[sourceStatKeyForMainOffensive].iv;
    if (mainOffensiveEvEl) mainOffensiveEvEl.value = currentPanelStoredStats[sourceStatKeyForMainOffensive].ev;
    if (mainOffensiveNatureHiddenEl) mainOffensiveNatureHiddenEl.value = currentPanelStoredStats[sourceStatKeyForMainOffensive].nature;
    if (mainOffensiveNatureControlEl) {
        mainOffensiveNatureControlEl.querySelectorAll('button').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.value) === currentPanelStoredStats[sourceStatKeyForMainOffensive].nature);
        });
    }
    // ランク表示は updateRankDisplay が行うが、初期値として sourceStatKeyForMainOffensive のランクを反映
    updateRankDisplay(panelId, 'main-offensive', currentPanelStoredStats[sourceStatKeyForMainOffensive].rank);
}

export function updateAllPanelStats() {
    panelIds.forEach(id => updatePanelStats(id));
}

export function showAbilities(panelId, pokemon) {
    const container = document.getElementById(`${panelId}-ability-choice`);
    const nullifiedCheckbox = document.getElementById(`${panelId}-ability-nullified`);
    
    if (!container) return;
    container.innerHTML = ""; // 以前の特性表示をクリア
    
    const currentPanelAbilityState = panelStats[panelId].ability;

    // カスタム特性入力フィールドを先に作成（ボタンの後に追加するため）
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.id = `${panelId}-custom-ability-input-dynamic`; // 必要に応じてIDをユニークに
    customInput.placeholder = "特性入力";
    customInput.className = "custom-ability-input";
    customInput.style.flexGrow = "1"; 
    customInput.style.minWidth = "80px"; // 必要に応じて調整

    if (!pokemon) { // ポケモンが選択されていない場合
        if (nullifiedCheckbox) {
            nullifiedCheckbox.checked = false;
            // nullifiedCheckbox.disabled = true; // 必要であれば無効化チェックボックスも無効に
        }
        // パネルの特性状態をリセット
        currentPanelAbilityState.name = '';
        currentPanelAbilityState.custom = '';
        currentPanelAbilityState.nullified = false;
        currentPanelAbilityState.selectedButton = null;

        const placeholderAbilityNames = ["特性1", "特性2", "隠れ特性"];
        placeholderAbilityNames.forEach(name => {
            const btn = document.createElement("button");
            btn.textContent = name;
            btn.className = "ability-btn placeholder-ability-btn"; // スタイル付けのためのクラス追加
            btn.type = "button";
            btn.disabled = true;
            container.appendChild(btn);
        });

        customInput.value = "";
        customInput.disabled = true;
        container.appendChild(customInput);

        if (nullifiedCheckbox) {
            nullifiedCheckbox.checked = currentPanelAbilityState.nullified; // falseになるはず
        }
        return; // ポケモン未選択の場合はここで処理終了
    }

    // --- ポケモンが選択されている場合の処理 ---
    // if (nullifiedCheckbox) nullifiedCheckbox.disabled = false; // 必要であれば有効化

    const abilities = [pokemon.Ability1, pokemon.Ability2, pokemon.Ability3].filter(Boolean); // 空文字列を除外
    
    abilities.forEach((abilityName) => {
        const btn = document.createElement("button");
        btn.textContent = abilityName;
        btn.className = "ability-btn";
        btn.type = "button";
        btn.dataset.ability = abilityName;

        // この特性が選択されており、カスタム入力や無効化で上書きされていない場合に選択状態を復元
        if (currentPanelAbilityState.selectedButton === abilityName && !currentPanelAbilityState.custom && !currentPanelAbilityState.nullified) {
            btn.classList.add("selected");
        }

        // ボタンクリック時の処理
        btn.onclick = () => {
            container.querySelectorAll(".ability-btn.selected").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            currentPanelAbilityState.name = abilityName;
            currentPanelAbilityState.custom = "";    // Clear custom input when a button is clicked
            currentPanelAbilityState.nullified = false;
            currentPanelAbilityState.selectedButton = abilityName;
            customInput.value = ""; // カスタム入力フィールドをクリア
            customInput.disabled = false; // カスタム入力フィールドを有効化
            if (nullifiedCheckbox) nullifiedCheckbox.checked = false;
            // console.log(`${panelId} Ability selected: ${currentPanelAbilityState.name}`);
            // updatePanelStats(panelId); // If ability affects base stats directly (rare)
        };
        container.appendChild(btn);
    });

    // カスタム特性入力フィールドの設定
    customInput.value = currentPanelAbilityState.custom; // カスタム入力値を復元
    customInput.disabled = currentPanelAbilityState.nullified; // 特性が無効化されていれば入力フィールドも無効化

    // カスタム入力時の処理
    customInput.oninput = () => {
        container.querySelectorAll(".ability-btn.selected").forEach(b => b.classList.remove("selected"));
        currentPanelAbilityState.name = customInput.value;
        currentPanelAbilityState.custom = customInput.value;
        currentPanelAbilityState.nullified = false; // カスタム入力時は無効化を解除
        currentPanelAbilityState.selectedButton = null; // Clear button selection
        if (nullifiedCheckbox) nullifiedCheckbox.checked = false;
        customInput.disabled = false; // 入力中は有効
        // console.log(`${panelId} Custom Ability input: ${currentPanelAbilityState.name}`);
    };
    container.appendChild(customInput); // ボタンの後にカスタム入力フィールドを追加

    // 無効化チェックボックスの状態を復元
    if (nullifiedCheckbox) {
        nullifiedCheckbox.checked = currentPanelAbilityState.nullified;
        // 特性が無効化されている場合、UI（ボタンの選択解除、カスタム入力の無効化など）は
        // nullifiedCheckbox のイベントハンドラ (event-handler.js内) とこの関数の冒頭で処理される
    }
}

export function updateMoveDetails(panelId) {
    const move = selectedMoves[panelId];
    const doubleDamageSection = document.getElementById(`${panelId}-move-double-damage-section`);
    const moveTypeDisplay = document.getElementById(`${panelId}-move-type`);

    if (move) {
        if (moveTypeDisplay) moveTypeDisplay.textContent = move.Type || "???";
        if (doubleDamageSection) {
            // "全体"技の場合にダブルダメージオプションを表示
            const isSpreadMove = move.memo && move.memo.includes("全体");
            doubleDamageSection.style.display = isSpreadMove ? "block" : "none";
            if (!isSpreadMove) { // 全体技でないならダブルダメージチェックを外す
                const checkbox = document.getElementById(`${panelId}-double-damage-checkbox`);
                if(checkbox) checkbox.checked = false;
                panelStats[panelId].doubleDamage = false;
            }
        }
    } else {
        if (moveTypeDisplay) moveTypeDisplay.textContent = "MoveType";
        if (doubleDamageSection) {
            doubleDamageSection.style.display = "none";
            const checkbox = document.getElementById(`${panelId}-double-damage-checkbox`);
            if(checkbox) checkbox.checked = false;
            panelStats[panelId].doubleDamage = false;
        }
    }
}

export function updateRankDisplay(panelId, statType, rank) {
    // statType は 'main-offensive', 'defense', 'sp-defense' のいずれか
    const rankDisplayButton = document.getElementById(`${panelId}-${statType}-dropdownBtn`);
    const rankValueSpan = document.getElementById(`${panelId}-${statType}-rank-val`); // Hidden span

    if (rankDisplayButton) {
        const displayRankText = rank === 0 ? '±0' : (rank > 0 ? `+${rank}` : `${rank}`);
        const displaySpan = rankDisplayButton.querySelector('span:first-child'); // Assuming first span is for text
        if (displaySpan) displaySpan.textContent = displayRankText;
    }
    if (rankValueSpan) {
        rankValueSpan.textContent = rank;
    }
}

export function initializeRankValuesFromPanelStats(panelId) {
    const statsToInitialize = {
        'main-offensive': panelStats[panelId].stats.attack.rank, // Default to attack rank for main-offensive initially
        'defense': panelStats[panelId].stats.defense.rank,
        'sp-defense': panelStats[panelId].stats.spDefense.rank,
    };

    for (const [statType, rank] of Object.entries(statsToInitialize)) {
        updateRankDisplay(panelId, statType, rank);
    }
}