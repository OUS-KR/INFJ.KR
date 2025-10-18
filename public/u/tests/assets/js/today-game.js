// today-game.js - INFJ - 내면의 성소 가꾸기 (Cultivating the Inner Sanctuary)

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
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        insight: 50,
        harmony: 50,
        meaning: 50,
        inspiration: 50,
        empathy: 50,
        actionPoints: 10, // Internally actionPoints, but represents 'concentration' in UI
        maxActionPoints: 10,
        resources: { inspiration: 10, knowledge: 10, connection: 5, deep_understanding: 0 },
        seekers: [
            { id: "elara", name: "엘라라", personality: "몽상가", skill: "상징 해석", trust: 70 },
            { id: "kael", name: "카엘", personality: "현자", skill: "통찰", trust: 60 }
        ],
        maxSeekers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { insightGain: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { meditated: false, talkedToSeeker: false, discussed: false, minigamePlayed: false }, // Re-themed
        concepts: {
            meditationRoom: { built: false, durability: 100, name: "명상의 방", description: "내면의 평화를 찾고 통찰을 얻습니다.", effect_description: "통찰 및 조화 증가." },
            knowledgeLibrary: { built: false, durability: 100, name: "영혼의 도서관", description: "고대 지식과 지혜를 탐구합니다.", effect_description: "지식 및 영감 증가." },
            visionAltar: { built: false, durability: 100, name: "비전의 제단", description: "미래의 가능성과 의미를 탐색합니다.", effect_description: "의미 및 통찰 증가." },
            silenceGarden: { built: false, durability: 100, name: "침묵의 정원", description: "고요함 속에서 자신을 성찰하고 재충전합니다.", effect_description: "집중력 회복 및 스트레스 감소." },
            oracleChamber: { built: false, durability: 100, name: "신탁의 방", description: "심오한 예언과 깨달음을 얻습니다.", effect_description: "깊은 이해 및 희귀 자원 발견 확률 증가." }
        },
        sanctuaryLevel: 0, // Re-themed from toolsLevel
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('infjSanctuaryGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('infjSanctuaryGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { insightGain: 0 };
        if (!loaded.seekers || loaded.seekers.length === 0) {
            loaded.seekers = [
                { id: "elara", name: "엘라라", personality: "몽상가", skill: "상징 해석", trust: 70 },
                { id: "kael", name: "카엘", personality: "현자", skill: "통찰", trust: 60 }
            ];
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.insight === undefined) loaded.insight = 50;
        if (loaded.harmony === undefined) loaded.harmony = 50;
        if (loaded.meaning === undefined) loaded.meaning = 50;
        if (loaded.inspiration === undefined) loaded.inspiration = 50;
        if (loaded.empathy === undefined) loaded.empathy = 50;
        if (loaded.sanctuaryLevel === undefined) loaded.sanctuaryLevel = 0;

        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const seekerListHtml = gameState.seekers.map(s => `<li>${s.name} (${s.skill}) - 신뢰도: ${s.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>통찰:</b> ${gameState.insight} | <b>조화:</b> ${gameState.harmony} | <b>의미:</b> ${gameState.meaning} | <b>영감:</b> ${gameState.inspiration} | <b>공감:</b> ${gameState.empathy}</p>
        <p><b>자원:</b> 영감 ${gameState.resources.inspiration}, 지식 ${gameState.resources.knowledge}, 관계 ${gameState.resources.connection}, 깊은 이해 ${gameState.resources.deep_understanding || 0}</p>
        <p><b>성소 레벨:</b> ${gameState.sanctuaryLevel}</p>
        <p><b>구도자 (${gameState.seekers.length}/${gameState.maxSeekers}):</b></p>
        <ul>${seekerListHtml}</ul>
        <p><b>구현된 개념:</b></p>
        <ul>${Object.values(gameState.concepts).filter(c => c.built).map(c => `<li>${c.name} (내구도: ${c.durability}) - ${c.effect_description}</li>`).join('') || '없음'}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_concept_management') {
        dynamicChoices = gameScenarios.action_concept_management.choices ? [...gameScenarios.action_concept_management.choices] : [];
        // Build options
        if (!gameState.concepts.meditationRoom.built) dynamicChoices.push({ text: "명상의 방 구현 (영감 50, 지식 20)", action: "build_meditationRoom" });
        if (!gameState.concepts.knowledgeLibrary.built) dynamicChoices.push({ text: "영혼의 도서관 구현 (지식 30, 관계 30)", action: "build_knowledgeLibrary" });
        if (!gameState.concepts.visionAltar.built) dynamicChoices.push({ text: "비전의 제단 구현 (영감 100, 지식 50, 관계 50)", action: "build_visionAltar" });
        if (!gameState.concepts.silenceGarden.built) dynamicChoices.push({ text: "침묵의 정원 구현 (지식 80, 관계 40)", action: "build_silenceGarden" });
        if (gameState.concepts.knowledgeLibrary.built && gameState.concepts.knowledgeLibrary.durability > 0 && !gameState.concepts.oracleChamber.built) {
            dynamicChoices.push({ text: "신탁의 방 구현 (지식 50, 관계 100)", action: "build_oracleChamber" });
        }
        // Maintenance options
        Object.keys(gameState.concepts).forEach(key => {
            const concept = gameState.concepts[key];
            if (concept.built && concept.durability < 100) {
                dynamicChoices.push({ text: `${concept.name} 정화 (지식 10, 관계 10)`, action: "purify_concept", params: { concept: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();

    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "내면의 성소에서 무엇을 할까요?", choices: [
        { text: "명상하기", action: "meditate" },
        { text: "구도자와 대화하기", action: "talk_to_seeker" },
        { text: "토론회 개최", action: "hold_discussion" },
        { text: "영감 수집", action: "show_inspiration_gathering_options" },
        { text: "개념 관리", action: "show_concept_management_options" },
        { text: "심오한 탐구", action: "show_deep_exploration_options" },
        { text: "오늘의 깨달음", action: "play_minigame" }
    ]},
    "daily_event_ominous_prophecy": { 
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_deep_realization": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_inner_conflict": {
        text: "내면에서 깊은 갈등이 일어났습니다. 당신의 조화가 흔들리고 있습니다.",
        choices: [
            { text: "갈등의 원인을 직시하고 해결한다 (집중력 1 소모)", action: "resolve_inner_conflict" },
            { text: "갈등을 외면하고 회피한다", action: "ignore_inner_conflict" }
        ]
    },
    "daily_event_lost_connection": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_seeker_dispute": {
        text: "엘라라와 카엘 사이에 해석에 대한 작은 의견 차이가 생겼습니다. 둘 다 당신의 지혜를 기다리는 것 같습니다.",
        choices: [
            { text: "엘라라의 관점을 먼저 들어준다.", action: "handle_seeker_dispute", params: { first: "elara", second: "kael" } },
            { text: "카엘의 관점을 먼저 들어준다.", action: "handle_seeker_dispute", params: { first: "kael", second: "elara" } },
            { text: "둘을 불러 조화를 이룬다.", action: "mediate_seeker_dispute" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_seeker": {
        choices: [
            { text: "따뜻하게 환영하고 성소로 이끈다.", action: "welcome_new_unique_seeker" },
            { text: "성소에 필요한지 좀 더 지켜본다.", action: "observe_seeker" },
            { text: "정중히 거절한다.", action: "reject_seeker" }
        ]
    },
    "daily_event_lost_traveler": {
        text: "성소 근처에서 길을 잃은 여행자를 발견했습니다. 그의 눈빛에서 깊은 고뇌가 느껴집니다.",
        choices: [
            { text: "지식을 사용해 길을 안내한다 (지식 5 소모)", action: "guide_traveler" },
            { text: "그의 여정을 존중하고 그대로 둔다", action: "leave_traveler" }
        ]
    },
    "daily_event_ancient_text_discovery": {
        text: "성소 깊은 곳에서 잊혀진 고대 문헌을 발견했습니다. 당신의 지적 호기심을 자극합니다.",
        choices: [
            { text: "문헌을 연구한다 (집중력 1 소모)", action: "research_ancient_text" },
            { text: "지금은 다른 일에 집중한다", action: "decline_research" }
        ]
    },
    "daily_event_visionary_dream": {
        text: "밤새도록 강렬한 비전의 꿈을 꾸었습니다. 미래에 대한 중요한 통찰을 얻을 수 있을 것 같습니다.",
        choices: [
            { text: "꿈을 해석한다 (집중력 1 소모)", action: "interpret_dream" },
            { text: "꿈을 흘려보낸다", action: "ignore_dream" }
        ]
    },
    "daily_event_meaning_crisis": {
        text: "갑자기 모든 것의 의미가 모호해집니다. 성소의 의미가 흔들리는 것 같습니다.",
        choices: [
            { text: "내면의 가치를 재확립한다 (집중력 1 소모)", action: "reaffirm_values" },
            { text: "혼란 속에서 방황한다", action: "wander_in_confusion" }
        ]
    },
    "game_over_insight": { text: "성소의 통찰력이 고갈되어 더 이상 진실을 볼 수 없습니다. 내면의 성소는 어둠에 잠겼습니다.", choices: [], final: true },
    "game_over_harmony": { text: "성소의 조화가 무너져 내면의 평화를 잃었습니다. 모든 것이 혼란스럽습니다.", choices: [], final: true },
    "game_over_meaning": { text: "성소의 의미가 사라져 더 이상 나아갈 방향을 찾을 수 없습니다. 모든 노력이 무의미해졌습니다.", choices: [], final: true },
    "game_over_inspiration": { text: "영감이 모두 사라졌습니다. 성소는 메마르고 황량해졌습니다.", choices: [], final: true },
    "game_over_empathy": { text: "구도자들과의 공감대가 사라졌습니다. 구도자들은 당신을 떠나기 시작했습니다.", choices: [], final: true },
    "game_over_resources": { text: "성소의 자원이 모두 고갈되어 더 이상 가꿀 수 없습니다.", choices: [], final: true },
    "action_inspiration_gathering": {
        text: "어떤 영감을 수집하시겠습니까?",
        choices: [
            { text: "영감 모으기", action: "gather_inspiration" },
            { text: "지식 탐구", action: "gather_knowledge" },
            { text: "관계 맺기", "action": "gather_connection" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_concept_management": {
        text: "어떤 개념을 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "resource_gathering_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_inspiration_gathering_options" }] // Return to gathering menu
    },
    "concept_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_concept_management_options" }] // Return to facility management menu
    },
    "seeker_dispute_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "inner_conflict_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "deep_exploration_menu": {
        text: "어떤 심오한 탐구를 하시겠습니까?",
        choices: [
            { text: "상징 해석 (집중력 1 소모)", action: "interpret_symbols" },
            { text: "예언 탐색 (집중력 1 소모)", action: "seek_prophecy" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const discussionOutcomes = [
    {
        condition: (gs) => gs.harmony < 40,
        weight: 40,
        effect: (gs) => {
            const harmonyLoss = getRandomValue(10, 4);
            const meaningLoss = getRandomValue(5, 2);
            const empathyLoss = getRandomValue(5, 2);
            return {
                changes: { harmony: gs.harmony - harmonyLoss, meaning: gs.meaning - meaningLoss, empathy: gs.empathy - empathyLoss },
                message: `토론회가 시작되자마자 구도자들의 불만이 터져 나왔습니다. 낮은 조화로 인해 분위기가 험악합니다. (-${harmonyLoss} 조화, -${meaningLoss} 의미, -${empathyLoss} 공감)`
            };
        }
    },
    {
        condition: (gs) => gs.empathy > 70 && gs.insight > 60,
        weight: 30,
        effect: (gs) => {
            const harmonyGain = getRandomValue(15, 5);
            const meaningGain = getRandomValue(10, 3);
            const insightGain = getRandomValue(10, 3);
            return {
                changes: { harmony: gs.harmony + harmonyGain, meaning: gs.meaning + meaningGain, insight: gs.insight + insightGain },
                message: `높은 공감대와 통찰력을 바탕으로 건설적인 토론이 오갔습니다! (+${harmonyGain} 조화, +${meaningGain} 의미, +${insightGain} 통찰)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.knowledge < gs.seekers.length * 4,
        weight: 25,
        effect: (gs) => {
            const insightGain = getRandomValue(10, 3);
            const meaningGain = getRandomValue(5, 2);
            return {
                changes: { insight: gs.insight + insightGain, meaning: gs.meaning + meaningGain },
                message: `지식이 부족한 상황에 대해 논의했습니다. 모두가 지혜를 모으기로 동의하며 당신의 리더십을 신뢰했습니다. (+${insightGain} 통찰, +${meaningGain} 의미)`
            };
        }
    },
    {
        condition: (gs) => gs.seekers.some(s => s.trust < 50),
        weight: 20,
        effect: (gs) => {
            const seeker = gs.seekers.find(s => s.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const empathyGain = getRandomValue(5, 2);
            const insightGain = getRandomValue(5, 2);
            const updatedSeekers = gs.seekers.map(s => s.id === seeker.id ? { ...s, trust: Math.min(100, s.trust + trustGain) } : s);
            return {
                changes: { seekers: updatedSeekers, empathy: gs.empathy + empathyGain, insight: gs.insight + insightGain },
                message: `토론회 중, ${seeker.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${seeker.name} 신뢰도, +${empathyGain} 공감, +${insightGain} 통찰)`
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const harmonyGain = getRandomValue(5, 2);
            const meaningGain = getRandomValue(3, 1);
            return {
                changes: { harmony: gs.harmony + harmonyGain, meaning: gs.meaning + meaningGain },
                message: `평범한 토론회였지만, 모두가 한자리에 모여 지혜를 나눈 것만으로도 의미가 있었습니다. (+${harmonyGain} 조화, +${meaningGain} 의미)`
            };
        }
    },
    {
        condition: (gs) => gs.meaning < 40 || gs.empathy < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const harmonyLoss = getRandomValue(5, 2);
            const meaningLoss = getRandomValue(5, 2);
            const insightLoss = getRandomValue(5, 2);
            return {
                changes: { harmony: gs.harmony - harmonyLoss, meaning: gs.meaning - meaningLoss, insight: gs.insight - insightLoss },
                message: `토론회는 길어졌지만, 의견 차이만 확인하고 끝났습니다. 구도자들의 조화와 의미, 당신의 통찰이 약간 감소했습니다. (-${harmonyLoss} 조화, -${meaningLoss} 의미, -${insightLoss} 통찰)`
            };
        }
    }
];

const meditateOutcomes = [
    {
        condition: (gs) => gs.resources.inspiration < 20,
        weight: 30,
        effect: (gs) => {
            const inspirationGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, inspiration: gs.resources.inspiration + inspirationGain } },
                message: `명상 중 새로운 영감을 발견했습니다! (+${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.knowledge < 20,
        weight: 25,
        effect: (gs) => {
            const knowledgeGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, knowledge: gs.resources.knowledge + knowledgeGain } },
                message: `명상 중 잊혀진 지식을 떠올렸습니다! (+${knowledgeGain} 지식)`
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const empathyGain = getRandomValue(5, 2);
            const insightGain = getRandomValue(5, 2);
            return {
                changes: { empathy: gs.empathy + empathyGain, insight: gs.insight + insightGain },
                message: `명상하며 깊은 통찰을 얻었습니다. (+${empathyGain} 공감, +${insightGain} 통찰)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const harmonyLoss = getRandomValue(5, 2);
            const insightLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, harmony: gs.harmony - harmonyLoss, insight: gs.insight - insightLoss },
                message: `명상에 너무 깊이 빠져 집중력을 소모하고 조화와 통찰이 감소했습니다. (-${actionLoss} 집중력, -${harmonyLoss} 조화, -${insightLoss} 통찰)`
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const meaningLoss = getRandomValue(5, 2);
            const inspirationLoss = getRandomValue(5, 2);
            return {
                changes: { meaning: gs.meaning - meaningLoss, inspiration: gs.inspiration - inspirationLoss },
                message: `명상 중 예상치 못한 어려움에 부딪혀 의미와 영감이 약간 감소했습니다. (-${meaningLoss} 의미, -${inspirationLoss} 영감)`
            };
        }
    }
];

const talkToSeekerOutcomes = [
    {
        condition: (gs, seeker) => seeker.trust < 60,
        weight: 40,
        effect: (gs, seeker) => {
            const trustGain = getRandomValue(10, 5);
            const empathyGain = getRandomValue(5, 2);
            const insightGain = getRandomValue(5, 2);
            const updatedSeekers = gs.seekers.map(s => s.id === seeker.id ? { ...s, trust: Math.min(100, s.trust + trustGain) } : s);
            return {
                changes: { seekers: updatedSeekers, empathy: gs.empathy + empathyGain, insight: gs.insight + insightGain },
                message: `${seeker.name}${getWaGwaParticle(seeker.name)} 깊은 대화를 나누며 신뢰와 당신의 통찰을 얻었습니다. (+${trustGain} ${seeker.name} 신뢰도, +${empathyGain} 공감, +${insightGain} 통찰)`
            };
        }
    },
    {
        condition: (gs, seeker) => seeker.personality === "현자",
        weight: 20,
        effect: (gs, seeker) => {
            const knowledgeGain = getRandomValue(10, 3);
            const insightGain = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge + knowledgeGain, insight: gs.insight + insightGain },
                message: `${seeker.name}${getWaGwaParticle(seeker.name)}와 지혜로운 대화를 나누며 지식과 통찰이 상승했습니다. (+${knowledgeGain} 지식, +${insightGain} 통찰)`
            };
        }
    },
    {
        condition: (gs, seeker) => seeker.skill === "상징 해석",
        weight: 15,
        effect: (gs, seeker) => {
            const inspirationGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, inspiration: gs.resources.inspiration + inspirationGain } },
                message: `${seeker.name}${getWaGwaParticle(seeker.name)}에게서 상징 해석에 대한 영감을 얻어 영감을 추가로 확보했습니다. (+${inspirationGain} 영감)`
            };
        }
    },
    {
        condition: (gs, seeker) => true, // Default positive outcome
        weight: 25,
        effect: (gs, seeker) => {
            const harmonyGain = getRandomValue(5, 2);
            const meaningGain = getRandomValue(3, 1);
            return {
                changes: { harmony: gs.harmony + harmonyGain, meaning: gs.meaning + meaningGain },
                message: `${seeker.name}${getWaGwaParticle(seeker.name)} 소소한 이야기를 나누며 조화와 당신의 의미가 조금 더 단단해졌습니다. (+${harmonyGain} 조화, +${meaningGain} 의미)`
            };
        }
    },
    {
        condition: (gs, seeker) => gs.harmony < 40 || seeker.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, seeker) => {
            const trustLoss = getRandomValue(10, 3);
            const harmonyLoss = getRandomValue(5, 2);
            const insightLoss = getRandomValue(5, 2);
            const updatedSeekers = gs.seekers.map(s => s.id === seeker.id ? { ...s, trust: Math.max(0, s.trust - trustLoss) } : s);
            return {
                changes: { seekers: updatedSeekers, harmony: gs.harmony - harmonyLoss, insight: gs.insight - insightLoss },
                message: `${seeker.name}${getWaGwaParticle(seeker.name)} 대화 중 오해를 사서 신뢰도와 조화, 당신의 통찰이 감소했습니다. (-${trustLoss} ${seeker.name} 신뢰도, -${harmonyLoss} 조화, -${insightLoss} 통찰)`
            };
        }
    },
    {
        condition: (gs) => gs.harmony < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, seeker) => {
            const actionLoss = getRandomValue(1, 0);
            const insightLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, insight: gs.insight - insightLoss },
                message: `${seeker.name}${getWaGwaParticle(seeker.name)} 대화가 길어졌지만, 특별한 소득은 없었습니다. 당신의 통찰이 감소했습니다. (-${actionLoss} 집중력, -${insightLoss} 통찰)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { insight: 0, harmony: 0, meaning: 0, inspiration: 0, empathy: 0, message: "" };

    switch (minigameName) {
        case "상징 순서 맞추기":
            if (score >= 51) {
                rewards.insight = 15;
                rewards.inspiration = 10;
                rewards.harmony = 5;
                rewards.empathy = 5;
                rewards.message = `최고의 상징 해석가 되셨습니다! (+15 통찰, +10 영감, +5 조화, +5 공감)`;
            } else if (score >= 21) {
                rewards.insight = 10;
                rewards.inspiration = 5;
                rewards.harmony = 3;
                rewards.message = `훌륭한 상징 해석입니다! (+10 통찰, +5 영감, +3 조화)`;
            } else if (score >= 0) {
                rewards.insight = 5;
                rewards.message = `상징 순서 맞추기를 완료했습니다. (+5 통찰)`;
            } else {
                rewards.message = `상징 순서 맞추기를 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "상징 해석하기": // Placeholder for now, but re-themed
            rewards.insight = 2;
            rewards.meaning = 1;
            rewards.message = `상징 해석하기를 완료했습니다. (+2 통찰, +1 의미)`;
            break;
        case "미래 예측": // Placeholder for now, but re-themed
            rewards.insight = 2;
            rewards.inspiration = 1;
            rewards.message = `미래 예측을 완료했습니다. (+2 통찰, +1 영감)`;
            break;
        case "공감 챌린지": // Placeholder for now, but re-themed
            rewards.empathy = 2;
            rewards.harmony = 1;
            rewards.message = `공감 챌린지를 완료했습니다. (+2 공감, +1 조화)`;
            break;
        case "비전 그리기": // Placeholder for now, but re-themed
            rewards.inspiration = 2;
            rewards.meaning = 1;
            rewards.message = `비전 그리기를 완료했습니다. (+2 영감, +1 의미)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "상징 순서 맞추기",
        description: "화면에 나타나는 상징들의 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = {
                currentSequence: [],
                playerInput: [],
                stage: 1,
                score: 0,
                showingSequence: false
            };
            minigames[0].render(gameArea, choicesDiv);
            minigames[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="symbol-pad">
                    ${["△", "□", "○", "☆", "◇", "▽", "◎", "★", "◆", "⊕"].map(symbol => `<button class="choice-btn symbol-btn" data-value="${symbol}">${symbol}</button>`).join('')}
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.symbol-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const symbols = ["△", "□", "○", "☆", "◇", "▽", "◎", "★", "◆", "⊕"];
            const sequenceLength = gameState.minigameState.stage + 2; // e.g., stage 1 -> 3 symbols
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(symbols[Math.floor(currentRandFn() * symbols.length)]);
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(value);
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((symbol, i) => symbol === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("틀렸습니다! 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({ ...rewards.changes, insight: gameState.insight + rewards.insight, harmony: gameState.harmony + rewards.harmony, meaning: gameState.meaning + rewards.meaning, inspiration: gameState.inspiration + rewards.inspiration, empathy: gameState.empathy + rewards.empathy, currentScenarioId: 'intro' }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "상징 해석하기",
        description: "모호한 상징의 숨겨진 의미를 해석하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({ insight: gameState.insight + rewards.insight, meaning: gameState.meaning + rewards.meaning, currentScenarioId: 'intro' }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "미래 예측",
        description: "현재의 단서들을 조합하여 미래를 예측하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({ insight: gameState.insight + rewards.insight, inspiration: gameState.inspiration + rewards.inspiration, currentScenarioId: 'intro' }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "공감 챌린지",
        description: "상대방의 숨겨진 감정을 맞추는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({ empathy: gameState.empathy + rewards.empathy, harmony: gameState.harmony + rewards.harmony, currentScenarioId: 'intro' }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "비전 그리기",
        description: "이상적인 미래에 대한 비전을 그림으로 표현하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({ inspiration: gameState.inspiration + rewards.inspiration, meaning: gameState.meaning + rewards.meaning, currentScenarioId: 'intro' }, rewards.message);
            gameState.minigameState = {};
        }
    }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("집중력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    meditate: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = meditateOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = meditateOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, meditated: true } }, result.message);
    },
    talk_to_seeker: () => {
        if (!spendActionPoint()) return;
        const seeker = gameState.seekers[Math.floor(currentRandFn() * gameState.seekers.length)];
        if (gameState.dailyActions.talkedToSeeker) { updateState({ dailyActions: { ...gameState.dailyActions, talkedToSeeker: true } }, `${seeker.name}${getWaGwaParticle(seeker.name)} 이미 충분히 대화했습니다.`); return; }

        const possibleOutcomes = talkToSeekerOutcomes.filter(outcome => outcome.condition(gameState, seeker));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = talkToSeekerOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, seeker);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, talkedToSeeker: true } }, result.message);
    },
    hold_discussion: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = discussionOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = discussionOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_seeker_dispute: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let changes = {};
        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const empathyGain = getRandomValue(5, 2);
        const insightGain = getRandomValue(5, 2);

        const updatedSeekers = gameState.seekers.map(s => {
            if (s.id === first) {
                s.trust = Math.min(100, s.trust + trustGain);
                message += `${s.name}의 관점을 먼저 들어주었습니다. ${s.name}의 신뢰도가 상승했습니다. `;
                changes.empathy = gameState.empathy + empathyGain;
                changes.insight = gameState.insight + insightGain;
            } else if (s.id === second) {
                s.trust = Math.max(0, s.trust - trustLoss);
                message += `${second}의 신뢰도가 약간 하락했습니다. `;
            }
            return s;
        });

        updateState({ ...changes, seekers: updatedSeekers, currentScenarioId: 'seeker_dispute_resolution_result' }, message);
    },
    mediate_seeker_dispute: () => {
        if (!spendActionPoint()) return;
        const harmonyGain = getRandomValue(10, 3);
        const meaningGain = getRandomValue(5, 2);
        const insightGain = getRandomValue(5, 2);
        const message = `당신의 지혜로운 중재로 엘라라와 카엘의 의견 차이가 조화를 이루었습니다. 성소의 조화와 당신의 통찰이 강화되었습니다! (+${harmonyGain} 조화, +${meaningGain} 의미, +${insightGain} 통찰)`;
        updateState({ harmony: gameState.harmony + harmonyGain, meaning: gameState.meaning + meaningGain, insight: gameState.insight + insightGain, currentScenarioId: 'seeker_dispute_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const harmonyLoss = getRandomValue(10, 3);
        const meaningLoss = getRandomValue(5, 2);
        const message = `의견 차이를 무시했습니다. 구도자들의 불만이 커지고 성소의 분위기가 침체됩니다. (-${harmonyLoss} 조화, -${meaningLoss} 의미)`;
        const updatedSeekers = gameState.seekers.map(s => {
            s.trust = Math.max(0, s.trust - 5);
            return s;
        });
        updateState({ harmony: gameState.harmony - harmonyLoss, meaning: gameState.meaning - meaningLoss, seekers: updatedSeekers, currentScenarioId: 'seeker_dispute_resolution_result' }, message);
    },
    resolve_inner_conflict: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const harmonyGain = getRandomValue(10, 3);
            const meaningGain = getRandomValue(5, 2);
            message = `갈등의 원인을 직시하고 해결했습니다. 내면의 조화와 의미가 상승합니다. (+${harmonyGain} 조화, +${meaningGain} 의미)`;
            changes.harmony = gameState.harmony + harmonyGain;
            changes.meaning = gameState.meaning + meaningGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "갈등을 해결할 집중력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'inner_conflict_resolution_result' }, message);
    },
    ignore_inner_conflict: () => {
        if (!spendActionPoint()) return;
        const harmonyLoss = getRandomValue(10, 3);
        const insightLoss = getRandomValue(5, 2);
        updateState({ harmony: gameState.harmony - harmonyLoss, insight: gameState.insight - insightLoss, currentScenarioId: 'inner_conflict_resolution_result' }, `갈등을 외면했습니다. 내면의 조화와 통찰이 감소합니다. (-${harmonyLoss} 조화, -${insightLoss} 통찰)`);
    },
    guide_traveler: () => {
        if (!spendActionPoint()) return;
        const cost = 5;
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost) {
            const empathyGain = getRandomValue(10, 3);
            const meaningGain = getRandomValue(5, 2);
            message = `길 잃은 여행자에게 지식을 나누어 길을 안내했습니다. 당신의 공감과 의미가 상승합니다. (+${empathyGain} 공감, +${meaningGain} 의미)`;
            changes.empathy = gameState.empathy + empathyGain;
            changes.meaning = gameState.meaning + meaningGain;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost };
        } else {
            message = "여행자를 안내할 지식이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    leave_traveler: () => {
        if (!spendActionPoint()) return;
        const empathyLoss = getRandomValue(10, 3);
        const harmonyLoss = getRandomValue(5, 2);
        updateState({ empathy: gameState.empathy - empathyLoss, harmony: gameState.harmony - harmonyLoss, currentScenarioId: 'intro' }, `여행자의 여정을 존중하고 그대로 두었습니다. (-${empathyLoss} 공감, -${harmonyLoss} 조화)`);
    },
    research_ancient_text: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "고대 문헌을 연구했습니다. ";
        let changes = {};
        if (rand < 0.5) {
            const knowledgeGain = getRandomValue(10, 4);
            const insightGain = getRandomValue(5, 2);
            message += `잊혀진 지식을 발견하여 지식과 통찰이 상승합니다. (+${knowledgeGain} 지식, +${insightGain} 통찰)`;
            changes.knowledge = gameState.knowledge + knowledgeGain;
            changes.insight = gameState.insight + insightGain;
        } else {
            const inspirationGain = getRandomValue(10, 4);
            const meaningGain = getRandomValue(5, 2);
            message += `문헌 속에서 새로운 영감과 의미를 얻었습니다. (+${inspirationGain} 영감, +${meaningGain} 의미)`;
            changes.inspiration = gameState.inspiration + inspirationGain;
            changes.meaning = gameState.meaning + meaningGain;
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_research: () => {
        if (!spendActionPoint()) return;
        const insightLoss = getRandomValue(5, 2);
        updateState({ insight: gameState.insight - insightLoss, currentScenarioId: 'intro' }, `문헌 연구를 미루었습니다. 아쉽게도 새로운 통찰을 놓쳤습니다. (-${insightLoss} 통찰)`);
    },
    interpret_dream: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "꿈을 해석했습니다. ";
        let changes = {};
        if (rand < 0.6) {
            const insightGain = getRandomValue(10, 3);
            const meaningGain = getRandomValue(5, 2);
            message += `꿈 속에서 중요한 통찰과 의미를 발견했습니다. (+${insightGain} 통찰, +${meaningGain} 의미)`;
            changes.insight = gameState.insight + insightGain;
            changes.meaning = gameState.meaning + meaningGain;
        } else {
            const harmonyLoss = getRandomValue(10, 3);
            const empathyLoss = getRandomValue(5, 2);
            message += `꿈 해석에 실패하여 내면의 조화와 공감이 감소했습니다. (-${harmonyLoss} 조화, -${empathyLoss} 공감)`;
            changes.harmony = gameState.harmony - harmonyLoss;
            changes.empathy = gameState.empathy - empathyLoss;
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    ignore_dream: () => {
        if (!spendActionPoint()) return;
        const inspirationLoss = getRandomValue(5, 2);
        updateState({ inspiration: gameState.inspiration - inspirationLoss, currentScenarioId: 'intro' }, `꿈을 흘려보냈습니다. 중요한 영감을 놓쳤을지도 모릅니다. (-${inspirationLoss} 영감)`);
    },
    reaffirm_values: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "";
        let changes = {};
        if (rand < 0.6) {
            const meaningGain = getRandomValue(10, 3);
            const harmonyGain = getRandomValue(5, 2);
            message = `내면의 가치를 재확립하여 의미와 조화를 회복했습니다. (+${meaningGain} 의미, +${harmonyGain} 조화)`;
            changes.meaning = gameState.meaning + meaningGain;
            changes.harmony = gameState.harmony + harmonyGain;
        } else {
            const insightLoss = getRandomValue(10, 3);
            const empathyLoss = getRandomValue(5, 2);
            message = `가치를 재확립하려 했지만, 오히려 통찰과 공감이 감소했습니다. (-${insightLoss} 통찰, -${empathyLoss} 공감)`;
            changes.insight = gameState.insight - insightLoss;
            changes.empathy = gameState.empathy - empathyLoss;
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    wander_in_confusion: () => {
        if (!spendActionPoint()) return;
        const meaningLoss = getRandomValue(10, 3);
        const harmonyLoss = getRandomValue(5, 2);
        updateState({ meaning: gameState.meaning - meaningLoss, harmony: gameState.harmony - harmonyLoss, currentScenarioId: 'intro' }, `혼란 속에서 방황했습니다. 의미와 조화가 감소했습니다. (-${meaningLoss} 의미, -${harmonyLoss} 조화)`);
    },
    show_inspiration_gathering_options: () => updateState({ currentScenarioId: 'action_inspiration_gathering' }),
    show_concept_management_options: () => updateState({ currentScenarioId: 'action_concept_management' }),
    gather_inspiration: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.sanctuaryLevel * 0.1) + (gameState.dailyBonus.insightGain || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const inspirationGain = getRandomValue(5, 2);
            message = `영감을 성공적으로 수집했습니다! (+${inspirationGain} 영감)`;
            changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration + inspirationGain };
        } else {
            message = "영감 수집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_knowledge: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.sanctuaryLevel * 0.1) + (gameState.dailyBonus.insightGain || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const knowledgeGain = getRandomValue(5, 2);
            message = `지식을 성공적으로 탐구했습니다! (+${knowledgeGain} 지식)`;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge + knowledgeGain };
        } else {
            message = "지식 탐구에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_connection: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.sanctuaryLevel * 0.1) + (gameState.dailyBonus.insightGain || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const connectionGain = getRandomValue(5, 2);
            message = `관계를 성공적으로 맺었습니다! (+${connectionGain} 관계)`;
            changes.resources = { ...gameState.resources, connection: gameState.resources.connection + connectionGain };
        } else {
            message = "관계 맺기에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_meditationRoom: () => {
        if (!spendActionPoint()) return;
        const cost = { inspiration: 50, knowledge: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.inspiration >= cost.inspiration && gameState.resources.knowledge >= cost.knowledge) {
            gameState.concepts.meditationRoom.built = true;
            const insightGain = getRandomValue(10, 3);
            message = `명상의 방을 구현했습니다! (+${insightGain} 통찰)`;
            changes.insight = gameState.insight + insightGain;
            changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration - cost.inspiration, knowledge: gameState.resources.knowledge - cost.knowledge };
        } else {
            message = "자원이 부족하여 구현할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_knowledgeLibrary: () => {
        if (!spendActionPoint()) return;
        const cost = { knowledge: 30, connection: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.connection >= cost.connection) {
            gameState.concepts.knowledgeLibrary.built = true;
            const inspirationGain = getRandomValue(10, 3);
            message = `영혼의 도서관을 구현했습니다! (+${inspirationGain} 영감)`;
            changes.inspiration = gameState.inspiration + inspirationGain;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, connection: gameState.resources.connection - cost.connection };
        } else {
            message = "자원이 부족하여 구현할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_visionAltar: () => {
        if (!spendActionPoint()) return;
        const cost = { inspiration: 100, knowledge: 50, connection: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.inspiration >= cost.inspiration && gameState.resources.knowledge >= cost.knowledge && gameState.resources.connection >= cost.connection) {
            gameState.concepts.visionAltar.built = true;
            const meaningGain = getRandomValue(20, 5);
            const insightGain = getRandomValue(20, 5);
            message = `비전의 제단을 구현했습니다! (+${meaningGain} 의미, +${insightGain} 통찰)`;
            changes.meaning = gameState.meaning + meaningGain;
            changes.insight = gameState.insight + insightGain;
            changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration - cost.inspiration, knowledge: gameState.resources.knowledge - cost.knowledge, connection: gameState.resources.connection - cost.connection };
        } else {
            message = "자원이 부족하여 구현할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_silenceGarden: () => {
        if (!spendActionPoint()) return;
        const cost = { knowledge: 80, connection: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.connection >= cost.connection) {
            gameState.concepts.silenceGarden.built = true;
            const harmonyGain = getRandomValue(15, 5);
            const meaningGain = getRandomValue(10, 3);
            message = `침묵의 정원을 구현했습니다! (+${harmonyGain} 조화, +${meaningGain} 의미)`;
            changes.harmony = gameState.harmony + harmonyGain;
            changes.meaning = gameState.meaning + meaningGain;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, connection: gameState.resources.connection - cost.connection };
        } else {
            message = "자원이 부족하여 구현할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_oracleChamber: () => {
        if (!spendActionPoint()) return;
        const cost = { knowledge: 50, connection: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.connection >= cost.connection) {
            gameState.concepts.oracleChamber.built = true;
            message = "신탁의 방을 구현했습니다!";
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, connection: gameState.resources.connection - cost.connection };
        } else {
            message = "자원이 부족하여 구현할 수 없습니다.";
        }
        updateState(changes, message);
    },
    purify_concept: (params) => {
        if (!spendActionPoint()) return;
        const conceptKey = params.concept;
        const cost = { knowledge: 10, connection: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.connection >= cost.connection) {
            gameState.concepts[conceptKey].durability = 100;
            message = `${gameState.concepts[conceptKey].name} 개념의 정화를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, connection: gameState.resources.connection - cost.connection };
        } else {
            message = "정화에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    interpret_symbols: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const inspirationGain = getRandomValue(30, 10);
            const knowledgeGain = getRandomValue(20, 5);
            const connectionGain = getRandomValue(15, 5);
            message = `상징 해석 대성공! 엄청난 자원을 얻었습니다! (+${inspirationGain} 영감, +${knowledgeGain} 지식, +${connectionGain} 관계)`;
            changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration + inspirationGain, knowledge: gameState.resources.knowledge + knowledgeGain, connection: gameState.resources.connection + connectionGain };
        } else if (rand < 0.4) { // Small Win
            const insightGain = getRandomValue(10, 5);
            message = `상징 해석 성공! 통찰이 샘솟습니다. (+${insightGain} 통찰)`;
            changes.insight = gameState.insight + insightGain;
        } else if (rand < 0.7) { // Small Loss
            const insightLoss = getRandomValue(5, 2);
            message = `아쉽게도 꽝! 통찰이 조금 흐려집니다. (-${insightLoss} 통찰)`;
            changes.insight = gameState.insight - insightLoss;
        } else { // No Change
            message = "상징 해석 결과는 아무것도 아니었습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'deep_exploration_menu' }, message);
    },
    seek_prophecy: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Deep Understanding)
            const deepUnderstandingGain = getRandomValue(3, 1);
            message = `예언 탐색 대성공! 깊은 이해를 얻었습니다! (+${deepUnderstandingGain} 깊은 이해)`;
            changes.resources = { ...gameState.resources, deep_understanding: (gameState.resources.deep_understanding || 0) + deepUnderstandingGain };
        } else if (rand < 0.6) { // Normal Catch (Knowledge)
            const knowledgeGain = getRandomValue(10, 5);
            message = `지식을 얻었습니다! (+${knowledgeGain} 지식)`;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge + knowledgeGain };
        } else { // No Catch
            message = "아쉽게도 아무것도 얻지 못했습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'deep_exploration_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 깨달음은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_deep_exploration_options: () => updateState({ currentScenarioId: 'deep_exploration_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Insight: Resource creation success chance increase
    if (gameState.insight >= 70) {
        gameState.dailyBonus.insightGain += 0.1;
        message += "높은 통찰력 덕분에 새로운 영감 발견 확률이 증가합니다. ";
    }
    // Low Insight: Harmony decrease
    if (gameState.insight < 30) {
        gameState.harmony = Math.max(0, gameState.harmony - getRandomValue(5, 2));
        message += "통찰력 부족으로 조화가 감소합니다. ";
    }

    // High Harmony: Action points increase
    if (gameState.harmony >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 조화로 집중력이 증가합니다. ";
    }
    // Low Harmony: Action points decrease
    if (gameState.harmony < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "조화가 깨져 집중력이 감소합니다. ";
    }

    // High Meaning: Empathy and Inspiration boost
    if (gameState.meaning >= 70) {
        const empathyGain = getRandomValue(5, 2);
        const inspirationGain = getRandomValue(5, 2);
        gameState.empathy = Math.min(100, gameState.empathy + empathyGain);
        gameState.inspiration = Math.min(100, gameState.inspiration + inspirationGain);
        message += `당신의 높은 의미 추구 덕분에 구도자들과의 공감대가 깊어지고 영감이 샘솟습니다! (+${empathyGain} 공감, +${inspirationGain} 영감) `;
    }
    // Low Meaning: Empathy and Inspiration decrease
    if (gameState.meaning < 30) {
        const empathyLoss = getRandomValue(5, 2);
        const inspirationLoss = getRandomValue(5, 2);
        gameState.empathy = Math.max(0, gameState.empathy - empathyLoss);
        gameState.inspiration = Math.max(0, gameState.inspiration - inspirationLoss);
        message += "의미가 약화되어 구도자들이 동요하고 영감이 흐려집니다. (-${empathyLoss} 공감, -${inspirationLoss} 영감) ";
    }

    // High Inspiration: Insight boost or rare resource discovery
    if (gameState.inspiration >= 70) {
        const insightGain = getRandomValue(5, 2);
        gameState.insight = Math.min(100, gameState.insight + insightGain);
        message += "당신의 영감이 새로운 통찰력을 불러일으킵니다. (+${insightGain} 통찰) ";
        if (currentRandFn() < 0.2) { // 20% chance for deep understanding discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.deep_understanding += amount;
            message += `깊은 이해를 발견했습니다! (+${amount} 깊은 이해) `;
        }
    }
    // Low Inspiration: Insight decrease or action point loss
    if (gameState.inspiration < 30) {
        const insightLoss = getRandomValue(5, 2);
        gameState.insight = Math.max(0, gameState.insight - insightLoss);
        message += "영감이 부족하여 통찰력이 감소합니다. (-${insightLoss} 통찰) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 탐구로 집중력을 낭비했습니다. (-${actionLoss} 집중력) ";
        }
    }

    // High Empathy: Seeker trust increase
    if (gameState.empathy >= 70) {
        gameState.seekers.forEach(s => s.trust = Math.min(100, s.trust + getRandomValue(2, 1)));
        message += "높은 공감 지수 덕분에 구도자들의 신뢰가 깊어집니다. ";
    }
    // Low Empathy: Seeker trust decrease
    if (gameState.empathy < 30) {
        gameState.seekers.forEach(s => s.trust = Math.max(0, s.trust - getRandomValue(5, 2)));
        message += "낮은 공감 지수로 인해 구도자들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomSeeker() {
    const names = ["아론", "베라", "시온", "다나", "이안"];
    const personalities = ["신비로운", "사려 깊은", "지혜로운", "영감적인"];
    const skills = ["상징 해석", "통찰", "예언"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_ominous_prophecy", weight: 10, condition: () => true, onTrigger: () => {
        const insightLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_ominous_prophecy.text = `불길한 예언이 성소에 드리웠습니다. 통찰력이 감소합니다. (-${insightLoss} 통찰)`;
        updateState({ insight: Math.max(0, gameState.insight - insightLoss) });
    } },
    { id: "daily_event_deep_realization", weight: 10, condition: () => true, onTrigger: () => {
        const insightGain = getRandomValue(10, 5);
        gameScenarios.daily_event_deep_realization.text = `깊은 깨달음이 성소에 가득합니다! 통찰이 증가합니다. (+${insightGain} 통찰)`;
        updateState({ insight: gameState.insight + insightGain });
    } },
    { id: "daily_event_inner_conflict", weight: 15, condition: () => true },
    { id: "daily_event_lost_connection", weight: 7, condition: () => true, onTrigger: () => {
        const connectionLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_lost_connection.text = `내면의 연결이 약화되어 관계 일부가 사라졌습니다. (-${connectionLoss} 관계)`;
        updateState({ resources: { ...gameState.resources, connection: Math.max(0, gameState.resources.connection - connectionLoss) } });
    } },
    { id: "daily_event_seeker_dispute", weight: 15, condition: () => gameState.seekers.length >= 2 },
    { id: "daily_event_new_seeker", weight: 10, condition: () => gameState.concepts.visionAltar.built && gameState.seekers.length < gameState.maxSeekers, onTrigger: () => {
        const newSeeker = generateRandomSeeker();
        gameState.pendingNewSeeker = newSeeker;
        gameScenarios["daily_event_new_seeker"].text = `새로운 구도자 ${newSeeker.name}(${newSeeker.personality}, ${newSeeker.skill})이(가) 성소에 머물고 싶어 합니다. (현재 구도자 수: ${gameState.seekers.length} / ${gameState.maxSeekers})`;
    }},
    { id: "daily_event_lost_traveler", weight: 10, condition: () => true },
    { id: "daily_event_ancient_text_discovery", weight: 15, condition: () => true },
    { id: "daily_event_visionary_dream", weight: 10, condition: () => true },
    { id: "daily_event_meaning_crisis", weight: 12, condition: () => gameState.meaning < 50 },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { meditated: false, talkedToSeeker: false, discussed: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { insightGain: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.seekers.forEach(s => {
        if (s.skill === '상징 해석') { gameState.resources.inspiration++; skillBonusMessage += `${s.name}의 상징 해석 덕분에 영감을 추가로 얻었습니다. `; }
        else if (s.skill === '통찰') { gameState.resources.knowledge++; skillBonusMessage += `${s.name}의 통찰 덕분에 지식을 추가로 얻었습니다. `; }
        else if (s.skill === '예언') { gameState.resources.connection++; skillBonusMessage += `${s.name}의 예언 덕분에 관계를 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.concepts).forEach(key => {
        const concept = gameState.concepts[key];
        if(concept.built) {
            concept.durability -= 1;
            if(concept.durability <= 0) {
                concept.built = false;
                durabilityMessage += `${key} 개념이 붕괴되었습니다! 정화가 필요합니다. `; 
            }
        }
    });

    gameState.resources.inspiration -= gameState.seekers.length * 2; // Inspiration consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.inspiration < 0) {
        gameState.harmony -= 10;
        dailyMessage += "영감이 부족하여 구도자들이 힘들어합니다! (-10 조화)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.insight <= 0) { gameState.currentScenarioId = "game_over_insight"; }
    else if (gameState.harmony <= 0) { gameState.currentScenarioId = "game_over_harmony"; }
    else if (gameState.meaning <= 0) { gameState.currentScenarioId = "game_over_meaning"; }
    else if (gameState.inspiration <= 0) { gameState.currentScenarioId = "game_over_inspiration"; }
    else if (gameState.empathy <= 0) { gameState.currentScenarioId = "game_over_empathy"; }
    else if (gameState.resources.inspiration < -(gameState.seekers.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 내면의 성소를 포기하시겠습니까? 모든 깨달음이 사라집니다.")) {
        localStorage.removeItem('infjSanctuaryGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};
