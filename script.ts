// ============================================================
// Karten-Kampf – Spiellogik
// ============================================================
// Vier Karten treten gegeneinander an. Siegregeln:
//   König  > Dame, Bube     | verliert gegen Ass
//   Dame   > Bube           | verliert gegen König | unentschieden mit Ass
//   Bube   > Ass            | verliert gegen König und Dame
//   Ass    > König          | verliert gegen Bube  | unentschieden mit Dame
//   Joker  > alle anderen Karten (schlägt immer)
//
// Joker-System:
//   Nach jeder Runde erscheint mit JOKER_CHANCE ein zusätzlicher Joker-Button
//   rechts neben den Karten-Buttons. Er kostet 5 EP und schlägt jede Karte.
//
// Energie-System (EP):
//   Jeder Spieler startet mit MAX_EP = 7.
//   Kosten: König 3, Dame 2, Bube 1, Ass 1–4 zufällig, Joker 5.
//   Sind alle Karten zu teuer, muss der Spieler passen.
//   Passt der Gegner, gewinnt der Spieler automatisch diese Runde.
//
// Leben-System (LP):
//   Jeder Spieler startet mit MAX_HP = 10.
//   Verlierer einer Runde: –1 LP. Wer 0 LP erreicht, verliert das Spiel.
// ============================================================

type Choice = 'König' | 'Dame' | 'Bube' | 'Ass' | 'Joker';

const options: Choice[] = ['König', 'Dame', 'Bube', 'Ass']; // Joker ist keine reguläre Option

interface CardInfo { rank: string; suit: string; colorClass: string; }

// Visuelle Daten jeder Karte für makeCardHTML()
const cardData: Record<Choice, CardInfo> = {
    'König': { rank: 'K',  suit: '👑', colorClass: 'black' },
    'Dame':  { rank: 'Q',  suit: '🌹', colorClass: 'red'   },
    'Bube':  { rank: 'J',  suit: '🗡️', colorClass: 'black' },
    'Ass':   { rank: 'A',  suit: '♠', colorClass: 'red'   },
    'Joker': { rank: 'JK', suit: '👅', colorClass: 'joker' },
};

// Siegbedingungen: Karte A → Liste der Karten, die A schlägt.
// Dame ↔ Ass fehlt in beiden Listen → Unentschieden (Sonderfall).
// Joker wird in getResult() vor dieser Map geprüft.
const winsMap: Record<Choice, Choice[]> = {
    'König': ['Dame', 'Bube'],
    'Dame':  ['Bube'],
    'Bube':  ['Ass'],
    'Ass':   ['König'],
    'Joker': ['König', 'Dame', 'Bube', 'Ass'],
};

// EP-Kosten pro Karte.
// Für Ass steht hier 1 (Minimum) – der tatsächliche zufällige Wert
// wird erst in getEnergyCost() berechnet und ist bis dahin unbekannt.
// Dieser Wert wird in updateButtonStates() als Mindest-EP-Prüfung verwendet.
const ENERGY_COST: Record<Choice, number> = {
    'König': 3,
    'Dame':  2,
    'Bube':  1,
    'Ass':   1,
    'Joker': 4,
};

// Wahrscheinlichkeit, dass der Joker-Button nach einer Runde erscheint (12 %)
const JOKER_CHANCE = 0.12;

const MAX_HP = 10; // Startwert Lebenspunkte
const MAX_EP = 7;  // Startwert Energiepunkte

let playerHp = MAX_HP;
let enemyHp  = MAX_HP;
let playerEp = MAX_EP;
let enemyEp  = MAX_EP;
let gameOver     = false; // Sperrt play() und pass() nach Spielende
let jokerVisible = false; // Ob der Joker-Button aktuell eingeblendet ist

// ============================================================
// Hilfsfunktionen
// ============================================================

// ------------------------------------------------------------
// getResult
// Vergleicht Spieler-Karte (a) mit Gegner-Karte (b).
//   1. Joker gewinnt immer (außer Joker vs. Joker → Unentschieden)
//   2. Gleich       → Unentschieden
//   3. a schlägt b  → Sieg
//   4. b schlägt a  → Niederlage
//   5. Keines       → Unentschieden (tritt nur bei Dame ↔ Ass auf)
// ------------------------------------------------------------
function getResult(a: Choice, b: Choice): 'win' | 'loss' | 'draw' {
    if (a === b)       return 'draw';
    if (a === 'Joker') return 'win';
    if (b === 'Joker') return 'loss';
    if (winsMap[a].includes(b)) return 'win';
    if (winsMap[b].includes(a)) return 'loss';
    return 'draw';
}

// ------------------------------------------------------------
// getEnergyCost
// Gibt die tatsächlichen EP-Kosten für das Spielen einer Karte zurück.
// Ass: zufällig 1–4 (zum Zeitpunkt des Ausspielens gewürfelt).
// Alle anderen Karten: fester Wert aus ENERGY_COST.
// ------------------------------------------------------------
function getEnergyCost(choice: Choice): number {
    if (choice === 'Ass') return Math.floor(Math.random() * 3) + 1;
    return ENERGY_COST[choice];
}

// ------------------------------------------------------------
// getEnemyChoice
// Wählt zufällig eine Karte, die der Gegner sich leisten kann.
// Gibt null zurück, wenn der Gegner keine EP mehr für irgendeine
// Karte hat (→ Gegner muss passen).
// Hinweis: Der Gegner kann nie Joker spielen (kein Joker in options).
// ------------------------------------------------------------
function getEnemyChoice(): Choice | null {
    const affordable = options.filter(c => enemyEp >= ENERGY_COST[c]);
    if (affordable.length === 0) return null;
    return affordable[Math.floor(Math.random() * affordable.length)];
}

// ------------------------------------------------------------
// makeCardHTML
// Erzeugt den HTML-String für eine aufgedeckte Karte (.disp-card).
// Struktur:
//   .disp-card [Farbe]
//     .card-corner.tl   – Rang + Symbol oben links
//     .card-center-suit – großes Symbol in der Mitte
//     .card-corner.br   – Rang + Symbol unten rechts (180° gedreht per CSS)
// ------------------------------------------------------------
function makeCardHTML(choice: Choice): string {
    const { rank, suit, colorClass } = cardData[choice];
    return `<div class="disp-card ${colorClass}">` +
        `<div class="card-corner tl"><span class="rank">${rank}</span></div>` +
        `<div class="card-center-suit">${suit}</div>` +
        `<div class="card-corner br"><span class="rank">${rank}</span></div>` +
        `</div>`;
}

// ------------------------------------------------------------
// makePassCardHTML
// Erzeugt den HTML-String für das Pass-Symbol im Kampfbereich.
// Wird angezeigt, wenn Spieler oder Gegner in dieser Runde passt.
// ------------------------------------------------------------
function makePassCardHTML(): string {
    return '<div class="pass-card">🛡️</div>';
}

// ------------------------------------------------------------
// animatePop
// Startet die Pop-Animation neu.
// Das Entfernen + erzwungener Reflow (offsetWidth) stellt sicher,
// dass die Animation auch bei wiederholtem Klick von vorne beginnt.
// ------------------------------------------------------------
function animatePop(el: HTMLElement): void {
    el.classList.remove('pop');
    void el.offsetWidth; // Reflow erzwingen
    el.classList.add('pop');
}

// ============================================================
// Anzeige-Aktualisierungen
// ============================================================

// ------------------------------------------------------------
// updateHpDisplay
// Synchronisiert LP-Balken und LP-Zahlen mit playerHp / enemyHp.
// Balken: scaleX(anteil) → Spieler schrumpft von rechts,
//                          Gegner schrumpft von links (CSS transform-origin).
// Zahlen: CSS-Klasse je nach LP-Stand (grün / orange / rot).
// ------------------------------------------------------------
function updateHpDisplay(): void {
    const playerBar = document.getElementById('playerHpBar')    as HTMLElement;
    const enemyBar  = document.getElementById('enemyHpBar')     as HTMLElement;
    const playerNum = document.getElementById('playerHpNumber') as HTMLElement;
    const enemyNum  = document.getElementById('enemyHpNumber')  as HTMLElement;

    playerBar.style.transform = `scaleX(${playerHp / MAX_HP})`;
    enemyBar.style.transform  = `scaleX(${enemyHp  / MAX_HP})`;

    // LP-Balken rot einfärben bei kritisch niedrigem Stand
    playerBar.className = 'hp-bar player-bar' + (playerHp <= 3 ? ' critical' : '');
    enemyBar.className  = 'hp-bar enemy-bar'  + (enemyHp  <= 3 ? ' critical' : '');

    playerNum.textContent = String(playerHp);
    enemyNum.textContent  = String(enemyHp);

    // Zahlenfarbe: grün ≥ 5, orange ≥ 3, rot sonst
    const hpClass = (hp: number) => hp >= 5 ? '' : hp >= 3 ? 'warn' : 'critical';
    playerNum.className = 'hp-number ' + hpClass(playerHp);
    enemyNum.className  = 'hp-number ' + hpClass(enemyHp);
}

// ------------------------------------------------------------
// updateEpDisplay
// Synchronisiert EP-Balken und EP-Zahlen mit playerEp / enemyEp.
// Farb-Schwellenwerte:
//   EP ≥ 4: blau  (normal)
//   EP ≤ 3: amber (.low)
//   EP = 1: rot   (.critical auf Zahl)
//   EP = 0: grau  (.empty)
// ------------------------------------------------------------
function updateEpDisplay(): void {
    const playerBar = document.getElementById('playerEpBar')    as HTMLElement;
    const enemyBar  = document.getElementById('enemyEpBar')     as HTMLElement;
    const playerNum = document.getElementById('playerEpNumber') as HTMLElement;
    const enemyNum  = document.getElementById('enemyEpNumber')  as HTMLElement;

    playerBar.style.transform = `scaleX(${playerEp / MAX_EP})`;
    enemyBar.style.transform  = `scaleX(${enemyEp  / MAX_EP})`;

    // EP-Balken-Farbe nach Stand
    const epBarClass = (ep: number) =>
        ep === 0 ? ' empty' : ep <= 3 ? ' low' : '';
    playerBar.className = 'ep-bar player-ep-bar' + epBarClass(playerEp);
    enemyBar.className  = 'ep-bar enemy-ep-bar'  + epBarClass(enemyEp);

    playerNum.textContent = String(playerEp);
    enemyNum.textContent  = String(enemyEp);

    // EP-Zahlenfarbe
    const epNumClass = (ep: number) =>
        ep === 0 ? 'empty' : ep === 1 ? 'critical' : ep <= 3 ? 'warn' : '';
    playerNum.className = 'ep-number ' + epNumClass(playerEp);
    enemyNum.className  = 'ep-number ' + epNumClass(enemyEp);
}

// ------------------------------------------------------------
// updateButtonStates
// Aktiviert/Deaktiviert Karten-Buttons je nachdem, ob der Spieler
// genug EP für die jeweilige Karte hat.
// Bei Ass: Mindest-EP ist 1 (tatsächliche Kosten erst beim Spielen bekannt).
// Beim Joker: nur wenn sichtbar; Mindest-EP ist 5.
// Sind alle spielbaren Buttons deaktiviert, erhält der Passen-Button
// die Klasse .forced und leuchtet auf (signalisiert erzwungenes Passen).
// ------------------------------------------------------------
function updateButtonStates(): void {
    const buttonMap: [string, Choice][] = [
        ['btnKoenig', 'König'],
        ['btnDame',   'Dame' ],
        ['btnBube',   'Bube' ],
        ['btnAss',    'Ass'  ],
    ];

    buttonMap.forEach(([id, choice]) => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        btn.disabled = playerEp < ENERGY_COST[choice];
    });

    // Joker-Button: nur aktualisieren wenn er gerade sichtbar ist
    if (jokerVisible) {
        const jokerBtn = document.getElementById('btnJoker') as HTMLButtonElement;
        jokerBtn.disabled = playerEp < ENERGY_COST['Joker'];
    }

    // Passen-Button hervorheben, wenn keine Karte mehr spielbar
    const allRegularDisabled = options.every(c => playerEp < ENERGY_COST[c]);
    const jokerDisabled      = !jokerVisible || playerEp < ENERGY_COST['Joker'];
    const passBtn = document.getElementById('passBtn') as HTMLButtonElement;
    passBtn.classList.toggle('forced', allRegularDisabled && jokerDisabled);
}

// ------------------------------------------------------------
// hideJoker
// Blendet den Joker-Button und seinen Trenner aus und setzt
// jokerVisible = false. Wird bei Spielende und Neustart aufgerufen.
// ------------------------------------------------------------
function hideJoker(): void {
    (document.getElementById('btnJoker') as HTMLElement).style.display = 'none';
    (document.getElementById('jokerSep') as HTMLElement).style.display = 'none';
    (document.querySelector('.container') as HTMLElement).classList.remove('has-joker');
    jokerVisible = false;
}

// ------------------------------------------------------------
// tryShowJoker
// Würfelt, ob der Joker-Button für die nächste Runde erscheint.
// Bei JOKER_CHANCE-Treffer: Einblenden und jokerVisible = true.
// Andernfalls: Ausblenden (via hideJoker).
// Das Einblenden via display = '' triggert @keyframes joker-appear in CSS.
// ------------------------------------------------------------
function tryShowJoker(): void {
    if (Math.random() < JOKER_CHANCE) {
        const btn = document.getElementById('btnJoker') as HTMLButtonElement;
        const sep = document.getElementById('jokerSep') as HTMLElement;
        btn.style.display = '';
        sep.style.display = '';
        (document.querySelector('.container') as HTMLElement).classList.add('has-joker');
        jokerVisible = true;
        btn.disabled = playerEp < ENERGY_COST['Joker'];
    } else {
        hideJoker();
    }
}

// ============================================================
// Game-Over-Logik
// ============================================================

// ------------------------------------------------------------
// showGameOver
// Blendet das Overlay ein. playerWon = true → Sieg, false → Niederlage.
// Wird aus play() mit setTimeout() aufgerufen (700 ms Verzögerung),
// damit die Kartenanimation noch sichtbar bleibt.
// ------------------------------------------------------------
function showGameOver(playerWon: boolean): void {
    const overlay = document.getElementById('gameOverOverlay') as HTMLElement;
    const title   = document.getElementById('gameOverTitle')   as HTMLElement;

    title.textContent = playerWon ? 'Sieg! 🏆' : 'Niederlage! 💀';
    title.className   = 'game-over-title ' + (playerWon ? 'win' : 'loss');
    overlay.classList.add('visible');
}

// ------------------------------------------------------------
// restart
// Setzt das Spiel vollständig zurück:
//   – LP und EP beider Spieler auf Maximalwerte
//   – gameOver-Flag auf false, Joker ausblenden
//   – Alle Anzeigen aktualisieren
//   – Overlay ausblenden, Kartenrücken einblenden, Ergebnistext löschen
// Wird vom "Neu starten"-Button im Overlay aufgerufen.
// ------------------------------------------------------------
function restart(): void {
    playerHp = MAX_HP;
    enemyHp  = MAX_HP;
    playerEp = MAX_EP;
    enemyEp  = MAX_EP;
    gameOver = false;

    hideJoker(); // Erscheint erst wieder nach der ersten gespielten Runde

    updateHpDisplay();
    updateEpDisplay();
    updateButtonStates();

    // Overlay ausblenden
    (document.getElementById('gameOverOverlay') as HTMLElement).classList.remove('visible');

    // Kartenrücken wiederherstellen
    const faceDown = '<div class="face-down-card">?</div>';
    (document.getElementById('playerChoice') as HTMLElement).innerHTML = faceDown;
    (document.getElementById('enemyChoice')  as HTMLElement).innerHTML = faceDown;

    // Ergebnistext zurücksetzen
    const resultEl = document.getElementById('result') as HTMLElement;
    resultEl.className   = 'result';
    resultEl.textContent = 'Wähle eine Option!';
}

// ============================================================
// Spielzug-Funktionen
// ============================================================

// ------------------------------------------------------------
// play
// Hauptfunktion – aufgerufen durch onclick="play('<Karte>')" im HTML.
// Ablauf:
//   1. Abbruch wenn Spiel beendet
//   2. EP-Kosten abziehen (Ass = zufällig 1–4, Joker = 5)
//   3. Gegner-Karte ermitteln; falls null → Gegner passt automatisch
//   4a. Gegner spielt → normaler Kampf, LP-Änderung nach Ergebnis
//   4b. Gegner passt  → Spieler gewinnt (–1 LP beim Gegner, +5 EP für Gegner)
//   5. Anzeigen aktualisieren, Spielende prüfen
//   6. Joker für nächste Runde würfeln (oder ausblenden bei Spielende)
// ------------------------------------------------------------
function play(selection: Choice): void {
    if (gameOver) return;

    // EP des Spielers abziehen; Math.max verhindert negative Werte
    const playerCost = getEnergyCost(selection);
    playerEp = Math.max(0, playerEp - playerCost);

    // Für Ass den tatsächlichen Zufallswert im Ergebnis nennen
    const assNote = (selection === 'Ass') ? ` · Ass kostete ${playerCost} EP` : '';

    const enemyChoice = getEnemyChoice();

    const playerChoiceEl = document.getElementById('playerChoice') as HTMLElement;
    const enemyChoiceEl  = document.getElementById('enemyChoice')  as HTMLElement;
    const resultEl       = document.getElementById('result')        as HTMLElement;

    // Spieler-Karte aufdecken
    playerChoiceEl.innerHTML = makeCardHTML(selection);
    animatePop(playerChoiceEl);

    if (enemyChoice !== null) {
        // ── Normaler Kampf ──────────────────────────────────
        const enemyCost = getEnergyCost(enemyChoice);
        enemyEp = Math.max(0, enemyEp - enemyCost);

        enemyChoiceEl.innerHTML = makeCardHTML(enemyChoice);
        animatePop(enemyChoiceEl);

        const outcome = getResult(selection, enemyChoice);
        resultEl.className = 'result ' + outcome;

        if (outcome === 'win') {
            enemyHp--;
            resultEl.textContent = `Runde gewonnen! 🎉${assNote}`;
        } else if (outcome === 'loss') {
            playerHp--;
            resultEl.textContent = `Runde verloren... 😞${assNote}`;
        } else {
            resultEl.textContent = `Unentschieden! 🤝${assNote}`;
        }
    } else {
        // ── Gegner hat keine EP → Gegner passt automatisch ──
        // Gegner lädt +5 EP auf (analog zur Passen-Regel des Spielers)
        enemyEp = Math.min(MAX_EP, enemyEp + 5);
        // Spieler trifft unverteidigt → Gegner verliert 1 LP
        enemyHp = Math.max(0, enemyHp - 1);
        enemyChoiceEl.innerHTML = makePassCardHTML();
        animatePop(enemyChoiceEl);
        resultEl.className   = 'result win';
        resultEl.textContent = `Gegner hat keine EP und passt! 🎯${assNote}`;
    }

    updateHpDisplay();
    updateEpDisplay();
    updateButtonStates();

    // Spielende prüfen; 700 ms Verzögerung für die Kartenanimation
    if (playerHp === 0 || enemyHp === 0) {
        gameOver = true;
        hideJoker();
        setTimeout(() => showGameOver(enemyHp === 0), 700);
    } else {
        tryShowJoker(); // Würfeln, ob Joker für die nächste Runde erscheint
    }
}

// ------------------------------------------------------------
// pass
// Spieler passt (freiwillig oder weil alle Karten-Buttons deaktiviert).
// Ablauf:
//   1. Abbruch wenn Spiel beendet
//   2. Spieler erhält +5 EP (maximal MAX_EP)
//   3. Pass-Symbol auf Spieler-Seite anzeigen
//   4a. Gegner spielt → Gegner gibt EP aus; Spieler nimmt 1 LP Schaden
//   4b. Gegner passt  → kein Schaden, Gegner erhält +5 EP
//   5. Anzeigen aktualisieren, Spielende prüfen
//   6. Joker für nächste Runde würfeln (oder ausblenden bei Spielende)
// Hinweis: Passen kostet keine EP, lädt aber +5 EP auf (bis MAX_EP).
// ------------------------------------------------------------
function pass(): void {
    if (gameOver) return;

    // +5 EP aufladen; Math.min verhindert Überschreitung von MAX_EP
    playerEp = Math.min(MAX_EP, playerEp + 5);

    const playerChoiceEl = document.getElementById('playerChoice') as HTMLElement;
    const enemyChoiceEl  = document.getElementById('enemyChoice')  as HTMLElement;
    const resultEl       = document.getElementById('result')        as HTMLElement;

    // Pass-Symbol für den Spieler einblenden
    playerChoiceEl.innerHTML = makePassCardHTML();
    animatePop(playerChoiceEl);

    const enemyChoice = getEnemyChoice();

    if (enemyChoice !== null) {
        // Gegner spielt → EP abziehen, Karte zeigen
        // Spieler hat nicht angegriffen → trifft unverteidigt → –1 LP
        const enemyCost = getEnergyCost(enemyChoice);
        enemyEp  = Math.max(0, enemyEp  - enemyCost);
        playerHp = Math.max(0, playerHp - 1);
        enemyChoiceEl.innerHTML = makeCardHTML(enemyChoice);
        animatePop(enemyChoiceEl);
        resultEl.className   = 'result loss';
        resultEl.textContent = 'Du passt – Gegner trifft! 😞';
    } else {
        // Gegner hat ebenfalls keine EP → beide passen, kein Schaden
        // Gegner lädt +5 EP auf (analog zur Passen-Regel des Spielers)
        enemyEp = Math.min(MAX_EP, enemyEp + 5);
        enemyChoiceEl.innerHTML = makePassCardHTML();
        animatePop(enemyChoiceEl);
        resultEl.className   = 'result draw';
        resultEl.textContent = 'Beide passen. Kein Schaden. ⏸️';
    }

    updateHpDisplay();
    updateEpDisplay();
    updateButtonStates();

    // Spielende prüfen (Spieler könnte durch Gegner-Treffer auf 0 fallen)
    if (playerHp === 0 || enemyHp === 0) {
        gameOver = true;
        hideJoker();
        setTimeout(() => showGameOver(enemyHp === 0), 700);
    } else {
        tryShowJoker(); // Würfeln, ob Joker für die nächste Runde erscheint
    }
}

// ── Initialisierung beim Seitenaufruf ──────────────────────
// Button-Zustände einmal setzen, bevor der Spieler die erste Karte wählt.
// (Alle Buttons sind bei 7 EP aktiv; dieser Aufruf ist ein sicherer Startpunkt.)
updateButtonStates();
