// app.js

let pokemonData = [];
let moveData = [];

// --- データのフェッチ共通関数 (autocomplete.js も利用するため、ここに置くか、別途 utils.js に置く) ---
// autocomplete.js がこの関数を参照するため、グローバルスコープまたはそれより前のスクリプトで定義が必要
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTPエラー！ステータス: ${response.status} URL: ${url}`);
      throw new Error(`HTTP error! status: ${response.status} from ${url}`);
    }
    const data = await response.json();
    console.log(`Successfully fetched JSON from ${url}:`, data); // デバッグ用
    return data;
  } catch (error) {
    console.error(`Error fetching JSON from ${url}:`, error);
    return []; // エラー時は空の配列を返す
  }
}

// --- 実数値計算系 ---
function calcActualStat(base, iv, ev, nature, rank) {
  let val = Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * 50) / 100) + 5;
  val = Math.floor(val * nature);
  const rankMultiplier = rank >= 0 ? (2 + rank) / 2 : 2 / (2 - rank);
  return Math.floor(val * rankMultiplier);
}

function calcHPStat(base, iv, ev) {
  return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * 50) / 100) + 60;
}

// --- UI更新系 ---
function updateAttackActualStat() {
  const attackerInput = document.getElementById("attacker");
  const attackerName = attackerInput ? attackerInput.value : "";
  // autocomplete.jsで選択されたポケモンの名前で検索
  const selectedPoke = pokemonData.find(p => p.name === attackerName);
  if (!selectedPoke) {
    document.getElementById("attack-actual").textContent = ""; // 値をクリア
    return;
  }

  const moveInput = document.getElementById("move");
  const moveName = moveInput ? moveInput.value : "";
  const selectedMove = moveData.find(m => m.name === moveName);
  if (!selectedMove) {
    document.getElementById("attack-actual").textContent = ""; // 値をクリア
    return;
  }

  const statKey = selectedMove.category === "特殊" ? "C" : "A";
  const base = parseInt(selectedPoke[statKey], 10);
  const iv = parseInt(document.getElementById("attack-iv").value, 10);
  const ev = parseInt(document.getElementById("attack-ev").value, 10);
  const nature = parseFloat(document.getElementById("attack-nature").value);
  const rank = parseInt(document.getElementById("attack-rank-val").textContent);

  const result = calcActualStat(base, iv, ev, nature, rank);
  document.getElementById("attack-actual").textContent = result;
}

function updateDefenseActualStat() {
  const defenderInput = document.getElementById("defender");
  const defenderName = defenderInput ? defenderInput.value : "";
  const selectedPoke = pokemonData.find(p => p.name === defenderName);
  if (!selectedPoke) {
    document.getElementById("defense-actual").textContent = ""; // 値をクリア
    return;
  }

  const moveInput = document.getElementById("move");
  const moveName = moveInput ? moveInput.value : "";
  const selectedMove = moveData.find(m => m.name === moveName);
  if (!selectedMove) {
    document.getElementById("defense-actual").textContent = ""; // 値をクリア
    return;
  }

  const statKey = selectedMove.category === "特殊" ? "D" : "B";
  const base = parseInt(selectedPoke[statKey], 10);
  const iv = parseInt(document.getElementById("defense-iv").value, 10);
  const ev = parseInt(document.getElementById("defense-ev").value, 10);
  const nature = parseFloat(document.getElementById("defense-nature").value);
  const rank = parseInt(document.getElementById("defense-rank-val").textContent);
  const result = calcActualStat(base, iv, ev, nature, rank);
  document.getElementById("defense-actual").textContent = result;
}

function updateHPStat() {
  const defenderInput = document.getElementById("defender");
  const defenderName = defenderInput ? defenderInput.value : "";
  const selectedPoke = pokemonData.find(p => p.name === defenderName);
  if (!selectedPoke) {
    document.getElementById("hp-actual").textContent = ""; // 値をクリア
    return;
  }

  const base = parseInt(selectedPoke.H);
  const iv = parseInt(document.getElementById("hp-iv").value, 10);
  const ev = parseInt(document.getElementById("hp-ev").value, 10);
  const result = calcHPStat(base, iv, ev);
  document.getElementById("hp-actual").textContent = result;
}

function showAbilities(pokemon, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const abilities = [pokemon.Ability1, pokemon.Ability2, pokemon.Ability3].filter(Boolean);

  abilities.forEach(ability => {
    const btn = document.createElement("button");
    btn.textContent = ability;
    btn.className = "ability-btn";
    btn.onclick = () => {
      container.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      const customInput = container.querySelector('input[type="text"]');
      if (customInput) customInput.value = "";
    };
    container.appendChild(btn);
  });

  const input = document.createElement("input");
  input.type = "text";
  input.id = `${containerId}-custom-ability`;
  input.placeholder = "その他の特性を入力";
  container.appendChild(document.createElement("br"));
  container.appendChild(input);

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `${containerId}-ability-disable`;
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(" 特性を無効化する"));
  container.appendChild(document.createElement("br"));
  container.appendChild(label);
}

function updateDoubleDamageCheckbox() {
  const moveName = document.getElementById("move").value;
  const selectedMove = moveData.find(m => m.name === moveName);

  const section = document.getElementById("move-double-damage-section");
  if (!section) return;

  if (selectedMove && selectedMove.remark && selectedMove.remark.includes("全体技")) {
    section.style.display = "block";
  } else {
    section.style.display = "none";
  }
}

function setupEventListeners() {
  ["attack-iv", "attack-ev", "attack-nature"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("input", updateAttackActualStat);
  });
  ["defense-iv", "defense-ev", "defense-nature"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("input", updateDefenseActualStat);
  });
  ["hp-iv", "hp-ev"].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("input", updateHPStat);
  });

  // moveElement.addEventListener("change") は autocomplete.js の selection イベントで発火される
  const moveElement = document.getElementById("move");
  if (moveElement) {
    moveElement.addEventListener("change", () => {
      updateAttackActualStat();
      updateDefenseActualStat();
      updateDoubleDamageCheckbox();
    });
  }

  // attackerElement.addEventListener("change") は autocomplete.js の selection イベントで発火される
  const attackerElement = document.getElementById("attacker");
  if (attackerElement) {
    attackerElement.addEventListener("change", () => {
      const attackerName = attackerElement.value;
      const selectedPoke = pokemonData.find(p => p.name === attackerName);
      if (selectedPoke) {
        showAbilities(selectedPoke, "attacker-ability-container");
      } else {
        document.getElementById("attacker-ability-container").innerHTML = "";
      }
      updateAttackActualStat();
    });
  }

  // defenderElement.addEventListener("change") は autocomplete.js の selection イベントで発火される
  const defenderElement = document.getElementById("defender");
  if (defenderElement) {
    defenderElement.addEventListener("change", () => {
      const defenderName = defenderElement.value;
      const selectedPoke = pokemonData.find(p => p.name === defenderName);
      if (selectedPoke) {
        showAbilities(selectedPoke, "defender-ability-container");
      } else {
        document.getElementById("defender-ability-container").innerHTML = "";
      }
      updateDefenseActualStat();
      updateHPStat();
    });
  }
}

// --- ひらがな・カタカナ変換用ヘルパー関数 (autocomplete.js の searchEngine で利用するため、ここには残す) ---
// カタカナをひらがなに変換
function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// 文字列を正規化（ひらがな化して小文字にする）
function normalizeString(str) {
  return toHiragana(str.toLowerCase());
}

// --- 初期化処理 ---
// autocomplete.js がデータフェッチとオートコンプリートの初期化を行うため、
// app.js の initializeApp ではそれ以外のUI要素とイベントリスナーを設定する
async function initializeApp() {
  // autocomplete.js がデータをフェッチし、グローバル変数に代入するのを待つか、
  // app.js も独自にデータをフェッチする
  // 依存関係をシンプルにするため、app.jsもここでデータをフェッチするようにします。
  // これにより、pokemonDataとmoveDataがapp.jsの他の関数で確実に利用できます。
  pokemonData = await fetchJson('data/pokemonList.json');
  moveData = await fetchJson('data/moveList.json');

  setupEventListeners();

  // セグメントコントロールの初期化
  setupSegmentedControl('weatherControl', selected => {
    console.log('選択された天候:', selected);
    const select = document.getElementById('weather');
    if (select) {
      select.value = selected;
    }
    updateAttackActualStat();
    updateDefenseActualStat();
  });

  setupSegmentedControl('fieldControl', selected => {
    console.log('選択されたフィールド:', selected);
    const select = document.getElementById('field');
    if (select) {
      select.value = selected;
    }
    updateAttackActualStat();
    updateDefenseActualStat();
  });
}

function setupSegmentedControl(controlId, onChangeCallback) {
  const control = document.getElementById(controlId);
  if (!control) {
    console.warn(`Segmented control with ID "${controlId}" not found.`);
    return;
  }
  const buttons = control.querySelectorAll('button');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const isActive = button.classList.contains('active');

      if (isActive) {
        button.classList.remove('active');
        if (onChangeCallback) onChangeCallback("");
        return;
      }

      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const selectedValue = button.dataset.value;
      if (onChangeCallback) {
        onChangeCallback(selectedValue);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);