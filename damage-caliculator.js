// ui/damage-calculator.js
import { selectedPokemons, selectedMoves, panelStats, fieldState } from './main.js';
import { pokemonData, moveData, abilityData, itemData } from './data-loader.js'; // abilityData, itemData をインポート
import { floor, goshaGoChonyu } from './math-utils.js';
import { calcActualStat } from './stat-calculator.js';

// --- タイプ相性データ (仮) ---
const typeEffectiveness = {
    'ノーマル': { 'いわ': 0.5, 'ゴースト': 0, 'はがね': 0.5 },
    'ほのお': { 'ほのお': 0.5, 'みず': 0.5, 'くさ': 2, 'こおり': 2, 'むし': 2, 'いわ': 0.5, 'ドラゴン': 0.5, 'はがね': 2 },
    'みず': { 'ほのお': 2, 'みず': 0.5, 'くさ': 0.5, 'じめん': 2, 'いわ': 2, 'ドラゴン': 0.5 },
    'でんき': { 'みず': 2, 'でんき': 0.5, 'くさ': 0.5, 'じめん': 0, 'ひこう': 2, 'ドラゴン': 0.5 },
    'くさ': { 'ほのお': 0.5, 'みず': 2, 'くさ': 0.5, 'どく': 0.5, 'じめん': 2, 'ひこう': 0.5, 'むし': 0.5, 'いわ': 2, 'ドラゴン': 0.5, 'はがね': 0.5 },
    'こおり': { 'ほのお': 0.5, 'みず': 0.5, 'くさ': 2, 'こおり': 0.5, 'じめん': 2, 'ひこう': 2, 'ドラゴン': 2, 'はがね': 0.5 },
    'かくとう': { 'ノーマル': 2, 'こおり': 2, 'どく': 0.5, 'ひこう': 0.5, 'エスパー': 0.5, 'むし': 0.5, 'いわ': 2, 'ゴースト': 0, 'あく': 2, 'はがね': 2, 'フェアリー': 0.5 },
    'どく': { 'くさ': 2, 'どく': 0.5, 'じめん': 0.5, 'いわ': 0.5, 'ゴースト': 0.5, 'はがね': 0, 'フェアリー': 2 },
    'じめん': { 'ほのお': 2, 'でんき': 2, 'くさ': 0.5, 'どく': 2, 'ひこう': 0, 'むし': 0.5, 'いわ': 2, 'はがね': 2 },
    'ひこう': { 'でんき': 0.5, 'くさ': 2, 'かくとう': 2, 'むし': 2, 'いわ': 0.5, 'はがね': 0.5 },
    'エスパー': { 'かくとう': 2, 'どく': 2, 'エスパー': 0.5, 'あく': 0, 'はがね': 0.5 },
    'むし': { 'ほのお': 0.5, 'くさ': 2, 'かくとう': 0.5, 'どく': 0.5, 'ひこう': 0.5, 'エスパー': 2, 'ゴースト': 0.5, 'あく': 2, 'はがね': 0.5, 'フェアリー': 0.5 },
    'いわ': { 'ほのお': 2, 'こおり': 2, 'かくとう': 0.5, 'じめん': 0.5, 'ひこう': 2, 'むし': 2, 'はがね': 0.5 },
    'ゴースト': { 'ノーマル': 0, 'エスパー': 2, 'ゴースト': 2, 'あく': 0.5 },
    'ドラゴン': { 'ドラゴン': 2, 'はがね': 0.5, 'フェアリー': 0 },
    'あく': { 'かくとう': 0.5, 'エスパー': 2, 'ゴースト': 2, 'あく': 0.5, 'フェアリー': 0.5 },
    'はがね': { 'ほのお': 0.5, 'みず': 0.5, 'でんき': 0.5, 'こおり': 2, 'いわ': 2, 'はがね': 0.5, 'フェアリー': 2 },
    'フェアリー': { 'かくとう': 2, 'どく': 0.5, 'ドラゴン': 2, 'あく': 2, 'はがね': 0.5 }
};


/**
 * ダメージ計算を実行します。
 * @param {string} attackerPanelId - 攻撃側のパネルID。
 * @param {string} defenderPanelId - 防御側のパネルID。
 * @returns {object} 計算されたダメージ量などの詳細。
 */
export function calculateDamage(attackerPanelId, defenderPanelId) {
    const attacker = selectedPokemons[attackerPanelId];
    const defender = selectedPokemons[defenderPanelId];
    const attackerMove = selectedMoves[attackerPanelId];
    const attackerStats = panelStats[attackerPanelId];
    const defenderStats = panelStats[defenderPanelId];

    if (!attacker || !defender || !attackerMove) {
        throw new Error("攻撃側・防御側のポケモンまたは技が選択されていません。");
    }

    const moveCategory = attackerMove.category;
    if (moveCategory !== "物理" && moveCategory !== "特殊") {
        return { finalDamage: 0, percentage: 0, details: "変化技のためダメージ計算対象外" };
    }

    // --- 計算式の各要素を取得 ---
    const level = 50; // 固定
    let movePower = parseInt(attackerMove.power);
    // TODO: 'W参照'などの威力変動技のロジック
    
    // 攻撃/特攻の実数値とランク
    let attackStat, attackRank;
    if (moveCategory === "物理") {
        attackStat = attackerStats.stats.attack.actual;
        attackRank = attackerStats.stats.attack.rank;
    } else { // 特殊
        attackStat = attackerStats.stats.spAttack.actual;
        attackRank = attackerStats.stats.spAttack.rank;
    }
    
    // 防御/特防の実数値とランク
    let defenseStat, defenseRank, defenderTypes;
    if (moveCategory === "物理") {
        defenseStat = defenderStats.stats.defense.actual;
        defenseRank = defenderStats.stats.defense.rank;
    } else { // 特殊
        defenseStat = defenderStats.stats.spDefense.actual;
        defenseRank = defenderStats.stats.spDefense.rank;
    }

    // --- 各種補正値の計算 ---
    
    // 威力補正
    let powerMultiplier = 1.0;
    // TODO: "一部の技"、"一部の特性"、"一部の持物"に応じた威力補正
    
    // はりきり補正
    const harikiriMultiplier = (attackerStats.ability.name === "はりきり" && moveCategory === "物理") ? 1.5 : 1.0;
    
    // 攻撃補正
    let attackMultiplier = 1.0;
    // TODO: "一部の技"、"一部の特性"、"一部の持物"に応じた攻撃補正

    // 防御補正
    let defenseMultiplier = 1.0;
    // TODO: "一部の技"、"一部の特性"、"一部の持物"に応じた防御補正

    // 雪こおり補正
    const yukiKooriMultiplier = (fieldState.weather === "snow" && defenderStats.types.current.includes("こおり") && moveCategory === "物理") ? 1.5 : 1.0;
    
    // 砂いわ補正
    const sunaIwaMultiplier = (fieldState.weather === "sand" && defenderStats.types.current.includes("いわ") && moveCategory === "特殊") ? 1.5 : 1.0;

    // 範囲補正
    const rangeMultiplier = (attackerMove.memo && attackerMove.memo.includes("全体") && panelStats[defenderPanelId].doubleDamage) ? 0.75 : 1.0;

    // おやこあい補正
    const oyakoiMultiplier = (attackerStats.ability.name === "おやこあい") ? 1.25 : 1.0;

    // 天候補正
    let weatherMultiplier = 1.0;
    if (fieldState.weather === "rain") {
        if (attackerMove.Type === "みず") weatherMultiplier = 1.5;
        if (attackerMove.Type === "ほのお") weatherMultiplier = 0.5;
    } else if (fieldState.weather === "sun") {
        if (attackerMove.Type === "ほのお") weatherMultiplier = 1.5;
        if (attackerMove.Type === "みず") weatherMultiplier = 0.5;
    }
    // フィールド補正 (威力)
    if (fieldState.terrain === "grassy" && attackerMove.Type === "くさ") powerMultiplier *= 1.3;
    if (fieldState.terrain === "electric" && attackerMove.Type === "でんき") powerMultiplier *= 1.3;
    if (fieldState.terrain === "psychic" && attackerMove.Type === "エスパー") powerMultiplier *= 1.3;
    if (fieldState.terrain === "misty" && attackerMove.Type === "ドラゴン") powerMultiplier *= 0.5;

    // 急所補正
    const criticalMultiplier = attackerStats.isCriticalHit ? 1.5 : 1.0;

    // 乱数補正 (0.85 ~ 1.00) - ここでは最大値1.0を使用
    const randomMultiplier = 1.0; 

    // タイプ一致補正 (STAB)
    let stabMultiplier = 1.0;
    const isTerastallized = attackerStats.typeChange.startsWith("terastal-");
    const terastalType = isTerastallized ? attackerStats.typeChange.replace("terastal-", "") : null;
    const originalTypes = [attacker.Type1, attacker.Type2].filter(Boolean);
    const hasOriginalStab = originalTypes.includes(attackerMove.Type);
    const hasTerastalStab = isTerastallized && terastalType === attackerMove.Type;

    if (attackerStats.ability.name === "てきおうりょく") {
        if (hasTerastalStab) {
            stabMultiplier = hasOriginalStab ? 2.25 : 2.0;
        } else if (hasOriginalStab) {
            stabMultiplier = 2.0;
        }
    } else {
        if (hasTerastalStab) {
            stabMultiplier = hasOriginalStab ? 2.0 : 1.5;
        } else if (hasOriginalStab) {
            stabMultiplier = 1.5;
        }
    }
    
    // 相性補正
    let typeEffectivenessMultiplier = 1.0;
    defenderTypes = defenderStats.types.current;
    defenderTypes.forEach(defType => {
        if (typeEffectiveness[attackerMove.Type] && typeEffectiveness[attackerMove.Type][defType] !== undefined) {
            typeEffectivenessMultiplier *= typeEffectiveness[attackerMove.Type][defType];
        }
    });

    // やけど補正
    const burnMultiplier = (attackerStats.statusCondition === "burn" && moveCategory === "物理" && attackerStats.ability.name !== "こんじょう") ? 0.5 : 1.0;

    // --- M（その他の補正）の計算 ---
    let mMultiplier = 1.0;
    // 壁補正
    if (!attackerStats.isCriticalHit) {
        const isDouble = (attackerMove.memo && attackerMove.memo.includes("全体"));
        if (moveCategory === "物理" && fieldState.teamBlue.isReflectActive) mMultiplier *= (isDouble ? 2/3 : 0.5);
        if (moveCategory === "特殊" && fieldState.teamBlue.isLightScreenActive) mMultiplier *= (isDouble ? 2/3 : 0.5);
    }
    // いのちのたま補正
    if (attackerStats.item === "いのちのたま") mMultiplier *= 1.3;
    // TODO: README.md に記載の他のM補正を実装 (ブレインフォース、スナイパー、いろめがね、もふもふ、フィルター、フレンドガード、たつじんのおび、メトロノーム、半減実など)


    // --- ダメージ計算実行 ---

    // 攻撃側の能力値 (急所時はランク補正を考慮しない)
    let finalAttack = attackStat;
    if (attackerStats.isCriticalHit && attackRank > 0) {
        finalAttack = calcActualStat(parseInt(moveCategory === "物理" ? attacker.A : attacker.C), attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].iv, attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].ev, attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].nature, 0);
    }
    
    // 防御側の能力値 (急所時はランク補正を考慮しない)
    let finalDefense = defenseStat;
    if (attackerStats.isCriticalHit && defenseRank < 0) {
        finalDefense = calcActualStat(parseInt(moveCategory === "物理" ? defender.B : defender.D), defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].iv, defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].ev, defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].nature, 0);
    }


    // 計算式コア
    let damage = floor(level * 2 / 5 + 2);
    damage = floor(damage * goshaGoChonyu(movePower * powerMultiplier) * goshaGoChonyu(floor(floor(finalAttack * getRankMultiplier(attackRank)) * harikiriMultiplier) * attackMultiplier));
    damage = floor(damage / goshaGoChonyu(floor(floor(finalDefense * getRankMultiplier(defenseRank)) * (moveCategory === "物理" ? yukiKooriMultiplier : sunaIwaMultiplier)) * defenseMultiplier));
    damage = floor(damage / 50) + 2;
    
    // 最終ダメージ計算
    damage = goshaGoChonyu(damage * rangeMultiplier);
    damage = goshaGoChonyu(damage * oyakoiMultiplier); //親子愛は別処理のほうが正確かも
    damage = goshaGoChonyu(damage * weatherMultiplier);
    damage = goshaGoChonyu(damage * criticalMultiplier);
    damage = floor(damage * randomMultiplier);
    damage = goshaGoChonyu(damage * stabMultiplier);
    damage = floor(damage * typeEffectivenessMultiplier);
    damage = goshaGoChonyu(damage * burnMultiplier);
    damage = goshaGoChonyu(damage * mMultiplier);

    const finalDamage = Math.max(1, damage); // 最低1ダメージ保証
    const percentage = defenderStats.maxHP > 0 ? (finalDamage / defenderStats.maxHP) * 100 : 0;

    return {
        finalDamage,
        percentage,
        details: "計算完了" // TODO: 詳細な計算過程を返す
    };
}