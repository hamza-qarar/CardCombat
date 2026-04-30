"use strict";
// ============================================================
// Karten-Kampf – Spiellogik (kompiliertes JavaScript)
// ============================================================
// Vier Karten treten gegeneinander an. Die Siegbedingungen
// sind nicht transitiv: König > Dame > Bube > Ass > König,
// aber Dame und Ass enden immer unentschieden.
// ============================================================

// Alle möglichen Optionen – wird für die zufällige Gegnerwahl genutzt
const options = ['König', 'Dame', 'Bube', 'Ass'];

// Ordnet jeder Karte ihre visuelle Darstellung zu:
//   rank       – Buchstabe oben links / unten rechts (K, Q, J, A)
//   suit       – Kartenzeichen (♠ ♥ ♣ ♦)
//   colorClass – CSS-Klasse 'black' oder 'red'
const cardData = {
    'König': { rank: 'K', suit: '♠', colorClass: 'black' },
    'Dame':  { rank: 'Q', suit: '♥', colorClass: 'red'   },
    'Bube':  { rank: 'J', suit: '♣', colorClass: 'black' },
    'Ass':   { rank: 'A', suit: '♦', colorClass: 'red'   },
};

// Definiert, welche Karten eine gegebene Karte besiegt.
// Was hier NICHT steht, ist entweder eine Niederlage oder ein Unentschieden.
//   König schlägt: Dame, Bube
//   Dame  schlägt: Bube
//   Bube  schlägt: Ass
//   Ass   schlägt: König
// Sonderfall: Dame vs. Ass → Unentschieden (steht in keiner Liste)
const winsMap = {
    'König': ['Dame', 'Bube'],
    'Dame':  ['Bube'],
    'Bube':  ['Ass'],
    'Ass':   ['König'],
};

// Punktestand – wird bei jeder Runde aktualisiert und im DOM angezeigt
let winCount  = 0;
let lossCount = 0;
let drawCount = 0;

// ------------------------------------------------------------
// getResult
// Vergleicht die Wahl des Spielers (a) mit der des Gegners (b).
// Reihenfolge der Prüfung:
//   1. Gleiche Karte → Unentschieden
//   2. a schlägt b laut winsMap → Sieg
//   3. b schlägt a laut winsMap → Niederlage
//   4. Keines davon (nur möglich bei Dame vs. Ass) → Unentschieden
// ------------------------------------------------------------
function getResult(a, b) {
    if (a === b) return 'draw';
    if (winsMap[a].includes(b)) return 'win';
    if (winsMap[b].includes(a)) return 'loss';
    return 'draw'; // Sonderfall: Dame ↔ Ass
}

// ------------------------------------------------------------
// makeCardHTML
// Erzeugt den HTML-String für eine aufgedeckte Karte im Kampfbereich.
// Struktur:
//   .disp-card          – weißes Kartenrechteck
//     .card-corner.tl   – Rang + Symbol oben links
//     .card-center-suit – großes Symbol in der Mitte
//     .card-corner.br   – Rang + Symbol unten rechts (per CSS um 180° gedreht)
// ------------------------------------------------------------
function makeCardHTML(choice) {
    const { rank, suit, colorClass } = cardData[choice];
    return `<div class="disp-card ${colorClass}">` +
        `<div class="card-corner tl"><span class="rank">${rank}</span><span class="suit">${suit}</span></div>` +
        `<div class="card-center-suit">${suit}</div>` +
        `<div class="card-corner br"><span class="rank">${rank}</span><span class="suit">${suit}</span></div>` +
        `</div>`;
}

// ------------------------------------------------------------
// animatePop
// Startet die Pop-Animation auf einem Element neu.
// Das Entfernen der Klasse + erzwungener Reflow (offsetWidth)
// stellt sicher, dass die Animation auch bei wiederholtem
// Klick von vorne beginnt.
// ------------------------------------------------------------
function animatePop(el) {
    el.classList.remove('pop');
    void el.offsetWidth; // Reflow erzwingen, damit die Animation neu startet
    el.classList.add('pop');
}

// ------------------------------------------------------------
// play
// Wird von den Buttons im HTML aufgerufen (onclick="play('König')").
// Ablauf:
//   1. Zufällige Gegnerkarte auswählen
//   2. Karten-HTML in den Kampfbereich schreiben
//   3. Pop-Animation auf beiden Seiten starten
//   4. Ergebnis berechnen und anzeigen
//   5. Punktestand aktualisieren
// ------------------------------------------------------------
function play(selection) {
    // Zufällige Auswahl aus den 4 Optionen (Index 0–3)
    const enemySelection = options[Math.floor(Math.random() * options.length)];

    // DOM-Elemente für Kampfanzeige und Ergebnistext
    const playerChoiceEl = document.getElementById('playerChoice');
    const enemyChoiceEl  = document.getElementById('enemyChoice');
    const resultEl       = document.getElementById('result');

    // Karten aufdecken (ersetzt den Kartenrücken oder die vorherige Karte)
    playerChoiceEl.innerHTML = makeCardHTML(selection);
    enemyChoiceEl.innerHTML  = makeCardHTML(enemySelection);

    // Beide Karten animieren
    animatePop(playerChoiceEl);
    animatePop(enemyChoiceEl);

    // Ergebnis ermitteln und CSS-Klasse setzen (steuert Farbe des Ergebnisfelds)
    const outcome = getResult(selection, enemySelection);
    resultEl.className = 'result ' + outcome; // z.B. 'result win'

    // Text und Zähler je nach Ergebnis aktualisieren
    if (outcome === 'win') {
        winCount++;
        resultEl.textContent = 'Du hast gewonnen! 🎉';
    } else if (outcome === 'loss') {
        lossCount++;
        resultEl.textContent = 'Du hast verloren... 😞';
    } else {
        drawCount++;
        resultEl.textContent = 'Unentschieden! 🤝';
    }

    // Punktestand im Score-Board aktualisieren
    document.getElementById('wins').textContent   = String(winCount);
    document.getElementById('losses').textContent = String(lossCount);
    document.getElementById('draws').textContent  = String(drawCount);
}
