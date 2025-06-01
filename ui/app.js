// app.js

let pokemonData = [];
let moveData = [];

// 実数値計算（HP以外）
function calcActualStat(base, iv, ev, nature, rank) {
  let val = Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * 50) / 100) + 5;
  val = Math.floor(val * nature);
  const rankMultiplier = rank >= 0 ? (2 + rank) / 2 : 2 / (2 - rank);
  return Math.floor(val * rankMultiplier);
}

// HP実数値計算
function calcHPStat(base, iv, ev) {
  return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * 50) / 100) + 60;
}

// UI更新系
function updateAttackActualStat() {
  const attackerId = document.getElementById("attacker").value;
  const selectedPoke = pokemonData.find(p => p.id === attackerId);
  if (!selectedPoke) return;

  const moveName = document.getElementById("move").value;
  const selectedMove = moveData.find(m => m.name === moveName);
  if (!selectedMove) return;

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
  const defenderId = document.getElementById("defender").value;
  const selectedPoke = pokemonData.find(p => p.id === defenderId);
  if (!selectedPoke) return;

  const moveName = document.getElementById("move").value;
  const selectedMove = moveData.find(m => m.name === moveName);
  if (!selectedMove) return;

  // 防御ステータス（物理:B / 特殊:D）
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
  const defenderId = document.getElementById("defender").value;
  const selectedPoke = pokemonData.find(p => p.id === defenderId);
  if (!selectedPoke) return;

  const base = parseInt(selectedPoke.H);
  const iv = parseInt(document.getElementById("hp-iv").value, 10);
  const ev = parseInt(document.getElementById("hp-ev").value, 10);
  const result = calcHPStat(base, iv, ev);
  document.getElementById("hp-actual").textContent = result;
}

// 特性表示
function showAbilities(pokemon, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Element with id '${containerId}' not found.`);
    return;
  }
  container.innerHTML = "";
  [pokemon.Ability1, pokemon.Ability2, pokemon.Ability3].filter(Boolean).forEach(ability => {
    const btn = document.createElement("button");
    btn.textContent = ability;
    btn.className = "ability-btn";
    btn.onclick = () => {
      container.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    };
    container.appendChild(btn);
  });
}

// イベントリスナー登録
function setupEventListeners() {
  ["attack-iv", "attack-ev", "attack-nature"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateAttackActualStat);
  });
  ["defense-iv", "defense-ev", "defense-nature"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateDefenseActualStat);
  });
  ["hp-iv", "hp-ev"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateHPStat);
  });
  document.getElementById("move").addEventListener("change", () => {
    updateAttackActualStat();
    updateDefenseActualStat();
  });
}

// 初期化
function initialize() {
  fetch("data/pokemonList.json")
    .then(res => res.json())
    .then(data => {
      pokemonData = data;
      const attackerSelect = document.getElementById("attacker");
      const defenderSelect = document.getElementById("defender");

      data.forEach(poke => {
        const optionA = new Option(poke.name, poke.id);
        const optionD = new Option(poke.name, poke.id);
        attackerSelect.appendChild(optionA);
        defenderSelect.appendChild(optionD);
      });

      attackerSelect.addEventListener("change", () => {
        const selected = data.find(p => p.id === attackerSelect.value);
        showAbilities(selected, "attacker-abilities");
        updateAttackActualStat();
      });

      defenderSelect.addEventListener("change", () => {
        const selected = data.find(p => p.id === defenderSelect.value);
        showAbilities(selected, "defender-abilities");
        updateDefenseActualStat();
        updateHPStat();
      });
    });

  fetch("data/moveList.json")
    .then(res => res.json())
    .then(data => {
      moveData = data;
      const moveSelect = document.getElementById("move");
      data.forEach(move => {
        const option = new Option(`${move.name} (${move.category})`, move.name);
        moveSelect.appendChild(option);
      });
    });

  setupEventListeners();
}
// ひらがな変換と正規化
function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}
function normalize(str) {
  return toHiragana(str.toLowerCase());
}

// 共通のAutoComplete初期化関数（normalizeを使って先頭一致に限定）
function setupAutoComplete(selector, dataList, onSelectCallback, placeholderText) {
  new autoComplete({
    selector,
    placeHolder: placeholderText || "入力",
    threshold: 1,
    data: {
      src: dataList.map(d => (typeof d === "string" ? d : d.name)),
      cache: true,
    },
    searchEngine: (query, record) => {
      const normQuery = normalize(query);
      const normRecord = normalize(record);
      return normRecord.startsWith(normQuery) ? 1 : 0;
    },
    resultItem: {
      highlight: true,
      render: (item, data) => {
        item.innerHTML = data.match;
        return item;
      }
    },
    events: {
      input: {
        selection: (e) => {
          const selection = e.detail.selection.value;
          document.querySelector(selector).value = selection;
          document.querySelector(selector).dispatchEvent(new Event("change"));
          if (onSelectCallback) onSelectCallback(selection);
        }
      }
    }
  });
}


// ポケモンと技のデータを取得し、autocompleteを適用
pokemonData = [];
moveData = [];

fetch('data/pokemonList.json')
  .then(res => res.json())
  .then(data => {
    pokemonData = data;

    setupAutoComplete("#attacker", pokemonData, () => updateAttackActualStat());
    setupAutoComplete("#defender", pokemonData, () => updateDefenseActualStat());
  });

fetch('data/moveList.json')
  .then(res => res.json())
  .then(data => {
    moveData = data;

    setupAutoComplete("#move", moveData, () => updateAttackActualStat());
  });

function updateDoubleDamageCheckbox() {
  const moveName = document.getElementById("move").value;
  const selectedMove = moveData.find(m => m.name === moveName);
  if (!selectedMove) return;

  const container = document.getElementById("double-damage-container");
  if (selectedMove.remark && selectedMove.remark.includes("全体技")) {
    container.style.display = "block";
  } else {
    container.style.display = "none";
    document.getElementById("double-damage").checked = false;
  }
}

document.getElementById("move").addEventListener("change", () => {
  updateAttackActualStat();
  updateDefenseActualStat();
  updateDoubleDamageCheckbox();
});

fetch('data/pokemonList.json')
  .then(res => res.json())
  .then(data => {
    pokemonData = data;

    setupAutoComplete("#attacker", pokemonData, () => updateAttackActualStat(), "入力：攻撃側ポケモン");
    setupAutoComplete("#defender", pokemonData, () => updateDefenseActualStat(), "入力：防御側ポケモン");
  });

fetch('data/moveList.json')
  .then(res => res.json())
  .then(data => {
    moveData = data;

    setupAutoComplete("#move", moveData, () => updateAttackActualStat(), "入力：技");
  });



document.addEventListener("DOMContentLoaded", initialize);