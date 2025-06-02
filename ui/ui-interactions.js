// ui/ui-interactions.js

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
    // 必要であればここで実数値計算などの関数を呼び出す
    // calculateStats();
}

document.addEventListener('DOMContentLoaded', () => {
    // 性格ボタンの選択ロジック
    function setupNatureControl(controlId, hiddenInputId) {
        const control = document.getElementById(controlId);
        const hiddenInput = document.getElementById(hiddenInputId);

        if (control && hiddenInput) {
            control.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                    // 全てのボタンから 'active' クラスを削除
                    control.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                    // クリックされたボタンに 'active' クラスを追加
                    button.classList.add('active');
                    // hidden input の値を更新
                    hiddenInput.value = button.dataset.value;
                    // 必要であればここで計算ロジックを呼び出す
                    // calculateStats(); // 例: 実数値計算関数
                });
            });
        }
    }

    setupNatureControl('attack-nature-control', 'attack-nature');
    setupNatureControl('defense-nature-control', 'defense-nature');

    // 初期選択を反映
    // DOMContentLoaded内で実行することで、HTMLが完全に読み込まれてから処理が走ることを保証
    const attackNatureControl = document.getElementById('attack-nature-control');
    const defenseNatureControl = document.getElementById('defense-nature-control');
    if (attackNatureControl) {
        const attackNatureValue = document.getElementById('attack-nature')?.value || '1.0';
        attackNatureControl.querySelector(`button[data-value="${attackNatureValue}"]`)?.classList.add('active');
    }
    if (defenseNatureControl) {
        const defenseNatureValue = document.getElementById('defense-nature')?.value || '1.0';
        defenseNatureControl.querySelector(`button[data-value="${defenseNatureValue}"]`)?.classList.add('active');
    }


    // テラス・ステラボタンの選択ロジック
    const attackerButton1 = document.getElementById('attacker-button-1');
    const attackerButton2 = document.getElementById('attacker-button-2');
    const attackerButtons = [attackerButton1, attackerButton2].filter(Boolean); // null/undefinedを除外

    attackerButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', () => {
                if (button.classList.contains('selected')) {
                    button.classList.remove('selected');
                } else {
                    attackerButtons.forEach(btn => btn.classList.remove('selected'));
                    button.classList.add('selected');
                }
                // calculateDamage(); // 例: ダメージ計算関数
            });
        }
    });

    // スイッチ付きセグメントコントロールのロジック
    const toggleSwitch = document.getElementById('toggleSwitch');
    const speedControl = document.getElementById('speedControl');
    
    if (toggleSwitch && speedControl) { // 両方の要素が存在することを確認
        const controlButtons = speedControl.querySelectorAll('button');

        // セグメントコントロールのボタンクリック処理
        controlButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) {
                    return;
                }
                controlButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // トグルスイッチの切り替え処理
        toggleSwitch.addEventListener('change', () => {
            const isEnabled = toggleSwitch.checked;
            
            controlButtons.forEach(button => {
                button.disabled = !isEnabled;
            });

            if (isEnabled) {
                speedControl.classList.remove('disabled-state');
            } else {
                speedControl.classList.add('disabled-state');
                // 非選択状態にするロジック
                controlButtons.forEach(btn => btn.classList.remove('active'));
            }
        });
        
        // 初期状態を反映（スイッチがcheckedではないので、ボタンは無効になります）
        toggleSwitch.dispatchEvent(new Event('change'));
        // オプション: 初期選択ボタンを設定したい場合はここに追加
        // controlButtons[1].classList.add('active'); // 例: x1.0 をデフォルトで選択状態にする
    }
});