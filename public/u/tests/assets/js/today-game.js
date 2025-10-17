// today-game.js - 내면의 성소 가꾸기 (Cultivating the Inner Sanctuary)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "를";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "와";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        insight: 50, // 통찰
        harmony: 50, // 조화
        meaning: 50, // 의미
        inspiration: 50, // 영감
        self_reflection: 50, // 자기성찰
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { knowledge: 10, relationships: 5, deep_understanding: 0 },
        seekers: [
            { id: "luna", name: "루나", personality: "몽상가", skill: "상징 해석", connection: 70 },
            { id: "sol", name: "솔", personality: "현자", skill: "통찰", connection: 60 }
        ],
        maxSeekers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { meditationSuccess: 0 },
        dailyActions: { meditated: false, dialogueHeld: false, talkedTo: [], minigamePlayed: false },
        concepts: {
            meditationRoom: { built: false, durability: 100, name: "명상의 방", description: "내면의 목소리에 귀를 기울이는 공간입니다.", effect_description: "자기성찰 및 조화 스탯 보너스." },
            libraryOfSouls: { built: false, durability: 100, name: "영혼의 도서관", description: "고대의 지식과 기록을 보관합니다.", effect_description: "지식 수집 효율 및 통찰력 증가." },
            visionAltar: { built: false, durability: 100, name: "비전의 제단", description: "미래에 대한 비전을 구체화하는 장소입니다.", effect_description: "새로운 구도자 영입 및 의미 탐구 이벤트 활성화." },
            gardenOfSilence: { built: false, durability: 100, name: "침묵의 정원", description: "고요함 속에서 영감을 얻는 곳입니다.", effect_description: "영감 획득 및 내적 갈등 해소에 도움." },
            oracleChamber: { built: false, durability: 100, name: "신탁의 방", description: "깊은 이해를 통해 미래를 엿보는 공간입니다.", effect_description: "깊은 이해 획득 및 특수 이벤트 잠금 해제." }
        },
        sanctuaryLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('infjSanctuaryGame', JSON.stringify(gameState));
}

// ... (The rest of the code will be a combination of the old INFJ script and the new ENFJ features, adapted for the INFJ theme)
// This is a placeholder for the full script that will be generated.