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

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        insight: 50,
        harmony: 50,
        meaning: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { inspiration: 10, knowledge: 10, relationships: 5, deep_understanding: 0 },
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
            meditationRoom: { built: false, durability: 100 },
            libraryOfSouls: { built: false, durability: 100 },
            visionAltar: { built: false, durability: 100 },
            gardenOfSilence: { built: false, durability: 100 },
            oracleChamber: { built: false, durability: 100 }
        },
        sanctuaryLevel: 0,
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
        if (!loaded.dailyBonus) loaded.dailyBonus = { meditationSuccess: 0 };
        if (!loaded.seekers || loaded.seekers.length === 0) {
            loaded.seekers = [
                { id: "luna", name: "루나", personality: "몽상가", skill: "상징 해석", connection: 70 },
                { id: "sol", name: "현자", personality: "현실적", skill: "통찰", connection: 60 }
            ];
        }
        Object.assign(gameState, loaded);

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
    const seekerListHtml = gameState.seekers.map(s => `<li>${s.name} (${s.skill}) - 연결: ${s.connection}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>성찰:</b> ${gameState.day}일차</p>
        <p><b>집중력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>통찰:</b> ${gameState.insight} | <b>조화:</b> ${gameState.harmony} | <b>의미:</b> ${gameState.meaning}</p>
        <p><b>자원:</b> 영감 ${gameState.resources.inspiration}, 지식 ${gameState.resources.knowledge}, 관계 ${gameState.resources.relationships}, 깊은 이해 ${gameState.resources.deep_understanding || 0}</p>
        <p><b>성소 레벨:</b> ${gameState.sanctuaryLevel}</p>
        <p><b>구도자 (${gameState.seekers.length}/${gameState.maxSeekers}):</b></p>
        <ul>${seekerListHtml}</ul>
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
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        if (!gameState.concepts.meditationRoom.built) dynamicChoices.push({ text: "명상의 방 구현 (영감 50, 관계 20)", action: "build_meditation_room" });
        if (!gameState.concepts.libraryOfSouls.built) dynamicChoices.push({ text: "영혼의 도서관 구축 (지식 30, 관계 30)", action: "build_library_of_souls" });
        if (!gameState.concepts.visionAltar.built) dynamicChoices.push({ text: "비전의 제단 설립 (영감 100, 지식 50, 관계 50)", action: "build_vision_altar" });
        if (!gameState.concepts.gardenOfSilence.built) dynamicChoices.push({ text: "침묵의 정원 조성 (지식 80, 관계 40)", action: "build_garden_of_silence" });
        if (gameState.concepts.libraryOfSouls.built && gameState.concepts.libraryOfSouls.durability > 0 && !gameState.concepts.oracleChamber.built) {
            dynamicChoices.push({ text: "신탁의 방 개방 (지식 50, 관계 100)", action: "build_oracle_chamber" });
        }
        Object.keys(gameState.concepts).forEach(key => {
            const facility = gameState.concepts[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${key} 정화 (지식 10, 관계 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}''">${choice.text}</button>`).join('');
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
    "intro": { text: "오늘은 어떤 성찰을 하시겠습니까?", choices: [
        { text: "명상하기", action: "meditate" },
        { text: "구도자와 대화하기", action: "talk_to_seekers" },
        { text: "토론회 개최", action: "hold_dialogue" },
        { text: "영감 수집", action: "show_resource_collection_options" },
        { text: "개념 관리", action: "show_facility_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_inner_conflict": {
        text: "내면의 이상과 현실 사이의 괴리감으로 깊은 고뇌에 빠졌습니다.",
        choices: [
            { text: "이상을 따른다.", action: "handle_conflict", params: { first: "ideal", second: "reality" } },
            { text: "현실을 수용한다.", action: "handle_conflict", params: { first: "reality", second: "ideal" } },
            { text: "둘 사이의 조화를 모색한다.", action: "mediate_conflict" },
            { text: "결정을 미룬다.", action: "ignore_event" }
        ]
    },
    "daily_event_prophecy": { text: "꿈에서 불길한 예언을 보았습니다. (-10 조화)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_epiphany": { text: "오랜 고민 끝에 깊은 깨달음을 얻었습니다. (+10 영감)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_visitor": {
        text: "길 잃은 여행자가 성소를 찾아왔습니다. 그에게 [지식 50]을 나누어주면 [깊은 이해]를 얻을 수 있습니다.",
        choices: [
            { text: "지식을 나눈다", action: "accept_sharing" },
            { text: "돌려보낸다", action: "decline_sharing" }
        ]
    },
    "daily_event_new_seeker": {
        choices: [
            { text: "따뜻하게 맞이하고 비전을 공유한다.", action: "welcome_new_unique_seeker" },
            { text: "그의 내면을 조용히 관찰한다.", action: "observe_seeker" },
            { text: "우리와 길이 다른 것 같다.", action: "reject_seeker" }
        ]
    },
    "game_over_insight": { text: "통찰력을 잃고 방황하게 되었습니다. 성소의 빛이 사라집니다.", choices: [], final: true },
    "game_over_harmony": { text: "내면의 조화가 깨졌습니다. 더 이상 성찰을 이어갈 수 없습니다.", choices: [], final: true },
    "game_over_meaning": { text: "삶의 의미를 잃었습니다. 모든 것이 공허하게 느껴집니다.", choices: [], final: true },
    "game_over_resources": { text: "모든 영감과 지식이 고갈되었습니다.", choices: [], final: true },
    "action_resource_collection": {
        text: "어떤 영감을 수집하시겠습니까?",
        choices: [
            { text: "예술 작품 감상 (영감)", action: "perform_gather_inspiration" },
            { text: "고전 탐독 (지식)", action: "perform_get_knowledge" },
            { text: "의미있는 대화 (관계)", "action": "perform_build_relationships" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 개념을 관리하시겠습니까?",
        choices: []
    },
    "resource_collection_result": {
        text: "",
        choices: [{ text: "확인", action: "show_resource_collection_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "conflict_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { insight: 0, harmony: 0, meaning: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.insight = 15;
                rewards.harmony = 10;
                rewards.meaning = 5;
                rewards.message = `완벽한 기억력입니다! 모든 상징의 의미를 기억했습니다. (+15 통찰, +10 조화, +5 의미)`;
            } else if (score >= 21) {
                rewards.insight = 10;
                rewards.harmony = 5;
                rewards.message = `훌륭한 기억력입니다. (+10 통찰, +5 조화)`;
            } else if (score >= 0) {
                rewards.insight = 5;
                rewards.message = `훈련을 완료했습니다. (+5 통찰)`;
            } else {
                rewards.message = `훈련을 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        case "상징 해석하기":
            rewards.insight = 10;
            rewards.message = `상징의 숨겨진 의미를 발견했습니다! (+10 통찰)`;
            break;
        case "미래 예측":
            rewards.meaning = 10;
            rewards.message = `미래의 가능성을 엿보았습니다. (+10 의미)`;
            break;
        case "공감 챌린지":
            rewards.harmony = 10;
            rewards.message = `타인의 마음에 깊이 공감했습니다. (+10 조화)`;
            break;
        case "비전 그리기":
            rewards.insight = 5;
            rewards.meaning = 5;
            rewards.message = `당신의 비전이 더욱 명확해졌습니다. (+5 통찰, +5 의미)`;
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 상징의 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
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
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
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
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                insight: gameState.insight + rewards.insight,
                harmony: gameState.harmony + rewards.harmony,
                meaning: gameState.meaning + rewards.meaning,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "상징 해석하기", description: "모호한 상징의 숨겨진 의미를 해석하여 통찰을 얻으세요.", start: (ga, cd) => { ga.innerHTML = "<p>상징 해석하기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ insight: gameState.insight + r.insight, harmony: gameState.harmony + r.harmony, meaning: gameState.meaning + r.meaning, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "미래 예측", description: "현재의 단서들을 조합하여 미래에 일어날 일을 예측하세요.", start: (ga, cd) => { ga.innerHTML = "<p>미래 예측 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ insight: gameState.insight + r.insight, harmony: gameState.harmony + r.harmony, meaning: gameState.meaning + r.meaning, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "공감 챌린지", description: "상대방의 말과 행동 이면에 숨겨진 진짜 감정을 맞추세요.", start: (ga, cd) => { ga.innerHTML = "<p>공감 챌린지 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ insight: gameState.insight + r.insight, harmony: gameState.harmony + r.harmony, meaning: gameState.meaning + r.meaning, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "비전 그리기", description: "당신의 이상적인 미래에 대한 비전을 구체적인 그림으로 표현하세요.", start: (ga, cd) => { ga.innerHTML = "<p>비전 그리기 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ insight: gameState.insight + r.insight, harmony: gameState.harmony + r.harmony, meaning: gameState.meaning + r.meaning, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
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
        if (gameState.dailyActions.meditated) { updateState({ dailyActions: { ...gameState.dailyActions, meditated: true } }, "오늘은 이미 충분히 명상했습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, meditated: true } };
        let message = "깊은 명상을 통해 내면을 들여다보았습니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 새로운 영감을 얻었습니다. (+2 영감)"; changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration + 2 }; }
        else if (rand < 0.6) { message += " 잊고 있던 지식을 떠올렸습니다. (+2 지식)"; changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge + 2 }; }
        else { message += " 특별한 깨달음은 없었습니다."; }
        
        updateState(changes, message);
    },
    talk_to_seekers: () => {
        if (!spendActionPoint()) return;
        const seeker = gameState.seekers[Math.floor(currentRandFn() * gameState.seekers.length)];
        if (gameState.dailyActions.talkedTo.includes(seeker.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, seeker.id] } }, `${seeker.name}${getWaGwaParticle(seeker.name)} 이미 깊은 대화를 나누었습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, seeker.id] } };
        let message = `${seeker.name}${getWaGwaParticle(seeker.name)} 대화했습니다. `;
        if (seeker.connection > 80) { message += "그와의 대화를 통해 삶의 의미를 발견했습니다. (+5 의미)"; changes.meaning = gameState.meaning + 5; }
        else if (seeker.connection < 40) { message += "그는 아직 당신에게 마음을 열지 않았습니다. (-5 조화)"; changes.harmony = gameState.harmony - 5; }
        else { message += "그와의 관계가 깊어졌습니다. (+2 관계)"; changes.resources = { ...gameState.resources, relationships: gameState.resources.relationships + 2 }; }
        
        updateState(changes, message);
    },
    hold_dialogue: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.dialogueHeld) {
            const message = "오늘은 이미 토론회를 개최했습니다. 잦은 토론은 모두를 지치게 합니다. (-5 조화)";
            gameState.harmony -= 5;
            updateState({ harmony: gameState.harmony }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, dialogueHeld: true } });
        const rand = currentRandFn();
        let message = "토론회를 개최했습니다. ";
        if (rand < 0.5) { message += "구도자들이 서로의 생각을 나누며 성소의 조화가 깊어졌습니다. (+10 조화, +5 의미)"; updateState({ harmony: gameState.harmony + 10, meaning: gameState.meaning + 5 }); }
        else { message += "의견 충돌이 있었지만, 당신의 통찰력으로 잘 해결되었습니다. (+5 통찰)"; updateState({ insight: gameState.insight + 5 }); }
        updateGameDisplay(message);
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
    handle_conflict: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { insight: 0, harmony: 0, meaning: 0 };
        
        if (first === "ideal") {
            message = "이상을 따르기로 했습니다. 내면의 목소리에 귀를 기울입니다. (+5 의미)";
            reward.meaning += 5;
            reward.harmony -= 5;
        } else {
            message = "현실을 수용하기로 했습니다. 잠시 꿈을 접어둡니다. (-5 의미)";
            reward.meaning -= 5;
            reward.harmony += 5;
        }
        
        updateState({ ...reward, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    mediate_conflict: () => {
        if (!spendActionPoint()) return;
        const message = "이상과 현실의 조화를 찾았습니다. 성소의 조화가 깊어지고 새로운 통찰을 얻었습니다! (+10 조화, +5 통찰)";
        updateState({ harmony: gameState.harmony + 10, insight: gameState.insight + 5, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "결정을 미루었습니다. 내면의 갈등이 깊어집니다. (-10 조화, -5 통찰)";
        updateState({ harmony: gameState.harmony - 10, insight: gameState.insight - 5, currentScenarioId: 'conflict_resolution_result' }, message);
    },
    show_resource_collection_options: () => updateState({ currentScenarioId: 'action_resource_collection' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_gather_inspiration: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.sanctuaryLevel * 0.1) + (gameState.dailyBonus.meditationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "새로운 영감을 얻었습니다! (+5 영감)";
            changes.resources = { ...gameState.resources, inspiration: gameState.resources.inspiration + 5 };
        } else {
            message = "영감을 얻지 못했습니다.";
        }
        updateState(changes, message);
    },
    perform_get_knowledge: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.sanctuaryLevel * 0.1) + (gameState.dailyBonus.meditationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "깊은 지식을 얻었습니다! (+5 지식)";
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge + 5 };
        } else {
            message = "지식을 얻지 못했습니다.";
        }
        updateState(changes, message);
    },
    perform_build_relationships: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.sanctuaryLevel * 0.1) + (gameState.dailyBonus.meditationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "의미있는 관계를 맺었습니다! (+5 관계)";
            changes.resources = { ...gameState.resources, relationships: gameState.resources.relationships + 5 };
        } else {
            message = "관계 맺기에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_meditation_room: () => {
        if (!spendActionPoint()) return;
        const cost = { inspiration: 50, relationships: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.relationships >= cost.relationships && gameState.resources.inspiration >= cost.inspiration) {
            gameState.concepts.meditationRoom.built = true;
            message = "명상의 방을 구현했습니다!";
            changes.meaning = gameState.meaning + 10;
            changes.resources = { ...gameState.resources, relationships: gameState.resources.relationships - cost.relationships, inspiration: gameState.resources.inspiration - cost.inspiration };
        } else {
            message = "자원이 부족하여 구현할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_library_of_souls: () => {
        if (!spendActionPoint()) return;
        const cost = { knowledge: 30, relationships: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.relationships >= cost.relationships) {
            gameState.concepts.libraryOfSouls.built = true;
            message = "영혼의 도서관을 구축했습니다!";
            changes.harmony = gameState.harmony + 10;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, relationships: gameState.resources.relationships - cost.relationships };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_vision_altar: () => {
        if (!spendActionPoint()) return;
        const cost = { inspiration: 100, knowledge: 50, relationships: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.relationships >= cost.relationships && gameState.resources.inspiration >= cost.inspiration) {
            gameState.concepts.visionAltar.built = true;
            message = "비전의 제단을 설립했습니다!";
            changes.meaning = gameState.meaning + 20;
            changes.harmony = gameState.harmony + 20;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, relationships: gameState.resources.relationships - cost.relationships, inspiration: gameState.resources.inspiration - cost.inspiration };
        } else {
            message = "자원이 부족하여 설립할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_garden_of_silence: () => {
        if (!spendActionPoint()) return;
        const cost = { knowledge: 80, relationships: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.relationships >= cost.relationships) {
            gameState.concepts.gardenOfSilence.built = true;
            message = "침묵의 정원을 조성했습니다!";
            changes.insight = gameState.insight + 15;
            changes.meaning = gameState.meaning + 10;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, relationships: gameState.resources.relationships - cost.relationships };
        } else {
            message = "자원이 부족하여 조성할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_oracle_chamber: () => {
        if (!spendActionPoint()) return;
        const cost = { knowledge: 50, relationships: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.relationships >= cost.relationships) {
            gameState.concepts.oracleChamber.built = true;
            message = "신탁의 방을 개방했습니다!";
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, relationships: gameState.resources.relationships - cost.relationships };
        } else {
            message = "자원이 부족하여 개방할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { knowledge: 10, relationships: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.knowledge >= cost.knowledge && gameState.resources.relationships >= cost.relationships) {
            gameState.concepts[facilityKey].durability = 100;
            message = `${facilityKey} 개념의 정화를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge - cost.knowledge, relationships: gameState.resources.relationships - cost.relationships };
        } else {
            message = "정화에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    upgrade_sanctuary: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.sanctuaryLevel + 1);
        if (gameState.resources.knowledge >= cost && gameState.resources.relationships >= cost) {
            gameState.sanctuaryLevel++;
            updateState({ resources: { ...gameState.resources, knowledge: gameState.resources.knowledge - cost, relationships: gameState.resources.relationships - cost }, sanctuaryLevel: gameState.sanctuaryLevel });
            updateGameDisplay(`성소를 업그레이드했습니다! 모든 명상 성공률이 10% 증가합니다. (현재 레벨: ${gameState.sanctuaryLevel})`);
        } else { updateGameDisplay(`업그레이드에 필요한 자원이 부족합니다. (지식 ${cost}, 관계 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    review_records: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, knowledge: gameState.resources.knowledge + 20, relationships: gameState.resources.relationships + 20 } }); updateGameDisplay("기록 검토 중 잊혀진 관계의 실마리를 발견했습니다! (+20 지식, +20 관계)"); }
        else if (rand < 0.5) { updateState({ insight: gameState.insight + 10, meaning: gameState.meaning + 10 }); updateGameDisplay("과거의 기록에서 삶의 의미에 대한 통찰을 얻었습니다. (+10 통찰, +10 의미)"); }
        else { updateGameDisplay("기록을 검토했지만, 특별한 것은 발견하지 못했습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_sharing: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.knowledge >= 50) {
            updateState({ resources: { ...gameState.resources, knowledge: gameState.resources.knowledge - 50, deep_understanding: (gameState.resources.deep_understanding || 0) + 1 } });
            updateGameDisplay("지식을 나누어 깊은 이해를 얻었습니다! 성소의 의미가 깊어집니다.");
        } else { updateGameDisplay("나눌 지식이 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_sharing: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("여행자를 돌려보냈습니다. 다음 인연을 기다려야겠습니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

function applyStatEffects() {
    let message = "";
    if (gameState.insight >= 70) {
        gameState.dailyBonus.meditationSuccess += 0.1;
        message += "깊은 통찰력 덕분에 명상 성공률이 증가합니다. ";
    }
    if (gameState.insight < 30) {
        gameState.seekers.forEach(s => s.connection = Math.max(0, s.connection - 5));
        message += "통찰력이 흐려져 구도자들과의 연결이 약해집니다. ";
    }

    if (gameState.harmony >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "내면의 조화로 인해 집중력이 증가합니다. ";
    }
    if (gameState.harmony < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "내면의 부조화로 인해 집중력이 감소합니다. ";
    }

    if (gameState.meaning >= 70) {
        Object.keys(gameState.concepts).forEach(key => {
            if (gameState.concepts[key].built) gameState.concepts[key].durability = Math.min(100, gameState.concepts[key].durability + 1);
        });
        message += "삶의 의미가 깊어져 성소의 개념들이 더욱 견고해집니다. ";
    }
    if (gameState.meaning < 30) {
        Object.keys(gameState.concepts).forEach(key => {
            if (gameState.concepts[key].built) gameState.concepts[key].durability = Math.max(0, gameState.concepts[key].durability - 2);
        });
        message += "삶의 의미가 희미해져 개념들이 빠르게 붕괴됩니다. ";
    }
    return message;
}

function generateRandomSeeker() {
    const names = ["아리엘", "카이론", "셀레네", "오리온"];
    const personalities = ["이상주의적인", "통찰력 있는", "신비로운", "공감하는"];
    const skills = ["상징 해석", "통찰", "예언", "치유"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        connection: 50
    };
}

// --- Daily/Initialization Logic ---
function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { meditated: false, dialogueHeld: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { meditationSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.seekers.forEach(s => {
        if (s.skill === '상징 해석') { gameState.resources.inspiration++; skillBonusMessage += `${s.name}의 해석 덕분에 영감을 추가로 얻었습니다. `; }
        else if (s.skill === '통찰') { gameState.resources.knowledge++; skillBonusMessage += `${s.name}의 도움으로 지식을 추가로 얻었습니다. `; }
        else if (s.skill === '예언') { gameState.meaning++; skillBonusMessage += `${s.name} 덕분에 성소의 의미가 +1 깊어졌습니다. `; }
    });

    Object.keys(gameState.concepts).forEach(key => {
        const facility = gameState.concepts[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 개념이 붕괴되었습니다! 재정립이 필요합니다. `; 
            }
        }
    });

    gameState.resources.inspiration -= gameState.seekers.length * 2;
    let dailyMessage = "새로운 성찰의 날이 밝았습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.inspiration < 0) {
        gameState.harmony -= 10;
        dailyMessage += "영감이 부족하여 내면의 조화가 흔들립니다! (-10 조화)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_prophecy"; updateState({resources: {...gameState.resources, harmony: Math.max(0, gameState.resources.harmony - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_epiphany"; updateState({resources: {...gameState.resources, inspiration: gameState.resources.inspiration + 10}}); }
    else if (rand < 0.5 && gameState.seekers.length >= 2) { eventId = "daily_event_inner_conflict"; }
    else if (rand < 0.7 && gameState.concepts.visionAltar.built && gameState.seekers.length < gameState.maxSeekers) {
        eventId = "daily_event_new_seeker";
        const newSeeker = generateRandomSeeker();
        gameState.pendingNewSeeker = newSeeker;
        gameScenarios["daily_event_new_seeker"].text = `새로운 구도자 ${newSeeker.name}(${newSeeker.personality}, ${newSeeker.skill})이(가) 성소에 찾아왔습니다. (현재 구도자 수: ${gameState.seekers.length} / ${gameState.maxSeekers})`;
    }
    else if (rand < 0.85 && gameState.concepts.visionAltar.built) { eventId = "daily_event_visitor"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 성소를 초기화하시겠습니까? 모든 성찰의 기록이 사라집니다.")) {
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
