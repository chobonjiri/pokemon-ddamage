// ui/autocomplete.js

// fetchJson 関数は app.js または共通のユーティリティファイルにあることを想定
// このスクリプトが読み込まれる前に fetchJson が定義されている必要があります。
if (typeof fetchJson === 'undefined') {
    console.error("fetchJson function is not defined. Please ensure app.js is loaded before this script, or define it here.");
}

document.addEventListener('DOMContentLoaded', async () => {
    const pokemonList = await fetchJson('data/pokemonList.json');
    const moveList = await fetchJson('data/moveList.json');

    initializeAutoComplete('attacker', pokemonList, 'name'); // 攻撃側ポケモン
    initializeAutoComplete('defender', pokemonList, 'name'); // 防御側ポケモン
    initializeAutoComplete('move', moveList, 'name');       // 技
});

// autoComplete.js のインスタンスを初期化する汎用関数
function initializeAutoComplete(elementId, dataSrc, key) {
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
                    inputElement.dispatchEvent(new Event('change'));
                }
            }
        },
        searchEngine: "loose",
    });
}