const MAX_QUESTIONS = 10;
const QUESTION_DURATION = 15;
const XP_PER_CORRECT = 12;
const XP_PER_STREAK_POINT = 4;
const XP_PER_LEVEL = 120;
const STORAGE_KEY = "mw-level";
const QUEST_STORAGE_KEY = "mw-quest-selection";

const APP_CONTEXT = document.body && document.body.dataset && document.body.dataset.app ? document.body.dataset.app : "launcher";
const IS_GAME_CONTEXT = APP_CONTEXT === "game";
const IS_LAUNCHER_CONTEXT = APP_CONTEXT === "launcher";

const TABLE_OPTIONS = [
  { id: "1-3", label: "Tables 1 a 3", values: [1, 2, 3] },
  { id: "4-6", label: "Tables 4 a 6", values: [4, 5, 6] },
  { id: "7-9", label: "Tables 7 a 9", values: [7, 8, 9] },
  { id: "10", label: "Table de 10", values: [10] },
  {
    id: "mix",
    label: "Tout melange",
    values: Array.from({ length: 10 }, function (_, index) {
      return index + 1;
    })
  }
];

const MINI_GAMES = {

  classic: {

    id: "classic",

    title: "Roulette 15 s",

    status: "playable",

    summary: "Quiz rapide de 10 questions chronometrees.",

    goal: "Reponds juste avant la fin des 15 secondes par calcul.",

    rules: [

      "10 questions tirees des tables selectionnees.",

      "Le chrono se remet a 15 secondes pour chaque question.",

      "Quatre reponses melangees, une seule est correcte.",

      "Utilise le bouton Passer pour ne pas bloquer ta serie."

    ],

    rewards: [

      "12 xp par bonne reponse.",

      "Bonus de 4 xp multiplie par ta meilleure serie."

    ],

    focus: ["Reflexes", "Calcul mental"],

    launchUrl: "jeu.html",

    supportsTables: true

  },

  "flash-bingo": {

    id: "flash-bingo",

    title: "Bingo multiples",

    status: "playable",

    summary: "Bingo 4x4 special multiples de 10.",

    goal: "Trouve tous les bons resultats avant la fin du chrono.",

    rules: [

      "La grille contient 16 multiples de 10 entre 10 et 100.",

      "Huit cases correspondent aux operations affichees.",

      "Une bonne case reste allumee en vert.",

      "Les erreurs clignotent en rouge mais restent jouables."

    ],

    rewards: [

      "Compteur de bonnes reponses et chrono visibles.",

      "Reflexes sur les multiples de 10."

    ],

    focus: ["Observation", "Calcul mental"],

    launchUrl: "bingo.html",

    supportsTables: false

  },

  "true-false": {

    id: "true-false",

    title: "Vrai ou Faux",

    status: "playable",

    summary: "Reponds vite si la proposition de resultat est correcte.",

    goal: "Valide 10 operations en moins de 3 secondes chacune.",

    rules: [

      "Chaque question propose un calcul et un resultat.",

      "Reponds avec Vrai ou Faux avant la fin du compte a rebours.",

      "Les propositions fausses sont proches du bon resultat.",

      "Un score final recapitule les bonnes reponses."

    ],

    rewards: [

      "Travail sur la rapidite et la justesse.",

      "Historique de score pour se challenger."

    ],

    focus: ["Reflexes", "Logique"],

    launchUrl: "vf.html",

    supportsTables: false

  },

  "table-rush": {
    id: "table-rush",
    title: "Course aux reponses",
    status: "playable",
    summary: "Choisis une table et clique sur les bons produits.",
    goal: "Valide les 10 calculs de la table selectionnee.",
    rules: [
      "Choisis une table de 1 a 10 avant de demarrer.",
      "Chaque calcul apparait l un apres l autre.",
      "Clique sur le produit correct parmi les 10 reponses melangees.",
      "Toutes les reponses sont necessaires pour terminer la manche."
    ],
    rewards: [
      "Reflexes sur une table cible.",
      "Score final avec temps et erreurs."
    ],
    focus: ["Reflexes", "Calcul mental"],
    launchUrl: "table-rush.html",
    supportsTables: false
  },

  "memory-match": {

    id: "memory-match",

    title: "Memory multi",

    status: "playable",

    summary: "Associe operation et resultat pour completer les paires.",

    goal: "Retrouve les 6 paires avant la fin du chrono.",

    rules: [

      "Choisis une table de 1 a 10 avant de commencer.",

      "Chaque paire contient un calcul et son resultat.",

      "Deux cartes retournees ne correspondant pas se referment apres 1 seconde.",

      "Le compteur de coups et le chrono suivent ta progression."

    ],

    rewards: [

      "Renforcement memoire des tables choisies.",

      "Temps final pour se comparer."

    ],

    focus: ["Memoire", "Concentration"],

    launchUrl: "memory.html",

    supportsTables: false

  },

  construction: {

    id: "construction",

    title: "Construction surprise",

    status: "coming-soon",

    summary: "Assemble un dessin en gagnant des pieces en reussissant tes calculs.",

    goal: "Reveler l image mystere avant la fin des essais disponibles.",

    rules: [

      "Chaque bonne reponse ajoute une piece sur le plateau.",

      "Les pieces sont nombreuses au debut puis se font plus rares.",

      "Des mini missions apparaissent pour gagner des pieces bonus.",

      "Trois erreurs d affilee retirent une piece deja placee."

    ],

    rewards: [

      "Completement de l image = coffre d etoiles bonus.",

      "Trois images completees debloquent un decor special pour l accueil."

    ],

    focus: ["Perseverance", "Gestion du stress"],

    supportsTables: false

  }

};

const CLASSIC_MODE_ID = "classic";

const appState = {
  selectedTables: new Set(),
  selectedMode: CLASSIC_MODE_ID,
  selectedAvatar: null,
  avatarLocked: false,
  questLevel: null,
  questTables: []
};

let launcher = null;
let gameElements = null;
let gameState = createGameState([], CLASSIC_MODE_ID, appState.selectedAvatar);
let storageListenerBound = false;

initApp();

function initApp() {
  launcher = setupLauncherElements();
  gameElements = setupGameElements();

  bootstrapContextState();

  selectAvatar(appState.selectedAvatar ? appState.selectedAvatar.id : null);

  renderTableChips();
  renderReferenceTables();
  updateLevelCard();
  displayMiniGame(appState.selectedMode || CLASSIC_MODE_ID, { initial: true });
  refreshStartAvailability();
  showSetupView();
  renderTimer(gameState.duration);
  updateHud();

  if (!storageListenerBound) {
    window.addEventListener("storage", function (event) {
      if (event.key === STORAGE_KEY) {
        updateLevelCard();
        refreshStartAvailability();
      }
    });
    storageListenerBound = true;
  }
}

function bootstrapContextState() {
  if (IS_GAME_CONTEXT) {
    appState.selectedMode = CLASSIC_MODE_ID;
    appState.selectedAvatar = null;
    appState.avatarLocked = false;
    appState.questLevel = null;
    appState.questTables = [];

    const questSetup = readQuestSelection();
    if (questSetup) {
      if (questSetup.hero) {
        const hero = normalizeAvatar(questSetup.hero);
        if (hero) {
          appState.selectedAvatar = hero;
          appState.avatarLocked = true;
        }
      }
      if (questSetup.level && typeof questSetup.level === "object") {
        const levelId = typeof questSetup.level.id === "string"
          ? questSetup.level.id
          : questSetup.level.id != null
          ? String(questSetup.level.id)
          : "";
        appState.questLevel = {
          id: levelId,
          label: typeof questSetup.level.label === "string" ? questSetup.level.label : "",
          shortName:
            typeof questSetup.level.shortName === "string"
              ? questSetup.level.shortName
              : typeof questSetup.level.label === "string"
              ? questSetup.level.label
              : levelId,
          range: typeof questSetup.level.range === "string" ? questSetup.level.range : ""
        };
      }
      if (Array.isArray(questSetup.tables) && questSetup.tables.length > 0) {
        appState.questTables = sanitizeQuestTables(questSetup.tables);
      }
    }

    applyGameQueryParameters();

    if (appState.selectedTables.size === 0 && appState.questTables.length > 0) {
      appState.questTables.forEach(function (value) {
        appState.selectedTables.add(value);
      });
    }
  }
  if (!MINI_GAMES[appState.selectedMode]) {
    appState.selectedMode = CLASSIC_MODE_ID;
  }
}

function applyGameQueryParameters() {
  if (typeof window === "undefined" || !window.location) {
    return;
  }

  const search = typeof window.location.search === "string" ? window.location.search : "";
  const params = {};

  search
    .replace(/^\?/, "")
    .split("&")
    .forEach(function (pair) {
      if (!pair) {
        return;
      }
      const parts = pair.split("=");
      let key = parts[0] || "";
      try {
        key = decodeURIComponent(key);
      } catch (error) {
        // ignore invalid encoding and keep raw value
      }
      key = key.toLowerCase();
      if (!key) {
        return;
      }
      let value = parts.slice(1).join("=") || "";
      try {
        value = decodeURIComponent(value);
      } catch (error) {
        // ignore invalid encoding and keep raw value
      }
      params[key] = value;
    });

  const modeParam = params.mode;
  if (!IS_GAME_CONTEXT && modeParam && MINI_GAMES[modeParam]) {
    appState.selectedMode = modeParam;
  }

  const tablesParam = params.tables;
  appState.selectedTables.clear();
  if (tablesParam) {
    const values = parseTableValues(tablesParam);
    values.forEach(function (value) {
      appState.selectedTables.add(value);
    });
  }
}

function parseTableValues(input) {
  if (!input) {
    return [];
  }

  const seen = {};
  const result = [];

  String(input)
    .split(/[^0-9]+/)
    .forEach(function (token) {
      if (!token) {
        return;
      }
      const value = Number(token);
      if (!isNaN(value) && isFinite(value) && Math.floor(value) === value && value >= 1 && value <= 10 && !seen[value]) {
        seen[value] = true;
        result.push(value);
      }
    });

  return result.sort(function (a, b) {
    return a - b;
  });
}

function setupLauncherElements() {
  const setupIntroElement = document.querySelector(".setup__intro");
  const startHintElement = document.getElementById("start-hint");

  const elements = {
    setupPanel: document.getElementById("setup-panel"),
    referencePanel: document.getElementById("reference-panel"),
    tableOptions: document.getElementById("table-options"),
    avatarOptions: document.getElementById("avatar-options"),
    startBtn: document.getElementById("start-btn"),
    navButtons: Array.from(document.querySelectorAll(".nav-btn[data-panel]")),
    modeCards: Array.from(document.querySelectorAll(".mode-card")),
    previewButtons: Array.from(document.querySelectorAll("[data-mode-action]")),
    referenceGrid: document.getElementById("reference-grid"),
    levelName: document.getElementById("level-name"),
    levelXp: document.getElementById("level-xp"),
    levelProgress: document.getElementById("level-progress"),
    setupIntro: setupIntroElement,
    setupIntroDefault: setupIntroElement ? setupIntroElement.textContent : "",
    startHint: startHintElement,
    startHintDefault: startHintElement ? startHintElement.textContent : "",
    modeInfo: {
      container: document.getElementById("mode-info"),
      placeholder: document.getElementById("mode-info-placeholder"),
      panel: document.getElementById("mode-info-panel"),
      name: document.getElementById("mode-info-name"),
      status: document.getElementById("mode-info-status"),
      goal: document.getElementById("mode-info-goal"),
      rules: document.getElementById("mode-info-rules"),
      rewards: document.getElementById("mode-info-rewards"),
      focus: document.getElementById("mode-info-focus")
    }
  };

  elements.avatarButtons = elements.avatarOptions
    ? Array.from(elements.avatarOptions.querySelectorAll("[data-avatar]"))
    : [];

  if (elements.startBtn) {
    elements.startBtn.addEventListener("click", function () {
      if (!launchSelectedMode()) {
        refreshStartAvailability();
      }
    });
  }

  elements.avatarButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (appState.avatarLocked) {
        return;
      }
      if (button.dataset.selected === "true") {
        selectAvatar(null);
      } else {
        selectAvatar(button.dataset.avatar || "");
      }
    });
    button.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (appState.avatarLocked) {
          return;
        }
        if (button.dataset.selected === "true") {
          selectAvatar(null);
        } else {
          selectAvatar(button.dataset.avatar || "");
        }
      }
    });
  });

  elements.navButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      switchPanel(button.dataset.panel);
    });
  });

  elements.previewButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      displayMiniGame(button.dataset.modeAction || CLASSIC_MODE_ID);
    });
  });

  elements.modeCards.forEach(function (card) {
    card.addEventListener("click", function (event) {
      if (event.target && event.target.closest("button")) {
        return;
      }
      displayMiniGame(card.dataset.mode || CLASSIC_MODE_ID);
    });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        displayMiniGame(card.dataset.mode || CLASSIC_MODE_ID);
      }
    });
  });

  return elements;
}

function setupGameElements() {
  const elements = {
    gamePanel: document.getElementById("game-panel"),
    summaryPanel: document.getElementById("summary-panel"),
    timer: document.getElementById("timer"),
    progressLabel: document.getElementById("progress"),
    progressBar: document.getElementById("progress-bar"),
    streak: document.getElementById("streak"),
    score: document.getElementById("score"),
    questionMultipliers: document.getElementById("question-multipliers"),
    choices: document.getElementById("choices"),
    feedback: document.getElementById("feedback"),
    passBtn: document.getElementById("pass-btn"),
    closeBtn: document.getElementById("close-btn"),
    restartBtn: document.getElementById("restart-btn"),
    summaryCloseBtn: document.getElementById("summary-close-btn"),
    gameConfig: document.getElementById("game-config"),
    summaryScore: document.getElementById("summary-score"),
    summaryStreak: document.getElementById("summary-streak"),
    summaryQuestions: document.getElementById("summary-questions"),
    summaryCorrect: document.getElementById("summary-correct"),
    summaryWrong: document.getElementById("summary-wrong"),
    summaryXp: document.getElementById("summary-xp"),
    summaryLevel: document.getElementById("summary-level"),
    summaryLevelProgress: document.getElementById("summary-level-progress"),
    hudAvatar: document.getElementById("hud-avatar"),
    hudAvatarImage: document.getElementById("hud-avatar-image"),
    hudAvatarName: document.getElementById("hud-avatar-name"),
    summaryAvatar: document.getElementById("summary-avatar"),
    summaryAvatarImage: document.getElementById("summary-avatar-image"),
    summaryAvatarName: document.getElementById("summary-avatar-name")
  };

  if (elements.choices) {
    elements.choices.addEventListener("click", handleChoiceClick);
    elements.choices.addEventListener("keydown", handleChoiceKeyDown);
  }

  if (elements.passBtn) {
    elements.passBtn.addEventListener("click", handlePass);
  }

  if (elements.restartBtn) {
    elements.restartBtn.addEventListener("click", restartGame);
  }

  if (elements.closeBtn) {
    elements.closeBtn.addEventListener("click", closeGameWindow);
  }

  if (elements.summaryCloseBtn) {
    elements.summaryCloseBtn.addEventListener("click", closeGameWindow);
  }

  return elements;
}

function avatarDataFromButton(button) {
  if (!button) {
    return null;
  }

  const id = (button.dataset.avatar || "").trim();
  if (!id) {
    return null;
  }

  const titleElement = button.querySelector(".avatar-card__title");
  const imageElement = button.querySelector("img");

  const name = (button.dataset.avatarName || (titleElement ? titleElement.textContent || "" : "") || id).trim();
  const image = (button.dataset.avatarSrc || (imageElement ? imageElement.getAttribute("src") || "" : "")).trim();
  const alt = (button.dataset.avatarAlt || (imageElement ? imageElement.getAttribute("alt") || "" : "") || name || id).trim();

  return {
    id: id,
    name: name || id,
    image: image,
    alt: alt || name || id
  };
}

function selectAvatar(avatarId) {
  const targetId = avatarId ? String(avatarId).trim() : "";
  if (appState.avatarLocked) {
    if (!targetId || (appState.selectedAvatar && appState.selectedAvatar.id !== targetId)) {
      return;
    }
  }
  let selectedData = null;

  if (launcher && Array.isArray(launcher.avatarButtons) && launcher.avatarButtons.length > 0) {
    launcher.avatarButtons.forEach(function (button) {
      const id = button.dataset.avatar || "";
      const isActive = Boolean(targetId) && id === targetId;
      button.dataset.selected = isActive ? "true" : "false";
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("avatar-card--selected", isActive);

      if (isActive) {
        selectedData = avatarDataFromButton(button);
      }
    });
  }

  if (!selectedData && appState.selectedAvatar && appState.selectedAvatar.id === targetId) {
    selectedData = appState.selectedAvatar;
  }

  appState.selectedAvatar = normalizeAvatar(selectedData) || appState.selectedAvatar;
  refreshStartAvailability();
  updateQuestBriefing();
}
function renderTableChips() {
  if (!launcher.tableOptions) {
    return;
  }

  launcher.tableOptions.innerHTML = "";

  TABLE_OPTIONS.forEach(function (option) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = option.label;
    chip.dataset.id = option.id;

    const selected = option.values.every(function (value) {
      return appState.selectedTables.has(value);
    });
    chip.dataset.selected = selected ? "true" : "false";
    chip.setAttribute("aria-pressed", selected ? "true" : "false");

    chip.addEventListener("click", function () {
      const isSelected = chip.dataset.selected === "true";
      if (isSelected) {
        chip.dataset.selected = "false";
        chip.setAttribute("aria-pressed", "false");
        option.values.forEach(function (value) {
          appState.selectedTables.delete(value);
        });
      } else {
        chip.dataset.selected = "true";
        chip.setAttribute("aria-pressed", "true");
        option.values.forEach(function (value) {
          appState.selectedTables.add(value);
        });
      }
      refreshStartAvailability();
    });

    launcher.tableOptions.append(chip);
  });
}

function renderReferenceTables() {
  if (!launcher.referenceGrid) {
    return;
  }

  launcher.referenceGrid.innerHTML = "";

  for (let multiplicand = 1; multiplicand <= 10; multiplicand += 1) {
    const card = document.createElement("article");
    card.className = "reference-card";

    const title = document.createElement("h3");
    title.textContent = "Table de " + multiplicand;

    const list = document.createElement("ul");
    list.className = "reference-card__list";

    for (let multiplier = 1; multiplier <= 10; multiplier += 1) {
      const item = document.createElement("li");
      item.textContent = multiplicand + " x " + multiplier + " = " + multiplicand * multiplier;
      list.append(item);
    }

    card.append(title, list);
    launcher.referenceGrid.append(card);
  }
}

function updateNavButtons(panelName) {
  if (!launcher.navButtons) {
    return;
  }

  launcher.navButtons.forEach(function (button) {
    const isActive = button.dataset.panel === panelName;
    button.classList.toggle("nav-btn--active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function switchPanel(panelName) {
  if (panelName === "reference") {
    if (launcher.setupPanel) {
      launcher.setupPanel.setAttribute("hidden", "true");
    }
    if (gameElements.gamePanel) {
      gameElements.gamePanel.setAttribute("hidden", "true");
    }
    if (gameElements.summaryPanel) {
      gameElements.summaryPanel.setAttribute("hidden", "true");
    }
    if (launcher.referencePanel) {
      launcher.referencePanel.removeAttribute("hidden");
      launcher.referencePanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    updateNavButtons("reference");
    return;
  }

  showSetupView();
}

function showSetupView() {
  if (launcher.setupPanel) {
    launcher.setupPanel.removeAttribute("hidden");
    launcher.setupPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (launcher.referencePanel) {
    launcher.referencePanel.setAttribute("hidden", "true");
  }
  if (gameElements.gamePanel) {
    gameElements.gamePanel.setAttribute("hidden", "true");
  }
  if (gameElements.summaryPanel) {
    gameElements.summaryPanel.setAttribute("hidden", "true");
  }
  updateNavButtons("setup");
}

function showGameView() {
  if (launcher.setupPanel) {
    launcher.setupPanel.setAttribute("hidden", "true");
  }
  if (launcher.referencePanel) {
    launcher.referencePanel.setAttribute("hidden", "true");
  }
  if (gameElements.summaryPanel) {
    gameElements.summaryPanel.setAttribute("hidden", "true");
  }
  if (gameElements.gamePanel) {
    gameElements.gamePanel.removeAttribute("hidden");
    gameElements.gamePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  updateNavButtons("setup");
}

function showSummaryView() {
  if (launcher.setupPanel) {
    launcher.setupPanel.setAttribute("hidden", "true");
  }
  if (launcher.referencePanel) {
    launcher.referencePanel.setAttribute("hidden", "true");
  }
  if (gameElements.gamePanel) {
    gameElements.gamePanel.setAttribute("hidden", "true");
  }
  if (gameElements.summaryPanel) {
    gameElements.summaryPanel.removeAttribute("hidden");
    gameElements.summaryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  updateNavButtons("setup");
}

function displayMiniGame(modeId, options) {
  const mode = MINI_GAMES[modeId] || MINI_GAMES[CLASSIC_MODE_ID];
  appState.selectedMode = mode.id;

  highlightModeCards(mode.id);

  const info = launcher.modeInfo;
  if (info && info.container) {
    if (info.placeholder) {
      info.placeholder.setAttribute("hidden", "true");
    }
    if (info.panel) {
      info.panel.removeAttribute("hidden");
    }
    if (info.name) {
      info.name.textContent = mode.title;
    }
    if (info.status) {
      info.status.textContent = mode.status === "playable" ? "Disponible" : "En preparation";
      info.status.dataset.status = mode.status;
    }
    if (info.goal) {
      info.goal.textContent = mode.goal;
    }
    populateList(info.rules, mode.rules);
    populateList(info.rewards, mode.rewards);
    if (info.focus) {
      if (Array.isArray(mode.focus) && mode.focus.length > 0) {
        info.focus.textContent = "Atouts travailles : " + mode.focus.join(", ");
        info.focus.removeAttribute("hidden");
      } else {
        info.focus.textContent = "";
        info.focus.setAttribute("hidden", "true");
      }
    }
  }

  if (!options || !options.initial) {
    showSetupView();
  }

  refreshStartAvailability();
  return mode;
}
function highlightModeCards(activeId) {
  if (!launcher.modeCards) {
    return;
  }

  launcher.modeCards.forEach(function (card) {
    const cardId = card.dataset.mode || CLASSIC_MODE_ID;
    const isActive = cardId === activeId;
    card.classList.toggle("mode-card--active", isActive);
    if (isActive) {
      card.setAttribute("aria-current", "true");
    } else {
      card.removeAttribute("aria-current");
    }
  });
}

function populateList(listElement, items) {
  if (!listElement) {
    return;
  }

  listElement.innerHTML = "";

  if (!items || items.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Details a venir.";
    listElement.append(emptyItem);
    return;
  }

  items.forEach(function (item) {
    const li = document.createElement("li");
    li.textContent = item;
    listElement.append(li);
  });
}

function refreshStartAvailability() {
  if (!launcher || !launcher.startBtn) {
    return;
  }

  const mode = MINI_GAMES[appState.selectedMode] || MINI_GAMES[CLASSIC_MODE_ID];
  const playable = mode.status === "playable";
  const hasTables = appState.selectedTables.size > 0;
  const requiresTables = IS_GAME_CONTEXT && Boolean(mode.supportsTables);
  const requiresAvatar =
    IS_GAME_CONTEXT && launcher && Array.isArray(launcher.avatarButtons) && launcher.avatarButtons.length > 0;
  const hasAvatar = Boolean(appState.selectedAvatar && appState.selectedAvatar.id);
  const canStart =
    playable && (!requiresTables || hasTables) && (!requiresAvatar || hasAvatar);

  launcher.startBtn.dataset.mode = mode.id;
  const actionLabel = IS_GAME_CONTEXT ? "Commencer " : "Lancer ";
  launcher.startBtn.textContent = playable ? actionLabel + mode.title : mode.title + " (bientot)";
  launcher.startBtn.disabled = !canStart;

  if (launcher.startHint) {
    if (!playable) {
      launcher.startHint.textContent = "Ce mini-jeu sera disponible tres bientot.";
    } else if (requiresAvatar && !hasAvatar && requiresTables && !hasTables) {
      launcher.startHint.textContent = "Choisis un héros et une mission pour partir en campagne.";
    } else if (requiresAvatar && !hasAvatar) {
      launcher.startHint.textContent = "Choisis un héros pour mener la mission.";
    } else if (requiresTables && !hasTables) {
      launcher.startHint.textContent = "Choisis une mission pour partir en campagne.";
    } else if (IS_GAME_CONTEXT && hasAvatar) {
      const mission = appState.questLevel;
      if (mission) {
        const missionName = mission.shortName || mission.label || mission.id || "cette mission";
        const heroName = appState.selectedAvatar ? appState.selectedAvatar.name : "Ton héros";
        const selectedTables = hasTables
          ? Array.from(appState.selectedTables).sort(function (a, b) {
              return a - b;
            })
          : [];
        const tablesLabel = selectedTables.length > 0
          ? formatTablesLabel(selectedTables)
          : mission.range || "";
        const suffix = tablesLabel ? " (" + tablesLabel + ")" : "";
        launcher.startHint.textContent =
          heroName + " est prêt·e pour « " + missionName + " »" + suffix + ". Appuie sur Partir en mission !";
      } else {
        launcher.startHint.textContent = "Tout est fin prêt. Appuie sur Partir en mission !";
      }
    } else if (IS_LAUNCHER_CONTEXT) {
      launcher.startHint.textContent = mode.supportsTables
        ? "Clique pour lancer l'aventure et choisir ta mission."
        : "Clique pour lancer ce mini-jeu.";
    } else {
      launcher.startHint.textContent = mode.supportsTables
        ? "Appuie sur Partir en mission pour repousser les dragons."
        : "Appuie pour lancer ce mini-jeu.";
    }
  }

  if (IS_GAME_CONTEXT) {
    updateQuestBriefing();
  }
}

function updateQuestBriefing() {
  if (!IS_GAME_CONTEXT || !launcher) {
    return;
  }

  if (typeof document !== "undefined" && document.body) {
    if (appState.avatarLocked) {
      document.body.setAttribute("data-hero-locked", "true");
    } else {
      document.body.removeAttribute("data-hero-locked");
    }
  }

  if (launcher.avatarButtons) {
    launcher.avatarButtons.forEach(function (button) {
      button.disabled = Boolean(appState.avatarLocked);
      if (appState.avatarLocked) {
        button.setAttribute("aria-disabled", "true");
      } else {
        button.removeAttribute("aria-disabled");
      }
    });
  }

  if (launcher.setupIntro) {
    const hero = appState.selectedAvatar;
    const mission = appState.questLevel;
    const defaultText = launcher.setupIntroDefault || "";
    if (hero && mission) {
      const missionName = mission.shortName || mission.label || mission.id || "";
      const tables = appState.selectedTables.size > 0
        ? Array.from(appState.selectedTables).sort(function (a, b) {
            return a - b;
          })
        : appState.questTables;
      const tablesLabel = tables && tables.length > 0 ? formatTablesLabel(tables) : mission.range || "";
      const suffix = tablesLabel ? " — " + tablesLabel : "";
      launcher.setupIntro.textContent = hero.name + " mène la mission « " + missionName + " »" + suffix + ".";
    } else if (hero) {
      launcher.setupIntro.textContent = hero.name + " attend ton signal pour partir en mission.";
    } else {
      launcher.setupIntro.textContent = defaultText;
    }
  }

  if (launcher.startHint && !appState.selectedAvatar && launcher.startHintDefault) {
    launcher.startHint.textContent = launcher.startHintDefault;
  }
}

function launchSelectedMode() {
  const mode = MINI_GAMES[appState.selectedMode] || MINI_GAMES[CLASSIC_MODE_ID];

  if (mode.status !== "playable") {
    alert(mode.title + " sera disponible prochainement.\n\n" + (mode.summary || ""));
    return false;
  }

  const tables = Array.from(appState.selectedTables).sort(function (a, b) {
    return a - b;
  });

  const requiresAvatar =
    IS_GAME_CONTEXT && launcher && Array.isArray(launcher.avatarButtons) && launcher.avatarButtons.length > 0;
  const hasAvatar = Boolean(appState.selectedAvatar && appState.selectedAvatar.id);

  if (IS_LAUNCHER_CONTEXT) {
    const target = mode.launchUrl || "jeu.html";
    const query = [];

    if (mode.supportsTables && tables.length > 0) {
      query.push("tables=" + tables.join(","));
    }

    const queryString = query.length > 0 ? "?" + query.join("&") : "";
    window.location.href = target + queryString;
    return true;
  }

  if (!mode.supportsTables) {
    return false;
  }

  if (requiresAvatar && !hasAvatar) {
    if (launcher.startHint) {
      if (mode.supportsTables && tables.length === 0) {
        launcher.startHint.textContent = "Choisis un héros et une mission pour partir en campagne.";
      } else {
        launcher.startHint.textContent = "Choisis un héros pour mener la mission.";
      }
    }
    return false;
  }

  if (tables.length === 0) {
    if (launcher.startHint) {
      launcher.startHint.textContent = "Choisis une mission pour partir en campagne.";
    }
    return false;
  }

  startEmbeddedGame(tables, mode.id);
  return true;
}

function startEmbeddedGame(tables, modeId) {
  gameState = createGameState(tables, modeId, appState.selectedAvatar);
  updateGameHeader();
  if (launcher.startHint) {
    launcher.startHint.textContent = "Que la bravoure te guide !";
  }
  showGameView();
  startMatch();
}

function formatTablesLabel(tables) {
  if (!tables || tables.length === 0) {
    return "Aucune table selectionnee";
  }
  if (tables.length === 10) {
    return "Tables 1 a 10";
  }
  if (tables.length === 1) {
    return "Table " + tables[0];
  }
  return "Tables " + tables.join(", ");
}

function updateGameHeader() {
  if (!gameElements.gameConfig) {
    return;
  }
  const mode = MINI_GAMES[gameState.mode] || MINI_GAMES[CLASSIC_MODE_ID];
  const label = formatTablesLabel(gameState.tables);
  const details = [];
  if (appState.questLevel && (appState.questLevel.shortName || appState.questLevel.label)) {
    details.push(appState.questLevel.shortName || appState.questLevel.label);
  }
  details.push(label);
  details.push(QUESTION_DURATION + " s par question");
  gameElements.gameConfig.textContent = mode.title + " - " + details.join(" - ");
}

function startMatch() {
  resetStats();
  displayNextQuestion();
}

function resetStats() {
  stopTimer();
  gameState.timeLeft = gameState.duration;
  gameState.timerId = null;
  gameState.timerEnd = null;
  gameState.currentAnswer = null;
  gameState.questionResolved = false;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.bestStreak = 0;
  gameState.questions = 0;
  gameState.correct = 0;
  gameState.wrong = 0;
  gameState.summaryDisplayed = false;

  clearFeedback();
  resetQuestionCard();
  if (gameElements.choices) {
    gameElements.choices.innerHTML = "";
  }
  renderTimer(gameState.duration);
  updateHud();
}

function displayNextQuestion() {
  if (!Array.isArray(gameState.tables) || gameState.tables.length === 0) {
    closeGameWindow();
    return;
  }

  if (gameState.questions >= MAX_QUESTIONS) {
    endGame();
    return;
  }

  gameState.questionResolved = false;
  clearFeedback();
  resetQuestionCard();

  const tables = gameState.tables;
  const multiplicand = tables[Math.floor(Math.random() * tables.length)];
  const multiplier = Math.floor(Math.random() * 10) + 1;
  const correctAnswer = multiplicand * multiplier;

  gameState.currentAnswer = correctAnswer;

  if (gameElements.questionMultipliers) {
    gameElements.questionMultipliers.textContent = multiplicand + " x " + multiplier;
  }

  renderChoices(generateOptions(correctAnswer));
  updateProgress();
  startQuestionTimer();
}

function renderChoices(options) {
  if (!gameElements.choices) {
    return;
  }

  gameElements.choices.innerHTML = "";

  options.forEach(function (value, index) {
    const choice = document.createElement("label");
    choice.className = "choice";
    choice.dataset.value = String(value);
    choice.dataset.selected = "false";
    choice.setAttribute("role", "checkbox");
    choice.setAttribute("aria-checked", "false");
    choice.tabIndex = 0;

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "checkbox";
    hiddenInput.className = "choice__input";
    hiddenInput.tabIndex = -1;
    hiddenInput.hidden = true;

    const bubble = document.createElement("span");
    bubble.className = "choice__bubble";
    bubble.textContent = String.fromCharCode(65 + index);

    const text = document.createElement("span");
    text.className = "choice__text";
    text.textContent = String(value);

    choice.append(hiddenInput, bubble, text);
    gameElements.choices.append(choice);
  });
}

function generateOptions(correct) {
  const values = new Set([correct]);

  while (values.size < 4) {
    const offset = Math.floor(Math.random() * 7) - 3;
    let proposal = correct + offset * (Math.floor(Math.random() * 3) + 1);

    if (proposal <= 0 || values.has(proposal)) {
      proposal = correct + Math.floor(Math.random() * 10) + 2;
    }

    values.add(proposal);
  }

  return Array.from(values).sort(function () {
    return Math.random() - 0.5;
  });
}
function handleChoiceClick(event) {
  const target = event.target && event.target.closest(".choice");
  if (!target || gameState.questionResolved) {
    return;
  }

  const value = Number(target.dataset.value);
  validateChoice(value);
}

function handleChoiceKeyDown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const target = event.target && event.target.closest(".choice");
  if (!target || gameState.questionResolved) {
    return;
  }

  event.preventDefault();
  const value = Number(target.dataset.value);
  validateChoice(value);
}

function validateChoice(selectedValue) {
  if (gameState.questionResolved) {
    return;
  }

  stopTimer();
  const isCorrect = selectedValue === gameState.currentAnswer;

  gameState.questionResolved = true;
  gameState.questions += 1;

  lockChoices(selectedValue);

  if (isCorrect) {
    gameState.score += 10;
    gameState.streak += 1;
    gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);
    gameState.correct += 1;
    showFeedback("Dragon vaincu ! Tu remportes une relique.", "var(--success)");
    showResultBadge("Bonne reponse !", true);
  } else {
    gameState.score = Math.max(0, gameState.score - 2);
    gameState.streak = 0;
    gameState.wrong += 1;
    showFeedback("Le dragon ricanne... la bonne formule &eacute;tait " + gameState.currentAnswer + ".", "var(--warning)");
    showResultBadge("On retente !", false);
  }

  updateHud();
  scheduleNextQuestion(1000);
}

function lockChoices(selectedValue) {
  if (!gameElements.choices) {
    return;
  }

  const nodes = gameElements.choices.querySelectorAll(".choice");
  nodes.forEach(function (choice) {
    const value = Number(choice.dataset.value);
    const input = choice.querySelector(".choice__input");
    const isSelected = selectedValue !== null && value === selectedValue;

    if (input) {
      input.checked = isSelected;
      input.disabled = true;
    }

    choice.dataset.selected = isSelected ? "true" : "false";
    choice.setAttribute("aria-checked", isSelected ? "true" : "false");

    if (value === gameState.currentAnswer) {
      choice.dataset.correct = "true";
      choice.setAttribute("aria-label", value + ", bonne reponse");
    } else if (isSelected) {
      choice.dataset.correct = "false";
      choice.setAttribute("aria-label", value + ", a revoir");
    } else {
      delete choice.dataset.correct;
      choice.removeAttribute("aria-label");
    }
  });
}

function handlePass() {
  if (gameState.questionResolved) {
    return;
  }

  stopTimer();
  gameState.questionResolved = true;
  gameState.questions += 1;
  gameState.wrong += 1;
  gameState.streak = 0;

  lockChoices(null);
  showFeedback("Question passee, une nouvelle arrive !", "inherit");
  showResultBadge("Question passee", false);
  updateHud();
  scheduleNextQuestion(800);
}

function startQuestionTimer() {
  stopTimer();

  gameState.timeLeft = gameState.duration;
  gameState.timerEnd = Date.now() + gameState.duration * 1000;
  renderTimer(gameState.timeLeft);

  gameState.timerId = window.setInterval(function () {
    const remaining = Math.max(0, Math.ceil((gameState.timerEnd - Date.now()) / 1000));
    if (remaining !== gameState.timeLeft) {
      gameState.timeLeft = remaining;
      renderTimer(gameState.timeLeft);
    }

    if (remaining <= 0) {
      stopTimer();
      handleTimeUp();
    }
  }, 200);
}

function stopTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
  gameState.timerEnd = null;
}

function handleTimeUp() {
  if (gameState.questionResolved) {
    return;
  }

  gameState.timeLeft = 0;
  gameState.questionResolved = true;
  gameState.questions += 1;
  gameState.streak = 0;
  gameState.wrong += 1;

  lockChoices(null);
  showFeedback("Temps ecoule !", "var(--warning)");
  showResultBadge("Temps ecoule", false);
  updateHud();
  scheduleNextQuestion(900);
}

function scheduleNextQuestion(delay) {
  if (gameState.questions >= MAX_QUESTIONS) {
    window.setTimeout(function () {
      if (!gameState.summaryDisplayed) {
        endGame();
      }
    }, delay);
    return;
  }

  window.setTimeout(function () {
    if (!gameState.summaryDisplayed) {
      displayNextQuestion();
    }
  }, delay);
}

function renderTimer(seconds) {
  if (!gameElements.timer) {
    return;
  }

  const total = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  gameElements.timer.textContent = "⏱️ " + minutes + ":" + secs;
}

function updateHud() {
  renderHudAvatar();
  if (gameElements.score) {
    gameElements.score.textContent = "⭐ " + gameState.score;
  }
  if (gameElements.streak) {
    gameElements.streak.textContent = "🔥 " + gameState.streak;
  }
  updateProgress();
}

function updateProgress() {
  if (!gameElements.progressLabel || !gameElements.progressBar) {
    return;
  }

  const answered = Math.min(gameState.questions, MAX_QUESTIONS);
  const current = gameState.questionResolved ? answered : Math.min(answered + 1, MAX_QUESTIONS);

  gameElements.progressLabel.textContent = "Qu&ecirc;te " + current + "/" + MAX_QUESTIONS;
  gameElements.progressBar.style.width = answered / MAX_QUESTIONS * 100 + "%";

  if (gameElements.progressBar.parentElement) {
    gameElements.progressBar.parentElement.setAttribute("aria-valuenow", String(answered));
  }
}

function renderHudAvatar() {
  if (!gameElements.hudAvatar) {
    return;
  }

  const avatar = gameState.avatar;
  if (!avatar || !avatar.id) {
    gameElements.hudAvatar.setAttribute("hidden", "true");
    if (gameElements.hudAvatarImage) {
      gameElements.hudAvatarImage.removeAttribute("src");
      gameElements.hudAvatarImage.alt = "";
    }
    if (gameElements.hudAvatarName) {
      gameElements.hudAvatarName.textContent = "---";
    }
    return;
  }

  gameElements.hudAvatar.removeAttribute("hidden");
  if (gameElements.hudAvatarImage) {
    if (avatar.image) {
      gameElements.hudAvatarImage.src = avatar.image;
    } else {
      gameElements.hudAvatarImage.removeAttribute("src");
    }
    gameElements.hudAvatarImage.alt = avatar.alt || avatar.name || avatar.id;
  }
  if (gameElements.hudAvatarName) {
    gameElements.hudAvatarName.textContent = avatar.name || avatar.id;
  }
}

function endGame() {
  if (gameState.summaryDisplayed) {
    return;
  }

  stopTimer();
  clearFeedback();
  renderSummary();
  showSummaryView();
  gameState.summaryDisplayed = true;
}

function renderSummary() {
  renderSummaryAvatar();
  if (gameElements.summaryScore) {
    gameElements.summaryScore.textContent = "⭐ " + gameState.score;
  }
  if (gameElements.summaryStreak) {
    gameElements.summaryStreak.textContent = "🔥 " + gameState.bestStreak;
  }
  if (gameElements.summaryQuestions) {
    gameElements.summaryQuestions.textContent = "🧮 " + Math.min(gameState.questions, MAX_QUESTIONS);
  }
  if (gameElements.summaryCorrect) {
    gameElements.summaryCorrect.textContent = "✅ " + gameState.correct;
  }
  if (gameElements.summaryWrong) {
    gameElements.summaryWrong.textContent = "♻️ " + gameState.wrong;
  }

  const xpGain = computeXpGain();
  const levelState = awardExperience(xpGain);

  if (gameElements.summaryXp) {
    gameElements.summaryXp.textContent = "✨ +" + xpGain + " xp";
  }
  if (gameElements.summaryLevel) {
    gameElements.summaryLevel.textContent = "Niveau " + levelState.level;
  }
  if (gameElements.summaryLevelProgress) {
    gameElements.summaryLevelProgress.style.width = Math.round(levelState.progress * 100) + "%";
  }

  updateLevelCard();
}

function renderSummaryAvatar() {
  if (!gameElements.summaryAvatar) {
    return;
  }

  const avatar = gameState.avatar;
  if (!avatar || !avatar.id) {
    gameElements.summaryAvatar.setAttribute("hidden", "true");
    if (gameElements.summaryAvatarImage) {
      gameElements.summaryAvatarImage.removeAttribute("src");
      gameElements.summaryAvatarImage.alt = "";
    }
    if (gameElements.summaryAvatarName) {
      gameElements.summaryAvatarName.textContent = "";
    }
    return;
  }

  gameElements.summaryAvatar.removeAttribute("hidden");
  if (gameElements.summaryAvatarImage) {
    if (avatar.image) {
      gameElements.summaryAvatarImage.src = avatar.image;
    } else {
      gameElements.summaryAvatarImage.removeAttribute("src");
    }
    gameElements.summaryAvatarImage.alt = avatar.alt || avatar.name || avatar.id;
  }
  if (gameElements.summaryAvatarName) {
    gameElements.summaryAvatarName.textContent = avatar.name || avatar.id;
  }
}

function computeXpGain() {
  const correctXp = gameState.correct * XP_PER_CORRECT;
  const streakXp = gameState.bestStreak * XP_PER_STREAK_POINT;
  return correctXp + streakXp;
}

function restartGame() {
  if (!gameState.tables || gameState.tables.length === 0) {
    closeGameWindow();
    return;
  }
  startEmbeddedGame(gameState.tables.slice(), gameState.mode);
}

function closeGameWindow() {
  stopTimer();
  gameState = createGameState([], appState.selectedMode, appState.selectedAvatar);
  clearFeedback();
  resetQuestionCard();
  renderTimer(gameState.duration);
  updateHud();
  showSetupView();
  refreshStartAvailability();
}

function showFeedback(message, color) {
  if (!gameElements.feedback) {
    return;
  }
  gameElements.feedback.textContent = message;
  gameElements.feedback.style.color = color || "inherit";
}

function clearFeedback() {
  if (!gameElements.feedback) {
    return;
  }
  gameElements.feedback.textContent = "";
  gameElements.feedback.style.color = "inherit";
}

function resetQuestionCard() {
  if (!gameElements.questionCard) {
    return;
  }
  gameElements.questionCard.classList.remove("question-card--resolved", "question-card--correct", "question-card--wrong");
  if (gameElements.resultBadge) {
    gameElements.resultBadge.textContent = "";
  }
}

function showResultBadge(message, isCorrect) {
  if (!gameElements.questionCard) {
    return;
  }
  gameElements.questionCard.classList.add("question-card--resolved");
  gameElements.questionCard.classList.toggle("question-card--correct", Boolean(isCorrect));
  gameElements.questionCard.classList.toggle("question-card--wrong", !isCorrect);

  if (gameElements.resultBadge) {
    gameElements.resultBadge.textContent = message;
  }
}
function readStoredXp() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return 0;
    }
    const data = JSON.parse(raw);
    if (!data || typeof data.xp !== "number" || Number.isNaN(data.xp)) {
      return 0;
    }
    return Math.max(0, Math.floor(data.xp));
  } catch (error) {
    return 0;
  }
}

function writeStoredXp(xp) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp: xp }));
  } catch (error) {
    // ignore storage errors
  }
}

function levelFromXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function levelStateFromXp(xp) {
  const totalXp = Math.max(0, Math.floor(xp));
  const level = levelFromXp(totalXp);
  const currentFloor = (level - 1) * XP_PER_LEVEL;
  const nextFloor = level * XP_PER_LEVEL;
  const range = Math.max(1, nextFloor - currentFloor);
  const progress = Math.min(1, (totalXp - currentFloor) / range);

  return {
    xp: totalXp,
    level: level,
    currentFloor: currentFloor,
    nextFloor: nextFloor,
    progress: progress,
    xpInLevel: totalXp - currentFloor,
    xpToNext: nextFloor - totalXp
  };
}

function getStoredLevelState() {
  return levelStateFromXp(readStoredXp());
}

function awardExperience(amount) {
  const safeAmount = Math.max(0, Math.floor(amount));
  const newXp = readStoredXp() + safeAmount;
  writeStoredXp(newXp);
  return levelStateFromXp(newXp);
}

function updateLevelCard() {
  const state = getStoredLevelState();
  if (launcher.levelName) {
    launcher.levelName.textContent = "Niveau " + state.level;
  }
  if (launcher.levelXp) {
    launcher.levelXp.textContent = state.xpInLevel + " xp / " + (state.nextFloor - state.currentFloor) + " xp";
  }
  if (launcher.levelProgress) {
    launcher.levelProgress.style.width = Math.round(state.progress * 100) + "%";
  }
}

function readQuestSelection() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(QUEST_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (Array.isArray(parsed.tables)) {
      parsed.tables = sanitizeQuestTables(parsed.tables);
    } else {
      parsed.tables = [];
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

function sanitizeQuestTables(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  const seen = {};
  const result = [];

  list.forEach(function (value) {
    const number = Number(value);
    if (Number.isInteger(number) && number >= 1 && number <= 10 && !seen[number]) {
      seen[number] = true;
      result.push(number);
    }
  });

  return result.sort(function (a, b) {
    return a - b;
  });
}

function normalizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "object") {
    return null;
  }

  const id = typeof avatar.id === "string" ? avatar.id.trim() : "";
  if (!id) {
    return null;
  }

  const name = typeof avatar.name === "string" ? avatar.name.trim() : "";
  const image = typeof avatar.image === "string" ? avatar.image.trim() : "";
  const alt = typeof avatar.alt === "string" ? avatar.alt.trim() : "";

  return {
    id: id,
    name: name || id,
    image: image,
    alt: alt || name || id
  };
}

function createGameState(tables, modeId, avatarInfo) {
  const list = Array.isArray(tables)
    ? Array.from(new Set(tables.map(function (value) {
        return Number(value);
      }))).filter(function (value) {
        return Number.isInteger(value) && value >= 1 && value <= 10;
      }).sort(function (a, b) {
        return a - b;
      })
    : [];

  return {
    tables: list,
    mode: modeId || CLASSIC_MODE_ID,
    duration: QUESTION_DURATION,
    timeLeft: QUESTION_DURATION,
    timerId: null,
    timerEnd: null,
    currentAnswer: null,
    questionResolved: false,
    score: 0,
    streak: 0,
    bestStreak: 0,
    questions: 0,
    correct: 0,
    wrong: 0,
    summaryDisplayed: false,
    avatar: normalizeAvatar(avatarInfo)
  };
}










