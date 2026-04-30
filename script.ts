const options: string[] = ['Schere', 'Stein', 'Papier'];

const emojis: Record<string, string> = {
    'Schere': '✂️',
    'Stein':  '🪨',
    'Papier': '📄',
};

let wins   = 0;
let losses = 0;
let draws  = 0;

function getResult(selection: string, enemySelection: string): 'win' | 'loss' | 'draw' {
    if (selection === enemySelection) return 'draw';
    if (
        (selection === 'Schere' && enemySelection === 'Papier') ||
        (selection === 'Stein'  && enemySelection === 'Schere') ||
        (selection === 'Papier' && enemySelection === 'Stein')
    ) return 'win';
    return 'loss';
}

function animatePop(el: HTMLElement): void {
    el.classList.remove('pop');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('pop');
}

function play(selection: string): void {
    const enemySelection = options[Math.floor(Math.random() * 3)];

    const playerChoiceEl = document.getElementById('playerChoice') as HTMLElement;
    const enemyChoiceEl  = document.getElementById('enemyChoice')  as HTMLElement;
    const resultEl       = document.getElementById('result')        as HTMLElement;

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

    (document.getElementById('wins')   as HTMLElement).textContent = String(wins);
    (document.getElementById('losses') as HTMLElement).textContent = String(losses);
    (document.getElementById('draws')  as HTMLElement).textContent = String(draws);
}
