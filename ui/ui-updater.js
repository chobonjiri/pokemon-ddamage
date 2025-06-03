// ui/ui-updater.js
import { calcHPStat, calcActualStat } from './stat-calculator.js';
import { panelIds, selectedPokemons, selectedMoves, panelStats } from './main.js'; // main.js から状態をインポート

export function updatePokemonHPBar(panelId, currentHP, maxHP) {
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

export function updatePanelStats(panelId) {
    const pokemon = selectedPokemons[panelId];
    const currentPanelInternalStats = panelStats[panelId].stats;
    const move = selectedMoves[panelId];

    if (!pokemon) {
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
        if (iconEl) {
            iconEl.style.backgroundImage = '';
            iconEl.style.backgroundColor = '#cccccc'; // Default greyに戻す
        }
        return;
    }

    document.getElementById(`${panelId}-pokemon-type`).textContent = pokemon.Type2 ? `${pokemon.Type1}/${pokemon.Type2}` : pokemon.Type1;
    
    const iconEl = document.getElementById(`${panelId}-icon`);
    if (iconEl) {
        // iconEl.style.backgroundImage = `url('path_to_pokemon_icon/${pokemon.id}.png')`; // 例
        iconEl.style.backgroundColor = '#888';
    }

    currentPanelInternalStats.hp.actual = calcHPStat(parseInt(pokemon.H), currentPanelInternalStats.hp.iv, currentPanelInternalStats.hp.ev);
    document.getElementById(`${panelId}-hp-actual`).textContent = currentPanelInternalStats.hp.actual;
    panelStats[panelId].maxHP = currentPanelInternalStats.hp.actual;
    panelStats[panelId].currentHP = currentPanelInternalStats.hp.actual;
    updatePokemonHPBar(panelId, panelStats[panelId].currentHP, panelStats[panelId].maxHP);
    const hpTableNameEl = document.getElementById(`${panelId}-hp-table-name`);
    if (hpTableNameEl) hpTableNameEl.textContent = pokemon.name;

    const statKeyMapping = { attack: 'A', defense: 'B', spAttack: 'C', spDefense: 'D' };
    for (const [jsKey, dataKey] of Object.entries(statKeyMapping)) {
        const htmlStatPart = jsKey.replace('spAttack', 'sp-attack').replace('spDefense', 'sp-defense');
        currentPanelInternalStats[jsKey].actual = calcActualStat(
            parseInt(pokemon[dataKey]),
            currentPanelInternalStats[jsKey].iv,
            currentPanelInternalStats[jsKey].ev,
            currentPanelInternalStats[jsKey].nature,
            currentPanelInternalStats[jsKey].rank
        );
        document.getElementById(`${panelId}-${htmlStatPart}-actual`).textContent = currentPanelInternalStats[jsKey].actual;
    }
    
    const mainOffensiveLabelEl = document.getElementById(`${panelId}-main-offensive-label`);
    const mainOffensiveActualEl = document.getElementById(`${panelId}-main-offensive-actual`);
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
        } else {
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
        mainOffensiveIvEl.value = currentPanelInternalStats.attack.iv;
        mainOffensiveEvEl.value = currentPanelInternalStats.attack.ev;
        mainOffensiveNatureHiddenEl.value = currentPanelInternalStats.attack.nature;
        mainOffensiveNatureControlEl.querySelectorAll('button').forEach(btn => {
             btn.classList.toggle('active', parseFloat(btn.dataset.value) === currentPanelInternalStats.attack.nature);
        });
        mainOffensiveRankValEl.textContent = currentPanelInternalStats.attack.rank;
    }
}

export function updateAllPanelStats() {
    panelIds.forEach(id => updatePanelStats(id));
}

export function showAbilities(panelId, pokemon) {
    const container = document.getElementById(`${panelId}-ability-choice`);
    const nullifiedCheckbox = document.getElementById(`${panelId}-ability-nullified`);
    
    if (!container) return;
    container.innerHTML = "";
    
    const currentPanelAbility = panelStats[panelId].ability;

    if (!pokemon) {
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

    const customInputId = `${panelId}-custom-ability-input-dynamic`;
    let customInput = container.querySelector(`#${customInputId}`);
    if (!customInput) {
        customInput = document.createElement("input");
        customInput.type = "text";
        customInput.id = customInputId;
        customInput.placeholder = "特性入力";
        customInput.className = "custom-ability-input"; // CSS適用のため
        customInput.style.flexGrow = "1"; 
        customInput.style.minWidth = "80px";
        container.appendChild(customInput);
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

    if (nullifiedCheckbox) {
        nullifiedCheckbox.checked = currentPanelAbility.nullified;
    }
}

export function updateMoveDetails(panelId) {
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

export function changeRank(panelAndStat, change) {
    const parts = panelAndStat.split('-');
    const panelId = parts[0];
    let statKeyForPanelStats = parts.slice(1).join('-');

    let actualStatKey = "";
    let rankSpanIdSuffix = statKeyForPanelStats;

    if (statKeyForPanelStats === 'main-offensive') {
        const move = selectedMoves[panelId];
        if (move && move.category === "物理") {
            actualStatKey = 'attack';
        } else if (move && move.category === "特殊") {
            actualStatKey = 'spAttack';
        } else {
            return;
        }
    } else if (statKeyForPanelStats === 'sp-attack') {
        actualStatKey = 'spAttack';
    } else if (statKeyForPanelStats === 'sp-defense') {
        actualStatKey = 'spDefense';
    } else {
        actualStatKey = statKeyForPanelStats;
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