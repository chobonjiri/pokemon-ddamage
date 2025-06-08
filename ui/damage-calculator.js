// ui/damage-calculator.js
import {
    panelIds,
    selectedPokemons,
    selectedMoves,
    panelStats,
    fieldState
} from './main.js';
import {
    itemData,
    abilityData
} from './data-loader.js';
import {
    floor,
    goshaGoChonyu
} from './math-utils.js';
import { calcActualStat } from './stat-calculator.js';


/**
 * すべての攻撃側と防御側の組み合わせでダメージ計算をリアルタイムに実行します。
 * @returns {object} キーが防御側パネルID、値がそのパネルへのダメージ結果の配列となるオブジェクト
 */
export function calculateAndDisplayDamageForAll() {
    const allDamageResults = {};

    panelIds.forEach(attackerId => {
        const attackerPokemon = selectedPokemons[attackerId];
        const attackerMove = selectedMoves[attackerId];

        if (attackerPokemon && attackerMove && attackerMove.power) { // 攻撃側と技が有効か
            panelIds.forEach(defenderId => {
                if (attackerId === defenderId) return; // 自分自身への攻撃は計算しない

                const defenderPokemon = selectedPokemons[defenderId];
                if (defenderPokemon) {
                    try {
                        const result = calculateDamage(attackerId, defenderId);
                        if (result) {
                            if (!allDamageResults[defenderId]) {
                                allDamageResults[defenderId] = [];
                            }
                            allDamageResults[defenderId].push({
                                attackerId: attackerId,
                                ...result
                            });
                        }
                    } catch (error) {
                        // console.error(`Damage calc error for ${attackerId} -> ${defenderId}:`, error);
                    }
                }
            });
        }
    });
    return allDamageResults;
}


/**
 * 2つのパネル間のダメージを計算します。
 * @param {string} attackerId - 攻撃側のパネルID
 * @param {string} defenderId - 防御側のパネルID
 * @returns {object|null} 計算結果オブジェクト、または計算不可の場合はnull
 */
function calculateDamage(attackerId, defenderId) {
    const attackerPokemon = selectedPokemons[attackerId];
    const defenderPokemon = selectedPokemons[defenderId];
    const attackerMove = selectedMoves[attackerId];
    const attackerState = panelStats[attackerId];
    const defenderState = panelStats[defenderId];
    
    const attackerAbilityName = attackerState.ability.nullified ? null : (attackerState.ability.custom || attackerState.ability.name);
    const defenderAbilityName = defenderState.ability.nullified ? null : (defenderState.ability.custom || defenderState.ability.name);
    
    const attackerAbility = abilityData.find(a => a.名前 === attackerAbilityName);
    const defenderAbility = abilityData.find(a => a.名前 === defenderAbilityName);

    const attackerItem = itemData.find(i => i.名前 === attackerState.item);

    if (attackerMove.category !== "物理" && attackerMove.category !== "特殊") {
        return null;
    }

    let movePower = parseInt(attackerMove.power);
    if (isNaN(movePower) || movePower === 0) return null;

    const { attackStat, defenseStat } = getAttackAndDefenseStats(attackerId, defenderId);
    
    // --- 各種補正値の計算 ---
    const powerMultiplier = 1.0; // 将来の拡張用
    const attackMultiplier = 1.0; // 将来の拡張用
    const defenseMultiplier = 1.0; // 将来の拡張用

    const harikiriMultiplier = (attackerAbility?.名前 === 'はりきり') ? 1.5 : 1.0;
    
    const rangeMultiplier = (attackerMove.対象?.includes('全体') && attackerState.doubleDamage) ? 0.75 : 1.0;
    const weatherMultiplier = calculateWeatherMultiplier(attackerMove.type);
    const criticalMultiplier = attackerState.isCriticalHit ? 1.5 : 1.0;
    const stabMultiplier = calculateStabMultiplier(attackerPokemon, attackerMove, attackerState, attackerAbility);
    const typeEffectivenessMultiplier = calculateTypeEffectiveness(attackerMove.type, defenderPokemon, defenderState);
    const burnMultiplier = (attackerState.statusCondition === 'burn' && attackerMove.category === '物理' && attackerAbility?.名前 !== 'こんじょう') ? 0.5 : 1.0;

    // M（その他の補正）の計算
    const mMultiplier = calculateCombinedMMultiplier(attackerItem, defenderAbility, attackerMove, typeEffectivenessMultiplier, attackerId);

    // --- ダメージ計算式 ---
    let baseDamage = floor(((level * 2 / 5) + 2) * movePower * attackStat / defenseStat);
    baseDamage = floor(baseDamage / 50) + 2;

    // 補正を適用
    baseDamage = goshaGoChonyu(baseDamage * rangeMultiplier);
    baseDamage = goshaGoChonyu(baseDamage * weatherMultiplier);
    baseDamage = goshaGoChonyu(baseDamage * criticalMultiplier);
    
    // 乱数以外を適用したダメージ
    let preRandomDamage = baseDamage;
    preRandomDamage = goshaGoChonyu(preRandomDamage * stabMultiplier);
    preRandomDamage = floor(preRandomDamage * typeEffectivenessMultiplier);
    preRandomDamage = goshaGoChonyu(preRandomDamage * burnMultiplier);
    preRandomDamage = goshaGoChonyu(preRandomDamage * mMultiplier);

    const minDamage = floor(preRandomDamage * 0.85);
    const maxDamage = preRandomDamage; // 最大乱数
    
    const moveTimes = attackerState.moveTimes || 1;

    return {
        minDamage: Math.max(1, minDamage) * moveTimes,
        maxDamage: Math.max(1, maxDamage) * moveTimes,
    };
}


// --- ヘルパー関数群 ---

function getAttackAndDefenseStats(attackerId, defenderId) {
    const attackerState = panelStats[attackerId];
    const defenderState = panelStats[defenderId];
    const move = selectedMoves[attackerId];
    const attackerPokemon = selectedPokemons[attackerId];
    const defenderPokemon = selectedPokemons[defenderId];

    const moveCategory = move.category;
    const isCritical = attackerState.isCriticalHit;
    
    const offensiveKey = (moveCategory === '特殊') ? 'spAttack' : 'attack';
    const defensiveKey = (moveCategory === '特殊') ? 'spDefense' : 'defense';
    
    let attack, defense;

    // 攻撃側の能力値
    const attackerOffensiveStatInfo = attackerState.stats[offensiveKey];
    const attackerBase = parseInt(attackerPokemon[offensiveKey === 'attack' ? 'A' : 'C']);
    attack = calcActualStat(attackerBase, attackerOffensiveStatInfo.iv, attackerOffensiveStatInfo.ev, attackerOffensiveStatInfo.nature, isCritical ? Math.max(0, attackerOffensiveStatInfo.rank) : attackerOffensiveStatInfo.rank);
    
    // 防御側の能力値
    const defenderDefensiveStatInfo = defenderState.stats[defensiveKey];
    const defenderBase = parseInt(defenderPokemon[defensiveKey === 'defense' ? 'B' : 'D']);
    defense = calcActualStat(defenderBase, defenderDefensiveStatInfo.iv, defenderDefensiveStatInfo.ev, defenderDefensiveStatInfo.nature, isCritical ? Math.min(0, defenderDefensiveStatInfo.rank) : defenderDefensiveStatInfo.rank);

    return { attackStat: attack, defenseStat: defense };
}

function calculateStabMultiplier(pokemon, move, state, ability) {
    const originalTypes = [pokemon.Type1, pokemon.Type2].filter(Boolean);
    const moveType = move.type;
    let stab = 1.0;

    if (state.typeChange && state.typeChange.startsWith('terastal-')) {
        const teraType = state.typeChange.replace('terastal-', '');
        if (teraType === moveType) {
            stab = originalTypes.includes(moveType) ? 2.0 : 1.5;
        } else if (originalTypes.includes(moveType)) {
            stab = 1.5;
        }
    } else if (originalTypes.includes(moveType)) {
        stab = 1.5;
    }
    
    if (ability?.名前 === 'てきおうりょく' && stab > 1.0) {
        stab = (stab === 1.5) ? 2.0 : 2.25;
    }

    if (state.typeChange === 'stellar') {
        if (originalTypes.includes(moveType)) {
            return 2.0;
        } else {
            return 1.2; 
        }
    }

    return stab;
}

function calculateTypeEffectiveness(moveType, defenderPokemon, defenderState) {
    const typeChart = {
        'ノーマル': {'いわ': 0.5, 'ゴースト': 0, 'はがね': 0.5},
        'ほのお': {'ほのお': 0.5, 'みず': 0.5, 'くさ': 2, 'こおり': 2, 'むし': 2, 'いわ': 0.5, 'ドラゴン': 0.5, 'はがね': 2},
        'みず': {'ほのお': 2, 'みず': 0.5, 'くさ': 0.5, 'じめん': 2, 'いわ': 2, 'ドラゴン': 0.5},
        'でんき': {'みず': 2, 'でんき': 0.5, 'くさ': 0.5, 'じめん': 0, 'ひこう': 2, 'ドラゴン': 0.5},
        'くさ': {'ほのお': 0.5, 'みず': 2, 'くさ': 0.5, 'どく': 0.5, 'じめん': 2, 'ひこう': 0.5, 'むし': 0.5, 'いわ': 2, 'ドラゴン': 0.5, 'はがね': 0.5},
        'こおり': {'ほのお': 0.5, 'みず': 0.5, 'くさ': 2, 'こおり': 0.5, 'じめん': 2, 'ひこう': 2, 'ドラゴン': 2, 'はがね': 0.5},
        'かくとう': {'ノーマル': 2, 'こおり': 2, 'どく': 0.5, 'ひこう': 0.5, 'エスパー': 0.5, 'むし': 0.5, 'いわ': 2, 'ゴースト': 0, 'あく': 2, 'はがね': 2, 'フェアリー': 0.5},
        'どく': {'くさ': 2, 'どく': 0.5, 'じめん': 0.5, 'いわ': 0.5, 'ゴースト': 0.5, 'はがね': 0, 'フェアリー': 2},
        'じめん': {'ほのお': 2, 'でんき': 2, 'くさ': 0.5, 'どく': 2, 'ひこう': 0, 'むし': 0.5, 'いわ': 2, 'はがね': 2},
        'ひこう': {'でんき': 0.5, 'くさ': 2, 'かくとう': 2, 'むし': 2, 'いわ': 0.5, 'はがね': 0.5},
        'エスパー': {'かくとう': 2, 'どく': 2, 'エスパー': 0.5, 'あく': 0, 'はがね': 0.5},
        'むし': {'ほのお': 0.5, 'くさ': 2, 'かくとう': 0.5, 'どく': 0.5, 'ひこう': 0.5, 'エスパー': 2, 'ゴースト': 0.5, 'あく': 2, 'はがね': 0.5, 'フェアリー': 0.5},
        'いわ': {'ほのお': 2, 'こおり': 2, 'かくとう': 0.5, 'じめん': 0.5, 'ひこう': 2, 'むし': 2, 'はがね': 0.5},
        'ゴースト': {'ノーマル': 0, 'エスパー': 2, 'ゴースト': 2, 'あく': 0.5},
        'ドラゴン': {'ドラゴン': 2, 'はがね': 0.5, 'フェアリー': 0},
        'あく': {'かくとう': 0.5, 'エスパー': 2, 'ゴースト': 2, 'あく': 0.5, 'フェアリー': 0.5},
        'はがね': {'ほのお': 0.5, 'みず': 0.5, 'でんき': 0.5, 'こおり': 2, 'いわ': 2, 'はがね': 0.5, 'フェアリー': 2},
        'フェアリー': {'ほのお': 0.5, 'かくとう': 2, 'どく': 0.5, 'ドラゴン': 2, 'あく': 2, 'はがね': 0.5}
    };
    
    let defenderTypes = [defenderPokemon.Type1, defenderPokemon.Type2].filter(Boolean);
    if (defenderState.typeChange && defenderState.typeChange.startsWith('terastal-')) {
        defenderTypes = [defenderState.typeChange.replace('terastal-', '')];
    }
    
    let multiplier = 1;
    if (typeChart[moveType]) {
        defenderTypes.forEach(defType => {
            multiplier *= typeChart[moveType][defType] ?? 1;
        });
    }

    return multiplier;
}

function calculateWeatherMultiplier(moveType) {
    if (fieldState.weather === 'sun' && moveType === 'ほのお') return 1.5;
    if (fieldState.weather === 'sun' && moveType === 'みず') return 0.5;
    if (fieldState.weather === 'rain' && moveType === 'みず') return 1.5;
    if (fieldState.weather === 'rain' && moveType === 'ほのお') return 0.5;
    return 1.0;
}

function calculateWallMultiplier(moveCategory, defenderId, isCritical) {
    if (isCritical) return 1.0;

    const defenderTeam = defenderId.startsWith('blue') ? 'teamBlue' : 'teamRed';
    const otherTeamMembers = panelIds.filter(id => id.startsWith(defenderId.substring(0, 3)) && selectedPokemons[id]);
    const isDoubleBattle = otherTeamMembers.length > 1;

    if (moveCategory === '物理' && fieldState[defenderTeam].isReflectActive) {
        return isDoubleBattle ? (2/3) : 0.5;
    }
    if (moveCategory === '特殊' && fieldState[defenderTeam].isLightScreenActive) {
        return isDoubleBattle ? (2/3) : 0.5;
    }
    return 1.0;
}

function calculateCombinedMMultiplier(attackerItem, defenderAbility, move, typeEffectiveness, attackerId) {
    let multiplier = 1.0;

    if(attackerItem?.補正内容 === 'いのちのたま補正') multiplier *= 1.3;
    if(attackerItem?.補正内容 === 'たつじんのおび補正' && typeEffectiveness > 1) multiplier *= 1.2;

    if(defenderAbility?.Mhalf) multiplier *= 0.5;
    if(defenderAbility?.Mfilter && typeEffectiveness > 1) multiplier *= 0.75;

    // フレンドガード
    const attackerTeam = attackerId.substring(0,3);
    const allyId = panelIds.find(id => id.startsWith(attackerTeam) && id !== attackerId);
    if(allyId) {
        const allyState = panelStats[allyId];
        const allyAbilityName = allyState.ability.nullified ? null : (allyState.ability.custom || allyState.ability.name);
        if (allyAbilityName === 'フレンドガード') {
            multiplier *= 0.75;
        }
    }
    
    return multiplier;
}