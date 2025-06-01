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
  const selectedPoke = pokemonData.find(p => p.name === attackerId);
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
  const selectedPoke = pokemonData.find(p => p.name === defenderId);
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
  const selectedPoke = pokemonData.find(p => p.name === defenderId);
  if (!selectedPoke) return;

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

  // 自由入力欄と特性無効チェック
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "その他の特性を入力";
  container.appendChild(document.createElement("br"));
  container.appendChild(input);

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(" 特性を無効化する"));
  container.appendChild(document.createElement("br"));
  container.appendChild(label);
}
// 事前にボタン3つは固定でHTMLにある想定
function showAbilities(pokemon) {
  const container = document.getElementById("ability-choice");
  if (!container) return;

  const buttons = container.querySelectorAll("button.ability-btn");
  const abilities = [pokemon.Ability1, pokemon.Ability2, pokemon.Ability3].filter(Boolean);

  buttons.forEach((btn, i) => {
    if (abilities[i]) {
      btn.textContent = abilities[i];
      btn.disabled = false;
      btn.style.display = "inline-block";
    } else {
      // 特性が無いところは無効化して非表示でもOK
      btn.textContent = "";
      btn.disabled = true;
      btn.style.display = "none";
    }
    btn.classList.remove("selected");
    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      // 自由入力欄はクリア（必要なら）
      document.getElementById("custom-ability").value = "";
    };
  });
}

// ポケモン選択イベント
document.getElementById("attacker").addEventListener("change", () => {
  const attackerId = document.getElementById("attacker").value;
  const selectedPoke = pokemonData.find(p => p.id === attackerId);
  if (!selectedPoke) return;

  showAbilities(selectedPoke);
  updateAttackActualStat();
});



function updateDoubleDamageCheckbox() {
  const moveName = document.getElementById("move").value;
  const selectedMove = moveData.find(m => m.name === moveName);
  if (!selectedMove) return;

  const section = document.getElementById("move-double-damage-section");
  if (selectedMove.remark && selectedMove.remark.includes("全体技")) {
    section.style.display = "block";
  } else {
    section.style.display = "none";
  }
}

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
    updateDoubleDamageCheckbox();
  });
}
function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function normalize(str) {
  return toHiragana(str.toLowerCase());
}

function setupAutoComplete(selector, nameList, onSelectCallback, placeholderText) {
  new autoComplete({
    selector,
    placeHolder: placeholderText || "入力",
    threshold: 1,
    data: {
      src: nameList,
      cache: true
    },
    searchEngine: (query, record) => {
      const normQuery = normalize(query);
      const normRecord = normalize(record);
      return normRecord.startsWith(normQuery) ? 1 : 0;
    },
    resultItem: {
      highlight: true,
      render: (item, data) => {
        item.innerHTML = data.value;  // 修正：data.match → data.value（候補の名前表示）
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

function initialize() {
  fetch("data/pokemonList.json")
    .then(res => res.json())
    .then(data => {
      pokemonData = data;

      // 名前リストだけを抽出して渡す
      const nameList = pokemonData.map(p => p.name);

      setupAutoComplete("#attacker", nameList, updateAttackActualStat, "入力：攻撃側ポケモン");
      setupAutoComplete("#defender", nameList, () => {
        updateDefenseActualStat();
        updateHPStat();
      }, "入力：防御側ポケモン");
    });

  fetch("data/moveList.json")
    .then(res => res.json())
    .then(data => {
      moveData = data;

      const moveNameList = moveData.map(m => m.name);
      setupAutoComplete("#move", moveNameList, () => {
        updateAttackActualStat();
        updateDefenseActualStat();
        updateDoubleDamageCheckbox();
      }, "入力：技");
    });

  setupEventListeners();
}

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("popup-toggle");
  const popup = document.getElementById("side-popup");
  const overlay = document.getElementById("popup-overlay");

  toggleBtn.addEventListener("click", () => {
    const isVisible = popup.classList.toggle("show");
    overlay.classList.toggle("show", isVisible);
    toggleBtn.classList.toggle("rotated", isVisible); // ← 回転トグル
  });

  overlay.addEventListener("click", () => {
    popup.classList.remove("show");
    overlay.classList.remove("show");
    toggleBtn.classList.remove("rotated");
  });
});




document.addEventListener("DOMContentLoaded", initialize);