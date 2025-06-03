// script.js

let pokemonData = [];
let moveData = [];
let attackerSelectedPokemon = null; // 選択された攻撃側ポケモン
let defenderSelectedPokemon = null; // 選択された防御側ポケモン
let selectedMove = null; // 選択された技

// --- データのフェッチ共通関数 ---
async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTPエラー！ステータス: ${response.status} URL: ${url}`);
      throw new Error(`HTTP error! status: ${response.status} from ${url}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching JSON from ${url}:`, error);
    return []; // エラー時は空の配列を返す
  }
}

// --- 実数値計算系 ---
function calcActualStat(base, iv, ev, nature, rank, level = 50) {
  let val;
  if (base === "HP") { // HPの実数値計算は少し異なる
    val = Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  } else {
    val = Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  }
  
  val = Math.floor(val * nature);
  const rankMultiplier = rank >= 0 ? (2 + rank) / 2 : 2 / (2 - rank);
  return Math.floor(val * rankMultiplier);
}

function calcHPStat(base, iv, ev, level = 50) {
  return Math.floor(((base * 2 + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}


// --- UI更新系 ---
function updatePokemonStats(pokemon, type) {
  if (!pokemon) return;

  const prefix = type === 'attacker' ? 'attack' : 'defense';
  const isAttacker = type === 'attacker';

  const moveName = document.getElementById("move").value;
  const move = moveData.find(m => m.name === moveName);

  // HPの更新は防御側のみ
  if (type === 'defender') {
    const hpBase = parseInt(pokemon.H);
    const hpIv = parseInt(document.getElementById("hp-iv").value, 10);
    const hpEv = parseInt(document.getElementById("hp-ev").value, 10);
    document.getElementById("hp-actual").textContent = calcHPStat(hpBase, hpIv, hpEv);
  }

  // 攻撃/防御・特攻/特防の更新
  if ((isAttacker && move) || type === 'defender') { // 攻撃側は技が選択されている場合、防御側は常時
    let statKey;
    if (isAttacker) {
      statKey = move.category === "特殊" ? "C" : "A";
    } else { // 防御側
      statKey = move && move.category === "特殊" ? "D" : "B";
    }
    
    const base = parseInt(pokemon[statKey], 10);
    const iv = parseInt(document.getElementById(`${prefix}-iv`).value, 10);
    const ev = parseInt(document.getElementById(`${prefix}-ev`).value, 10);
    const nature = parseFloat(document.getElementById(`${prefix}-nature`).value);
    const rank = parseInt(document.getElementById(`${prefix}-rank-val`).textContent);
    
    document.getElementById(`${prefix}-actual`).textContent = calcActualStat(base, iv, ev, nature, rank);

    // 防御側のB/D表示切り替えラベルの更新
    if (!isAttacker) {
      const defenseLabel = document.querySelector('.stat-block h4');
      if (defenseLabel) {
        defenseLabel.textContent = statKey === "B" ? "B" : "D";
      }
    }
  } else {
    // 技が選択されていない場合、攻撃側の実数値は表示しない
    if (isAttacker) {
      document.getElementById(`${prefix}-actual`).textContent = "-";
    }
  }
}

function updateAllStats() {
  updatePokemonStats(attackerSelectedPokemon, 'attacker');
  updatePokemonStats(defenderSelectedPokemon, 'defender');
}

function showAbilities(pokemon, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = ""; // クリア

  // セグメントコントロールのラッパーを生成
  const segmentedControl = document.createElement("div");
  segmentedControl.className = "segmented-control";
  segmentedControl.id = `${containerId}-segmented-control`; // 新しいIDを付与

  const abilities = [pokemon.Ability1, pokemon.Ability2, pokemon.Ability3].filter(Boolean);

  abilities.forEach((ability, index) => {
    const btn = document.createElement("button");
    btn.textContent = ability;
    btn.className = "ability-btn";
    btn.type = "button"; // typeをbuttonに設定
    btn.dataset.ability = ability; // 特性名をデータ属性に保存
    btn.onclick = () => {
      // 他のボタンの選択状態を解除
      segmentedControl.querySelectorAll(".ability-btn").forEach(b => b.classList.remove("selected"));
      // 自由入力欄をクリア
      const customInput = segmentedControl.querySelector('input[type="text"]');
      if (customInput) customInput.value = "";
      // 無効化チェックボックスを解除
      const nullifiedCheckbox = segmentedControl.querySelector('input[type="checkbox"]');
      if (nullifiedCheckbox) nullifiedCheckbox.checked = false;

      btn.classList.add("selected");
    };
    segmentedControl.appendChild(btn);
  });

  // 自由入力欄
  const customInput = document.createElement("input");
  customInput.type = "text";
  customInput.id = `${containerId}-custom-ability`;
  customInput.placeholder = "特性を入力";
  customInput.className = "custom-ability-input"; // CSSのためにクラス追加
  customInput.oninput = () => {
    // 自由入力時にボタンの選択を解除
    segmentedControl.querySelectorAll(".ability-btn").forEach(b => b.classList.remove("selected"));
    // 無効化チェックボックスを解除
    const nullifiedCheckbox = segmentedControl.querySelector('input[type="checkbox"]');
    if (nullifiedCheckbox) nullifiedCheckbox.checked = false;
  };
  segmentedControl.appendChild(customInput);

  // 無効化チェックボックス
  const nullifiedWrapper = document.createElement("div");
  nullifiedWrapper.className = "ability-nullified-checkbox-wrapper";
  const nullifiedLabel = document.createElement("label");
  const nullifiedCheckbox = document.createElement("input");
  nullifiedCheckbox.type = "checkbox";
  nullifiedCheckbox.id = `${containerId}-ability-nullified`;
  nullifiedCheckbox.onchange = () => {
    // 無効化チェックボックスが選択されたら、ボタンと自由入力の選択を解除
    if (nullifiedCheckbox.checked) {
      segmentedControl.querySelectorAll(".ability-btn").forEach(b => b.classList.remove("selected"));
      if (customInput) customInput.value = "";
    }
  };
  nullifiedLabel.appendChild(nullifiedCheckbox);
  nullifiedLabel.appendChild(document.createTextNode(" 無効化"));
  nullifiedWrapper.appendChild(nullifiedLabel);
  segmentedControl.appendChild(nullifiedWrapper);

  container.appendChild(segmentedControl);
}


function updateDoubleDamageCheckbox() {
  const moveName = document.getElementById("move").value;
  selectedMove = moveData.find(m => m.name === moveName); // グローバル変数に代入

  const section = document.getElementById("move-double-damage-section");
  if (!section) return;

  if (selectedMove && selectedMove.memo && selectedMove.memo.includes("全体")) {
    section.style.display = "block";
  } else {
    section.style.display = "none";
  }
}

// --- イベントリスナー設定 ---
function setupEventListeners() {
  // 実数値計算に関連する入力フィールド
  const statInputs = [
    "attack-iv", "attack-ev",
    "defense-iv", "defense-ev",
    "hp-iv", "hp-ev"
  ];

  statInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      // type="range"のinputの場合、valueの表示も更新
      if (element.type === 'range') {
        const valueSpanId = `${id}-val`;
        const valueSpan = document.getElementById(valueSpanId);
        element.addEventListener('input', () => {
          valueSpan.textContent = element.value;
          updateAllStats();
        });
      } else {
        element.addEventListener("input", updateAllStats);
      }
    }
  });

  // 性格補正ボタンのロジック
  setupNatureControl('attack-nature-control', 'attack-nature', updateAllStats);
  setupNatureControl('defense-nature-control', 'defense-nature', updateAllStats);

  // ランク変更ボタン
  document.querySelectorAll('.rank-btn').forEach(button => {
    button.addEventListener('click', (event) => {
      const type = event.target.nextElementSibling.id.includes('attack') ? 'attack' : 'defense';
      const change = event.target.textContent === '+' ? 1 : -1;
      changeRank(type, change);
      updateAllStats();
    });
  });

  // 攻撃側ポケモン入力欄のイベント (autocomplete.jsのselectionイベントで発火)
  const attackerElement = document.getElementById("attacker");
  if (attackerElement) {
    attackerElement.addEventListener("change", () => {
      attackerSelectedPokemon = pokemonData.find(p => p.name === attackerElement.value);
      if (attackerSelectedPokemon) {
        showAbilities(attackerSelectedPokemon, "ability-choice");
      } else {
        document.getElementById("ability-choice").innerHTML = ""; // クリア
      }
      updateAllStats();
    });
  }

  // 防御側ポケモン入力欄のイベント (autocomplete.jsのselectionイベントで発火)
  const defenderElement = document.getElementById("defender");
  if (defenderElement) {
    defenderElement.addEventListener("change", () => {
      defenderSelectedPokemon = pokemonData.find(p => p.name === defenderElement.value);
      if (defenderSelectedPokemon) {
        showAbilities(defenderSelectedPokemon, "defender-abilities");
      } else {
        document.getElementById("defender-abilities").innerHTML = ""; // クリア
      }
      updateAllStats();
    });
  }

  // 技入力欄のイベント (autocomplete.jsのselectionイベントで発火)
  const moveElement = document.getElementById("move");
  if (moveElement) {
    moveElement.addEventListener("change", () => {
      selectedMove = moveData.find(m => m.name === moveElement.value);
      updateDoubleDamageCheckbox();
      updateAllStats();
    });
  }

  // テラス・ステラボタンの選択ロジック
  const attackerButton1 = document.getElementById('attacker-button-1');
  const attackerButton2 = document.getElementById('attacker-button-2');
  const attackerButtons = [attackerButton1, attackerButton2].filter(Boolean);

  attackerButtons.forEach(button => {
      if (button) {
          button.addEventListener('click', () => {
              if (button.classList.contains('selected')) {
                  button.classList.remove('selected');
              } else {
                  attackerButtons.forEach(btn => btn.classList.remove('selected'));
                  button.classList.add('selected');
              }
              // ダメージ計算関数があればここで呼び出す
              // calculateDamage();
          });
      }
  });

  // 防御側テラススイッチと速度コントロールの連動
  const toggleSwitch = document.getElementById('toggleSwitch');
  const speedControl = document.getElementById('speedControl');
  
  if (toggleSwitch && speedControl) {
      const controlButtons = speedControl.querySelectorAll('button');

      controlButtons.forEach(button => {
          button.addEventListener('click', () => {
              if (button.disabled) {
                  return;
              }
              controlButtons.forEach(btn => btn.classList.remove('active'));
              button.classList.add('active');
          });
      });

      toggleSwitch.addEventListener('change', () => {
          const isEnabled = toggleSwitch.checked;
          
          controlButtons.forEach(button => {
              button.disabled = !isEnabled;
          });

          if (isEnabled) {
              speedControl.classList.remove('disabled-state');
          } else {
              speedControl.classList.add('disabled-state');
              controlButtons.forEach(btn => btn.classList.remove('active'));
          }
      });
      toggleSwitch.dispatchEvent(new Event('change'));
  }

  // 壁、天候、フィールド、わざわい、状態などのセグメントコントロール
  setupSegmentedControl('weatherControl', selected => {
    console.log('選択された天候:', selected);
    // 天候の値を処理するロジック（例: ダメージ計算に影響）
  });

  setupSegmentedControl('fieldControl', selected => {
    console.log('選択されたフィールド:', selected);
    // フィールドの値を処理するロジック
  });

  setupSegmentedControl('ruinControl', selected => {
    console.log('選択されたわざわい:', selected);
    // わざわいの値を処理するロジック
  });

  // その他の状態チェックボックス
  document.getElementById('helping-hand')?.addEventListener('change', (e) => console.log('てだすけ:', e.target.checked));
  document.getElementById('checkbox-burn')?.addEventListener('change', (e) => console.log('やけど:', e.target.checked));
  document.getElementById('aurora-veil')?.addEventListener('change', (e) => console.log('オーロラベール:', e.target.checked));
  document.getElementById('reflect')?.addEventListener('change', (e) => console.log('リフレクター:', e.target.checked));
  document.getElementById('light-screen')?.addEventListener('change', (e) => console.log('ひかりのかべ:', e.target.checked));
  document.getElementById('friend-guard')?.addEventListener('change', (e) => console.log('フレンドガード:', e.target.checked));
}

// ランク変更関数
function changeRank(type, change) {
  const rankSpanId = `${type}-rank-val`;
  const rankSpan = document.getElementById(rankSpanId);
  let currentRank = parseInt(rankSpan.textContent);

  currentRank += change;

  // 上限と下限を設ける (-6 から +6)
  if (currentRank < -6) {
      currentRank = -6;
  } else if (currentRank > 6) {
      currentRank = 6;
  }

  rankSpan.textContent = currentRank;
}

// 性格補正ボタンのセットアップ関数
function setupNatureControl(controlId, hiddenInputId, callback) {
  const control = document.getElementById(controlId);
  const hiddenInput = document.getElementById(hiddenInputId);

  if (control && hiddenInput) {
      control.querySelectorAll('button').forEach(button => {
          button.addEventListener('click', () => {
              control.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
              button.classList.add('active');
              hiddenInput.value = button.dataset.value;
              if (callback) callback();
          });
      });
  }
}

// セグメントコントロールのセットアップ関数 (app.jsから移動)
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


// autoComplete.js のインスタンスを初期化する汎用関数
function initializeAutoComplete(elementId, dataSrc, key, onChangeCallback) {
  const inputElement = document.getElementById(elementId);
  if (!inputElement) {
      console.warn(`Input element with ID "${elementId}" not found. Skipping autoComplete initialization.`);
      return;
  }

  new autoComplete({
      selector: `#${elementId}`,
      placeHolder: inputElement.placeholder,
      data: {
          src: dataSrc,
          keys: [key],
          cache: true
      },
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
          render: (item, data) => {
              item.innerHTML = data.value[key];
              return item;
          }
      },
      events: {
          input: {
              selection: (event) => {
                  const feedback = event.detail;
                  inputElement.value = feedback.selection.value[key];
                  if (onChangeCallback) {
                    onChangeCallback(inputElement.value);
                  }
                  inputElement.dispatchEvent(new Event('change')); // 手動でchangeイベントを発火
              }
          }
      },
      searchEngine: (query, record) => {
        // ひらがな・カタカナ変換 & 小文字化
        const normalizedQuery = toHiragana(query.toLowerCase());
        const normalizedRecord = toHiragana(record.toLowerCase());
        return normalizedRecord.includes(normalizedQuery);
      },
  });
}

// カタカナをひらがなに変換
function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

// --- 初期化処理 ---
async function initializeApp() {
  pokemonData = await fetchJson('data/pokemonList.json');
  moveData = await fetchJson('data/moveList.json');

  // autocomplete.js の初期化をここで行う
  initializeAutoComplete('attacker', pokemonData, 'name', (selectedName) => {
    attackerSelectedPokemon = pokemonData.find(p => p.name === selectedName);
    if (attackerSelectedPokemon) {
      showAbilities(attackerSelectedPokemon, "ability-choice");
    } else {
      document.getElementById("ability-choice").innerHTML = ""; // クリア
    }
    updateAllStats();
  });
  initializeAutoComplete('defender', pokemonData, 'name', (selectedName) => {
    defenderSelectedPokemon = pokemonData.find(p => p.name === selectedName);
    if (defenderSelectedPokemon) {
      showAbilities(defenderSelectedPokemon, "defender-abilities");
    } else {
      document.getElementById("defender-abilities").innerHTML = ""; // クリア
    }
    updateAllStats();
  });
  initializeAutoComplete('move', moveData, 'name', (selectedName) => {
    selectedMove = moveData.find(m => m.name === selectedName);
    updateDoubleDamageCheckbox();
    updateAllStats();
  });

  setupEventListeners();

  // 初期ロード時の実数値更新
  updateAllStats();
}

// ダメージポップアップを更新する関数 (damage-calculator-ui.jsから移動)
function updateDamagePopup({ normalMin, normalMax, critical, damageNormalMin, damageNormalMax, damageCritical, targetHP }) {
  // すべての要素が存在するか確認
  const normalMinElem = document.getElementById('normal-min');
  const normalMaxElem = document.getElementById('normal-max');
  const criticalElem = document.getElementById('critical');
  const labelNormalElem = document.getElementById('label-normal');
  const labelCriticalElem = document.getElementById('label-critical');
  const valueNormalElem = document.getElementById('value-normal');
  const valueCriticalElem = document.getElementById('value-critical');

  if (!normalMinElem || !normalMaxElem || !criticalElem || !labelNormalElem || !labelCriticalElem || !valueNormalElem || !valueCriticalElem) {
      console.warn("Damage popup elements not found. Skipping update.");
      return; // 要素が見つからない場合は処理を中断
  }

  const normalMinPercent = (normalMin / targetHP) * 100;
  const normalMaxPercent = (normalMax / targetHP) * 100;
  const criticalPercent = (critical / targetHP) * 100;

  normalMinElem.style.left = '0%';
  normalMinElem.style.width = normalMinPercent + '%';

  normalMaxElem.style.left = normalMinPercent + '%';
  normalMaxElem.style.width = (normalMaxPercent - normalMinPercent) + '%';

  criticalElem.style.left = normalMaxPercent + '%';
  criticalElem.style.width = (criticalPercent - normalMaxPercent) + '%';

  labelNormalElem.textContent = `通常: ${Math.round(normalMinPercent)}% - ${Math.round(normalMaxPercent)}%`;
  labelCriticalElem.textContent = `急所: ${Math.round(criticalPercent)}%`;
  valueNormalElem.textContent = `通常: ${damageNormalMin} - ${damageNormalMax} ダメージ`;
  valueCriticalElem.textContent = `急所: ${damageCritical} ダメージ`;
}


// --- ページロード時に初期化 ---
document.addEventListener("DOMContentLoaded", initializeApp);

// 初期表示のダメージポップアップのサンプルデータ
document.addEventListener('DOMContentLoaded', () => {
  updateDamagePopup({
    normalMin: 30,
    normalMax: 40,
    critical: 60,
    damageNormalMin: 30,
    damageNormalMax: 40,
    damageCritical: 60,
    targetHP: 100
  });
});