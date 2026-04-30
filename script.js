"use strict";

const options = ['Schere', 'Stein', 'Papier'];

const emojis = {
    'Schere': '✂️',
    'Stein':  '🪨',
    'Papier': '📄',
};

let wins   = 0;
let losses = 0;
let draws  = 0;

function getResult(selection, enemySelection) {
    if (selection === enemySelection) return 'draw';
    if (
        (selection === 'Schere' && enemySelection === 'Papier') ||
        (selection === 'Stein'  && enemySelection === 'Schere') ||
        (selection === 'Papier' && enemySelection === 'Stein')
    ) return 'win';
    return 'loss';
}

function animatePop(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
}

function play(selection) {
    const enemySelection = options[Math.floor(Math.random() * 3)];

    const playerChoiceEl = document.getElementById('playerChoice');
    const enemyChoiceEl  = document.getElementById('enemyChoice');
    const resultEl       = document.getElementById('result');

    playerChoiceEl.textContent = emojis[selection];
    enemyChoiceEl.textContent  = emojis[enemySelection];
    animatePop(playerChoiceEl);
    animatePop(enemyChoiceEl);

    const outcome = getResult(selection, enemySelection);
    resultEl.className = 'result ' + outcome;

    if (outcome === 'win') {
        wins++;
        resultEl.textContent = 'Du hast gewonnen! 🎉';
    } else if (outcome === 'loss') {
        losses++;
        resultEl.textContent = 'Du hast verloren... 😞';
    } else {
        draws++;
        resultEl.textContent = 'Unentschieden! 🤝';
    }

    document.getElementById('wins').textContent   = String(wins);
    document.getElementById('losses').textContent = String(losses);
    document.getElementById('draws').textContent  = String(draws);
}
