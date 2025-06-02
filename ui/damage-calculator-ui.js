// ui/damage-calculator-ui.js

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

// サンプル呼び出し（実際の計算結果で置き換えてください）
// このサンプル呼び出しは、通常は実際の計算ロジックから行われます。
// 初期表示のためにここに残すか、別の初期化スクリプトに移動することを検討してください。
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