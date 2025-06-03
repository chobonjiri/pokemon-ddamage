// ui/data-loader.js

export let pokemonData = [];
export let moveData = [];

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTPエラー！ステータス: ${response.status} URL: ${url}`);
      throw new Error(`HTTP error! status: ${response.status} from ${url}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching JSON from ${url}:`, error);
    return [];
  }
}

export async function loadAllData() {
  pokemonData = await fetchJson('data/pokemonList.json');
  moveData = await fetchJson('data/moveList.json');
}