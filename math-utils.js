// ui/math-utils.js

/**
 * 小数点以下を切り捨てます。
 * (例: 5.9 は 5、-5.1 は -6 になります)
 * @param {number} num - 対象の数値。
 * @returns {number} 切り捨て後の整数。
 */
export function floor(num) {
  return Math.floor(num);
}

/**
 * 小数点以下を切り上げます。
 * (例: 5.1 は 6、-5.9 は -5 になります)
 * @param {number} num - 対象の数値。
 * @returns {number} 切り上げ後の整数。
 */
export function ceil(num) {
  return Math.ceil(num);
}

/**
 * 四捨五入します。
 * (例: 5.5 は 6、5.4 は 5 になります)
 * @param {number} num - 対象の数値。
 * @returns {number} 四捨五入後の整数。
 */
export function round(num) {
  return Math.round(num);
}

/**
 * 五捨五超入（小数点以下が0.5以下なら切り捨て、0.5よりも大きいなら切り上げ）を行います。
 * (例: 5.5 は 5、5.500000000000001 は 6, 5.6 は 6 になります)
 * @param {number} num - 対象の数値。
 * @returns {number} 五捨五超入後の整数。
 */
export function goshaGoChonyu(num) {
  const decimalPart = num - Math.floor(num);
  if (decimalPart <= 0.5) {
    return Math.floor(num);
  } else {
    return Math.ceil(num);
  }
}

// 必要に応じて、他の数学的ユーティリティ関数をここに追加できます。
// 例えば、特定の範囲内に数値を収めるclamp関数など。

/**
 * 指定された最小値と最大値の間に数値を制限（クランプ）します。
 * @param {number} num - クランプする数値。
 * @param {number} min - 最小値。
 * @param {number} max - 最大値。
 * @returns {number} クランプされた数値。
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}