// ui/damage-calculator.js
import { selectedPokemons, selectedMoves, panelStats, fieldState } from './main.js';
import { pokemonData, moveData } from './data-loader.js'; // タイプ相性表などを将来的にここから取得する可能性
import { floor, ceil, round, goshaGoChonyu } from './math-utils.js';
import { calcActualStat } from './stat-calculator.js'; // ランク補正を再計算する場合に利用

// --- タイプ相性データ (仮。実際にはdata-loader等でJSONから読み込むことを推奨) ---
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
 * ランクから能力値の倍率を取得します。
 * @param {number} rank - ランク(-6 から +6)。
 * @returns {number} ランク補正倍率。
 */
function getRankMultiplier(rank) {
    if (rank === 0) return 1.0;
    if (rank > 0) return (2 + rank) / 2;
    return 2 / (2 - rank);
}


/**
 * ダメージ計算を実行します。
 * @param {string} attackerPanelId - 攻撃側のパネルID。
 * @param {string} defenderPanelId - 防御側のパネルID。
 * @returns {object} 計算されたダメージ量などの詳細。 { damage: number, percentage: number, details: string }
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
        // return { damage: 0, percentage: 0, details: "変化技はダメージ計算対象外です。" };
        // 変化技でも固定ダメージ技や割合ダメージ技はあるが、ここでは基本ダメージ計算を対象とする
        console.log("変化技のため基本ダメージ計算をスキップ:", attackerMove.name);
        return { baseDamage: 0, finalDamage: 0, details: "変化技" };
    }

    // --- 1. 基本情報の取得 ---
    const level = 50; // 固定
    let movePower = parseInt(attackerMove.power);
    if (isNaN(movePower)) { // 技威力が数値でない場合（例: "W参照"）
        // TODO: 技威力参照のロジックを実装 (例:けたぐり、くさむすび)
        console.warn(`技「${attackerMove.name}」の威力が数値ではありません。計算をスキップします。`);
        return { baseDamage: 0, finalDamage: 0, details: "技威力不明" };
    }
    const moveType = attackerMove.Type;

    // 攻撃側の能力値
    let attackStatValue;
    let attackerRank;
    if (moveCategory === "物理") {
        attackStatValue = attackerStats.stats.attack.actual; // ランク補正込み
        attackerRank = attackerStats.stats.attack.rank;
    } else { // 特殊
        attackStatValue = attackerStats.stats.spAttack.actual; // ランク補正込み
        attackerRank = attackerStats.stats.spAttack.rank;
    }

    // 防御側の能力値
    let defenseStatValue;
    let defenderRank;
    if (moveCategory === "物理") {
        defenseStatValue = defenderStats.stats.defense.actual; // ランク補正込み
        defenderRank = defenderStats.stats.defense.rank;
    } else { // 特殊
        defenseStatValue = defenderStats.stats.spDefense.actual; // ランク補正込み
        defenderRank = defenderStats.stats.spDefense.rank;
    }

    // --- 2. 各種補正値の計算 ---

    // 威力補正 (仮。実際には特性や持ち物に応じて複雑に変動)
    let powerMultiplier = 1.0;
    // TODO: 技、特性(例:ちからずく、テクニシャン、フェアリースキン等)、持ち物(例:ノーマルジュエル等)による威力補正

    // はりきり補正
    const harikiriMultiplier = (attackerStats.ability.name === "はりきり" && !attackerStats.ability.nullified && moveCategory === "物理") ? 1.5 : 1.0;

    // 攻撃補正 (仮。特性や持ち物、場の状態による)
    let attackStatMultiplier = 1.0;
    // TODO: 特性(例:フラワーギフト、こんじょう、サンパワー、プラスマイナス等)、持ち物(例:こだわりハチマキ/メガネ、しんかのきせき等)による攻撃/特攻補正

    // 防御補正 (仮。特性や持ち物、場の状態による)
    let defenseStatMultiplier = 1.0;
    // TODO: 特性(例:フラワーギフト等)、持ち物(例:しんかのきせき、とつげきチョッキ等)による防御/特防補正

    // 雪こおり補正
    const yukiKooriMultiplier = (fieldState.weather === "snow" && defenderStats.types && defenderStats.types.current.includes("こおり") && moveCategory === "物理") ? 1.5 : 1.0;
    // 砂いわ補正
    const sunaIwaMultiplier = (fieldState.weather === "sand" && defenderStats.types && defenderStats.types.current.includes("いわ") && moveCategory === "特殊") ? 1.5 : 1.0;

    // 範囲補正 (技が全体技で対象が複数の場合)
    let rangeMultiplier = 1.0;
    if (attackerMove.memo && attackerMove.memo.includes("全体") && panelStats[defenderPanelId].doubleDamage) { // doubleDamageフラグで単体対象か複数対象かを判定
        rangeMultiplier = 0.75;
    } else if (attackerMove.memo && attackerMove.memo.includes("全体") && !panelStats[defenderPanelId].doubleDamage) {
        // 全体技だが対象が1体しかいない場合 (ダブルバトルで片方が倒れているなど)
        // このツールでは panelStats[defenderPanelId].doubleDamage で「ダブルダメージ計算を行うか」を見るので、
        // これがfalseなら対象は1体とみなし、範囲補正は1.0のまま。
    }


    // おやこあい補正 (仮。実際には2回目の攻撃として処理)
    const oyakoiMultiplier = (attackerStats.ability.name === "おやこあい" && !attackerStats.ability.nullified) ? 1.25 : 1.0; // 1発目+0.25発目

    // 天候補正
    let weatherMultiplier = 1.0;
    if (fieldState.weather === "sun") {
        if (moveType === "ほのお") weatherMultiplier = 1.5;
        if (moveType === "みず") weatherMultiplier = 0.5;
    } else if (fieldState.weather === "rain") {
        if (moveType === "みず") weatherMultiplier = 1.5;
        if (moveType === "ほのお") weatherMultiplier = 0.5;
    }
    // TODO: フィールドによる威力補正 (グラスフィールドで草技1.3倍など)
    if(fieldState.terrain === "grassy" && moveType === "くさ") powerMultiplier *= 1.3; // グラスフィールド
    if(fieldState.terrain === "electric" && moveType === "でんき") powerMultiplier *= 1.3; // エレキフィールド
    if(fieldState.terrain === "psychic" && moveType === "エスパー") powerMultiplier *= 1.3; // サイコフィールド
    // ミストフィールドはドラゴン技威力半減
    if(fieldState.terrain === "misty" && moveType === "ドラゴン") powerMultiplier *= 0.5;


    // 急所補正
    const criticalMultiplier = attackerStats.isCriticalHit ? 1.5 : 1.0;

    // 乱数補正 (0.85 ~ 1.00 の16段階。ここでは最大乱数1.0を使用)
    const randomMultiplier = 1.0; // or panelStats[attackerPanelId].randomFactor if user selectable

    // タイプ一致補正 (STAB)
    let stabMultiplier = 1.0;
    const attackerCurrentTypes = [];
    if (attackerStats.typeChange && attackerStats.typeChange.startsWith("terastal-")) {
        attackerCurrentTypes.push(attackerStats.typeChange.replace("terastal-", ""));
    } else if (attackerStats.typeChange === "stellar") {
        // ステラの場合、最初の1回だけ各タイプ技が1.2倍 (元のタイプ一致とは別枠)
        // ここでは基本STABのみ考慮。ステラ専用の処理は別途必要。
        attackerCurrentTypes.push(...[attacker.Type1, attacker.Type2].filter(Boolean));
    } else {
        attackerCurrentTypes.push(...[attacker.Type1, attacker.Type2].filter(Boolean));
    }

    const isOriginalTypeMatch = attacker.Type1 === moveType || attacker.Type2 === moveType;

    if (attackerStats.typeChange && attackerStats.typeChange.startsWith("terastal-")) {
        const terastalType = attackerStats.typeChange.replace("terastal-", "");
        if (terastalType === moveType) { // テラスタイプと技タイプが一致
            if (isOriginalTypeMatch) { // 元のタイプとも一致
                stabMultiplier = (attackerStats.ability.name === "てきおうりょく" && !attackerStats.ability.nullified) ? 2.25 : 2.0;
            } else { // 元のタイプとは不一致
                stabMultiplier = (attackerStats.ability.name === "てきおうりょく" && !attackerStats.ability.nullified) ? 2.0 : 1.5;
            }
        } else if (isOriginalTypeMatch) { // テラスタイプとは不一致だが、元のタイプとは一致
            stabMultiplier = (attackerStats.ability.name === "てきおうりょく" && !attackerStats.ability.nullified) ? 2.0 : 1.5;
        }
    } else if (isOriginalTypeMatch) { // テラスタルなし、元のタイプと一致
        stabMultiplier = (attackerStats.ability.name === "てきおうりょく" && !attackerStats.ability.nullified) ? 2.0 : 1.5;
    }
    // ステラタイプのSTABは複雑なので別途考慮。最初の1回だけ各タイプ1.2倍、一致なら2倍。


    // 相性補正
    let typeEffectivenessMultiplier = 1.0;
    const defenderCurrentTypes = [];
     if (defenderStats.typeChange && defenderStats.typeChange.startsWith("terastal-")) {
        defenderCurrentTypes.push(defenderStats.typeChange.replace("terastal-", ""));
    } else if (defenderStats.typeChange === "stellar") {
        // ステラは防御時のタイプ相性は元のタイプのまま
        defenderCurrentTypes.push(...[defender.Type1, defender.Type2].filter(Boolean));
    } else {
        defenderCurrentTypes.push(...[defender.Type1, defender.Type2].filter(Boolean));
    }

    if (typeEffectiveness[moveType]) {
        defenderCurrentTypes.forEach(defType => {
            if (typeEffectiveness[moveType][defType] !== undefined) {
                typeEffectivenessMultiplier *= typeEffectiveness[moveType][defType];
            }
        });
    }

    // やけど補正
    const burnMultiplier = (attackerStats.statusCondition === "burn" && moveCategory === "物理" && !(attackerStats.ability.name === "こんじょう" && !attackerStats.ability.nullified)) ? 0.5 : 1.0;

    // M (その他の補正)
    let mMultiplier = 1.0;
    // 壁補正
    let wallMultiplier = 1.0;
    if (!attackerStats.isCriticalHit) { // 急所時は壁無効
        if (moveCategory === "物理" && (defenderPanelId.startsWith('blue') ? fieldState.teamBlue.isReflectActive : fieldState.teamRed.isReflectActive)) {
            wallMultiplier = (attackerMove.memo && attackerMove.memo.includes("全体") && panelStats[defenderPanelId].doubleDamage) ? 0.66 : 0.5; // ダブルバトルでは0.66倍(2/3)、シングル0.5倍
        } else if (moveCategory === "特殊" && (defenderPanelId.startsWith('blue') ? fieldState.teamBlue.isLightScreenActive : fieldState.teamRed.isLightScreenActive)) {
            wallMultiplier = (attackerMove.memo && attackerMove.memo.includes("全体") && panelStats[defenderPanelId].doubleDamage) ? 0.66 : 0.5;
        }
    }
    mMultiplier *= wallMultiplier;

    // TODO: ブレインフォース補正 (特性 && 効果抜群)
    // TODO: スナイパー補正 (特性 && 急所)
    // TODO: いろめがね補正 (特性 && 効果いまひとつ)
    // TODO: もふもふ補正 (防御側特性、被ほのお技)
    // TODO: Mhalf (マルチスケイル等)
    // TODO: Mfilter (フィルター等)
    // TODO: フレンドガード補正
    // TODO: たつじんのおび補正 (持ち物 && 効果抜群)
    // TODO: メトロノーム補正 (持ち物 && 連続使用)
    // TODO: いのちのたま補正 (持ち物)
    // TODO: 半減実補正 (持ち物)
    // TODO: Mtwice (じしん vs あなをほる等)

    // --- 3. ダメージ計算式のコア部分 ---

    // 急所の場合、攻撃側のプラスランクと防御側のマイナスランク以外は無視
    let effectiveAttackValueForCalc = attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].actual;
    let effectiveDefenseValueForCalc = defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].actual;

    if (attackerStats.isCriticalHit) {
        // 攻撃側のプラスランクのみ考慮
        const attackerBaseStat = parseInt(attacker[moveCategory === "物理" ? 'A' : 'C']);
        const attackerIV = attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].iv;
        const attackerEV = attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].ev;
        const attackerNature = attackerStats.stats[moveCategory === "物理" ? 'attack' : 'spAttack'].nature;
        const positiveAttackerRank = Math.max(0, attackerRank); // プラスのランクのみ
        effectiveAttackValueForCalc = calcActualStat(attackerBaseStat, attackerIV, attackerEV, attackerNature, positiveAttackerRank);

        // 防御側のマイナスランクのみ考慮
        const defenderBaseStat = parseInt(defender[moveCategory === "物理" ? 'B' : 'D']);
        const defenderIV = defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].iv;
        const defenderEV = defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].ev;
        const defenderNature = defenderStats.stats[moveCategory === "物理" ? 'defense' : 'spDefense'].nature;
        const negativeDefenderRank = Math.min(0, defenderRank); // マイナスのランクのみ
        effectiveDefenseValueForCalc = calcActualStat(defenderBaseStat, defenderIV, defenderEV, defenderNature, negativeDefenderRank);
    }


    let baseDamagePart1 = floor(level * 2 / 5 + 2);
    let modifiedMovePower = goshaGoChonyu(movePower * powerMultiplier);
    let modifiedAttackStat = goshaGoChonyu(floor(floor(effectiveAttackValueForCalc) * harikiriMultiplier) * attackStatMultiplier); // 計算式通りA実数値からランク補正を分離
    let modifiedDefenseStat = goshaGoChonyu(floor(floor(effectiveDefenseValueForCalc) * (moveCategory === "物理" ? yukiKooriMultiplier : sunaIwaMultiplier) ) * defenseStatMultiplier);

    let baseDamagePart2 = floor(baseDamagePart1 * modifiedMovePower * modifiedAttackStat / modifiedDefenseStat);
    let baseDamagePart3 = floor(baseDamagePart2 / 50) + 2;

    // --- 4. ダメージの最終調整 ---
    let finalDamage = baseDamagePart3;
    finalDamage = goshaGoChonyu(finalDamage * rangeMultiplier);
    // finalDamage = goshaGoChonyu(finalDamage * oyakoiMultiplier); // 親子愛は複数回攻撃として扱うべき
    finalDamage = goshaGoChonyu(finalDamage * weatherMultiplier);
    finalDamage = goshaGoChonyu(finalDamage * criticalMultiplier);
    finalDamage = floor(finalDamage * randomMultiplier); // 乱数は最後に切り捨て
    finalDamage = goshaGoChonyu(finalDamage * stabMultiplier);
    finalDamage = floor(finalDamage * typeEffectivenessMultiplier); //タイプ相性は切り捨て
    finalDamage = goshaGoChonyu(finalDamage * burnMultiplier);
    finalDamage = goshaGoChonyu(finalDamage * mMultiplier);

    // 最低保証ダメージは1
    if (typeEffectivenessMultiplier > 0 && finalDamage < 1) {
        finalDamage = 1;
    }
    if (typeEffectivenessMultiplier === 0) {
        finalDamage = 0;
    }
    
    // 親子愛の2発目 (威力を0.25倍にして再計算する方がより正確だが、ここでは簡易的に)
    if (attackerStats.ability.name === "おやこあい" && !attackerStats.ability.nullified && moveCategory !== "変化") {
        let secondHitDamage = baseDamagePart3; // 乱数や急所などを再抽選する場合もあるが、ここでは単純化
        secondHitDamage = goshaGoChonyu(secondHitDamage * rangeMultiplier);
        secondHitDamage = goshaGoChonyu(secondHitDamage * weatherMultiplier);
        secondHitDamage = goshaGoChonyu(secondHitDamage * criticalMultiplier); // 2発目も急所判定あり
        secondHitDamage = floor(secondHitDamage * randomMultiplier); // 乱数も再抽選の可能性
        secondHitDamage = goshaGoChonyu(secondHitDamage * stabMultiplier);
        secondHitDamage = floor(secondHitDamage * typeEffectivenessMultiplier);
        secondHitDamage = goshaGoChonyu(secondHitDamage * burnMultiplier);
        secondHitDamage = goshaGoChonyu(secondHitDamage * mMultiplier);
        secondHitDamage = floor(secondHitDamage * 0.25); // 2発目は威力1/4
        if (typeEffectivenessMultiplier > 0 && secondHitDamage < 1 && finalDamage > 0) { // 1発目が当たっていれば2発目も最低1は保証されるか要確認
             secondHitDamage = 1;
        }
        if (typeEffectivenessMultiplier === 0) {
            secondHitDamage = 0;
        }
        finalDamage += secondHitDamage;
    }


    // HPに対する割合
    const damagePercentage = defenderStats.maxHP > 0 ? Math.round((finalDamage / defenderStats.maxHP) * 1000) / 10 : 0; // 小数点第1位まで

    return {
        baseDamage: baseDamagePart3, // 各種補正適用前の基礎ダメージに近い値
        finalDamage: finalDamage,
        percentage: damagePercentage,
        details: `攻撃: ${attacker.name}, 技: ${attackerMove.name}, 防御: ${defender.name}`
    };
}