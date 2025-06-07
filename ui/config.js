// ui/config.js

export const panelIds = ['red1', 'red2', 'blue1', 'blue2'];

export const initialPanelStatsTemplate = {
    pokemonName: '',
    moveName: '',
    item: '', // 持ち物を追加
    ability: { name: '', custom: '', nullified: false, selectedButton: null },
    typeChange: '',
    moveTimes: 1,
    doubleDamage: false,
    stats: {
        hp: { iv: 31, ev: 0, actual: 0 },
        attack: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 },
        defense: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 },
        spAttack: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 },
        spDefense: { iv: 31, ev: 0, nature: 1.0, rank: 0, actual: 0 }
    },
    currentHP: 0,
    maxHP: 0
};