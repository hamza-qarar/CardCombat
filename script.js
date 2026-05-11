// ============================================================
// Karten-Kampf – Spiellogik
// ============================================================
// Dieses Spiel läuft rundenweise: Spieler und Gegner wählen je
// eine Karte. Die Karten werden verglichen und der Verlierer
// verliert einen Lebenspunkt (LP). Wer zuerst 0 LP hat, verliert.
//
// Welche Karte schlägt welche?
//   König  schlägt  Dame und Bube  – verliert gegen Ass
//   Dame   schlägt  Bube           – verliert gegen König
//   Bube   schlägt  Ass            – verliert gegen König und Dame
//   Ass    schlägt  König          – verliert gegen Bube
//   Dame ↔ Ass: keiner gewinnt → Unentschieden
//   Joker  schlägt  jede andere Karte (außer gegen sich selbst)
//
// Joker-System:
//   Nach jeder Runde erscheint der Joker-Button mit einer Wahrscheinlichkeit
//   von JOKER_CHANCE (12 %). Er kostet 5 EP und schlägt jede Karte.
//
// Energie-System (EP):
//   Jede Karte kostet Energie. Ohne genug EP kann man eine Karte nicht spielen.
//   Wer keine Karte mehr spielen kann, muss passen.
//   Kosten: König 3, Dame 2, Bube 1, Ass 1–4 (Zufallswert), Joker 5.
//   Startwert: MAX_EP = 7 EP pro Spieler.
//
// Leben-System (LP):
//   Der Verlierer einer Runde verliert 1 LP. Bei 0 LP ist das Spiel vorbei.
//   Startwert: MAX_HP = 10 LP pro Spieler.
// ============================================================

// "options" enthält die vier normalen Karten, die immer zur Auswahl stehen.
// Der Joker ist hier nicht dabei, weil er nur zufällig erscheint.
const options = ['König', 'Dame', 'Bube', 'Ass'];

// "cardData" speichert die Darstellungs-Informationen jeder Karte:
// - rank:       der kurze Buchstabe, der auf der Karte steht (z. B. "K" für König)
// - suit:       das Symbol (Emoji) in der Mitte der Karte
// - colorClass: die CSS-Klasse, die Farbe und Stil der Karte bestimmt
const cardData = {
    'König': { rank: 'K',  suit: '👑', colorClass: 'black' },
    'Dame':  { rank: 'Q',  suit: '🌹', colorClass: 'red'   },
    'Bube':  { rank: 'J',  suit: '🗡️', colorClass: 'black' },
    'Ass':   { rank: 'A',  suit: '♠', colorClass: 'red'   },
    'Joker': { rank: 'JK', suit: '👅', colorClass: 'joker' },
};

// "winsMap" legt fest, welche Karten eine bestimmte Karte schlägt.
// Beispiel: winsMap['König'] = ['Dame', 'Bube'] bedeutet,
//           der König schlägt Dame und Bube.
// Dame und Ass tauchen gegenseitig nicht in ihren Listen auf →
// das ist Absicht: Dame gegen Ass endet immer unentschieden.
// Joker schlägt alle – aber der Joker-Fall wird in getResult()
// noch vor dieser Map behandelt.
const winsMap = {
    'König': ['Dame', 'Bube'],
    'Dame':  ['Bube'],
    'Bube':  ['Ass'],
    'Ass':   ['König'],
    'Joker': ['König', 'Dame', 'Bube', 'Ass'],
};

// "ENERGY_COST" gibt an, wie viele EP eine Karte kostet.
// Beim Ass steht hier eine 1 – das ist nur der Mindestwert für die Prüfung,
// ob der Button aktiv sein soll. Den echten Zufallswert (1–4) berechnet
// getEnergyCost() erst dann, wenn der Spieler die Karte tatsächlich ausspielt.
const ENERGY_COST = {
    'König': 3,
    'Dame':  2,
    'Bube':  1,
    'Ass':   1,
    'Joker': 4,
};

// Mit welcher Wahrscheinlichkeit erscheint der Joker nach einer Runde?
// 0.12 entspricht 12 % – Math.random() liefert eine Zufallszahl zwischen 0 und 1,
// und ist sie kleiner als 0.12, erscheint der Joker.
const JOKER_CHANCE = 0.12;

const MAX_HP = 10; // Jeder Spieler startet mit 10 Lebenspunkten
const MAX_EP = 7;  // Jeder Spieler startet mit 7 Energiepunkten

// Diese Variablen verändern sich während des Spiels und speichern
// den aktuellen Zustand beider Spieler sowie Spielfluss-Informationen.
let playerHp = MAX_HP;
let enemyHp  = MAX_HP;
let playerEp = MAX_EP;
let enemyEp  = MAX_EP;
let gameOver     = false; // true = Spiel vorbei; blockiert weitere Eingaben
let jokerVisible = false; // true = Joker-Button ist gerade sichtbar

// ============================================================
// Hilfsfunktionen
// ============================================================

// ------------------------------------------------------------
// getResult
// Vergleicht die Karte des Spielers (a) mit der des Gegners (b)
// und gibt das Ergebnis als Text zurück: 'win', 'loss' oder 'draw'.
//
// Reihenfolge der Prüfungen:
//   1. Gleiche Karte → immer Unentschieden
//   2. Spieler hat Joker → Spieler gewinnt immer
//   3. Gegner hat Joker → Spieler verliert immer
//   4. Steht b in der Gewinnt-Liste von a → Spieler gewinnt
//   5. Steht a in der Gewinnt-Liste von b → Spieler verliert
//   6. Keine Übereinstimmung → Unentschieden (tritt nur bei Dame ↔ Ass auf)
// ------------------------------------------------------------
function getResult(a, b) {
    if (a === b)       return 'draw';
    if (a === 'Joker') return 'win';
    if (b === 'Joker') return 'loss';
    if (winsMap[a].includes(b)) return 'win';
    if (winsMap[b].includes(a)) return 'loss';
    return 'draw';
}

// ------------------------------------------------------------
// getEnergyCost
// Gibt zurück, wie viele EP das Spielen der übergebenen Karte kostet.
// Beim Ass wird erst jetzt ein Zufallswert zwischen 1 und 3 gezogen:
//   Math.random()       → Zahl zwischen 0.0 und 0.9999...
//   * 3                 → Zahl zwischen 0.0 und 2.9999...
//   Math.floor(...)     → abrunden auf ganze Zahl → 0, 1 oder 2
//   + 1                 → Verschiebung auf 1, 2 oder 3
// Alle anderen Karten haben feste Kosten aus ENERGY_COST.
// ------------------------------------------------------------
function getEnergyCost(choice) {
    if (choice === 'Ass') return Math.floor(Math.random() * 3) + 1;
    return ENERGY_COST[choice];
}

// ------------------------------------------------------------
// getEnemyChoice
// Bestimmt zufällig, welche Karte der Gegner spielen wird.
// Zuerst wird gefiltert, welche Karten er sich noch leisten kann
// (d. h. sein EP-Vorrat reicht für die Kosten der Karte aus).
// Gibt es keine bezahlbare Karte, wird null zurückgegeben –
// das bedeutet: der Gegner muss passen.
// Der Gegner kann nie Joker spielen, weil dieser nicht in "options" steht.
// ------------------------------------------------------------
function getEnemyChoice() {
    // filter() geht jede Karte durch und behält nur die, bei denen
    // die Bedingung (genug EP) erfüllt ist.
    const affordable = options.filter(c => enemyEp >= ENERGY_COST[c]);
    if (affordable.length === 0) return null; // null = "keine Karte verfügbar"
    // Aus den bezahlbaren Karten wird eine zufällig ausgewählt:
    // Math.floor(Math.random() * affordable.length) liefert einen
    // gültigen Index (0 bis Länge-1).
    return affordable[Math.floor(Math.random() * affordable.length)];
}

// ------------------------------------------------------------
// makeCardHTML
// Baut den HTML-Code für eine aufgedeckte Karte zusammen und gibt
// ihn als Text zurück. Dieser Text wird später mit innerHTML
// in den Kartenbereich eingefügt, damit der Browser die Karte anzeigt.
//
// Aufbau einer Karte (vereinfacht):
//   ┌─────────────────┐
//   │ K               │   ← .card-corner.tl (oben links)
//   │                 │
//   │       👑        │   ← .card-center-suit (Mitte)
//   │                 │
//   │               K │   ← .card-corner.br (unten rechts, per CSS gedreht)
//   └─────────────────┘
// ------------------------------------------------------------
function makeCardHTML(choice) {
    // Destrukturierung: holt rank, suit und colorClass direkt aus cardData
    const { rank, suit, colorClass } = cardData[choice];
    return `<div class="disp-card ${colorClass}">` +
        `<div class="card-corner tl"><span class="rank">${rank}</span></div>` +
        `<div class="card-center-suit">${suit}</div>` +
        `<div class="card-corner br"><span class="rank">${rank}</span></div>` +
        `</div>`;
}

// ------------------------------------------------------------
// makePassCardHTML
// Gibt den HTML-Code für das Passen-Symbol zurück.
// Wird angezeigt, wenn Spieler oder Gegner in dieser Runde gepasst haben,
// also keine Karte ausgespielt wurde.
// ------------------------------------------------------------
function makePassCardHTML() {
    return '<div class="pass-card">🛡️</div>';
}

// ------------------------------------------------------------
// animatePop
// Spielt die Pop-Animation auf einem Element erneut ab.
// Problem: CSS-Animationen starten nur einmal beim ersten Hinzufügen
// der Klasse. Damit sie bei jedem Klick von vorne beginnt:
//   1. Klasse entfernen (Animation stoppt)
//   2. offsetWidth lesen → der Browser berechnet das Layout neu (Reflow)
//      – dieser Trick ist nötig, damit der Browser das Entfernen
//        wirklich registriert, bevor die Klasse wieder hinzugefügt wird
//   3. Klasse wieder hinzufügen → Animation startet frisch
// ------------------------------------------------------------
function animatePop(el) {
    el.classList.remove('pop');
    void el.offsetWidth; // Reflow erzwingen – ohne das würde die Animation nicht neu starten
    el.classList.add('pop');
}

// ============================================================
// Anzeige-Aktualisierungen
// ============================================================

// ------------------------------------------------------------
// updateHpDisplay
// Aktualisiert die Lebensbalken und Zahlen auf dem Bildschirm,
// damit sie den aktuellen LP-Stand widerspiegeln.
//
// Wie funktioniert der Balken?
//   Der Balken hat immer dieselbe volle Breite im CSS.
//   Mit scaleX() wird er stufenlos gestaucht:
//     scaleX(1.0) = voller Balken (10/10 LP)
//     scaleX(0.5) = halber Balken (5/10 LP)
//     scaleX(0.0) = unsichtbarer Balken (0 LP)
//
// Farb-Schwellenwerte für die LP-Zahl:
//   ≥ 5 LP → grün   (Standard, keine extra Klasse)
//   3–4 LP → orange (.warn)
//   1–2 LP → rot    (.critical)
// ------------------------------------------------------------
function updateHpDisplay() {
    const playerBar = document.getElementById('playerHpBar');
    const enemyBar  = document.getElementById('enemyHpBar');
    const playerNum = document.getElementById('playerHpNumber');
    const enemyNum  = document.getElementById('enemyHpNumber');

    // Balken stauchen: aktueller LP-Wert geteilt durch Maximum ergibt den Anteil
    playerBar.style.transform = `scaleX(${playerHp / MAX_HP})`;
    enemyBar.style.transform  = `scaleX(${enemyHp  / MAX_HP})`;

    // Bei wenigen LP wird die CSS-Klasse "critical" gesetzt → Balken wird rot
    playerBar.className = 'hp-bar player-bar' + (playerHp <= 3 ? ' critical' : '');
    enemyBar.className  = 'hp-bar enemy-bar'  + (enemyHp  <= 3 ? ' critical' : '');

    // LP-Zahl im HTML aktualisieren (String() wandelt die Zahl in Text um)
    playerNum.textContent = String(playerHp);
    enemyNum.textContent  = String(enemyHp);

    // Hilfsfunktion: gibt die passende Farb-Klasse für den LP-Wert zurück
    const hpClass = hp => hp >= 5 ? '' : hp >= 3 ? 'warn' : 'critical';
    playerNum.className = 'hp-number ' + hpClass(playerHp);
    enemyNum.className  = 'hp-number ' + hpClass(enemyHp);
}

// ------------------------------------------------------------
// updateEpDisplay
// Aktualisiert die Energiebalken und Zahlen, genau wie updateHpDisplay
// für LP – aber mit EP-spezifischen Farb-Schwellenwerten:
//   ≥ 4 EP → blau   (Standard)
//   1–3 EP → gelb-orange (.low)
//   1   EP → rot auf der Zahl (.critical)
//   0   EP → grau   (.empty) – Spieler kann keine Karte mehr spielen
// ------------------------------------------------------------
function updateEpDisplay() {
    const playerBar = document.getElementById('playerEpBar');
    const enemyBar  = document.getElementById('enemyEpBar');
    const playerNum = document.getElementById('playerEpNumber');
    const enemyNum  = document.getElementById('enemyEpNumber');

    playerBar.style.transform = `scaleX(${playerEp / MAX_EP})`;
    enemyBar.style.transform  = `scaleX(${enemyEp  / MAX_EP})`;

    // Hilfsfunktion für die Balken-Farbe: gibt die zusätzliche CSS-Klasse zurück
    const epBarClass = ep =>
        ep === 0 ? ' empty' : ep <= 3 ? ' low' : '';
    playerBar.className = 'ep-bar player-ep-bar' + epBarClass(playerEp);
    enemyBar.className  = 'ep-bar enemy-ep-bar'  + epBarClass(enemyEp);

    playerNum.textContent = String(playerEp);
    enemyNum.textContent  = String(enemyEp);

    // Hilfsfunktion für die Zahlen-Farbe
    const epNumClass = ep =>
        ep === 0 ? 'empty' : ep === 1 ? 'critical' : ep <= 3 ? 'warn' : '';
    playerNum.className = 'ep-number ' + epNumClass(playerEp);
    enemyNum.className  = 'ep-number ' + epNumClass(enemyEp);
}

// ------------------------------------------------------------
// updateButtonStates
// Überprüft für jeden Karten-Button, ob der Spieler genug EP hat,
// und schaltet den Button entsprechend ein (aktiv) oder aus (disabled).
// Ein deaktivierter Button kann nicht geklickt werden.
//
// Danach prüft die Funktion: Sind alle Buttons deaktiviert?
// Falls ja, bekommt der Passen-Button die Klasse .forced – er leuchtet
// dann auf und signalisiert dem Spieler, dass er passen muss.
// ------------------------------------------------------------
function updateButtonStates() {
    // Eine Liste aus Paaren [Button-ID, Kartenname] zum einfachen Durchlaufen
    const buttonMap = [
        ['btnKoenig', 'König'],
        ['btnDame',   'Dame' ],
        ['btnBube',   'Bube' ],
        ['btnAss',    'Ass'  ],
    ];

    // forEach geht jedes Paar durch und setzt den Button auf disabled,
    // wenn der Spieler weniger EP hat als die Karte kostet
    buttonMap.forEach(([id, choice]) => {
        const btn = document.getElementById(id);
        btn.disabled = playerEp < ENERGY_COST[choice];
    });

    // Den Joker-Button nur prüfen, wenn er gerade sichtbar ist
    if (jokerVisible) {
        const jokerBtn = document.getElementById('btnJoker');
        jokerBtn.disabled = playerEp < ENERGY_COST['Joker'];
    }

    // every() gibt true zurück, wenn die Bedingung für jede Karte erfüllt ist –
    // hier also, wenn der Spieler sich keine einzige normale Karte leisten kann
    const allRegularDisabled = options.every(c => playerEp < ENERGY_COST[c]);
    // jokerDisabled ist true, wenn kein Joker sichtbar ist ODER der Spieler ihn nicht bezahlen kann
    const jokerDisabled      = !jokerVisible || playerEp < ENERGY_COST['Joker'];
    const passBtn = document.getElementById('passBtn');
    // classList.toggle fügt die Klasse hinzu, wenn die Bedingung wahr ist, sonst entfernt er sie
    passBtn.classList.toggle('forced', allRegularDisabled && jokerDisabled);
}

// ------------------------------------------------------------
// hideJoker
// Versteckt den Joker-Button und seinen optischen Trenner
// und setzt jokerVisible auf false.
// Wird beim Spielende und beim Neustart aufgerufen, damit der
// Joker nicht unerwartet sichtbar bleibt.
// ------------------------------------------------------------
function hideJoker() {
    document.getElementById('btnJoker').style.display = 'none';
    document.getElementById('jokerSep').style.display = 'none';
    document.querySelector('.container').classList.remove('has-joker');
    jokerVisible = false;
}

// ------------------------------------------------------------
// tryShowJoker
// Entscheidet per Zufall, ob der Joker-Button nach dieser Runde erscheint.
// Math.random() gibt eine Zufallszahl zwischen 0 und 1 zurück.
// Ist sie kleiner als JOKER_CHANCE (0.12), erscheint der Joker.
// Das entspricht einer Wahrscheinlichkeit von 12 %.
//
// Einblenden: style.display = '' entfernt die direkt gesetzte Ausblend-Regel
// und lässt den Button wieder sichtbar werden. Das CSS-Keyframe
// "joker-appear" spielt dann die Einblendeanimation ab.
// ------------------------------------------------------------
function tryShowJoker() {
    if (Math.random() < JOKER_CHANCE) {
        const btn = document.getElementById('btnJoker');
        const sep = document.getElementById('jokerSep');
        btn.style.display = ''; // leerer String hebt display:none auf
        sep.style.display = '';
        document.querySelector('.container').classList.add('has-joker');
        jokerVisible = true;
        // Sofort prüfen, ob der Spieler sich den Joker leisten kann
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
// Blendet das Spielende-Overlay ein, das den Sieg oder die Niederlage anzeigt.
// playerWon = true  → Spieler hat gewonnen → Sieg-Nachricht
// playerWon = false → Spieler hat verloren → Niederlage-Nachricht
//
// Diese Funktion wird nicht sofort aufgerufen, sondern mit 700 ms
// Verzögerung (via setTimeout in play/pass), damit die Kartenanimation
// noch kurz sichtbar ist, bevor das Overlay erscheint.
// ------------------------------------------------------------
function showGameOver(playerWon) {
    const overlay = document.getElementById('gameOverOverlay');
    const title   = document.getElementById('gameOverTitle');

    title.textContent = playerWon ? 'Sieg! 🏆' : 'Niederlage! 💀';
    // CSS-Klasse 'win' oder 'loss' steuert die Farbe der Überschrift
    title.className   = 'game-over-title ' + (playerWon ? 'win' : 'loss');
    // 'visible' blendet das Overlay ein (wird im CSS mit opacity/pointer-events gesteuert)
    overlay.classList.add('visible');
}

// ------------------------------------------------------------
// restart
// Setzt alle Spielvariablen auf ihre Startwerte zurück und
// bringt die Oberfläche in den Ausgangszustand:
//   - LP und EP beider Spieler werden auf MAX_HP / MAX_EP gesetzt
//   - Das gameOver-Flag wird deaktiviert, damit Klicks wieder reagieren
//   - Der Joker wird ausgeblendet (erscheint erst nach der ersten Runde)
//   - Alle Balken und Zahlen werden neu gezeichnet
//   - Das Spielende-Overlay wird ausgeblendet
//   - Die Kartenbereiche zeigen wieder die verdeckten Kartenrücken (?)
//   - Der Ergebnistext wird zurückgesetzt
// ------------------------------------------------------------
function restart() {
    playerHp = MAX_HP;
    enemyHp  = MAX_HP;
    playerEp = MAX_EP;
    enemyEp  = MAX_EP;
    gameOver = false;

    hideJoker(); // Joker erst wieder nach der ersten gespielten Runde möglich

    // Alle Anzeigen auf die neuen (Start-)Werte aktualisieren
    updateHpDisplay();
    updateEpDisplay();
    updateButtonStates();

    // Das Overlay schließen
    document.getElementById('gameOverOverlay').classList.remove('visible');

    // Kartenrücken anzeigen – der Spieler sieht noch keine aufgedeckten Karten
    const faceDown = '<div class="face-down-card">?</div>';
    document.getElementById('playerChoice').innerHTML = faceDown;
    document.getElementById('enemyChoice').innerHTML  = faceDown;

    // Ergebnis-Bereich auf den Starttext zurücksetzen und Farben entfernen
    const resultEl = document.getElementById('result');
    resultEl.className   = 'result';
    resultEl.textContent = 'Wähle eine Option!';
}

// ============================================================
// Spielzug-Funktionen
// ============================================================

// ------------------------------------------------------------
// play
// Wird aufgerufen, wenn der Spieler einen Karten-Button klickt.
// Der Parameter "selection" enthält den Namen der gewählten Karte.
//
// Ablauf eines Spielzugs:
//   1. Spiel bereits beendet? → nichts tun (gameOver-Schutz)
//   2. EP-Kosten der gewählten Karte abziehen
//      (Math.max(0, ...) verhindert, dass EP unter 0 fallen)
//   3. Gegner-Karte auslosen; falls null → Gegner passt automatisch
//   4a. Gegner spielt eine Karte:
//         - EP des Gegners abziehen
//         - Karten vergleichen → Ergebnis bestimmen
//         - LP-Änderung beim Verlierer
//   4b. Gegner kann keine Karte spielen (keine EP):
//         - Gegner erhält +5 EP (lädt auf, als hätte er gepasst)
//         - Spieler trifft unverteidigt → Gegner verliert 1 LP
//   5. Alle Anzeigen aktualisieren
//   6. Hat jemand 0 LP? → Spiel beenden (700 ms Verzögerung für Animation)
//   7. Noch kein Spielende? → Würfeln, ob Joker erscheint
// ------------------------------------------------------------
function play(selection) {
    if (gameOver) return; // Schutz: nach Spielende keine weiteren Züge

    // EP abziehen; Math.max(0, ...) stellt sicher, dass EP nie negativ wird
    const playerCost = getEnergyCost(selection);
    playerEp = Math.max(0, playerEp - playerCost);

    // Beim Ass die tatsächlichen (zufälligen) Kosten im Ergebnistext erwähnen
    const assNote = (selection === 'Ass') ? ` · Ass kostete ${playerCost} EP` : '';

    const enemyChoice = getEnemyChoice(); // null = Gegner kann nicht spielen

    // HTML-Elemente aus dem Dokument holen, um sie zu aktualisieren
    const playerChoiceEl = document.getElementById('playerChoice');
    const enemyChoiceEl  = document.getElementById('enemyChoice');
    const resultEl       = document.getElementById('result');

    // Spieler-Karte aufdecken und Pop-Animation starten
    playerChoiceEl.innerHTML = makeCardHTML(selection);
    animatePop(playerChoiceEl);

    if (enemyChoice !== null) {
        // ── Normaler Kampf: Gegner hat eine Karte gespielt ──────────────
        const enemyCost = getEnergyCost(enemyChoice);
        enemyEp = Math.max(0, enemyEp - enemyCost);

        enemyChoiceEl.innerHTML = makeCardHTML(enemyChoice);
        animatePop(enemyChoiceEl);

        const outcome = getResult(selection, enemyChoice); // 'win', 'loss' oder 'draw'
        resultEl.className = 'result ' + outcome; // CSS-Klasse für Farbe setzen

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
        // ── Gegner passt automatisch: er hatte keine EP mehr ────────────
        // Gegner bekommt +5 EP zurück (wie bei einer normalen Passen-Aktion)
        enemyEp = Math.min(MAX_EP, enemyEp + 5);
        // Spieler trifft unverteidigt → Gegner verliert 1 LP
        enemyHp = Math.max(0, enemyHp - 1);
        enemyChoiceEl.innerHTML = makePassCardHTML();
        animatePop(enemyChoiceEl);
        resultEl.className   = 'result win';
        resultEl.textContent = `Gegner hat keine EP und passt! 🎯${assNote}`;
    }

    // Alle Anzeigen auf den neuesten Stand bringen
    updateHpDisplay();
    updateEpDisplay();
    updateButtonStates();

    // Spielende-Prüfung: Hat jemand 0 LP erreicht?
    if (playerHp === 0 || enemyHp === 0) {
        gameOver = true;
        hideJoker(); // Joker soll bei Spielende nicht mehr sichtbar sein
        // 700 ms warten, damit die Karten-Animation noch zu sehen ist
        setTimeout(() => showGameOver(enemyHp === 0), 700);
    } else {
        tryShowJoker(); // Würfeln: erscheint der Joker in der nächsten Runde?
    }
}

// ------------------------------------------------------------
// pass
// Wird aufgerufen, wenn der Spieler den Passen-Button klickt
// (freiwillig oder weil alle Karten-Buttons deaktiviert sind).
//
// Ablauf:
//   1. Spiel bereits beendet? → nichts tun
//   2. Spieler erhält +5 EP (lädt auf, als Ausgleich fürs Passen)
//      (Math.min(MAX_EP, ...) verhindert, dass EP über das Maximum steigen)
//   3. Pass-Symbol auf Spieler-Seite einblenden
//   4a. Gegner spielt eine Karte:
//         - EP des Gegners abziehen
//         - Spieler hat nicht angegriffen → trifft unverteidigt → –1 LP
//   4b. Gegner passt ebenfalls (keine EP):
//         - Kein Schaden für beide
//         - Gegner erhält ebenfalls +5 EP
//   5. Alle Anzeigen aktualisieren
//   6. Hat jemand 0 LP? → Spiel beenden
//   7. Kein Spielende → Würfeln, ob Joker erscheint
// ------------------------------------------------------------
function pass() {
    if (gameOver) return;

    // +5 EP aufladen, aber nicht über MAX_EP hinaus
    playerEp = Math.min(MAX_EP, playerEp + 5);

    const playerChoiceEl = document.getElementById('playerChoice');
    const enemyChoiceEl  = document.getElementById('enemyChoice');
    const resultEl       = document.getElementById('result');

    // Passen-Symbol anzeigen: Spieler hat keine Karte gespielt
    playerChoiceEl.innerHTML = makePassCardHTML();
    animatePop(playerChoiceEl);

    const enemyChoice = getEnemyChoice(); // null = Gegner passt ebenfalls

    if (enemyChoice !== null) {
        // ── Gegner spielt eine Karte ─────────────────────────────────────
        // Da der Spieler gepasst hat, trifft der Gegner unverteidigt → –1 LP
        const enemyCost = getEnergyCost(enemyChoice);
        enemyEp  = Math.max(0, enemyEp  - enemyCost);
        playerHp = Math.max(0, playerHp - 1);
        enemyChoiceEl.innerHTML = makeCardHTML(enemyChoice);
        animatePop(enemyChoiceEl);
        resultEl.className   = 'result loss';
        resultEl.textContent = 'Du passt – Gegner trifft! 😞';
    } else {
        // ── Gegner passt ebenfalls: beide haben keine EP ─────────────────
        // Kein Schaden; Gegner lädt auch +5 EP auf
        enemyEp = Math.min(MAX_EP, enemyEp + 5);
        enemyChoiceEl.innerHTML = makePassCardHTML();
        animatePop(enemyChoiceEl);
        resultEl.className   = 'result draw';
        resultEl.textContent = 'Beide passen. Kein Schaden. ⏸️';
    }

    updateHpDisplay();
    updateEpDisplay();
    updateButtonStates();

    // Spielende-Prüfung (Spieler könnte durch den Gegner-Treffer auf 0 LP fallen)
    if (playerHp === 0 || enemyHp === 0) {
        gameOver = true;
        hideJoker();
        setTimeout(() => showGameOver(enemyHp === 0), 700);
    } else {
        tryShowJoker();
    }
}

// ── Initialisierung ───────────────────────────────────────────
// Dieser Aufruf passiert einmalig, wenn die Seite geladen wird.
// Er stellt sicher, dass alle Buttons von Anfang an den richtigen
// Zustand haben (bei 7 EP sind ohnehin alle aktiv, aber so ist
// die Logik immer konsistent, egal wie MAX_EP sich ändert).
updateButtonStates();
