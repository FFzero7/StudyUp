(function () {
  const app = document.querySelector("#app");
  const navLinks = document.querySelectorAll("[data-route]");
  const themeToggle = document.querySelector("#theme-toggle");
  const themeIcon = document.querySelector("#theme-icon");
  const themeLabel = document.querySelector("#theme-label");
  const settingsButton = document.querySelector("#settings-button");
  const streakPill = document.querySelector("#streak-pill");
  const streakCount = document.querySelector("#streak-count");
  const cardsNavBadge = document.querySelector("#cards-nav-badge");
  const xpPill = document.querySelector("#xp-pill");
  const xpWeekCount = document.querySelector("#xp-week-count");
  const xpToastLayer = document.querySelector("#xp-toast-layer");
  const xpLive = document.querySelector("#xp-live");
  const logoutButton = document.querySelector("#logout-button");
  const C = window.StudyUpComponents;
  let state = window.StudyUpStorage.load();
  let cardSearchTimer = null;
  let matchTimer = null;
  let pendingChatAttachment = null;
  let voiceRecognition = null;

  const routes = ["dashboard", "grades", "planner", "cards", "mistakes", "progress", "session", "bot", "premium", "settings"];
  const accentColors = { blue: "#2563eb", green: "#10b981", violet: "#7c3aed", coral: "#f97316" };
  const subjectChoices = ["Mathe", "Deutsch", "Französisch", "Geschichte", "BG", "Musik", "Biologie", "Geographie", "Latein", "Englisch"];
  const planSteps = ["Wiederholen", "Üben", "Karteikarten", "Mini-Test", "Fehleranalyse", "Prüfungssimulation"];
  const levelDefinitions = [
    { level: 1, title: "Curious Lynx", min: 0, next: 250 },
    { level: 2, title: "Focus Lynx", min: 250, next: 650 },
    { level: 3, title: "Sharp Lynx", min: 650, next: 1250 },
    { level: 4, title: "Study Hunter", min: 1250, next: 2100 },
    { level: 5, title: "Exam Master", min: 2100, next: 3200 }
  ];
  const badgeDefinitions = [
    { id: "first-step", title: "First Step", text: "Erste Lerneinheit abgeschlossen" },
    { id: "mistake-fixer", title: "Mistake Fixer", text: "10 Fehler behoben" },
    { id: "card-master", title: "Card Master", text: "100 Karten wiederholt" },
    { id: "exam-ready", title: "Exam Ready", text: "Vor einer Prüfung gelernt" },
    { id: "comeback-lynx", title: "Comeback Lynx", text: "Ein schwaches Fach verbessert" },
    { id: "planner-pro", title: "Planner Pro", text: "Eine volle Lernwoche geplant" },
    { id: "focus-mode", title: "Focus Mode", text: "5 Lerneinheiten geschafft" }
  ];
  const questTemplates = [
    { id: "cards", title: "5 Karten wiederholen", metric: "cards", target: 5, href: "#cards" },
    { id: "mistakes", title: "1 Fehler beheben", metric: "mistakes", target: 1, href: "#mistakes" },
    { id: "sessions", title: "1 Lerneinheit abschließen", metric: "sessions", target: 1, href: "#session" }
  ];
  const learningModeOptions = [
    { id: "cards", title: "Karten", text: "Drehe Karten um und bewerte mit Again, Hard, Good oder Easy.", duration: "4-7 Min", xp: "Mittel", difficulty: "Leicht", target: 10 },
    { id: "learn", title: "Lernen", text: "Erst Choice-Fragen zum Warmwerden, danach Schreibfragen zum Festigen.", duration: "6-9 Min", xp: "Hoch", difficulty: "Mittel", target: 8 },
    { id: "test", title: "Test", text: "Gemischte Prüfungsrunde mit Schreiben und Choice.", duration: "8-12 Min", xp: "Sehr hoch", difficulty: "Hoch", target: 10 },
    { id: "match", title: "Zuordnen", text: "Verbinde Begriffe mit passenden Lösungen.", duration: "4-6 Min", xp: "Mittel", difficulty: "Mittel", target: 8 }
  ];
  const comboRewards = { 3: 5, 5: 10, 10: 20 };
  const leaderboardCategory = { label: "XP", field: "weeklyXp", unit: "XP", note: "diese Woche gelernt" };
  const leagueTiers = [
    { id: "snow-paw", name: "Snow Paw Liga", min: 0, image: "src/assets/leagues/snow-paw.png" },
    { id: "forest-lynx", name: "Forest Lynx Liga", min: 180, image: "src/assets/leagues/forest-lynx.png" },
    { id: "river-lynx", name: "River Lynx Liga", min: 420, image: "src/assets/leagues/river-lynx.png" },
    { id: "mountain-lynx", name: "Mountain Lynx Liga", min: 760, image: "src/assets/leagues/mountain-lynx.png" },
    { id: "alpine-lynx", name: "Alpine Lynx Liga", min: 1180, image: "src/assets/leagues/alpine-lynx.png" },
    { id: "shadow-lynx", name: "Shadow Lynx Liga", min: 1680, image: "src/assets/leagues/shadow-lynx.png" },
    { id: "crystal-lynx", name: "Crystal Lynx Liga", min: 2260, image: "src/assets/leagues/crystal-lynx.png" },
    { id: "aurora-lynx", name: "Aurora Lynx Liga", min: 2920, image: "src/assets/leagues/aurora-lynx.png" },
    { id: "northern-light", name: "Northern Light Liga", min: 3660, image: "src/assets/leagues/northern-light.png" },
    { id: "apex-lynx", name: "Apex Lynx Liga", min: 4500, image: "src/assets/leagues/apex-lynx.png" }
  ];
  const classLeagueCategory = { label: "XP", field: "weeklyXp", unit: "XP", note: "diese Woche gelernt" };

  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const pad = (value) => String(value).padStart(2, "0");
  const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const todayIso = () => toIso(new Date());
  const dateObject = (iso) => new Date(`${iso}T12:00:00`);
  const monthKey = () => todayIso().slice(0, 7);
  const weekKey = (iso = todayIso()) => {
    const date = dateObject(iso || todayIso());
    const weekday = date.getDay() || 7;
    date.setDate(date.getDate() - weekday + 1);
    return toIso(date);
  };
  const save = () => window.StudyUpStorage.save(state);
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  const parseNumberInput = (value, fallback = NaN) => {
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (!normalized) return fallback;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : fallback;
  };
  const parseWeightInput = (value, fallback = 1) => {
    const raw = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
    if (!raw) return fallback;
    const isPercent = raw.endsWith("%");
    const numeric = raw.replace(/%$/, "").replace(/x$/, "");
    const number = Number(numeric);
    if (!Number.isFinite(number) || number <= 0) return fallback;
    return Math.max(0.01, isPercent ? number / 100 : number);
  };
  const formatWeightInput = (value) => {
    const number = Math.max(0.01, Number(value || 1));
    if (!Number.isFinite(number)) return "1";
    if (number > 0 && number < 1) return `${Math.round(number * 100)}%`;
    return String(Number(number.toFixed(2))).replace(".", ",");
  };
  const formatWeightLabel = (value) => {
    const formatted = formatWeightInput(value);
    return formatted.endsWith("%") ? formatted : `${formatted}x`;
  };
  const formatWeightPercentLabel = (value) => `${Math.round(Math.max(0.01, Number(value || 1)) * 100)}%`;
  const normalizePartialGrade = (grade) => ({
    id: grade.id || uid("part"),
    title: grade.title || "Teilprüfung",
    date: grade.date || todayIso(),
    value: Number(grade.value || 0),
    weight: Number(grade.weight || 1),
    categoryId: grade.categoryId || ""
  });
  const defaultGradeCategories = () => [
    { id: uid("cat"), name: "Tests", percentage: 50 },
    { id: uid("cat"), name: "Mitarbeit", percentage: 15 },
    { id: uid("cat"), name: "Hausaufgaben", percentage: 15 },
    { id: uid("cat"), name: "Projekte", percentage: 20 }
  ];
  const normalizeGradeEntry = (grade) => {
    if (grade.type === "partial") {
      return {
        id: grade.id || uid("partial"),
        type: "partial",
        title: grade.title || "Teilnoten",
        date: grade.date || todayIso(),
        weight: Number(grade.weight || 1),
        categoryId: grade.categoryId || "",
        partialGrades: (grade.partialGrades || []).map(normalizePartialGrade)
      };
    }
    return {
      id: grade.id || uid("grade"),
      type: "exam",
      title: grade.title || "Prüfung",
      date: grade.date || todayIso(),
      value: Number(grade.value || 0),
      weight: Number(grade.weight || 1),
      categoryId: grade.categoryId || ""
    };
  };
  const normalizeMistake = (mistake) => ({
    id: mistake.id || uid("mistake"),
    subject: mistake.subject || "Allgemein",
    topic: mistake.topic || "",
    question: mistake.question || "Unklare Aufgabe",
    correctAnswer: mistake.correctAnswer || "",
    userAnswer: mistake.userAnswer || "",
    explanation: mistake.explanation || "",
    createdDate: mistake.createdDate || todayIso(),
    reviewStatus: mistake.reviewStatus || "open",
    reviewedAt: mistake.reviewedAt || "",
    fixedAt: mistake.fixedAt || (mistake.reviewStatus === "fixed" ? (mistake.createdDate || todayIso()) : ""),
    source: mistake.source || "manuell"
  });
  const aiLimitForPlan = (plan) => ({ free: 10, plus: 300, pro: 1000 })[plan] || 10;
  const planLabel = (plan) => ({ free: "Free", plus: "Plus", pro: "Pro" })[plan] || "Free";
  const defaultWeeklyStats = () => ({
    weekKey: weekKey(),
    xp: 0,
    cardsReviewed: 0,
    mistakesFixed: 0,
    mistakesReviewed: 0,
    studySessions: 0,
    studyDays: [],
    studyTasksAdded: 0,
    questsCompleted: 0
  });
  const defaultRecords = () => ({
    bestWeeklyXp: 0,
    bestCardsWeek: 0,
    bestMistakesWeek: 0,
    bestSessionsWeek: 0,
    totalCardsReviewed: 0,
    totalMistakesFixed: 0,
    totalStudySessions: 0
  });
  const defaultFriends = () => copy(window.StudyUpSeed.friends || []);
  const defaultChallenge = () => ({ ...window.StudyUpSeed.friendsChallenge, weekKey: weekKey() });
  const defaultClassLeague = () => ({ ...copy(window.StudyUpSeed.classLeague || {}), weekKey: weekKey() });
  const defaultWeeklyLeagueStats = () => ({
    weekKey: weekKey(),
    weeklyXp: 0,
    cardsReviewed: 0,
    mistakesFixed: 0,
    studySessions: 0,
    improved: 0
  });
  const defaultDailyDeckStats = () => ({
    date: todayIso(),
    fullSessions: 0,
    sessionsCompleted: 0,
    cardXp: 0,
    deckXp: 0
  });
  const defaultWeeklyDeckChallenge = () => ({
    weekKey: weekKey(),
    target: 5,
    progress: 0,
    rewardXp: 150,
    rewarded: false
  });
  const defaultCardStudySession = () => ({
    choosing: false,
    active: false,
    completed: false,
    mode: "",
    testStarted: false,
    testSetup: { write: true, choice: true, mixed: true, direction: "front" },
    currentAnswer: "",
    selectedChoice: "",
    selectedPromptId: "",
    selectedAnswerId: "",
    selectedMatchTileId: "",
    awaitingNext: false,
    lastResult: null,
    answers: [],
    testQuestions: [],
    matchPairs: [],
    promptOrder: [],
    answerOrder: [],
    matchTileOrder: [],
    matchedIds: [],
    lastWrongTileIds: [],
    matchStartedAt: "",
    matchCompletedAt: "",
    matchPenaltySeconds: 0,
    matchTimed: false
  });
  const tierForXp = (xp) => [...leagueTiers].reverse().find((tier) => Number(xp || 0) >= tier.min) || leagueTiers[0];
  const tierAliases = { snow: "snow-paw", forest: "forest-lynx", alpine: "alpine-lynx", shadow: "shadow-lynx", northern: "northern-light" };
  const tierById = (id) => {
    const normalized = tierAliases[id] || id;
    return leagueTiers.find((tier) => tier.id === normalized) || leagueTiers[1];
  };
  const leagueSymbolMarkup = {
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/><circle cx="12" cy="12" r="2.2"/>',
    forest: '<path d="M5 13c5.5-8 12-8 14-8-1 8-5 14-14 14 0-2 0-4 0-6Z"/><path d="M7 16c4-1 7-4 10-8"/>',
    alpine: '<path d="M3 19 9 7l3 5 3-7 6 14H3Z"/><path d="m9 7 2 4-3-1M15 5l2.3 5-3.3-1"/>',
    shadow: '<path d="M16.5 3.5c-4.7 1-8 4.7-8 8.5s3.3 7.5 8 8.5C10.1 20.5 5 16.8 5 12s5.1-8.5 11.5-8.5Z"/><path d="m17 8 1 2.2 2.4.2-1.8 1.5.6 2.3-2.2-1.2-2.1 1.2.5-2.3-1.8-1.5 2.4-.2Z"/>',
    northern: '<path d="M4 17c2-7 4.4-10 8-10s6 3 8 10"/><path d="M7 17c1.2-4 3-6 5-6s3.8 2 5 6"/><path d="M12 2l1.1 2.9 3.1.2-2.4 1.9.8 3-2.6-1.7L9.4 10l.8-3-2.4-1.9 3.1-.2Z"/>'
  };
  const leagueSymbol = (tierId, withName = false) => {
    const tier = tierById(typeof tierId === "string" ? tierId : tierId?.id);
    if (tier.image) {
      return `
        <span class="league-symbol league-image-symbol league-${C.escapeHtml(tier.id)}" title="${C.escapeHtml(tier.name)}" aria-label="${C.escapeHtml(tier.name)}">
          <img src="${C.escapeHtml(tier.image)}" alt="" loading="lazy" />
          ${withName ? `<small>${C.escapeHtml(tier.name)}</small>` : ""}
        </span>
      `;
    }
    const icon = leagueSymbolMarkup[tier.id] || leagueSymbolMarkup.forest;
    return `
      <span class="league-symbol league-${C.escapeHtml(tier.id)}" title="${C.escapeHtml(tier.name)}" aria-label="${C.escapeHtml(tier.name)}">
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">${icon}</svg>
        ${withName ? `<small>${C.escapeHtml(tier.name)}</small>` : ""}
      </span>
    `;
  };
  const makeDailyQuests = () => questTemplates.map((quest) => ({
    ...quest,
    progress: 0,
    completed: false,
    rewarded: false
  }));
  const levelForXp = (xp) => {
    const total = Number(xp || 0);
    return [...levelDefinitions].reverse().find((level) => total >= level.min) || levelDefinitions[0];
  };
  const nextLevelFor = (level) => levelDefinitions.find((item) => item.level === level.level + 1) || null;
  const levelProgress = () => {
    const current = levelForXp(state.xpTotal);
    const next = nextLevelFor(current);
    const end = next ? next.min : current.next;
    const span = Math.max(1, end - current.min);
    const gained = Math.max(0, Number(state.xpTotal || 0) - current.min);
    return { current, next, percent: Math.min(100, Math.round((gained / span) * 100)), remaining: Math.max(0, end - Number(state.xpTotal || 0)), end };
  };
  const normalizeQuest = (quest) => {
    const template = questTemplates.find((item) => item.id === quest.id) || questTemplates[0];
    const progress = Number(quest.progress || 0);
    return {
      ...template,
      ...quest,
      progress,
      completed: Boolean(quest.completed || progress >= Number(quest.target || template.target)),
      rewarded: Boolean(quest.rewarded)
    };
  };
  const normalizeBadge = (badge) => {
    if (typeof badge === "string") return { id: badge, unlockedAt: todayIso() };
    return { id: badge.id, unlockedAt: badge.unlockedAt || todayIso() };
  };
  const updatePersonalRecords = () => {
    state.personalRecords.bestWeeklyXp = Math.max(Number(state.personalRecords.bestWeeklyXp || 0), Number(state.weeklyStats.xp || 0));
    state.personalRecords.bestCardsWeek = Math.max(Number(state.personalRecords.bestCardsWeek || 0), Number(state.weeklyStats.cardsReviewed || 0));
    state.personalRecords.bestMistakesWeek = Math.max(Number(state.personalRecords.bestMistakesWeek || 0), Number(state.weeklyStats.mistakesFixed || 0));
    state.personalRecords.bestSessionsWeek = Math.max(Number(state.personalRecords.bestSessionsWeek || 0), Number(state.weeklyStats.studySessions || 0));
  };
  const ensureGamification = () => {
    const currentWeek = weekKey();
    state.xpTotal = Number(state.xpTotal || 0);
    state.level = levelForXp(state.xpTotal).level;
    state.badges = (state.badges || []).map(normalizeBadge).filter((badge) => badge.id);
    state.personalRecords = { ...defaultRecords(), ...(state.personalRecords || {}) };
    if (!state.weeklyStats || state.weeklyStats.weekKey !== currentWeek) {
      if (state.weeklyStats) {
        state.personalRecords.bestWeeklyXp = Math.max(Number(state.personalRecords.bestWeeklyXp || 0), Number(state.weeklyStats.xp || 0));
        state.personalRecords.bestCardsWeek = Math.max(Number(state.personalRecords.bestCardsWeek || 0), Number(state.weeklyStats.cardsReviewed || 0));
        state.personalRecords.bestMistakesWeek = Math.max(Number(state.personalRecords.bestMistakesWeek || 0), Number(state.weeklyStats.mistakesFixed || 0));
        state.personalRecords.bestSessionsWeek = Math.max(Number(state.personalRecords.bestSessionsWeek || 0), Number(state.weeklyStats.studySessions || 0));
      }
      state.weeklyStats = defaultWeeklyStats();
      state.xpThisWeek = 0;
    } else {
      state.weeklyStats = { ...defaultWeeklyStats(), ...state.weeklyStats, weekKey: currentWeek };
      state.weeklyStats.studyDays = Array.isArray(state.weeklyStats.studyDays) ? state.weeklyStats.studyDays : [];
      state.xpThisWeek = Number(state.weeklyStats.xp || state.xpThisWeek || 0);
    }
    if (state.dailyQuestDate !== todayIso() || !Array.isArray(state.dailyQuests) || state.dailyQuests.length !== questTemplates.length) {
      state.dailyQuestDate = todayIso();
      state.dailyQuests = makeDailyQuests();
    } else {
      state.dailyQuests = state.dailyQuests.map(normalizeQuest);
    }
    state.friends = state.friends?.length ? state.friends : defaultFriends();
    state.friendsChallenge = { ...defaultChallenge(), ...(state.friendsChallenge || {}), weekKey: currentWeek };
    state.leaderboardPrivacy = {
      visible: false,
      displayName: state.user?.name || "Du",
      ...(state.leaderboardPrivacy || {})
    };
    if (!state.leaderboardPrivacy.displayName) state.leaderboardPrivacy.displayName = state.user?.name || "Du";
    if (!state.weeklyLeagueStats || state.weeklyLeagueStats.weekKey !== currentWeek) {
      state.weeklyLeagueStats = defaultWeeklyLeagueStats();
    } else {
      state.weeklyLeagueStats = { ...defaultWeeklyLeagueStats(), ...state.weeklyLeagueStats, weekKey: currentWeek };
    }
    state.weeklyLeagueStats.weeklyXp = Math.max(Number(state.weeklyLeagueStats.weeklyXp || 0), Number(state.xpThisWeek || 0));
    state.weeklyLeagueStats.cardsReviewed = Math.max(Number(state.weeklyLeagueStats.cardsReviewed || 0), Number(state.weeklyStats.cardsReviewed || 0));
    state.weeklyLeagueStats.mistakesFixed = Math.max(Number(state.weeklyLeagueStats.mistakesFixed || 0), Number(state.weeklyStats.mistakesFixed || 0));
    state.weeklyLeagueStats.studySessions = Math.max(Number(state.weeklyLeagueStats.studySessions || 0), Number(state.weeklyStats.studySessions || 0));
    state.weeklyLeagueStats.improved = Math.max(Number(state.weeklyLeagueStats.improved || 0), Math.round(Number(state.xpThisWeek || 0) / 25));
    const oldClassWeek = state.classLeague?.weekKey || "";
    state.classLeague = { ...defaultClassLeague(), ...(state.classLeague || {}), weekKey: currentWeek };
    if (oldClassWeek && oldClassWeek !== currentWeek) state.classLeague.bonusAwarded = false;
    state.classLeague.goals = {
      cardsReviewed: 400,
      mistakesFixed: 80,
      studySessions: 40,
      ...(state.classLeague.goals || {})
    };
    state.classLeague.classmates = state.classLeague.classmates?.length ? state.classLeague.classmates : copy(window.StudyUpSeed.classLeague.classmates);
    state.classLeaguePrivacy = {
      joined: false,
      visible: false,
      displayName: state.user?.name || "Du",
      ...(state.classLeaguePrivacy || {})
    };
    if (!state.classLeaguePrivacy.displayName) state.classLeaguePrivacy.displayName = state.user?.name || "Du";
    state.classLeagueDemo = state.classLeagueDemo !== false;
    state.recentXpEvents = Array.isArray(state.recentXpEvents) ? state.recentXpEvents.slice(0, 12) : [];
    state.leagueTier = tierById(state.leagueTier || state.classLeague.tier || "forest-lynx").id;
    state.classCode = state.classCode || state.classLeague.classCode || "LYNX-2B";
    state.classLeague.tier = state.leagueTier;
    state.classLeague.classCode = state.classCode;
    state.deckSessions = state.deckSessions && typeof state.deckSessions === "object" && !Array.isArray(state.deckSessions) ? state.deckSessions : {};
    state.deckSessionHistory = Array.isArray(state.deckSessionHistory) ? state.deckSessionHistory.slice(0, 80) : [];
    state.cardXpHistory = state.cardXpHistory && typeof state.cardXpHistory === "object" && !Array.isArray(state.cardXpHistory) ? state.cardXpHistory : {};
    state.learningMode = state.learningMode || "";
    state.activeModeSession = state.activeModeSession && typeof state.activeModeSession === "object" && !Array.isArray(state.activeModeSession) ? state.activeModeSession : {};
    state.modeHistory = Array.isArray(state.modeHistory) ? state.modeHistory.slice(0, 120) : [];
    state.deckModeRewards = state.deckModeRewards && typeof state.deckModeRewards === "object" && !Array.isArray(state.deckModeRewards) ? state.deckModeRewards : {};
    state.testResults = Array.isArray(state.testResults) ? state.testResults.slice(0, 80) : [];
    state.matchResults = Array.isArray(state.matchResults) ? state.matchResults.slice(0, 80) : [];
    if (!state.dailyDeckStats || state.dailyDeckStats.date !== todayIso()) {
      state.dailyDeckStats = defaultDailyDeckStats();
    } else {
      state.dailyDeckStats = { ...defaultDailyDeckStats(), ...state.dailyDeckStats, date: todayIso() };
    }
    if (!state.weeklyDeckChallenge || state.weeklyDeckChallenge.weekKey !== currentWeek) {
      state.weeklyDeckChallenge = defaultWeeklyDeckChallenge();
    } else {
      state.weeklyDeckChallenge = { ...defaultWeeklyDeckChallenge(), ...state.weeklyDeckChallenge, weekKey: currentWeek };
      state.weeklyDeckChallenge.progress = Math.min(Number(state.weeklyDeckChallenge.target || 5), Number(state.weeklyDeckChallenge.progress || 0));
    }
    state.cardStudySession = {
      ...defaultCardStudySession(),
      ...(state.cardStudySession || {})
    };
    state.cardStudySession.cardIds = Array.isArray(state.cardStudySession.cardIds) ? state.cardStudySession.cardIds : [];
    state.cardStudySession.reviewedIds = Array.isArray(state.cardStudySession.reviewedIds) ? state.cardStudySession.reviewedIds : [];
    state.cardStudySession.ratings = Array.isArray(state.cardStudySession.ratings) ? state.cardStudySession.ratings : [];
    state.cardStudySession.comboAwards = Array.isArray(state.cardStudySession.comboAwards) ? state.cardStudySession.comboAwards : [];
    state.cardStudySession.dueCardIds = Array.isArray(state.cardStudySession.dueCardIds) ? state.cardStudySession.dueCardIds : [];
    state.cardStudySession.testSetup = { ...defaultCardStudySession().testSetup, ...(state.cardStudySession.testSetup || {}) };
    state.cardStudySession.testQuestions = Array.isArray(state.cardStudySession.testQuestions) ? state.cardStudySession.testQuestions : [];
    state.cardStudySession.matchPairs = Array.isArray(state.cardStudySession.matchPairs) ? state.cardStudySession.matchPairs : [];
    state.cardStudySession.matchTileOrder = Array.isArray(state.cardStudySession.matchTileOrder) ? state.cardStudySession.matchTileOrder : [];
    state.cardStudySession.matchedIds = Array.isArray(state.cardStudySession.matchedIds) ? state.cardStudySession.matchedIds : [];
    state.cardStudySession.lastWrongTileIds = Array.isArray(state.cardStudySession.lastWrongTileIds) ? state.cardStudySession.lastWrongTileIds : [];
    state.cardStudySession.matchPenaltySeconds = Number(state.cardStudySession.matchPenaltySeconds || 0);
    state.ui.progressTab = state.ui.progressTab || "me";
    state.ui.leaderboardTab = "xp";
    state.ui.classLeagueTab = "xp";
    updatePersonalRecords();
  };
  const recordStudyDay = () => {
    const today = todayIso();
    if (!state.weeklyStats.studyDays.includes(today)) state.weeklyStats.studyDays.push(today);
  };
  const showXpToast = (amount, reason = "XP erhalten", options = {}) => {
    const xp = Math.max(0, Number(amount || 0));
    if (!xp) return;
    const cleanReason = String(reason || "XP erhalten");
    state.recentXpEvents = [
      { id: uid("xp"), amount: xp, reason: cleanReason, date: new Date().toISOString() },
      ...(state.recentXpEvents || [])
    ].slice(0, 12);
    if (xpLive) xpLive.textContent = `${xp} XP erhalten: ${cleanReason}`;
    if (xpPill) {
      xpPill.classList.remove("gain");
      void xpPill.offsetWidth;
      xpPill.classList.add("gain");
    }
    if (!xpToastLayer) return;
    const toast = document.createElement("div");
    toast.className = `xp-toast ${options.levelUp ? "level-up" : ""}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-label", `${xp} XP erhalten: ${C.escapeHtml(cleanReason)}`);
    toast.innerHTML = `<strong>+${xp}</strong><i aria-hidden="true"></i><span>${C.escapeHtml(cleanReason)}</span>`;
    xpToastLayer.appendChild(toast);
    window.setTimeout(() => toast.remove(), options.levelUp ? 1800 : 1250);
  };
  const showLevelUpToast = (level) => {
    const name = level?.title || "Sharp Lynx";
    if (xpLive) xpLive.textContent = `Neue Liga! Du bist jetzt ${name}.`;
    if (!xpToastLayer) return;
    const toast = document.createElement("div");
    toast.className = "xp-toast level-up-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `${C.mascot("mascot-small")}<div><strong>Neue Liga!</strong><span>Du bist jetzt ${C.escapeHtml(name)}.</span></div>`;
    xpToastLayer.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2200);
  };
  const unlockBadge = (id) => {
    if (state.badges.some((badge) => badge.id === id)) return;
    state.badges.push({ id, unlockedAt: todayIso() });
  };
  const awardXp = (amount, reason = "XP erhalten") => {
    ensureGamification();
    const xp = Math.max(0, Number(amount || 0));
    if (!xp) return;
    const previousLevel = state.level;
    state.xpTotal = Number(state.xpTotal || 0) + xp;
    state.xpThisWeek = Number(state.xpThisWeek || 0) + xp;
    state.weeklyStats.xp = Number(state.weeklyStats.xp || 0) + xp;
    state.weeklyLeagueStats.weeklyXp = Number(state.weeklyLeagueStats.weeklyXp || 0) + xp;
    state.weeklyLeagueStats.improved = Math.max(Number(state.weeklyLeagueStats.improved || 0), Math.round(Number(state.xpThisWeek || 0) / 25));
    state.level = levelForXp(state.xpTotal).level;
    state.leagueTier = tierById(state.leagueTier || state.classLeague?.tier || "forest-lynx").id;
    state.classLeague.tier = state.leagueTier;
    recordStudyDay();
    updatePersonalRecords();
    showXpToast(xp, reason);
    if (state.level > previousLevel) showLevelUpToast(levelForXp(state.xpTotal));
  };
  const addQuestProgress = (metric, amount = 1) => {
    ensureGamification();
    state.dailyQuests.forEach((quest) => {
      if (quest.metric !== metric || quest.rewarded) return;
      quest.progress = Math.min(Number(quest.target || 1), Number(quest.progress || 0) + Number(amount || 1));
      quest.completed = quest.progress >= Number(quest.target || 1);
      if (quest.completed && !quest.rewarded) {
        quest.rewarded = true;
        state.weeklyStats.questsCompleted = Number(state.weeklyStats.questsCompleted || 0) + 1;
        awardXp(100, "Quest geschafft");
      }
    });
  };
  const classUserStats = () => ({
    id: "you",
    displayName: state.classLeaguePrivacy.visible ? (state.classLeaguePrivacy.displayName || "Du") : "Privat",
    initials: state.classLeaguePrivacy.visible ? (state.classLeaguePrivacy.displayName || state.user.name || "D").slice(0, 1).toUpperCase() : "P",
    private: !state.classLeaguePrivacy.visible,
    weeklyXp: Number(state.weeklyLeagueStats.weeklyXp || 0),
    cardsReviewed: Number(state.weeklyLeagueStats.cardsReviewed || 0),
    mistakesFixed: Number(state.weeklyLeagueStats.mistakesFixed || 0),
    studySessions: Number(state.weeklyLeagueStats.studySessions || 0),
    improved: Number(state.weeklyLeagueStats.improved || 0),
    tier: tierById(state.leagueTier || "forest-lynx").id
  });
  const classTeamTotals = () => {
    const own = classUserStats();
    const demo = state.classLeague.classmates || [];
    return {
      cardsReviewed: demo.reduce((sum, item) => sum + Number(item.cardsReviewed || 0), 0) + own.cardsReviewed,
      mistakesFixed: demo.reduce((sum, item) => sum + Number(item.mistakesFixed || 0), 0) + own.mistakesFixed,
      studySessions: demo.reduce((sum, item) => sum + Number(item.studySessions || 0), 0) + own.studySessions
    };
  };
  const checkClassBonus = () => {
    if (!state.classLeaguePrivacy.joined) return;
    const totals = classTeamTotals();
    const goals = state.classLeague.goals || {};
    const completed = totals.cardsReviewed >= Number(goals.cardsReviewed || 1)
      && totals.mistakesFixed >= Number(goals.mistakesFixed || 1)
      && totals.studySessions >= Number(goals.studySessions || 1);
    if (completed && !state.classLeague.bonusAwarded) {
      state.classLeague.bonusAwarded = true;
      awardXp(100, "Klassenbonus");
    }
  };
  const evaluateBadges = () => {
    if (Number(state.personalRecords.totalStudySessions || 0) >= 1) unlockBadge("first-step");
    if (Number(state.personalRecords.totalMistakesFixed || 0) >= 10) unlockBadge("mistake-fixer");
    if (Number(state.personalRecords.totalCardsReviewed || 0) >= 100) unlockBadge("card-master");
    if (Number(state.personalRecords.totalStudySessions || 0) >= 5) unlockBadge("focus-mode");
    if (Number(state.weeklyStats.studyTasksAdded || 0) >= 7) unlockBadge("planner-pro");
    if (state.exams.some((exam) => exam.date >= todayIso()) && Number(state.weeklyStats.studySessions || 0) > 0) unlockBadge("exam-ready");
    if (state.subjects.some((subject) => subjectTrend(subject) === "Verbessert")) unlockBadge("comeback-lynx");
  };
  const trackStudyAction = (type, amount = 1) => {
    ensureGamification();
    const count = Math.max(1, Number(amount || 1));
    if (type === "studySession") {
      awardXp(50 * count, "Lerneinheit geschafft");
      state.weeklyStats.studySessions = Number(state.weeklyStats.studySessions || 0) + count;
      state.weeklyLeagueStats.studySessions = Number(state.weeklyLeagueStats.studySessions || 0) + count;
      state.personalRecords.totalStudySessions = Number(state.personalRecords.totalStudySessions || 0) + count;
      addQuestProgress("sessions", count);
    }
    if (type === "cardReviewed") {
      awardXp(10 * count, "Karte gelernt");
      state.weeklyStats.cardsReviewed = Number(state.weeklyStats.cardsReviewed || 0) + count;
      state.weeklyLeagueStats.cardsReviewed = Number(state.weeklyLeagueStats.cardsReviewed || 0) + count;
      state.personalRecords.totalCardsReviewed = Number(state.personalRecords.totalCardsReviewed || 0) + count;
      addQuestProgress("cards", count);
    }
    if (type === "mistakeSaved") {
      awardXp(10 * count, "Fehler gespeichert");
    }
    if (type === "mistakeReviewed") {
      awardXp(20 * count, "Fehler wiederholt");
      state.weeklyStats.mistakesReviewed = Number(state.weeklyStats.mistakesReviewed || 0) + count;
    }
    if (type === "mistakeFixed") {
      awardXp(40 * count, "Fehler behoben");
      state.weeklyStats.mistakesFixed = Number(state.weeklyStats.mistakesFixed || 0) + count;
      state.weeklyLeagueStats.mistakesFixed = Number(state.weeklyLeagueStats.mistakesFixed || 0) + count;
      state.personalRecords.totalMistakesFixed = Number(state.personalRecords.totalMistakesFixed || 0) + count;
      addQuestProgress("mistakes", count);
    }
    if (type === "studyTaskAdded") {
      awardXp(10 * count, "Planung erledigt");
      state.weeklyStats.studyTasksAdded = Number(state.weeklyStats.studyTasksAdded || 0) + count;
    }
    state.weeklyLeagueStats.improved = Math.max(Number(state.weeklyLeagueStats.improved || 0), Math.round(Number(state.xpThisWeek || 0) / 25));
    updatePersonalRecords();
    evaluateBadges();
    checkClassBonus();
  };
  const markMistakeFixed = (mistake) => {
    if (!mistake) return;
    if (!mistake.reviewedAt) {
      mistake.reviewedAt = todayIso();
      trackStudyAction("mistakeReviewed");
    }
    const wasFixed = mistake.reviewStatus === "fixed";
    mistake.reviewStatus = "fixed";
    if (!wasFixed && !mistake.fixedAt) {
      mistake.fixedAt = todayIso();
      trackStudyAction("mistakeFixed");
    }
  };

  const ensureCollections = () => {
    state.user = { ...window.StudyUpSeed.user, ...(state.user || {}) };
    state.user.password = state.user.password || "";
    state.settings = { ...window.StudyUpSeed.settings, ...(state.settings || {}) };
    if (!["free", "plus", "pro"].includes(state.settings.plan)) {
      state.settings.plan = state.settings.premiumActive ? "plus" : "free";
    }
    if (state.settings.premiumActive && state.settings.plan !== "pro") state.settings.plan = "plus";
    state.settings.premiumActive = state.settings.plan === "plus" || state.settings.plan === "pro";
    state.settings.planName = planLabel(state.settings.plan);
    state.settings.aiLimit = aiLimitForPlan(state.settings.plan);
    if (state.settings.aiQuestionsMonth !== monthKey()) {
      state.settings.aiQuestionsMonth = monthKey();
      state.settings.aiQuestionsUsed = 0;
    }
    state.gradeSystems = state.gradeSystems?.length ? state.gradeSystems : copy(window.StudyUpSeed.gradeSystems);
    state.gradeSystems = state.gradeSystems.map((system) => (
      system.id === "ch" ? { ...system, step: 0.01, example: "5.75" } : system
    ));
    state.languages = state.languages?.length ? state.languages : copy(window.StudyUpSeed.languages);
    state.notifications = (state.notifications || []).map((note) => ({
      ...note,
      title: String(note.title || "").replaceAll("StudyUp", "Lynxly"),
      text: String(note.text || "").replaceAll("StudyUp", "Lynxly")
    }));
    state.homework = state.homework || [];
    state.subjects = (state.subjects || []).map((subject) => ({
      weight: 1,
      targetGrade: "",
      gradeMode: "simple",
      gradeCategories: defaultGradeCategories(),
      normalizeCategories: false,
      grades: [],
      ...subject,
      gradeMode: ["simple", "weight", "category"].includes(subject.gradeMode) ? subject.gradeMode : "simple",
      gradeCategories: Array.isArray(subject.gradeCategories) && subject.gradeCategories.length
        ? subject.gradeCategories.map((category) => ({
          id: category.id || uid("cat"),
          name: category.name || "Kategorie",
          percentage: Number(category.percentage || 0)
        }))
        : defaultGradeCategories(),
      normalizeCategories: Boolean(subject.normalizeCategories),
      grades: (subject.grades || []).map(normalizeGradeEntry)
    }));
    state.exams = state.exams || [];
    state.planEvents = state.planEvents || [];
    state.studyTasks = state.studyTasks || [];
    state.mistakes = (state.mistakes || []).map(normalizeMistake);
    state.flashcards = (state.flashcards || []).map((card) => {
      const normalized = { source: "private", reviewCount: 0, published: false, title: card.subject, ...card };
      if (normalized.title === "StudyUp KI") normalized.title = "Lynxly AI";
      return normalized;
    });
    state.cardSchedule = state.cardSchedule || {};
    state.streak = { current: 0, weeklySessions: 0, lastStudyDate: "", ...(state.streak || {}) };
    state.cardLibrary = state.cardLibrary?.length ? state.cardLibrary : copy(window.StudyUpSeed.cardLibrary);
    state.cardLibrary = state.cardLibrary.map((pack) => ({
      ...pack,
      author: pack.author === "StudyUp Database" ? "Lynxly Datenbank" : pack.author
    }));
    state.chat = (state.chat || []).map((message) => (
      message.role === "bot" && (String(message.text || "").includes("Unexpected token") || String(message.text || "").includes("Not found"))
        ? { ...message, text: "Diese alte KI-Antwort kam aus einer nicht verbundenen API. Stelle die Frage einfach noch einmal." }
        : { ...message, text: String(message.text || "").replaceAll("StudyUp KI", "Lynxly AI").replaceAll("StudyUp", "Lynxly") }
    ));
    state.ui = { ...window.StudyUpSeed.ui, ...(state.ui || {}) };
    state.ui.selectedPartialGroup = state.ui.selectedPartialGroup || null;
    state.ui.plannerMonthOffset = Number(state.ui.plannerMonthOffset || 0);
    state.ui.selectedPlannerDate = state.ui.selectedPlannerDate || todayIso();
    state.ui.selectedCardPackId = state.ui.selectedCardPackId || "";
    state.ui.cardStudyIndex = Number(state.ui.cardStudyIndex || 0);
    state.ui.studySessionStep = Number(state.ui.studySessionStep || 0);
    state.ui.studySessionCardIndex = Number(state.ui.studySessionCardIndex || 0);
    state.ui.mistakeFilter = state.ui.mistakeFilter || "open";
    state.ui.settingsTab = state.ui.settingsTab || "profile";
    state.ui.designOpen = Boolean(state.ui.designOpen);
    state.ui.aiOfflineMode = state.ui.aiOfflineMode !== false;
    state.ui.showMistakeForm = Boolean(state.ui.showMistakeForm);
    state.ui.showTargetGradeForm = Boolean(state.ui.showTargetGradeForm);
    state.ui.showPartialEntryForm = Boolean(state.ui.showPartialEntryForm);
    state.ui.showPartialWeightForm = Boolean(state.ui.showPartialWeightForm);
    state.ui.aiAttachMenuOpen = Boolean(state.ui.aiAttachMenuOpen);
    state.ui.editingGradeId = state.ui.editingGradeId || "";
    state.ui.targetGradeWeight = state.ui.targetGradeWeight || "1";
    state.ui.targetGradeCategoryId = state.ui.targetGradeCategoryId || "";
    state.ui.whatIfResult = state.ui.whatIfResult || null;
    ensureGamification();
    if (!state.ui.cleanedHundredthsTest) {
      state.subjects.forEach((subject) => {
        subject.grades = subject.grades.filter((grade) => grade.title !== "Hundertstel-Test");
      });
      state.ui.cleanedHundredthsTest = true;
    }
  };

  const currentPlan = () => state.settings.plan || (state.settings.premiumActive ? "plus" : "free");
  const isPlus = () => currentPlan() === "plus" || currentPlan() === "pro";
  const isPro = () => currentPlan() === "pro";
  const currentSystem = () => state.gradeSystems.find((system) => system.id === state.settings.gradeSystem) || state.gradeSystems[0];
  const formatDate = (date, options = { day: "2-digit", month: "short" }) => new Intl.DateTimeFormat(state.settings.language || currentSystem().language, options).format(dateObject(date));
  const gradeValue = (grade) => {
    if (grade.type === "partial") {
      return grade.partialGrades?.length ? average(grade.partialGrades) : null;
    }
    const value = Number(grade.value);
    return Number.isFinite(value) ? value : null;
  };
  const gradeValues = (grades) => grades.map(gradeValue).filter((value) => Number.isFinite(value));
  const average = (grades) => {
    const values = gradeValues(grades);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const gradeWeight = (grade) => Math.max(0.01, Number(grade.weight || 1));
  const weightedGradeAverage = (grades) => {
    const weighted = (grades || [])
      .map((grade) => ({ value: gradeValue(grade), weight: gradeWeight(grade) }))
      .filter((grade) => Number.isFinite(grade.value));
    const weightSum = weighted.reduce((sum, grade) => sum + grade.weight, 0);
    return weightSum ? weighted.reduce((sum, grade) => sum + grade.value * grade.weight, 0) / weightSum : null;
  };
  const categoryBreakdown = (subject, gradesOverride = null) => {
    const categories = subject.gradeCategories?.length ? subject.gradeCategories : defaultGradeCategories();
    const grades = gradesOverride || subject.grades || [];
    const totalPercent = categories.reduce((sum, category) => sum + Number(category.percentage || 0), 0);
    const rows = categories.map((category) => {
      const entries = grades.filter((grade) => grade.categoryId === category.id);
      const avg = weightedGradeAverage(entries);
      return {
        ...category,
        grades: entries,
        average: avg,
        contribution: Number.isFinite(avg) ? avg * (Number(category.percentage || 0) / 100) : null
      };
    });
    const filledPercent = rows.filter((row) => Number.isFinite(row.average)).reduce((sum, row) => sum + Number(row.percentage || 0), 0);
    const contributionTotal = rows.reduce((sum, row) => sum + (Number.isFinite(row.contribution) ? row.contribution : 0), 0);
    return { rows, totalPercent, filledPercent, contributionTotal, openPercent: Math.max(0, 100 - filledPercent) };
  };
  const subjectAverage = (subject, gradesOverride = null) => {
    const grades = gradesOverride || subject.grades || [];
    if ((subject.gradeMode || "simple") === "weight") return weightedGradeAverage(grades);
    if (subject.gradeMode === "category") {
      const breakdown = categoryBreakdown(subject, grades);
      const filled = breakdown.rows.filter((row) => Number.isFinite(row.average) && Number(row.percentage || 0) > 0);
      if (!filled.length) return weightedGradeAverage(grades);
      const denominator = subject.normalizeCategories
        ? filled.reduce((sum, row) => sum + Number(row.percentage || 0), 0)
        : 100;
      return denominator ? filled.reduce((sum, row) => sum + row.average * (Number(row.percentage || 0) / denominator), 0) : null;
    }
    return weightedGradeAverage(grades);
  };
  const subjectDisplayAverage = (subject) => subjectAverage(subject);
  const subjectHasGrades = (subject) => Number.isFinite(subjectDisplayAverage(subject));
  const sortedSubjectsByAverage = () => [...state.subjects].sort((a, b) => {
    const avgA = subjectDisplayAverage(a);
    const avgB = subjectDisplayAverage(b);
    const hasA = Number.isFinite(avgA);
    const hasB = Number.isFinite(avgB);
    if (hasA && hasB) return (avgB - avgA) || String(a.name || "").localeCompare(String(b.name || ""), "de");
    if (hasA) return -1;
    if (hasB) return 1;
    return String(a.name || "").localeCompare(String(b.name || ""), "de");
  });

  const weightedAverage = () => {
    const weighted = state.subjects
      .filter(subjectHasGrades)
      .map((subject) => ({ value: subjectDisplayAverage(subject), weight: Number(subject.weight || 1) }));
    const weightSum = weighted.reduce((sum, item) => sum + item.weight, 0);
    return weightSum ? weighted.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum : null;
  };

  const plusPointsForAverage = (value) => {
    if (!Number.isFinite(value)) return 0;
    const system = currentSystem();
    if (system.id === "ch") {
      if (value < 1.25) return -6;
      if (value < 1.75) return -5;
      if (value < 2.25) return -4;
      if (value < 2.75) return -3;
      if (value < 3.25) return -2;
      if (value < 3.75) return -1;
      if (value < 4.25) return 0;
      if (value < 4.75) return 0.5;
      if (value < 5.25) return 1;
      if (value < 5.75) return 1.5;
      return 2;
    }
    const delta = system.higherIsBetter ? value - system.pass : system.pass - value;
    return Math.round(delta * 10) / 10;
  };

  const plusPointsFor = (subject) => subjectHasGrades(subject) ? plusPointsForAverage(subjectDisplayAverage(subject)) * Number(subject.weight || 1) : 0;
  const plusPointsTotal = () => Math.round(state.subjects.reduce((sum, subject) => sum + plusPointsFor(subject), 0) * 10) / 10;
  const formatPlusPoints = (value) => {
    const rounded = Math.round(value * 10) / 10;
    const clean = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    return `${rounded > 0 ? "+" : ""}${clean} P`;
  };
  const topicList = (topics) => Array.isArray(topics) ? topics : String(topics || "").split(",").map((topic) => topic.trim()).filter(Boolean);

  const applySampleData = () => {
    state.user = { loggedIn: true, name: state.user.name || "Beispiel-Schüler", email: state.user.email || "", password: state.user.password || "lynx1234", region: state.user.region || "ch" };
    state.settings.gradeSystem = state.settings.gradeSystem || "ch";
    state.settings.language = state.settings.language || "de-CH";
    state.subjects = [
      { id: uid("sub"), name: "Mathe", weight: 1, targetGrade: "5.0", grades: [{ id: uid("grade"), type: "exam", title: "Algebra-Test", date: addDays(todayIso(), -8), value: 4.5 }, { id: uid("grade"), type: "exam", title: "Geometrie-Quiz", date: addDays(todayIso(), -2), value: 5.0 }] },
      { id: uid("sub"), name: "Französisch", weight: 1, targetGrade: "5.0", grades: [{ id: uid("grade"), type: "exam", title: "Unit 1 Vokabeln", date: addDays(todayIso(), -5), value: 4.0 }] },
      { id: uid("sub"), name: "Biologie", weight: 1, targetGrade: "", grades: [{ id: uid("grade"), type: "exam", title: "Zellen", date: addDays(todayIso(), -3), value: 5.5 }] }
    ];
    state.exams = [{ id: uid("exam"), subject: "Mathe", title: "Lineare Funktionen", date: addDays(todayIso(), 6), targetGrade: "5.0", minutesPerDay: 25, topics: ["Steigung", "y-Achsenabschnitt"] }];
    state.homework = [{ id: uid("hw"), subject: "Französisch", title: "Vokabeln Unit 1", description: "10 Wörter wiederholen", dueDate: addDays(todayIso(), 2), priority: "Mittel", status: "Offen" }];
    state.planEvents = [{ id: uid("event"), subject: "Mathe", title: "15 Minuten Gleichungen üben", date: todayIso(), minutes: 15, type: "Üben", auto: false }];
    state.flashcards = [
      { id: uid("card"), subject: "Französisch", title: "Unit 1", question: "bonjour", answer: "hallo / guten Tag", difficulty: 2, reviewCount: 0, source: "private", published: false },
      { id: uid("card"), subject: "Französisch", title: "Unit 1", question: "la famille", answer: "die Familie", difficulty: 1, reviewCount: 0, source: "private", published: false },
      { id: uid("card"), subject: "Biologie", title: "Zellen", question: "Zellkern", answer: "Steuert die Zelle und enthält DNA.", difficulty: 2, reviewCount: 0, source: "private", published: false }
    ];
    state.mistakes = [
      normalizeMistake({ subject: "Mathe", topic: "Klammern", question: "2*(3+4)", userAnswer: "10", correctAnswer: "14", explanation: "Zuerst die Klammer rechnen: 3+4=7, danach 2*7=14.", source: "Beispiel" }),
      normalizeMistake({ subject: "Französisch", topic: "Vokabeln", question: "au revoir", userAnswer: "Hallo", correctAnswer: "auf Wiedersehen", explanation: "Bonjour ist hallo, au revoir ist auf Wiedersehen.", source: "Beispiel" })
    ];
    state.studyTasks = [{ id: uid("task"), subject: "Mathe", title: "Klammerregel wiederholen", date: todayIso(), done: false }];
    state.cardSchedule = {};
    state.streak = { current: 1, weeklySessions: 1, lastStudyDate: todayIso() };
    state.xpTotal = 220;
    state.xpThisWeek = 120;
    state.level = 1;
    state.weeklyStats = { ...defaultWeeklyStats(), xp: 120, cardsReviewed: 3, mistakesFixed: 1, mistakesReviewed: 1, studySessions: 1, studyDays: [todayIso()] };
    state.personalRecords = { ...defaultRecords(), bestWeeklyXp: 120, bestCardsWeek: 3, bestMistakesWeek: 1, bestSessionsWeek: 1, totalCardsReviewed: 3, totalMistakesFixed: 1, totalStudySessions: 1 };
    state.badges = [{ id: "first-step", unlockedAt: todayIso() }];
    state.dailyQuestDate = todayIso();
    state.dailyQuests = makeDailyQuests().map((quest) => quest.id === "sessions" ? { ...quest, progress: 1, completed: true, rewarded: true } : quest);
    state.leaderboardPrivacy = { visible: false, displayName: state.user.name || "Du" };
    state.weeklyLeagueStats = { ...defaultWeeklyLeagueStats(), weeklyXp: 120, cardsReviewed: 3, mistakesFixed: 1, studySessions: 1, improved: 5 };
    state.classLeague = defaultClassLeague();
    state.classLeaguePrivacy = { joined: false, visible: false, displayName: state.user.name || "Du" };
    state.classLeagueDemo = true;
    state.leagueTier = "snow-paw";
    state.classCode = "LYNX-2B";
    state.recentXpEvents = [];
    state.ui.showMistakeForm = false;
    state.ui.cardCreateOpen = false;
    state.ui.studySessionStep = 0;
    state.ui.studySessionCardIndex = 0;
  };

  const applyTheme = () => {
    const system = currentSystem();
    document.title = "Lynxly";
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.cardStyle = state.settings.cardStyle || "stacked";
    document.documentElement.lang = state.settings.language || system.language;
    document.body.classList.toggle("is-locked", !state.user.loggedIn);
    const accent = accentColors[state.settings.accent] || accentColors.blue;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-soft", `${accent}1A`);
    const streak = Number(state.streak?.current || 0);
    if (streakCount) streakCount.textContent = String(streak);
    if (streakPill) {
      streakPill.title = `${streak} Tage Lernserie`;
      streakPill.setAttribute("aria-label", `${streak} Tage Lernserie`);
    }
    if (xpWeekCount) xpWeekCount.textContent = String(Number(state.xpThisWeek || 0));
    if (xpPill) {
      xpPill.title = `${Number(state.xpThisWeek || 0)} XP diese Woche`;
      xpPill.setAttribute("aria-label", `${Number(state.xpThisWeek || 0)} XP diese Woche`);
    }
    if (cardsNavBadge) {
      const due = pendingDueCards().length;
      cardsNavBadge.textContent = String(due);
      cardsNavBadge.hidden = due === 0;
    }
    if (themeIcon) themeIcon.innerHTML = state.settings.theme === "dark" ? "&#9728;" : "&#9790;";
    if (themeLabel) themeLabel.textContent = state.settings.theme === "dark" ? "Hell" : "Dunkel";
  };

  const getRoute = () => {
    const route = location.hash.replace("#", "");
    if (route === "homework") return "planner";
    return routes.includes(route) ? route : "dashboard";
  };

  const setActiveNav = (route) => {
    const visibleRoute = { mistakes: "dashboard", session: "dashboard", premium: "dashboard", settings: "dashboard" }[route] || route;
    navLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === visibleRoute));
  };

  const pushNotification = async (title, text, ask = false) => {
    state.notifications.unshift({ id: uid("note"), title, text, date: todayIso(), read: false });
    state.notifications = state.notifications.slice(0, 12);
    save();
    if (!("Notification" in window)) return;
    const permission = ask && Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission === "granted") new Notification(title, { body: text });
  };

  const requestNotifications = async () => {
    const next = calendarItems().find((item) => item.date >= todayIso());
    const text = next ? `${next.subject}: ${next.title} ist als Nächstes dran.` : "Lynxly kann dir Geräte-Mitteilungen schicken.";
    await pushNotification("Lynxly Erinnerung", text, true);
    render();
  };

  const renderOnboarding = () => {
    const system = currentSystem();
    return `
      <section class="onboarding-screen">
        <div class="onboarding-logo">
          ${C.mascot("mascot-floating")}
          <h1>Lynxly</h1>
          <p>Lynxly: dein smarter Lerncoach.</p>
        </div>
        <form class="panel onboarding-card" id="onboarding-form">
          <label>Name<input name="name" required placeholder="Dein Name" /></label>
          <label>E-Mail <small>optional</small><input name="email" type="email" placeholder="name@schule.ch" /></label>
          <label>Passwort<input name="password" type="password" required minlength="4" placeholder="Mindestens 4 Zeichen" /></label>
          <label>Region / Notensystem<select name="gradeSystem">${state.gradeSystems.map((item) => `<option value="${item.id}" ${item.id === system.id ? "selected" : ""}>${C.escapeHtml(item.name)} · ${C.escapeHtml(item.label)}</option>`).join("")}</select></label>
          <label>App-Sprache<select name="language">${state.languages.map((item) => `<option value="${item.id}" ${item.id === state.settings.language ? "selected" : ""}>${C.escapeHtml(item.name)}</option>`).join("")}</select></label>
          <button class="primary-button" type="submit">Lynxly starten</button>
        </form>
      </section>
    `;
  };

  const calendarItems = () => [
    ...state.planEvents,
    ...state.exams.map((exam) => ({ id: exam.id, subject: exam.subject, title: exam.title, date: exam.date, minutes: exam.minutesPerDay || 30, type: "Prüfung", exam: true })),
    ...state.homework.map((task) => ({ id: task.id, subject: task.subject, title: task.title, date: task.dueDate, minutes: 20, type: "Hausaufgabe", homework: true }))
  ].sort((a, b) => a.date.localeCompare(b.date));

  const addDays = (iso, days) => {
    const date = dateObject(iso || todayIso());
    date.setDate(date.getDate() + days);
    return toIso(date);
  };
  const openMistakes = () => state.mistakes.filter((mistake) => mistake.reviewStatus !== "fixed");
  const mistakeLabel = (count) => `${count} ${count === 1 ? "offener Fehler" : "offene Fehler"}`;
  const cardScheduleFor = (id) => state.cardSchedule[id] || {};
  const libraryCardsForReview = () => state.cardLibrary.flatMap((pack) => {
    const limit = isPlus() ? pack.cards.length : Math.min(pack.freeCount || pack.cards.length, pack.cards.length);
    return pack.cards.slice(0, limit).map((card, index) => ({
      id: `${pack.id}-${index}`,
      subject: pack.subject,
      title: pack.title,
      packId: pack.id,
      source: "database",
      published: true,
      ...card
    }));
  });
  const allCardsForReview = () => [
    ...state.flashcards,
    ...libraryCardsForReview()
  ].map((card) => ({ ...card, ...cardScheduleFor(card.id) }));
  const cardIsDue = (card) => !card.nextReview || card.nextReview <= todayIso();
  const cardWasDueToday = (card) => cardIsDue(card) || (state.cardXpHistory?.[card.id]?.date === todayIso() && state.cardXpHistory?.[card.id]?.due);
  const cardReviewedToday = (card) => state.cardSchedule?.[card.id]?.lastReviewed === todayIso() || state.cardXpHistory?.[card.id]?.date === todayIso();
  const dueCards = () => allCardsForReview().filter(cardWasDueToday);
  const pendingDueCards = () => allCardsForReview().filter((card) => cardIsDue(card) && !cardReviewedToday(card));
  const rememberCardDueToday = (card, wasDue) => {
    if (!card?.id || !wasDue) return;
    const previous = state.cardXpHistory?.[card.id] || {};
    state.cardXpHistory[card.id] = {
      ...previous,
      date: todayIso(),
      due: true,
      xp: Number(previous.xp || 0)
    };
  };
  const recordCardReviewAction = (count = 1) => {
    ensureGamification();
    const amount = Math.max(1, Number(count || 1));
    state.weeklyStats.cardsReviewed = Number(state.weeklyStats.cardsReviewed || 0) + amount;
    state.weeklyLeagueStats.cardsReviewed = Number(state.weeklyLeagueStats.cardsReviewed || 0) + amount;
    state.personalRecords.totalCardsReviewed = Number(state.personalRecords.totalCardsReviewed || 0) + amount;
    addQuestProgress("cards", amount);
    updatePersonalRecords();
    evaluateBadges();
    checkClassBonus();
  };
  const awardCardReviewXp = (card, wasDue) => {
    if (!card?.id) return 0;
    ensureGamification();
    const today = todayIso();
    const previous = state.cardXpHistory[card.id];
    recordCardReviewAction(1);
    if (previous?.date === today && Number(previous.xp || 0) > 0) return 0;
    const xp = wasDue ? 4 : 1;
    state.cardXpHistory[card.id] = { ...previous, date: today, xp, due: Boolean(previous?.due || wasDue) };
    if (xp > 0) {
      awardXp(xp, "Karte gelernt");
      state.dailyDeckStats.cardXp = Number(state.dailyDeckStats.cardXp || 0) + xp;
    }
    return xp;
  };
  const nextExamOrHomework = () => calendarItems().find((item) => (item.exam || item.homework) && item.date >= todayIso());
  const weakestSubject = () => {
    const graded = [...state.subjects].filter(subjectHasGrades).sort((a, b) => plusPointsFor(a) - plusPointsFor(b))[0];
    if (graded) return { name: graded.name, reason: `${formatPlusPoints(plusPointsFor(graded))} und ${subjectAverage(graded).toFixed(2)} Schnitt`, href: "#grades" };
    const byMistake = openMistakes().reduce((map, mistake) => {
      map[mistake.subject] = (map[mistake.subject] || 0) + 1;
      return map;
    }, {});
    const subject = Object.entries(byMistake).sort((a, b) => b[1] - a[1])[0];
    return subject ? { name: subject[0], reason: `${subject[1]} offene Fehler`, href: "#mistakes" } : null;
  };
  const studyTasksToday = () => {
    const today = todayIso();
    const manual = state.studyTasks.filter((task) => !task.done && (!task.date || task.date <= today)).map((task) => ({ ...task, href: "#planner", kind: "Lernaufgabe" }));
    const calendar = calendarItems().filter((item) => item.date === today).map((item) => ({ id: item.id, title: item.title, subject: item.subject, href: "#planner", kind: item.type }));
    const cards = pendingDueCards().slice(0, 3).map((card) => ({ id: card.id, title: card.question, subject: card.subject, href: "#cards", kind: "Karte fällig" }));
    const mistakes = openMistakes().slice(0, 3).map((mistake) => ({ id: mistake.id, title: mistake.question, subject: mistake.subject, href: "#mistakes", kind: "Fehler wiederholen" }));
    return [...manual, ...calendar, ...mistakes, ...cards].slice(0, 6);
  };
  const saveMistake = (mistake, options = {}) => {
    state.mistakes.unshift(normalizeMistake(mistake));
    state.mistakes = state.mistakes.slice(0, 200);
    if (options.reward !== false) trackStudyAction("mistakeSaved");
  };
  const reviewOffsetForRating = (rating) => ({ again: 1, hard: 2, good: 4, easy: 7 })[rating] || 3;
  const scheduleCardReview = (card, rating, options = {}) => {
    const wasDue = cardIsDue(card);
    rememberCardDueToday(card, wasDue);
    state.cardSchedule[card.id] = { rating, nextReview: addDays(todayIso(), reviewOffsetForRating(rating)), lastReviewed: todayIso() };
    state.cardReviewStatus = state.cardReviewStatus || {};
    state.cardReviewStatus[card.id] = rating;
    const ownedCard = state.flashcards.find((item) => item.id === card.id);
    if (ownedCard) ownedCard.reviewCount = Number(ownedCard.reviewCount || 0) + 1;
    if (options.rewardCard) awardCardReviewXp(card, wasDue);
    if (rating === "again" || rating === "hard") {
      saveMistake({
        subject: card.subject,
        topic: card.title || card.subject,
        question: card.question,
        correctAnswer: card.answer,
        userAnswer: rating === "again" ? "Nicht gewusst" : "Unsicher",
        explanation: "Aus Karteikarten-Wiederholung gespeichert.",
        source: "Karten"
      }, { reward: options.mistakeReward === true });
    }
    return { wasDue };
  };
  const updateStreak = () => {
    const today = todayIso();
    if (state.streak.lastStudyDate === today) return;
    const yesterday = addDays(today, -1);
    state.streak.current = state.streak.lastStudyDate === yesterday ? Number(state.streak.current || 0) + 1 : 1;
    state.streak.weeklySessions = Number(state.streak.weeklySessions || 0) + 1;
    state.streak.lastStudyDate = today;
  };
  const requiredNextGrade = (subject, options = {}) => {
    if (!subject?.targetGrade || !subjectHasGrades(subject)) return null;
    const target = Number(subject.targetGrade);
    if (!Number.isFinite(target)) return null;
    const system = currentSystem();
    const min = Number(system.min);
    const max = Number(system.max);
    const weight = Math.max(0.01, Number(options.weight || 1));
    const categoryId = subject.gradeMode === "category" ? (options.categoryId || subject.gradeCategories?.[0]?.id || "") : "";
    const projectedMin = projectSubjectAverage(subject, min, { weight, categoryId });
    const projectedMax = projectSubjectAverage(subject, max, { weight, categoryId });
    if (system.higherIsBetter && projectedMax < target) return null;
    if (!system.higherIsBetter && projectedMin > target) return null;
    if (system.higherIsBetter && projectedMin >= target) return min;
    if (!system.higherIsBetter && projectedMax <= target) return max;
    let low = min;
    let high = max;
    for (let index = 0; index < 42; index += 1) {
      const mid = (low + high) / 2;
      const projected = projectSubjectAverage(subject, mid, { weight, categoryId });
      if (system.higherIsBetter) {
        if (projected >= target) high = mid;
        else low = mid;
      } else if (projected <= target) {
        low = mid;
      } else {
        high = mid;
      }
    }
    return system.higherIsBetter ? high : low;
  };
  const subjectTrend = (subject) => {
    const values = gradeValues(subject.grades);
    if (values.length < 2) return "Noch kein Trend";
    const system = currentSystem();
    const delta = values.at(-1) - values.at(-2);
    const improving = system.higherIsBetter ? delta > 0.05 : delta < -0.05;
    const falling = system.higherIsBetter ? delta < -0.05 : delta > 0.05;
    if (improving) return "Verbessert";
    if (falling) return "Fällt";
    return "Stabil";
  };

  const nextFocus = () => calendarItems().find((item) => item.date >= todayIso());
  const recommendation = () => {
    const subjectWithoutGrade = state.subjects.find((subject) => !subjectHasGrades(subject));
    if (subjectWithoutGrade) return { title: `${subjectWithoutGrade.name}: erste Note eintragen`, href: "#grades" };
    const weakSubject = [...state.subjects].filter(subjectHasGrades).sort((a, b) => plusPointsFor(a) - plusPointsFor(b))[0];
    if (weakSubject) return { title: `${weakSubject.name} gezielt üben`, href: "#grades" };
    const due = calendarItems().find((item) => item.date >= todayIso());
    if (due) return { title: `${due.subject}: ${due.title}`, href: "#planner" };
    return { title: "Ersten Lerntermin planen", href: "#planner" };
  };

  const smartRecommendation = () => {
    const weak = weakestSubject();
    if (openMistakes().length) return { title: `${openMistakes().length} Fehler gezielt reparieren`, href: "#mistakes" };
    if (pendingDueCards().length) return { title: `${pendingDueCards().length} Karte(n) heute wiederholen`, href: "#cards" };
    if (weak) return { title: `${weak.name} gezielt üben`, href: weak.href };
    const due = nextFocus();
    if (due) return { title: `${due.subject}: ${due.title}`, href: "#planner" };
    return { title: "Ersten Lerntermin planen", href: "#planner" };
  };

  const smartCoachSentence = () => {
    const mistakeCounts = openMistakes().reduce((counts, mistake) => {
      counts[mistake.subject] = (counts[mistake.subject] || 0) + 1;
      return counts;
    }, {});
    const mistakeFocus = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];
    if (mistakeFocus) {
      return `Heute solltest du 15 Minuten ${mistakeFocus[0]} machen, weil du dort ${mistakeLabel(mistakeFocus[1])} hast.`;
    }
    const dueBySubject = pendingDueCards().reduce((counts, card) => {
      counts[card.subject] = (counts[card.subject] || 0) + 1;
      return counts;
    }, {});
    const cardFocus = Object.entries(dueBySubject).sort((a, b) => b[1] - a[1])[0];
    if (cardFocus) {
      return `Heute sind ${cardFocus[1]} Karten in ${cardFocus[0]} fällig. Starte eine kurze Wiederholung.`;
    }
    const weak = weakestSubject();
    if (weak) return `Dein nächster sinnvoller Fokus ist ${weak.name}, weil Lynxly dort den größten Übungsbedarf sieht.`;
    const next = nextExamOrHomework();
    if (next) return `Bereite dich heute kurz auf ${next.subject} vor: ${next.title} ist am ${formatDate(next.date)} dran.`;
    return "Starte mit einem Fach, einer Karte oder einem Fehler. Lynxly baut daraus deinen Lerncoach.";
  };
  const questPercent = (quest) => Math.min(100, Math.round((Number(quest.progress || 0) / Math.max(1, Number(quest.target || 1))) * 100));
  const renderDailyQuestsCard = () => `
    <article class="daily-quests-card focus-card">
      <div class="quest-card-head">
        <div><span>Tagesquests</span><h2>Heute ruhig Punkte sammeln</h2></div>
        <strong>+100 XP</strong>
      </div>
      <div class="quest-list">
        ${state.dailyQuests.map((quest) => `
          <a class="quest-row ${quest.completed ? "completed" : ""}" href="${quest.href}">
            <div>
              <strong>${C.escapeHtml(quest.title)}</strong>
              <small>${Math.min(Number(quest.progress || 0), Number(quest.target || 1))} / ${quest.target}</small>
            </div>
            ${progressBar(Math.min(Number(quest.progress || 0), Number(quest.target || 1)), quest.target, `Tagesquest ${quest.title}`, "quest-progress")}
          </a>
        `).join("")}
      </div>
    </article>
  `;
  const renderProgressTeaser = () => {
    const progress = levelProgress();
    const currentTier = tierById(state.leagueTier);
    return `
      <a class="progress-teaser-card focus-card" href="#progress">
        <div class="mascot-card-head">${C.mascot("mascot-small")}<div><span>Fortschritt</span><h2>${leagueSymbol(currentTier.id)}</h2></div></div>
        <p>${progress.next ? `${progress.remaining} XP bis ${C.escapeHtml(progress.next.title)}` : "Höchstes Ziel erreicht"} · ${state.xpThisWeek} XP diese Woche</p>
        ${progressBar(Number(state.xpTotal || 0) - progress.current.min, progress.end - progress.current.min, `Fortschritt bis ${progress.next ? progress.next.title : currentTier.name}`)}
        <em>Fortschritt öffnen</em>
      </a>
    `;
  };

  const renderDashboard = () => {
    const next = nextFocus();
    const tip = recommendation();
    const avg = weightedAverage();
    const points = plusPointsTotal();
    return `
      <section class="home-page">
        <h1>Home</h1>
        <div class="home-metric-row">
          <article><span>Notendurchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article><span>Pluspunkte</span><strong>${state.subjects.some(subjectHasGrades) ? formatPlusPoints(points) : "–"}</strong></article>
        </div>
        <div class="home-vertical-stack">
          <article class="focus-card latest-card"><span>Aktuell</span><h2>${next ? C.escapeHtml(next.title) : "Noch nichts eingetragen"}</h2><p>${next ? `${C.escapeHtml(next.subject)} · ${formatDate(next.date)} · ${C.escapeHtml(next.type)}` : "Sobald du im Kalender etwas einträgst, erscheint es hier."}</p><a class="primary-button" href="#planner">Kalender öffnen</a></article>
          <article class="focus-card recommendation-card"><span>Empfohlen</span><h2>${C.escapeHtml(tip.title)}</h2><a class="secondary-button" href="${tip.href}">Öffnen</a></article>
        </div>
      </section>
    `;
  };

  const renderTodayDashboard = () => {
    const next = nextFocus();
    const nextWork = nextExamOrHomework();
    const avg = weightedAverage();
    const points = plusPointsTotal();
    const weak = weakestSubject();
    const tasks = studyTasksToday();
    const hasContent = state.subjects.length || state.flashcards.length || state.exams.length || state.homework.length || state.mistakes.length;
    const upcoming = calendarItems().filter((item) => item.date >= todayIso()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2);
    const dueCount = pendingDueCards().length;
    const openMistakeCount = openMistakes().length;
    return `
      <section class="home-page today-dashboard sleek-screen">
        <div class="sleek-page-header">
          <div>
            <h1>Start</h1>
            <p>Heute, ${formatDate(todayIso(), { day: "numeric", month: "long" })}</p>
          </div>
        </div>

        <article class="coach-sentence-card sleek-coach-card">
          <span class="coach-label"><i></i>Coach Empfehlung</span>
          <h2>${weak ? `Fokus auf ${C.escapeHtml(weak.name)}` : dueCount ? `${dueCount} Karte${dueCount === 1 ? "" : "n"} wiederholen` : "Heute kurz starten"}</h2>
          <p>${C.escapeHtml(smartCoachSentence())}</p>
          <button class="primary-button start-study-session sleek-primary-cta" type="button">
            <span>15-Minuten-Lerneinheit starten</span><i></i>
          </button>
        </article>

        ${hasContent ? "" : `<article class="empty-state mascot-empty dashboard-empty">${C.mascot("mascot-small")}<div><strong>Neu hier?</strong><p>Füge deine ersten Noten, Karten oder Termine hinzu. Lynxly baut daraus deinen Lernplan.</p></div></article>`}

        <div class="home-metric-row today-metrics sleek-metrics">
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong><small>Noten</small></article>
          <article><span>Pluspunkte</span><strong>${state.subjects.some(subjectHasGrades) ? formatPlusPoints(points) : "–"}</strong><small>Schweiz</small></article>
        </div>

        <div class="today-grid gamification-home-grid">
          ${renderDailyQuestsCard()}
          ${renderProgressTeaser()}
        </div>

        <div class="sleek-section-title"><h2>Als Nächstes</h2><a href="#planner">Alle</a></div>
        <div class="sleek-next-list">
          ${upcoming.map((item) => `<a class="sleek-next-item" href="#planner"><span class="next-dot ${item.exam ? "exam" : item.homework ? "homework" : ""}"><i></i></span><div><strong>${C.escapeHtml(item.title)}</strong><small>${C.escapeHtml(item.subject)}</small></div><em>${formatDate(item.date, { weekday: "short" })}</em></a>`).join("") || `<article class="sleek-next-item empty"><span class="next-dot"><i></i></span><div><strong>Noch kein Termin</strong><small>Trage im Plan eine Prüfung oder Hausaufgabe ein.</small></div></article>`}
        </div>

        <div class="today-grid sleek-bottom-grid">
          <article class="focus-card today-main-card">
            <span>Heute zu tun</span>
            <h2>${tasks.length ? `${tasks.length} Lernschritt${tasks.length === 1 ? "" : "e"}` : "Alles ruhig"}</h2>
            <div class="today-task-list">
              ${tasks.slice(0, 3).map((task) => `<a href="${task.href}"><strong>${C.escapeHtml(task.title)}</strong><small>${C.escapeHtml(task.subject)} · ${C.escapeHtml(task.kind)}</small></a>`).join("") || `<p class="muted-text">Noch keine Aufgaben für heute. Plane einen Termin, speichere Fehler oder starte mit Karten.</p>`}
            </div>
          </article>
          <article class="focus-card">
            <span>Fehlerbank</span>
            <h2>${openMistakeCount ? `${openMistakeCount} offen` : "Keine offenen Fehler"}</h2>
            <p>${weak ? C.escapeHtml(weak.reason) : "Speichere Fehler, damit Lynxly deine nächsten Übungen gezielter plant."}</p>
            <a class="secondary-button" href="#mistakes">Öffnen</a>
          </article>
        </div>
      </section>
    `;
  };

  const sessionMistakes = () => openMistakes().slice(0, 3);
  const sessionCards = () => pendingDueCards().slice(0, 5);
  const renderSessionProgress = () => `
    <div class="session-progress">
      ${["Fehler", "Karten", "Mini-Check", "Zusammenfassung"].map((label, index) => `<span class="${state.ui.studySessionStep === index ? "active" : ""}">${index + 1}. ${label}</span>`).join("")}
    </div>
  `;
  const renderStudySession = () => {
    const step = Math.min(Math.max(Number(state.ui.studySessionStep || 0), 0), 3);
    const mistakes = sessionMistakes();
    const cards = sessionCards();
    const cardIndex = Math.min(Math.max(Number(state.ui.studySessionCardIndex || 0), 0), Math.max(0, cards.length - 1));
    const card = cards[cardIndex];
    const emptyHelp = `<div class="empty-state"><strong>Noch nicht genug Lernstoff</strong><p>Erstelle ein paar Karten oder füge einen Fehler hinzu. Danach wird die Session automatisch sinnvoller.</p><div class="coach-action-row"><a class="secondary-button" href="#cards">Karten erstellen</a><a class="secondary-button" href="#mistakes">Fehler hinzufügen</a></div></div>`;
    const content = [
      `<section class="session-step">
        <h2>Fehler wiederholen</h2>
        ${mistakes.length ? mistakes.map((mistake) => `<article class="mistake-card"><div class="mistake-card-top"><strong>${C.escapeHtml(mistake.subject)}</strong><span>${C.escapeHtml(mistake.topic || "Fehler")}</span></div><h2>${C.escapeHtml(mistake.question)}</h2><p>${C.escapeHtml(mistake.explanation || mistake.correctAnswer || "Erkläre dir kurz, warum dieser Punkt schwierig war.")}</p><button class="secondary-button session-fix-mistake" data-id="${mistake.id}" type="button">Verstanden</button></article>`).join("") : emptyHelp}
      </section>`,
      `<section class="session-step">
        <h2>Karten wiederholen</h2>
        ${card ? `${renderStudyCard(card)}<div class="study-nav-row"><button class="icon-button session-card-prev" type="button" aria-label="Vorherige Karte in der Lerneinheit" ${cardIndex <= 0 ? "disabled" : ""}>&#8592;</button><span>${cardIndex + 1} / ${cards.length}</span><button class="icon-button session-card-next" type="button" aria-label="Nächste Karte in der Lerneinheit" ${cardIndex >= cards.length - 1 ? "disabled" : ""}>&#8594;</button></div><div class="srs-rating-grid"><button class="srs-rating again session-rate-card" data-rating="again" type="button">Nochmal</button><button class="srs-rating hard session-rate-card" data-rating="hard" type="button">Schwer</button><button class="srs-rating good session-rate-card" data-rating="good" type="button">Gut</button><button class="srs-rating easy session-rate-card" data-rating="easy" type="button">Einfach</button></div>` : emptyHelp}
      </section>`,
      `<section class="session-step">
        <h2>Mini-Check</h2>
        <article class="panel"><p class="panel-note">Schreibe in einem Satz auf, was du gerade besser verstanden hast. Das speichert Lynxly als kleine Lernnotiz.</p><form id="session-check-form"><label>Meine Zusammenfassung<textarea name="summary" rows="4" placeholder="Heute habe ich verstanden, dass ..."></textarea></label><button class="primary-button" type="submit">Speichern und weiter</button></form></article>
      </section>`,
      `<section class="session-step">
        <h2>Gut gemacht</h2>
        <article class="panel session-summary"><strong>${mistakes.length} Fehler · ${cards.length} Karten</strong><p>Diese Session zählt für deine Lernserie. Du kannst jetzt zurück zu Home oder direkt weiter Karten lernen.</p><div class="coach-action-row"><button class="primary-button complete-study-session" type="button">Session abschließen</button><a class="secondary-button" href="#cards">Weiter Karten lernen</a></div></article>
      </section>`
    ][step];
    return `
      <section class="study-session-page">
        <div class="mistake-header">
          <div><span class="eyebrow">15 Minuten</span><h1>Lerneinheit</h1></div>
          <a class="secondary-button" href="#dashboard">Beenden</a>
        </div>
        ${renderSessionProgress()}
        ${content}
        <div class="session-controls">
          <button class="secondary-button session-prev-step" type="button" ${step <= 0 ? "disabled" : ""}>Zurück</button>
          <button class="primary-button session-next-step" type="button" ${step >= 3 ? "disabled" : ""}>Weiter</button>
        </div>
      </section>
    `;
  };

  const gradeInputAttrs = () => {
    const system = currentSystem();
    return `min="${system.min}" max="${system.max}" step="0.01"`;
  };
  const fitTitleStyle = (title) => {
    const length = Math.max(4, [...String(title || "")].length);
    const size = Math.max(1.65, Math.min(3.7, 4.7 - (length * 0.24)));
    return `style="--fit-title-size:${size.toFixed(2)}rem"`;
  };

  const gradeSubjectById = (id) => state.subjects.find((subject) => subject.id === id);
  const gradeEntryById = (subject, id) => subject?.grades.find((grade) => grade.id === id);
  const gradeCategoryById = (subject, categoryId) => (subject.gradeCategories || []).find((category) => category.id === categoryId);
  const defaultTargetOptions = (subject) => ({
    weight: parseWeightInput(state.ui.targetGradeWeight, 1),
    categoryId: subject.gradeMode === "category"
      ? (gradeCategoryById(subject, state.ui.targetGradeCategoryId)?.id || subject.gradeCategories?.[0]?.id || "")
      : ""
  });
  const projectSubjectAverage = (subject, value, options = {}) => subjectAverage(subject, [
    ...(subject.grades || []),
    {
      id: "preview-grade",
      type: "exam",
      title: "Vorschau",
      date: todayIso(),
      value: Number(value),
      weight: parseWeightInput(options.weight, 1),
      categoryId: options.categoryId || ""
    }
  ]);
  const renderGradeActions = (gradeId, partialId = "") => `
    <div class="grade-row-actions">
      <button class="icon-action delete-grade" data-grade="${gradeId}" data-partial="${partialId}" type="button" title="Löschen" aria-label="Prüfung löschen">${C.icon("trash")}</button>
    </div>
  `;
  const renderGradeEntryRow = (grade) => {
    const isPartial = grade.type === "partial";
    const value = gradeValue(grade);
    const subject = gradeSubjectById(state.ui.selectedGradeSubject);
    const category = gradeCategoryById(subject || {}, grade.categoryId);
    const partialCount = isPartial ? (grade.partialGrades || []).length : 0;
    const details = [
      isPartial ? `${partialCount} Teilprüfung${partialCount === 1 ? "" : "en"}` : (grade.date ? formatDate(grade.date) : "Ohne Datum"),
      isPartial ? `Zählt ${formatWeightPercentLabel(gradeWeight(grade))}` : (gradeWeight(grade) !== 1 ? `Gewicht ${formatWeightLabel(gradeWeight(grade))}` : ""),
      category ? category.name : ""
    ].filter(Boolean).join(" · ");
    return `
      <article class="grade-swipe-row ${isPartial ? "partial-folder-row" : ""}" ${isPartial ? `data-partial-id="${grade.id}"` : ""}>
        <button class="grade-row-main ${isPartial ? "open-partial-folder" : "edit-grade-entry"}" data-id="${grade.id}" type="button" aria-label="${isPartial ? `${C.escapeHtml(grade.title)} öffnen` : `${C.escapeHtml(grade.title)} bearbeiten`}">
          <span class="grade-row-icon">${C.icon(isPartial ? "folder" : "chart")}</span>
          <div>
            <strong>${C.escapeHtml(grade.title)}</strong>
            <small>${C.escapeHtml(details || "Ohne Datum")}</small>
          </div>
          ${isPartial ? `
            <span class="partial-folder-metrics">
              <b>${Number.isFinite(value) ? value.toFixed(2) : "–"}</b>
              <small>${formatWeightPercentLabel(gradeWeight(grade))}</small>
            </span>
          ` : `<em>${Number.isFinite(value) ? value.toFixed(2) : "–"}</em>`}
        </button>
        ${renderGradeActions(grade.id)}
      </article>
    `;
  };

  const renderSubjectFolders = () => sortedSubjectsByAverage().map((subject) => {
    const avg = subjectAverage(subject);
    const points = plusPointsFor(subject);
    const roundedGrade = Number.isFinite(avg) ? Math.round(avg * 2) / 2 : null;
    const gradeClass = !Number.isFinite(roundedGrade)
      ? "grade-neutral"
      : roundedGrade < 3.5
        ? "grade-low"
        : roundedGrade < 4
          ? "grade-warning"
          : roundedGrade < 4.5
            ? "grade-ok"
            : roundedGrade < 5
              ? "grade-light-good"
              : "grade-high";
    return `
      <article class="subject-folder-row ${gradeClass}" data-subject-id="${subject.id}">
        <button class="grade-folder" data-id="${subject.id}" type="button">
          <div><strong>${C.escapeHtml(subject.name)}</strong><small>${subject.grades.length} Prüfung${subject.grades.length === 1 ? "" : "en"}</small></div>
          <em>${avg === null ? "–" : avg.toFixed(2)}</em>
          <b class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</b>
        </button>
        <div class="subject-row-actions">
          <button class="icon-action delete-subject" data-id="${subject.id}" type="button" title="Fach löschen" aria-label="${C.escapeHtml(subject.name)} löschen">${C.icon("trash")}</button>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty-grade-list">Füge oben dein erstes Fach hinzu.</div>`;

  const renderGrades = () => {
    const selected = gradeSubjectById(state.ui.selectedGradeSubject);
    const partial = selected ? gradeEntryById(selected, state.ui.selectedPartialGroup) : null;
    if (selected && partial?.type === "partial") return renderPartialGroupDetail(selected, partial);
    if (selected) return renderGradeSubjectDetail(selected);

    return `
      <section class="grade-page">
        <div class="grade-page-header">
          <h1>Noten</h1>
          <button class="round-add" id="toggle-subject-form" type="button" aria-label="Fach hinzufügen">+</button>
        </div>
        <form class="subject-add-form ${state.ui.showSubjectForm ? "show" : ""}" id="subject-form">
          <label class="subject-combo-label">Fach
            <div class="subject-combo" data-subject-combo>
              <input name="name" required autocomplete="off" placeholder="Fach selbst eintippen" />
              <button class="subject-suggest-toggle" type="button" aria-label="Vorgeschlagene Fächer anzeigen" aria-expanded="false">&#8964;</button>
              <div class="subject-suggestions" role="listbox" aria-label="Vorgeschlagene Fächer">
                ${subjectChoices.map((subject) => `<button type="button" role="option" data-subject="${C.escapeHtml(subject)}">${C.escapeHtml(subject)}</button>`).join("")}
              </div>
            </div>
          </label>
          <label>Gewichtung<input name="weight" type="number" min="0.5" max="4" step="0.5" value="1" /></label>
          <button class="primary-button" type="submit">Fach hinzufügen</button>
        </form>
        ${state.ui.showSubjectForm ? "" : `
          <section class="grade-summary-card">
            <div class="grade-summary-top">
              <div><span>Gesamtdurchschnitt</span><strong>${weightedAverage() === null ? "–" : weightedAverage().toFixed(2)}</strong></div>
              <em>${state.subjects.length ? "Aktuelles Semester" : "Startklar"}</em>
            </div>
            <div class="grade-summary-stats">
              <article><span>Pluspunkte</span><strong>${state.subjects.some(subjectHasGrades) ? formatPlusPoints(plusPointsTotal()) : "–"}</strong></article>
              <article><span>Ziel</span><strong>${state.subjects.find((subject) => subject.targetGrade)?.targetGrade || "–"}</strong></article>
              <article><span>Prüfungen</span><strong>${state.subjects.reduce((sum, subject) => sum + subject.grades.length, 0)}</strong></article>
            </div>
          </section>
          <div class="sleek-section-title grade-list-title"><h2>Fächer</h2><span>${state.subjects.length}</span></div>
          <section class="grade-folder-list">${renderSubjectFolders()}</section>
        `}
      </section>
    `;
  };

  const renderGradeModeFields = (subject, values = {}) => {
    const selectedWeight = parseWeightInput(values.weight, 1);
    const weightField = `
      <label>Gewichtung <small>x oder %</small>
        <input id="grade-weight" name="weight" type="text" inputmode="decimal" value="${C.escapeHtml(formatWeightInput(selectedWeight))}" />
      </label>
    `;
    const folderToggle = values.includeFolderToggle ? `
      <label class="toggle-field grade-folder-toggle">
        <input name="isPartialFolder" type="checkbox" />
        <span>Als Noten-Ordner speichern</span>
        <small>Für Teilnoten wie mündliche Noten oder kurze Abfragen.</small>
      </label>
    ` : "";
    return `${weightField}${folderToggle}`;
  };

  const renderTargetModeFields = (subject) => {
    if (subject.gradeMode === "simple") return "";
    const currentOptions = defaultTargetOptions(subject);
    const weightField = `
      <label>Nächste Gewichtung <small>x oder %</small>
        <input id="target-grade-weight" name="targetWeight" type="text" inputmode="decimal" value="${C.escapeHtml(formatWeightInput(currentOptions.weight))}" />
      </label>
    `;
    if (subject.gradeMode === "category") {
      return `
        <label>Nächste Kategorie
          <select name="targetCategoryId">
            ${(subject.gradeCategories || []).map((category) => `<option value="${category.id}" ${category.id === currentOptions.categoryId ? "selected" : ""}>${C.escapeHtml(category.name)} · ${Number(category.percentage || 0)}%</option>`).join("")}
          </select>
        </label>
        ${weightField}
      `;
    }
    return weightField;
  };

  const renderCategoryBreakdown = (subject) => {
    if (subject.gradeMode !== "category") return "";
    const breakdown = categoryBreakdown(subject);
    const avg = subjectAverage(subject);
    const filled = Math.round(breakdown.filledPercent);
    const open = Math.max(0, 100 - filled);
    const totalWarning = Math.round(breakdown.totalPercent) === 100 || subject.normalizeCategories
      ? ""
      : `<p class="category-progress-note warning">Die Kategorien ergeben ${Math.round(breakdown.totalPercent)}%. Der Endschnitt kann unvollständig wirken, bis du 100% erreichst oder automatisch normalisierst.</p>`;
    return `
      <section class="category-breakdown-card">
        <div class="sleek-section-title">
          <h2>Kategorie-Breakdown</h2>
          <span>${Number.isFinite(avg) ? avg.toFixed(2) : "–"}</span>
        </div>
        <p class="category-progress-note">${filled}% der Bewertung ist mit Noten gefüllt${open ? ` · Noch ${open}% offen` : ""}</p>
        ${totalWarning}
        ${breakdown.rows.map((row) => `
          <article class="category-breakdown-row">
            <div>
              <strong>${C.escapeHtml(row.name)}</strong>
              <small>${Number(row.percentage || 0)}% · ${row.grades.length ? `${row.grades.length} Note${row.grades.length === 1 ? "" : "n"}` : "Noch keine Noten"}</small>
            </div>
            <span>${Number.isFinite(row.average) ? row.average.toFixed(2) : "–"}</span>
            <em>${Number.isFinite(row.contribution) ? row.contribution.toFixed(2) : "–"}</em>
          </article>
        `).join("")}
      </section>
    `;
  };

  const renderWhatIfCard = (subject) => {
    const result = state.ui.whatIfResult?.subjectId === subject.id ? state.ui.whatIfResult : null;
    const current = subjectAverage(subject);
    const change = result && Number.isFinite(result.average) && Number.isFinite(current) ? result.average - current : null;
    return `
      <section class="what-if-card">
        <div class="sleek-section-title"><h2>Zur Wunschnote testen</h2><span>Was wäre, wenn</span></div>
        <form class="what-if-form" id="what-if-form">
          <label>Titel <small>optional</small><input name="title" /></label>
          <label>Note<input name="value" required type="number" ${gradeInputAttrs()} /></label>
          ${subject.gradeMode === "category" ? `
            <label>Kategorie<select name="categoryId">${(subject.gradeCategories || []).map((category) => `<option value="${category.id}">${C.escapeHtml(category.name)}</option>`).join("")}</select></label>
          ` : ""}
          ${subject.gradeMode !== "simple" ? `<label>Gewichtung <small>x oder %</small><input name="weight" type="text" inputmode="decimal" value="1" /></label>` : ""}
          <button class="secondary-button" type="submit">Ausrechnen</button>
        </form>
        ${result ? `
          <div class="what-if-result">
            <article><span>Aktuell</span><strong>${Number.isFinite(current) ? current.toFixed(2) : "–"}</strong></article>
            <article><span>Vorschau</span><strong>${Number.isFinite(result.average) ? result.average.toFixed(2) : "–"}</strong></article>
            <article><span>Änderung</span><strong>${Number.isFinite(change) ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}` : "–"}</strong></article>
            <button class="primary-button save-what-if-grade" type="button">Als Note speichern</button>
          </div>
        ` : ""}
      </section>
    `;
  };

  const renderGradeSubjectDetail = (subject) => {
    const avg = subjectDisplayAverage(subject);
    const points = plusPointsFor(subject);
    const target = subject.targetGrade ? Number(subject.targetGrade).toFixed(2) : "–";
    const targetOptions = defaultTargetOptions(subject);
    const needed = requiredNextGrade(subject, targetOptions);
    const neededText = Number.isFinite(needed)
      ? `ca. ${needed.toFixed(2)}`
      : (subject.targetGrade ? "Mit einer einzelnen Note wahrscheinlich nicht erreichbar" : "Zielnote setzen");
    const editingGrade = state.ui.editingGradeId ? gradeEntryById(subject, state.ui.editingGradeId) : null;
    const gradeFormTitle = editingGrade?.title || "";
    const gradeFormDate = editingGrade?.date || todayIso();
    const gradeFormValue = Number.isFinite(gradeValue(editingGrade || {})) ? gradeValue(editingGrade).toFixed(2) : "";
    const gradeFormWeight = editingGrade ? gradeWeight(editingGrade) : 1;
    const gradeFormCategory = editingGrade?.categoryId || subject.gradeCategories?.[0]?.id || "";
    return `
      <section class="grade-page">
        <div class="grade-page-header folder-detail-header">
          <button class="icon-button back-arrow-button back-to-subjects" type="button" title="Zurück" aria-label="Zurück zu den Fächern">&#8249;</button>
          <h1 ${fitTitleStyle(subject.name)}>${C.escapeHtml(subject.name)}</h1>
          <button class="round-add" id="toggle-grade-entry-form" type="button" aria-label="Prüfung hinzufügen">+</button>
        </div>
        <div class="subject-score-row">
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article class="target-grade-card"><span>Wunschnote</span><button class="target-grade-button" type="button">${C.escapeHtml(target)}</button></article>
          <article><span>Pluspunkte</span><strong class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</strong></article>
        </div>
        <div class="grade-coach-row">
          <article><span>Welche Note brauche ich?</span><strong>${C.escapeHtml(neededText)}</strong></article>
        </div>
        ${state.ui.showTargetGradeForm ? `
          <form class="target-grade-form show" id="target-grade-form">
            <label>Wunschnote<input name="targetGrade" type="number" ${gradeInputAttrs()} value="${C.escapeHtml(subject.targetGrade || "")}" /></label>
            ${renderTargetModeFields(subject)}
            <button class="primary-button" type="submit">Wunschnote speichern</button>
          </form>
          ${renderWhatIfCard(subject)}
        ` : ""}
        <form class="grade-entry-form ${state.ui.showGradeEntryForm ? "show" : ""}" id="grade-form">
          <input type="hidden" name="gradeId" value="${C.escapeHtml(editingGrade?.id || "")}" />
          <label>Name <small>optional</small><input name="title" value="${C.escapeHtml(gradeFormTitle)}" /></label>
          <label>Datum<input name="date" type="date" value="${C.escapeHtml(gradeFormDate)}" /></label>
          <label>Note<input name="value" type="number" ${gradeInputAttrs()} value="${C.escapeHtml(gradeFormValue)}" /></label>
          ${renderGradeModeFields(subject, { weight: gradeFormWeight, categoryId: gradeFormCategory, includeFolderToggle: !editingGrade })}
          <button class="primary-button" type="submit">${editingGrade ? "Prüfung aktualisieren" : "Prüfung speichern"}</button>
        </form>
        ${state.ui.showGradeEntryForm ? "" : `
        <section class="grade-entry-list">
          ${subject.grades.map(renderGradeEntryRow).join("") || `<div class="empty-grade-list">Drücke +, um die erste Prüfung einzutragen.</div>`}
        </section>`}
      </section>
    `;
  };

  const renderPartialGroupDetail = (subject, group) => {
    const avg = group.partialGrades.length ? average(group.partialGrades) : null;
    return `
      <section class="grade-page">
        <div class="grade-page-header folder-detail-header">
          <button class="icon-button back-arrow-button back-to-subject-detail" type="button" title="Zurück" aria-label="Zurück zum Fach">&#8249;</button>
          <h1 ${fitTitleStyle(group.title)}>${C.escapeHtml(group.title)}</h1>
          <button class="round-add" id="toggle-partial-entry-form" type="button" aria-label="Teilprüfung hinzufügen">+</button>
        </div>
        <div class="subject-score-row partial-score-row">
          <article><span>Fach</span><strong>${C.escapeHtml(subject.name)}</strong></article>
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article class="partial-weight-card">
            <span>Zählt</span>
            <button class="partial-weight-button" type="button" aria-label="Gewichtung ändern">${formatWeightPercentLabel(gradeWeight(group))}</button>
          </article>
        </div>
        ${state.ui.showPartialWeightForm ? `
          <form class="grade-entry-form show partial-weight-form" id="partial-weight-form">
            <label>Gewichtung <small>x oder %</small>
              <input name="weight" type="text" inputmode="decimal" value="${C.escapeHtml(formatWeightInput(gradeWeight(group)))}" />
            </label>
            <button class="primary-button" type="submit">Gewichtung speichern</button>
          </form>
        ` : ""}
        <form class="grade-entry-form ${state.ui.showPartialEntryForm ? "show" : ""}" id="partial-grade-form">
          <label>Name <small>optional</small><input name="title" /></label>
          <label>Datum<input name="date" type="date" value="${todayIso()}" /></label>
          <label>Note<input name="value" required type="number" ${gradeInputAttrs()} /></label>
          <button class="primary-button" type="submit">Teilprüfung speichern</button>
        </form>
        ${state.ui.showPartialEntryForm ? "" : `<section class="grade-entry-list">
          ${group.partialGrades.map((grade) => `
            <article class="grade-swipe-row">
              <div class="grade-row-main static">
                <span class="grade-row-icon">${C.icon("chart")}</span>
                <div><strong>${C.escapeHtml(grade.title)}</strong><small>${grade.date ? formatDate(grade.date) : "Ohne Datum"} · Gewicht 1</small></div>
                <em>${Number(grade.value).toFixed(2)}</em>
              </div>
              ${renderGradeActions(grade.id, group.id)}
            </article>
          `).join("") || `<div class="empty-grade-list">Drücke +, um die erste Teilprüfung einzutragen.</div>`}
        </section>`}
      </section>
    `;
  };

  const createAutoPlan = ({ subject, title, date, minutes, topics = "" }) => {
    const end = dateObject(date);
    const start = dateObject(todayIso());
    const dayDistance = Math.max(1, Math.round((end - start) / 86400000));
    const count = Math.min(6, dayDistance + 1);
    const topicItems = topicList(topics);
    return Array.from({ length: count }, (_, index) => {
      const stepDate = new Date(start);
      const offset = count === 1 ? 0 : Math.round((dayDistance * index) / Math.max(1, count - 1));
      stepDate.setDate(stepDate.getDate() + offset);
      const step = planSteps[index % planSteps.length];
      const topic = topicItems[index % Math.max(1, topicItems.length)] || title;
      return { id: uid("event"), subject, title: `${step}: ${topic}`, date: toIso(stepDate), minutes: Number(minutes || 25), type: step, auto: true };
    });
  };

  const renderMonthCalendar = (monthOffset = 0) => {
    const base = new Date();
    const now = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const items = calendarItems();
    const cells = [
      ...Array.from({ length: offset }, () => `<div class="calendar-cell empty"></div>`),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const iso = toIso(new Date(year, month, day));
        const dayItems = items.filter((item) => item.date === iso);
        return `<button class="calendar-cell ${iso === todayIso() ? "today" : ""} ${iso === state.ui.selectedPlannerDate ? "selected" : ""}" data-date="${iso}" type="button"><strong>${day}</strong>${dayItems.slice(0, 3).map((item) => `<span class="${item.exam ? "exam-dot" : item.homework ? "homework-dot" : ""}">${C.escapeHtml(item.subject)}</span>`).join("")}</button>`;
      })
    ];
    return `
      <article class="month-panel">
        <h3>${formatDate(toIso(new Date(year, month, 1)), { month: "long", year: "numeric" })}</h3>
        <div class="weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
        <div class="calendar-grid">${cells.join("")}</div>
      </article>
    `;
  };

  const renderCalendar = () => `<div class="calendar-month-stack">${renderMonthCalendar(state.ui.plannerMonthOffset)}</div>`;

  const renderPlanner = () => {
    const base = new Date();
    const shownMonth = toIso(new Date(base.getFullYear(), base.getMonth() + Number(state.ui.plannerMonthOffset || 0), 1));
    const selectedDate = state.ui.selectedPlannerDate || todayIso();
    const selectedItems = calendarItems().filter((item) => item.date === selectedDate);
    const agendaItems = selectedItems.length ? selectedItems : calendarItems().filter((item) => item.date >= selectedDate).slice(0, 2);
    return `
      <section class="planner-page sleek-screen">
        <div class="grade-page-header planner-page-header">
          <h1>Plan</h1>
          ${state.ui.showEventForm ? "" : `<button class="round-add planner-header-add" id="toggle-event-form" type="button" aria-label="Kalendereintrag hinzufügen">+</button>`}
        </div>
        <section class="panel calendar-only-panel ${state.ui.showEventForm ? "form-mode" : ""}">
        ${state.ui.showEventForm ? `
        <div class="form-only-header">
          <div><span>Plan</span><h2>Eintrag hinzufügen</h2></div>
          <button class="icon-button" id="toggle-event-form" type="button" title="Schließen" aria-label="Formular schließen">×</button>
        </div>
        ` : `<div class="sleek-month-selector">
          <button class="planner-prev-month" type="button" title="Vorheriger Monat" aria-label="Vorheriger Monat">&#8249;</button>
          <strong>${formatDate(shownMonth, { month: "long", year: "numeric" })}</strong>
          <button class="planner-next-month" type="button" title="Nächster Monat" aria-label="Nächster Monat">&#8250;</button>
        </div>`}
      ${state.ui.showEventForm ? "" : renderCalendar()}
      <form id="event-form" class="calendar-entry-form ${state.ui.showEventForm ? "show" : ""}">
        <label>Eintrag<select name="kind"><option value="event">Termin</option><option value="exam">Prüfung</option><option value="homework">Hausaufgabe</option></select></label>
        <label>Fach<input name="subject" required placeholder="z. B. Französisch" /></label>
        <label>Titel<input name="title" required placeholder="z. B. UNIT 1" /></label>
        <label>Datum<input name="date" required type="date" value="${C.escapeHtml(state.ui.selectedPlannerDate || todayIso())}" /></label>
        <label class="toggle-field"><input name="autoPlan" type="checkbox" value="on" /><span>Automatische Lerntermine</span><small>Lynxly trägt Wiederholen, Üben, Karteikarten und Mini-Test bis zum Datum ein.</small></label>
        <button class="primary-button" type="submit">Eintragen</button>
      </form>
      </section>
      ${state.ui.showEventForm ? "" : `
        <section class="planner-agenda">
          <div class="sleek-section-title"><h2>${formatDate(selectedDate, { weekday: "long", day: "numeric", month: "short" })}</h2><span>${selectedDate === todayIso() ? "Heute" : (selectedItems.length ? `${selectedItems.length} Eintrag${selectedItems.length === 1 ? "" : "e"}` : "Keine Einträge")}</span></div>
          <div class="planner-agenda-list">
            ${agendaItems.map((item) => `<article class="agenda-card ${item.exam ? "exam" : item.homework ? "homework" : ""}"><div><strong>${C.escapeHtml(item.title)}</strong><small>${C.escapeHtml(item.subject)} · ${formatDate(item.date, { weekday: "short", day: "numeric", month: "short" })}</small></div><em>${C.escapeHtml(item.type)}</em></article>`).join("") || `<article class="agenda-card empty"><div><strong>An diesem Tag ist nichts geplant</strong><small>Drücke +, um für diesen Tag einen Termin einzutragen.</small></div></article>`}
          </div>
        </section>
      `}
      </section>
    `;
  };

  const filteredLibrary = () => {
    const query = String(state.ui.cardSearch || "").toLowerCase();
    return state.cardLibrary.filter((pack) => [pack.title, pack.subject, pack.description].join(" ").toLowerCase().includes(query));
  };

  const personalCards = () => state.flashcards.filter((card) => card.source !== "database");
  const selectedLibraryPack = () => state.cardLibrary.find((pack) => pack.id === state.ui.selectedCardPackId) || null;
  const recommendedPack = () => selectedLibraryPack() || filteredLibrary()[0] || state.cardLibrary[0];
  const personalDecks = () => {
    const groups = new Map();
    personalCards().forEach((card) => {
      const title = card.title || card.subject || "Eigene Karten";
      const current = groups.get(title) || { title, subject: card.subject || title, cards: [] };
      current.cards.push(card);
      groups.set(title, current);
    });
    return [...groups.values()].sort((a, b) => b.cards.length - a.cards.length);
  };
  const currentDeckMeta = () => {
    if (state.ui.cardStudyMode === "due") return { id: "due", title: "Heute fällig", subtitle: "Fällige Wiederholung" };
    if (state.ui.cardStudyMode === "personal") {
      const title = state.ui.selectedCardSubject || "Persönliche Karten";
      return { id: `personal:${title}`, title, subtitle: "Eigener Stapel" };
    }
    const pack = recommendedPack();
    return { id: `recommended:${pack?.id || "cards"}`, title: pack?.title || "Empfohlener Stapel", subtitle: pack?.subject || "Lynxly Datenbank" };
  };
  const baseStudyCards = () => {
    if (state.ui.cardStudyMode === "due") return dueCards();
    if (state.ui.cardStudyMode === "personal") {
      return state.flashcards
        .filter((card) => card.source !== "database")
        .filter((card) => !state.ui.selectedCardSubject || (card.title || card.subject) === state.ui.selectedCardSubject || card.subject === state.ui.selectedCardSubject)
        .map((card) => ({ ...card, ...cardScheduleFor(card.id) }));
    }
    const pack = recommendedPack();
    if (!pack) return [];
    const limit = isPlus() ? pack.cards.length : Math.min(pack.freeCount || pack.cards.length, pack.cards.length);
    return pack.cards.slice(0, limit).map((card, index) => ({
      id: `${pack.id}-${index}`,
      subject: pack.subject,
      title: pack.title,
      packId: pack.id,
      source: "database",
      published: true,
      ...card,
      ...cardScheduleFor(`${pack.id}-${index}`)
    }));
  };
  const activeStudyCards = () => {
    const session = state.cardStudySession || {};
    if ((session.active || session.completed) && Array.isArray(session.cardIds) && session.cardIds.length) {
      const all = new Map(allCardsForReview().map((card) => [card.id, card]));
      return session.cardIds.map((id) => all.get(id)).filter(Boolean);
    }
    return baseStudyCards();
  };
  const learningModeOption = (id) => learningModeOptions.find((option) => option.id === id) || learningModeOptions[0];
  const shuffleList = (items) => [...items].sort(() => Math.random() - 0.5);
  const normalizeAnswerText = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:"'’`´()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const answerVariants = (answer) => {
    const raw = String(answer || "");
    const variants = raw
      .split(/\/|;|,|\boder\b|\bor\b|\|/i)
      .map(normalizeAnswerText)
      .filter(Boolean);
    return [...new Set([normalizeAnswerText(raw), ...variants].filter(Boolean))];
  };
  const answerMatches = (input, answer) => {
    const clean = normalizeAnswerText(input);
    if (!clean) return false;
    return answerVariants(answer).some((variant) => clean === variant);
  };
  const setCardReviewOnly = (card, rating) => {
    if (!card?.id) return;
    const wasDue = cardIsDue(card);
    rememberCardDueToday(card, wasDue);
    state.cardSchedule[card.id] = { rating, nextReview: addDays(todayIso(), reviewOffsetForRating(rating)), lastReviewed: todayIso() };
    state.cardReviewStatus = state.cardReviewStatus || {};
    state.cardReviewStatus[card.id] = rating;
    const ownedCard = state.flashcards.find((item) => item.id === card.id);
    if (ownedCard) ownedCard.reviewCount = Number(ownedCard.reviewCount || 0) + 1;
  };
  const modeRewardKey = (deckId, mode) => `${deckId || "deck"}:${mode || "mode"}`;
  const deckModeRewardToday = (deckId, mode) => {
    const reward = state.deckModeRewards?.[modeRewardKey(deckId, mode)];
    return reward?.date === todayIso() ? reward : null;
  };
  const awardDeckModeReward = (deckId, mode, fullXp, reason, reducedXp = 10) => {
    ensureGamification();
    state.deckModeRewards = state.deckModeRewards && typeof state.deckModeRewards === "object" && !Array.isArray(state.deckModeRewards) ? state.deckModeRewards : {};
    const key = modeRewardKey(deckId, mode);
    const previous = deckModeRewardToday(deckId, mode);
    const xp = previous ? Math.max(0, Number(reducedXp || 0)) : Math.max(0, Number(fullXp || 0));
    const cleanReason = previous ? "Übungsbonus" : reason;
    const count = previous ? Number(previous.count || 1) + 1 : 1;
    state.deckModeRewards[key] = { date: todayIso(), count, xp, fullXp: Number(fullXp || 0), mode };
    if (xp > 0) {
      awardXp(xp, cleanReason);
      state.dailyDeckStats.deckXp = Number(state.dailyDeckStats.deckXp || 0) + xp;
    }
    return { xp, repeated: Boolean(previous), reason: cleanReason };
  };
  const awardModeCardXp = (card, amount, reason) => {
    if (!card?.id) return 0;
    ensureGamification();
    recordCardReviewAction(1);
    const today = todayIso();
    const previous = state.cardXpHistory?.[card.id];
    if (previous?.date === today && Number(previous.xp || 0) > 0) return 0;
    const xp = Math.max(0, Number(amount || 0));
    state.cardXpHistory[card.id] = { ...previous, date: today, xp, due: Boolean(previous?.due), mode: state.cardStudySession?.mode || "cards" };
    if (xp > 0) {
      awardXp(xp, reason);
      state.dailyDeckStats.cardXp = Number(state.dailyDeckStats.cardXp || 0) + xp;
    }
    return xp;
  };
  const cardsForLearningMode = (modeId) => {
    const option = learningModeOption(modeId);
    const cards = baseStudyCards();
    const due = cards.filter(cardIsDue);
    const early = cards.filter((card) => !cardIsDue(card));
    const ordered = [...due, ...early];
    const limit = modeId === "match" ? Math.min(8, Math.max(2, Math.min(option.target, ordered.length || option.target))) : option.target;
    return ordered.slice(0, Math.min(limit, ordered.length));
  };
  const choiceOptionsForCard = (card) => {
    const sessionCards = activeStudyCards().filter((item) => item.id !== card.id);
    const sameDeck = sessionCards
      .filter((item) => item.packId && card.packId ? item.packId === card.packId : (item.title || item.subject) === (card.title || card.subject));
    const sameSubject = sessionCards.filter((item) => item.subject === card.subject);
    const pool = [...sameDeck, ...sameSubject]
      .map((item) => item.answer)
      .filter(Boolean);
    const fallback = plausibleDistractors(card.answer, card.subject);
    const options = [card.answer, ...pool, ...fallback]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item, index, list) => list.findIndex((value) => normalizeAnswerText(value) === normalizeAnswerText(item)) === index)
      .slice(0, 4);
    while (options.length < 4) options.push(`Option ${options.length + 1}`);
    return shuffleList(options);
  };
  const plausibleDistractors = (answer, subject = "") => {
    const clean = String(answer || "").trim();
    const numeric = clean.match(/-?\d+(?:[.,]\d+)?/);
    if (numeric) {
      const value = Number(numeric[0].replace(",", "."));
      if (Number.isFinite(value)) return [value + 1, Math.max(0, value - 1), value * 2].map((item) => String(item).replace(".", ","));
    }
    const science = /bio|chem|phys|mathe|geograph|geschichte|natur|technik|wissenschaft/i.test(String(subject || ""));
    if (science) return ["ähnlicher Fachbegriff", "verwandter Vorgang", "andere Ursache", "anderes Merkmal"];
    return ["ähnliche Bedeutung", "verwandter Begriff", "andere Lösung", "ähnliche Antwort"];
  };
  const languageNameFromText = (text) => {
    const value = String(text || "").toLowerCase();
    if (/franz|french|français|francais/.test(value)) return "Französisch";
    if (/engl|english/.test(value)) return "Englisch";
    if (/latein|latin/.test(value)) return "Latein";
    if (/ital|italien/.test(value)) return "Italienisch";
    if (/span|españ|espan/.test(value)) return "Spanisch";
    if (/deutsch|german/.test(value)) return "Deutsch";
    return "";
  };
  const deckLanguageLabels = (meta, cards) => {
    const joined = [meta?.title, meta?.subtitle, cards?.[0]?.subject, cards?.[0]?.title].join(" ");
    return {
      front: languageNameFromText(joined) || "Fremdsprache",
      back: state.settings.language?.startsWith("de") ? "Deutsch" : "deiner Sprache"
    };
  };
  const testPromptFor = (card, question = {}) => {
    const direction = question.direction || "front";
    return direction === "back"
      ? { prompt: card.answer, expected: card.question, from: "Antwort", to: "Frage" }
      : { prompt: card.question, expected: card.answer, from: "Frage", to: "Antwort" };
  };
  const choiceOptionsForQuestion = (card, question = {}, sourceCards = null) => {
    const expected = testPromptFor(card, question).expected;
    const sessionCards = (Array.isArray(sourceCards) ? sourceCards : activeStudyCards()).filter((item) => item.id !== card.id);
    const sameDeck = sessionCards
      .filter((item) => item.packId && card.packId ? item.packId === card.packId : (item.title || item.subject) === (card.title || card.subject));
    const sameSubject = sessionCards.filter((item) => item.subject === card.subject);
    const pool = [...sameDeck, ...sameSubject]
      .map((item) => question.direction === "back" ? item.question : item.answer)
      .filter(Boolean);
    const options = [expected, ...pool, ...plausibleDistractors(expected, card.subject)]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item, index, list) => list.findIndex((value) => normalizeAnswerText(value) === normalizeAnswerText(item)) === index)
      .slice(0, 4);
    while (options.length < 4) options.push(`Option ${options.length + 1}`);
    return shuffleList(options);
  };
  const buildTestQuestions = (cards, setup = {}) => {
    const useMixed = setup.mixed || (setup.write && setup.choice);
    const useWrite = setup.write || (!setup.write && !setup.choice);
    const useChoice = setup.choice || (!setup.write && !setup.choice);
    const directions = setup.direction === "both" ? ["front", "back"] : [setup.direction || "front"];
    return cards.map((card, index) => {
      const direction = directions[index % directions.length];
      const type = useMixed
        ? (index % 2 === 0 ? "write" : "choice")
        : (useChoice && !useWrite ? "choice" : "write");
      const question = { cardId: card.id, type, direction, options: [] };
      question.options = type === "choice" ? choiceOptionsForQuestion(card, question, cards) : [];
      return question;
    });
  };
  const buildLearnQuestions = (cards) => {
    const choiceCount = Math.max(1, Math.ceil(cards.length / 2));
    return cards.map((card, index) => {
      const question = { cardId: card.id, type: index < choiceCount ? "choice" : "write", direction: "front", options: [] };
      question.options = question.type === "choice" ? choiceOptionsForQuestion(card, question, cards) : [];
      return question;
    });
  };
  const matchTileId = (side, id) => `${side}:${id}`;
  const parseMatchTileId = (tileId = "") => {
    const [side, ...rest] = String(tileId).split(":");
    return { side, pairId: rest.join(":") };
  };
  const matchElapsedSeconds = (session = state.cardStudySession || {}) => {
    if (!session.matchTimed) return 0;
    const start = Date.parse(session.matchStartedAt || "");
    if (!Number.isFinite(start)) return Number(session.matchPenaltySeconds || 0);
    const end = session.matchCompletedAt ? Date.parse(session.matchCompletedAt) : Date.now();
    const base = Math.max(0, Math.floor((end - start) / 1000));
    return base + Number(session.matchPenaltySeconds || 0);
  };
  const formatStopwatch = (seconds) => {
    const total = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  const resetCardStudySession = () => {
    state.cardStudySession = defaultCardStudySession();
    state.activeModeSession = {};
    state.learningMode = "";
    state.ui.cardStudyIndex = 0;
  };
  const startDeckSession = (modeId) => {
    const normalizedModeId = modeId === "write" || modeId === "choice" ? "learn" : modeId;
    const option = learningModeOption(normalizedModeId);
    const meta = currentDeckMeta();
    const cards = cardsForLearningMode(option.id);
    if (!cards.length) return;
    const matchCards = option.id === "match" ? cards.slice(0, Math.min(8, Math.max(2, cards.length))) : [];
    const allDeckDueIds = baseStudyCards().filter(cardIsDue).map((card) => card.id);
    const matchTileOrder = option.id === "match"
      ? shuffleList(matchCards.flatMap((card) => [matchTileId("q", card.id), matchTileId("a", card.id)]))
      : [];
    const session = {
      choosing: false,
      active: true,
      completed: false,
      mode: option.id,
      testStarted: option.id !== "test",
      testSetup: { write: true, choice: true, mixed: true, direction: "front" },
      deckId: meta.id,
      deckTitle: meta.title,
      optionId: option.id,
      target: option.id === "match" ? matchCards.length : cards.length,
      cardIds: cards.map((card) => card.id),
      dueCardIds: allDeckDueIds,
      reviewedIds: [],
      ratings: [],
      answers: [],
      testQuestions: option.id === "learn" ? buildLearnQuestions(cards) : [],
      matchPairs: matchCards.map((card) => ({ id: card.id, question: card.question, answer: card.answer, subject: card.subject })),
      promptOrder: shuffleList(matchCards.map((card) => card.id)),
      answerOrder: shuffleList(matchCards.map((card) => card.id)),
      matchTileOrder,
      matchedIds: [],
      selectedPromptId: "",
      selectedAnswerId: "",
      selectedMatchTileId: "",
      currentAnswer: "",
      selectedChoice: "",
      awaitingNext: false,
      lastResult: null,
      lastWrongTileIds: [],
      correct: 0,
      wrong: 0,
      xpEarned: 0,
      cardXp: 0,
      deckXp: 0,
      comboXp: 0,
      bonusXp: 0,
      combo: 0,
      maxCombo: 0,
      comboAwards: [],
      mistakesCreated: 0,
      perfect: true,
      wrongAttempts: 0,
      matchPenaltySeconds: 0,
      matchStartedAt: option.id === "match" && meta.id !== "due" ? new Date().toISOString() : "",
      matchCompletedAt: "",
      matchTimed: option.id === "match" && meta.id !== "due",
      startedAt: new Date().toISOString(),
      summary: null
    };
    state.learningMode = option.id;
    state.cardStudySession = session;
    state.activeModeSession = { ...session };
    state.ui.cardStudyIndex = 0;
  };
  const completeWeeklyDeckChallenge = () => {
    const challenge = state.weeklyDeckChallenge;
    if (!challenge || challenge.rewarded) return 0;
    challenge.progress = Math.min(Number(challenge.target || 5), Number(challenge.progress || 0) + 1);
    if (challenge.progress >= Number(challenge.target || 5)) {
      challenge.rewarded = true;
      const reward = Number(challenge.rewardXp || 150);
      awardXp(reward, "Wochenchallenge geschafft");
      return reward;
    }
    return 0;
  };
  const completeDeckSession = () => {
    const session = { ...state.cardStudySession };
    if (!session.active || session.completed) return;
    if (session.mode === "match" && session.matchTimed && !session.matchCompletedAt) {
      session.matchCompletedAt = new Date().toISOString();
    }
    const mode = learningModeOption(session.mode);
    const answers = Array.isArray(session.answers) ? session.answers : [];
    const reviewedIds = Array.isArray(session.reviewedIds) ? session.reviewedIds : [];
    const processed = session.mode === "match"
      ? Number(session.matchedIds?.length || 0)
      : (session.mode === "cards" ? reviewedIds.length : answers.length);
    const correct = session.mode === "cards"
      ? Number(session.ratings?.filter((rating) => rating === "good" || rating === "easy").length || 0)
      : (session.mode === "match" ? Number(session.matchedIds?.length || 0) : answers.filter((answer) => answer.correct).length);
    const wrong = session.mode === "match"
      ? Number(session.wrongAttempts || 0)
      : (session.mode === "cards" ? Number(session.ratings?.filter((rating) => rating === "again" || rating === "hard").length || 0) : answers.filter((answer) => !answer.correct).length);
    let xpEarned = Number(session.xpEarned || 0);
    let deckXp = 0;
    let bonusXp = Number(session.bonusXp || 0);
    let repeatedDeck = false;
    const scorePercent = processed ? Math.round((correct / processed) * 100) : 0;
    if (session.mode === "test" || session.mode === "learn") {
      const scoreBonus = scorePercent >= 80 ? 20 : 0;
      const perfectBonus = scorePercent === 100 && processed > 0 ? 40 : 0;
      const reward = awardDeckModeReward(session.deckId, session.mode, 50 + scoreBonus + perfectBonus, `${mode.title} abgeschlossen`, 10);
      repeatedDeck = reward.repeated;
      xpEarned += reward.xp;
      deckXp += reward.xp;
      bonusXp += reward.repeated ? 0 : scoreBonus + perfectBonus;
      state.testResults = [{ id: uid("test"), deckId: session.deckId, deckTitle: session.deckTitle, modeId: session.mode, scorePercent, correct, wrong, xp: reward.xp, date: todayIso() }, ...(state.testResults || [])].slice(0, 80);
      recordCardReviewAction(Math.max(1, processed));
    }
    if (session.mode === "match") {
      const perfectBonus = Number(session.wrongAttempts || 0) === 0 ? 15 : 0;
      const reward = awardDeckModeReward(session.deckId, session.mode, 30 + perfectBonus, "Match Sprint", 8);
      repeatedDeck = reward.repeated;
      xpEarned += reward.xp;
      deckXp += reward.xp;
      bonusXp += reward.repeated ? 0 : perfectBonus;
      state.matchResults = [{ id: uid("match"), deckId: session.deckId, deckTitle: session.deckTitle, pairs: processed, mistakes: Number(session.wrongAttempts || 0), timeSeconds: matchElapsedSeconds(session), xp: reward.xp, date: todayIso() }, ...(state.matchResults || [])].slice(0, 80);
      recordCardReviewAction(Math.max(1, processed));
    }
    const challengeXp = repeatedDeck ? 0 : completeWeeklyDeckChallenge();
    xpEarned += challengeXp;
    bonusXp += challengeXp;
    const existing = state.deckSessions[session.deckId];
    const currentCount = existing?.date === todayIso() ? Number(existing.count || 0) : 0;
    state.deckSessions[session.deckId] = { date: todayIso(), count: currentCount + 1 };
    state.dailyDeckStats.sessionsCompleted = Number(state.dailyDeckStats.sessionsCompleted || 0) + 1;
    if (!repeatedDeck) state.dailyDeckStats.fullSessions = Number(state.dailyDeckStats.fullSessions || 0) + 1;
    const nextReviewDate = session.cardIds
      .map((id) => state.cardSchedule[id]?.nextReview)
      .filter(Boolean)
      .sort()[0] || "";
    const completedAt = new Date().toISOString();
    const summary = {
      mode: mode.title,
      modeId: session.mode,
      cardsReviewed: processed,
      correct,
      wrong,
      scorePercent,
      xpEarned,
      deckXp,
      cardXp: Number(session.cardXp || 0),
      comboXp: Number(session.comboXp || 0),
      bonusXp,
      challengeXp,
      mistakesCreated: Number(session.mistakesCreated || 0),
      matchTimeSeconds: session.mode === "match" ? matchElapsedSeconds(session) : null,
      matchTimed: Boolean(session.matchTimed),
      nextReviewDate,
      allDueFinished: session.dueCardIds?.length > 0 && session.dueCardIds.every((id) => reviewedIds.includes(id)),
      perfect: wrong === 0,
      repeatedDeck,
      recommendation: wrong > 0 ? "Fehler wiederholen" : "Noch eine Runde"
    };
    state.modeHistory = [
      { id: uid("mode"), deckId: session.deckId, deckTitle: session.deckTitle, modeId: session.mode, completedAt, ...summary },
      ...(state.modeHistory || [])
    ].slice(0, 120);
    state.deckSessionHistory = [
      { id: uid("deck-session"), deckId: session.deckId, deckTitle: session.deckTitle, optionId: session.optionId, completedAt, ...summary },
      ...(state.deckSessionHistory || [])
    ].slice(0, 80);
    state.cardStudySession = {
      ...state.cardStudySession,
      ...session,
      active: false,
      completed: true,
      deckXp,
      bonusXp,
      xpEarned,
      summary,
      completedAt
    };
    state.activeModeSession = { ...state.cardStudySession };
    state.ui.cardStudyIndex = 0;
    evaluateBadges();
    checkClassBonus();
  };
  const rateDeckSessionCard = (card, rating) => {
    const session = { ...state.cardStudySession };
    if (!session.active || !card || session.mode !== "cards") return;
    const wasDue = cardIsDue(card);
    scheduleCardReview(card, rating, { rewardCard: false, mistakeReward: false });
    const cardXp = awardCardReviewXp(card, wasDue);
    let combo = Number(session.combo || 0);
    let maxCombo = Number(session.maxCombo || 0);
    let comboXp = Number(session.comboXp || 0);
    let xpEarned = Number(session.xpEarned || 0) + cardXp;
    const comboAwards = Array.isArray(session.comboAwards) ? [...session.comboAwards] : [];
    let perfect = session.perfect !== false;
    if (rating === "again") {
      combo = 0;
      perfect = false;
    } else if (rating === "good" || rating === "easy") {
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      const threshold = [10, 5, 3].find((value) => combo >= value && !comboAwards.includes(value));
      if (threshold) {
        const reward = comboRewards[threshold] || 0;
        comboAwards.push(threshold);
        if (reward > 0) {
          awardXp(reward, "Combo");
          comboXp += reward;
          xpEarned += reward;
        }
      }
    }
    const reviewedIds = [...new Set([...(session.reviewedIds || []), card.id])];
    const ratings = [...(session.ratings || []), rating];
    const answers = [...(session.answers || [])];
    if (rating === "again" || rating === "hard") {
      answers.push({
        id: uid("answer"),
        cardId: card.id,
        subject: card.subject,
        question: card.question,
        correctAnswer: card.answer,
        userAnswer: rating === "again" ? "Nicht gewusst" : "Unsicher",
        correct: false,
        xp: cardXp,
        type: "cards",
        savedMistake: false
      });
    }
    state.cardStudySession = {
      ...state.cardStudySession,
      ...session,
      reviewedIds,
      ratings,
      answers,
      xpEarned,
      cardXp: Number(session.cardXp || 0) + cardXp,
      comboXp,
      combo,
      maxCombo,
      comboAwards,
      perfect
    };
    state.activeModeSession = { ...state.cardStudySession };
    if (reviewedIds.length >= Number(session.target || session.cardIds?.length || 0)) {
      completeDeckSession();
    } else {
      state.ui.cardStudyIndex = Math.min(Number(state.ui.cardStudyIndex || 0) + 1, Math.max(0, Number(session.cardIds?.length || 1) - 1));
    }
  };
  const pushModeAnswer = (answer) => {
    const session = { ...state.cardStudySession };
    const answers = [...(session.answers || []), answer];
    state.cardStudySession = {
      ...state.cardStudySession,
      ...session,
      answers,
      reviewedIds: [...new Set([...(session.reviewedIds || []), answer.cardId])],
      correct: Number(session.correct || 0) + (answer.correct ? 1 : 0),
      wrong: Number(session.wrong || 0) + (answer.correct ? 0 : 1),
      perfect: answer.correct ? session.perfect !== false : false,
      xpEarned: Number(session.xpEarned || 0) + Number(answer.xp || 0),
      cardXp: Number(session.cardXp || 0) + Number(answer.xp || 0),
      awaitingNext: true,
      lastResult: answer
    };
    state.activeModeSession = { ...state.cardStudySession };
  };
  const answerCurrentCard = (rawAnswer) => {
    const session = state.cardStudySession || {};
    const cards = activeStudyCards();
    const index = Math.min(Math.max(0, Number(state.ui.cardStudyIndex || 0)), Math.max(0, cards.length - 1));
    const card = cards[index];
    if (!session.active || !card || session.awaitingNext) return;
    const correct = answerMatches(rawAnswer, card.answer);
    setCardReviewOnly(card, correct ? "good" : "again");
    const xp = correct ? awardModeCardXp(card, 8, "Richtig geschrieben") : 0;
    if (!correct) recordCardReviewAction(1);
    pushModeAnswer({
      id: uid("answer"),
      cardId: card.id,
      subject: card.subject,
      question: card.question,
      correctAnswer: card.answer,
      userAnswer: rawAnswer,
      correct,
      xp,
      type: "write",
      savedMistake: false
    });
  };
  const answerChoiceCard = (selected) => {
    const session = state.cardStudySession || {};
    const cards = activeStudyCards();
    const index = Math.min(Math.max(0, Number(state.ui.cardStudyIndex || 0)), Math.max(0, cards.length - 1));
    const card = cards[index];
    if (!session.active || !card || session.awaitingNext) return;
    const correct = normalizeAnswerText(selected) === normalizeAnswerText(card.answer);
    setCardReviewOnly(card, correct ? "good" : "again");
    const xp = correct ? awardModeCardXp(card, 4, "Choice korrekt") : 0;
    if (!correct) recordCardReviewAction(1);
    pushModeAnswer({
      id: uid("answer"),
      cardId: card.id,
      subject: card.subject,
      question: card.question,
      correctAnswer: card.answer,
      userAnswer: selected,
      correct,
      xp,
      type: "choice",
      savedMistake: false
    });
  };
  const answerTestQuestion = (value) => {
    const session = state.cardStudySession || {};
    const cards = activeStudyCards();
    const index = Math.min(Math.max(0, Number(state.ui.cardStudyIndex || 0)), Math.max(0, cards.length - 1));
    const card = cards[index];
    const question = session.testQuestions?.[index] || { type: "write" };
    if (!session.active || !card || session.awaitingNext) return;
    const expected = testPromptFor(card, question).expected;
    const correct = question.type === "choice" ? normalizeAnswerText(value) === normalizeAnswerText(expected) : answerMatches(value, expected);
    setCardReviewOnly(card, correct ? "good" : "again");
    pushModeAnswer({
      id: uid("answer"),
      cardId: card.id,
      subject: card.subject,
      question: testPromptFor(card, question).prompt,
      correctAnswer: expected,
      userAnswer: value,
      correct,
      xp: 0,
      type: question.type,
      savedMistake: false
    });
  };
  const startConfiguredTest = (setup = {}) => {
    const session = state.cardStudySession || {};
    const cards = activeStudyCards();
    if (!session.active || session.mode !== "test" || !cards.length) return;
    const cleanSetup = {
      write: Boolean(setup.write),
      choice: Boolean(setup.choice),
      mixed: Boolean(setup.mixed),
      direction: ["front", "back", "both"].includes(setup.direction) ? setup.direction : "front"
    };
    if (!cleanSetup.write && !cleanSetup.choice && !cleanSetup.mixed) cleanSetup.mixed = true;
    if (cleanSetup.mixed) {
      cleanSetup.write = true;
      cleanSetup.choice = true;
    }
    state.cardStudySession = {
      ...session,
      testStarted: true,
      testSetup: cleanSetup,
      testQuestions: buildTestQuestions(cards, cleanSetup),
      answers: [],
      reviewedIds: [],
      awaitingNext: false,
      lastResult: null
    };
    state.activeModeSession = { ...state.cardStudySession };
  };
  const submitFullTest = (form) => {
    const session = state.cardStudySession || {};
    const cards = activeStudyCards();
    if (!session.active || session.mode !== "test" || !session.testStarted) return;
    const data = formData(form);
    const answers = cards.map((card, index) => {
      const question = session.testQuestions?.[index] || { type: "write", direction: "front" };
      const expected = testPromptFor(card, question).expected;
      const prompt = testPromptFor(card, question).prompt;
      const value = String(data[`answer-${index}`] || "").trim();
      const correct = question.type === "choice" ? normalizeAnswerText(value) === normalizeAnswerText(expected) : answerMatches(value, expected);
      setCardReviewOnly(card, correct ? "good" : "again");
      return {
        id: uid("answer"),
        cardId: card.id,
        subject: card.subject,
        question: prompt,
        correctAnswer: expected,
        userAnswer: value || "Keine Antwort",
        correct,
        xp: 0,
        type: question.type,
        savedMistake: false
      };
    });
    state.cardStudySession = {
      ...session,
      answers,
      reviewedIds: [...new Set(cards.map((card) => card.id))],
      correct: answers.filter((answer) => answer.correct).length,
      wrong: answers.filter((answer) => !answer.correct).length,
      perfect: answers.every((answer) => answer.correct),
      awaitingNext: false,
      lastResult: null
    };
    state.activeModeSession = { ...state.cardStudySession };
    completeDeckSession();
  };
  const advanceModeSession = () => {
    const session = state.cardStudySession || {};
    const cards = activeStudyCards();
    const index = Number(state.ui.cardStudyIndex || 0);
    const answered = session.mode === "match" ? Number(session.matchedIds?.length || 0) : (session.mode === "cards" ? Number(session.reviewedIds?.length || 0) : Number(session.answers?.length || 0));
    const isLast = index >= cards.length - 1 || answered >= Number(session.target || cards.length);
    if (isLast) {
      completeDeckSession();
      return;
    }
    state.cardStudySession = {
      ...session,
      awaitingNext: false,
      lastResult: null,
      currentAnswer: "",
      selectedChoice: ""
    };
    state.activeModeSession = { ...state.cardStudySession };
    state.ui.cardStudyIndex = Math.min(index + 1, Math.max(0, cards.length - 1));
  };
  const saveModeMistake = (answerIndex) => {
    const session = { ...state.cardStudySession };
    const answers = [...(session.answers || [])];
    const answer = answers[Number(answerIndex)];
    if (!answer || answer.savedMistake || answer.correct) return;
    saveMistake({
      subject: answer.subject || "Karten",
      topic: session.deckTitle || "Karten",
      question: answer.question,
      correctAnswer: answer.correctAnswer,
      userAnswer: answer.userAnswer || "Keine Antwort",
      explanation: `Aus dem Lernmodus ${learningModeOption(session.mode).title} gespeichert.`,
      source: `${learningModeOption(session.mode).title} · Karten`
    }, { reward: true });
    answer.savedMistake = true;
    answers[Number(answerIndex)] = answer;
    const mistakesCreated = Number(session.mistakesCreated || 0) + 1;
    state.cardStudySession = {
      ...state.cardStudySession,
      ...session,
      answers,
      mistakesCreated,
      lastResult: session.lastResult?.id === answer.id ? { ...session.lastResult, savedMistake: true } : session.lastResult,
      summary: session.summary ? { ...session.summary, mistakesCreated } : session.summary
    };
    state.activeModeSession = { ...state.cardStudySession };
  };

  const renderStack = (title, subtitle, count, kind, actionText, extra = "") => `
    <button class="quizlet-large-stack" data-stack="${kind}" ${extra} type="button">
      <div class="big-card-stack"><i></i><i></i><i></i></div>
      <strong>${C.escapeHtml(title)}</strong>
      <span>${C.escapeHtml(subtitle)}</span>
      <small>${count} Karten</small>
      <em>${actionText}</em>
    </button>
  `;

  const renderStudyCard = (card) => card ? `
    <button class="study-flashcard ${C.difficultyClass(card.difficulty)}" type="button">
      <span class="flip-hint">Tippen zum Umdrehen</span>
      <div class="study-flashcard-inner">
        <div class="study-flashcard-face front">
          <small>${C.escapeHtml(card.subject)}</small>
          <h2>${C.escapeHtml(card.question)}</h2>
        </div>
        <div class="study-flashcard-face back">
          <small>Lösung</small>
          <h2>${C.escapeHtml(card.answer)}</h2>
        </div>
      </div>
    </button>
  ` : C.emptyState("Keine Karte", "Lade einen Stapel oder erstelle deine erste Karte.");
  const modeIcon = (mode) => ({
    cards: `<span class="mode-symbol mode-symbol-cards" aria-hidden="true"><i></i><i></i><b></b></span>`,
    learn: `<span class="mode-symbol mode-symbol-learn" aria-hidden="true"><i></i><b></b></span>`,
    write: `<span class="mode-symbol mode-symbol-write" aria-hidden="true"><i></i><b></b></span>`,
    choice: `<span class="mode-symbol mode-symbol-choice" aria-hidden="true"><i></i><b></b></span>`,
    test: `<span class="mode-symbol mode-symbol-test" aria-hidden="true"><i></i><b></b></span>`,
    match: `<span class="mode-symbol mode-symbol-match" aria-hidden="true"><i></i><i></i><b></b></span>`
  })[mode] || `<span class="mode-symbol mode-symbol-cards" aria-hidden="true"><i></i><i></i><b></b></span>`;

  const renderDeckSessionChoice = () => {
    const meta = currentDeckMeta();
    const deckCards = baseStudyCards();
    const dueInDeck = deckCards.filter(cardIsDue).length;
    return `
      ${C.sectionTitle("Karten", meta.title)}
      <section class="deck-session-choice card-study-view">
        <div class="study-view-header">
          <button class="secondary-button close-study-view" type="button">Zurück</button>
          <strong>${C.escapeHtml(meta.subtitle)}</strong>
        </div>
        <article class="session-progress-card">
          ${C.mascot("mascot-small")}
          <div>
            <span class="eyebrow">Lernmodus wählen</span>
            <h2>${C.escapeHtml(meta.title)}</h2>
            <p>${dueInDeck ? `${dueInDeck} Karten sind heute fällig.` : `${deckCards.length} Karten können freiwillig wiederholt werden.`} Wähle, wie du jetzt lernen willst.</p>
          </div>
        </article>
        <div class="learning-mode-grid">
          ${learningModeOptions.map((option) => {
            const cards = cardsForLearningMode(option.id);
            const reward = deckModeRewardToday(meta.id, option.id);
            const disabled = option.id === "match" ? cards.length < 2 : cards.length < 1;
            return `
              <button class="learning-mode-card start-deck-session ${disabled ? "disabled" : ""}" data-mode="${option.id}" type="button" ${disabled ? "disabled" : ""} aria-label="${option.title} starten, ${option.duration}, XP ${option.xp}">
                ${modeIcon(option.id)}
                <span>${C.escapeHtml(option.title)}</span>
                <small>${C.escapeHtml(option.duration)} · XP ${C.escapeHtml(option.xp)} · ${C.escapeHtml(option.difficulty)}</small>
                <em>${reward ? "Übungsbonus" : `${cards.length} bereit`}</em>
              </button>
            `;
          }).join("")}
        </div>
        <p class="panel-note">XP gibt es nur für echte Antworten, Bewertungen und abgeschlossene Runden. Öffnen oder Umdrehen zählt nicht.</p>
      </section>
    `;
  };
  const renderTestSetup = (cards) => {
    const meta = currentDeckMeta();
    const labels = deckLanguageLabels(meta, cards);
    return `
      <section class="test-setup-panel">
        <article class="session-progress-card">
          ${C.mascot("mascot-small")}
          <div>
            <span class="eyebrow">Test vorbereiten</span>
            <h2>${C.escapeHtml(meta.title)}</h2>
            <p>Wähle, wie Lynxly dich abfragen soll. Die Auswertung siehst du erst am Schluss.</p>
          </div>
        </article>
        <form id="test-setup-form" class="test-setup-form">
          <fieldset>
            <legend>Frage-Arten</legend>
            <label class="toggle-field"><input name="write" type="checkbox" checked /><span>Schreiben</span></label>
            <label class="toggle-field"><input name="choice" type="checkbox" checked /><span>Multiple Choice</span></label>
            <label class="toggle-field"><input name="mixed" type="checkbox" checked /><span>Gemischt</span></label>
          </fieldset>
          <fieldset>
            <legend>Abfragerichtung</legend>
            <label class="test-direction-option"><input name="direction" type="radio" value="front" checked /><span>${C.escapeHtml(labels.front)} → ${C.escapeHtml(labels.back)}</span></label>
            <label class="test-direction-option"><input name="direction" type="radio" value="back" /><span>${C.escapeHtml(labels.back)} → ${C.escapeHtml(labels.front)}</span></label>
            <label class="test-direction-option"><input name="direction" type="radio" value="both" /><span>Beide Richtungen</span></label>
          </fieldset>
          <button class="primary-button" type="submit">Test starten</button>
        </form>
      </section>
    `;
  };
  const renderTestQuestionList = (cards) => {
    const session = state.cardStudySession || {};
    return `
      <form id="test-list-form" class="test-list-form">
        ${cards.map((card, index) => {
          const question = session.testQuestions?.[index] || { type: "write", direction: "front", options: [] };
          const prompt = testPromptFor(card, question).prompt;
          return `
            <article class="test-list-question">
              <span>${index + 1}</span>
              <div>
                <strong>${C.escapeHtml(prompt)}</strong>
                <small>${question.type === "choice" ? "Multiple Choice" : "Schreiben"}</small>
                ${question.type === "choice" ? `
                  <div class="test-choice-list">
                    ${(question.options || []).map((option, optionIndex) => `
                      <label>
                        <input name="answer-${index}" type="radio" value="${C.escapeHtml(option)}" ${optionIndex === 0 ? "" : ""} />
                        <span>${C.escapeHtml(option)}</span>
                      </label>
                    `).join("")}
                  </div>
                ` : `<input name="answer-${index}" autocomplete="off" placeholder="Antwort eingeben" />`}
              </div>
            </article>
          `;
        }).join("")}
        <button class="primary-button test-submit-button" type="submit">Test abgeben</button>
      </form>
    `;
  };
  const matchClassComparison = (ownSeconds) => {
    const own = Math.max(0, Number(ownSeconds || 0));
    const demo = [
      { name: "Mia", seconds: Math.max(28, own - 8), mistakes: 1 },
      { name: "Leo", seconds: own + 5, mistakes: 2 },
      { name: "Nora", seconds: own + 14, mistakes: 3 },
      { name: "Sam", seconds: own + 22, mistakes: 4 }
    ];
    return [...demo, { name: "Du", seconds: own, mistakes: Number(state.cardStudySession?.wrongAttempts || 0), you: true }]
      .sort((a, b) => a.seconds - b.seconds)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  };
  const renderMatchTimeTable = (summary) => {
    if (!summary.matchTimed || !Number.isFinite(Number(summary.matchTimeSeconds))) return "";
    const rows = matchClassComparison(summary.matchTimeSeconds);
    return `
      <section class="match-time-results">
        <div class="sleek-section-title"><h2>Zeitvergleich</h2><span>Klasse</span></div>
        <table>
          <thead><tr><th>Rang</th><th>Name</th><th>Zeit</th><th>Fehler</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr class="${row.you ? "you" : ""}"><td>${row.rank}</td><td>${C.escapeHtml(row.name)}</td><td>${formatStopwatch(row.seconds)}</td><td>${row.mistakes}</td></tr>`).join("")}
          </tbody>
        </table>
      </section>
    `;
  };
  const renderTestResultChart = (summary) => {
    if (summary.modeId !== "test") return "";
    const correct = Number(summary.correct || 0);
    const wrong = Number(summary.wrong || 0);
    const total = Math.max(1, correct + wrong);
    const percent = Math.round((correct / total) * 100);
    return `
      <section class="test-result-chart">
        <div class="pie-chart" style="--correct:${percent}%"><strong>${percent}%</strong><span>richtig</span></div>
        <div>
          <span class="eyebrow">Test-Auswertung</span>
          <h2>${correct} richtig · ${wrong} falsch</h2>
          <p>Grün zeigt richtige Antworten, rot zeigt Fehler. Falsche Antworten kannst du unten in die Fehlerbank übernehmen.</p>
        </div>
      </section>
    `;
  };
  const renderDeckSessionSummary = () => {
    const session = state.cardStudySession || {};
    const summary = session.summary || {};
    const progress = levelProgress();
    const wrongAnswers = (session.answers || []).map((answer, index) => ({ ...answer, index })).filter((answer) => !answer.correct);
    return `
      ${C.sectionTitle("Karten", "Zusammenfassung")}
      <section class="session-summary-card card-study-view">
        <div class="study-view-header">
          <button class="secondary-button close-study-view" type="button">Zurück</button>
          <strong>${C.escapeHtml(summary.mode || session.deckTitle || "Stapel")}</strong>
        </div>
        <article class="session-progress-card celebration">
          ${C.mascot("mascot-small")}
          <div>
            <span class="eyebrow">${C.escapeHtml(session.deckTitle || "Stapel")}</span>
            <h2>${Number(summary.xpEarned || 0)} XP verdient</h2>
            <p>${summary.repeatedDeck ? "Diese Runde war heute ein reduzierter Übungsbonus." : "Dein Fortschritt wurde gespeichert."}</p>
          </div>
        </article>
        <div class="session-summary-grid">
          <article><span>Bearbeitet</span><strong>${Number(summary.cardsReviewed || 0)}</strong></article>
          <article><span>Richtig</span><strong>${Number(summary.correct || 0)}</strong></article>
          <article><span>Falsch</span><strong>${Number(summary.wrong || 0)}</strong></article>
          <article><span>Score</span><strong>${Number(summary.scorePercent || 0)}%</strong></article>
          <article><span>Karten-XP</span><strong>${Number(summary.cardXp || 0)}</strong></article>
          <article><span>Bonus-XP</span><strong>${Number(summary.bonusXp || 0)}</strong></article>
          <article><span>Fehler gespeichert</span><strong>${Number(summary.mistakesCreated || 0)}</strong></article>
        </div>
        ${renderTestResultChart(summary)}
        ${renderMatchTimeTable(summary)}
        ${wrongAnswers.length ? `<section class="wrong-answer-list"><h2>Fehler aus dieser Runde</h2>${wrongAnswers.map((answer) => `<article><strong>${C.escapeHtml(answer.question)}</strong><p>Deine Antwort: ${C.escapeHtml(answer.userAnswer || "Keine Antwort")}</p><p>Richtig: ${C.escapeHtml(answer.correctAnswer)}</p><button class="secondary-button save-mode-mistake" data-answer-index="${answer.index}" type="button" ${answer.savedMistake ? "disabled" : ""}>${answer.savedMistake ? "Gespeichert" : "In Fehlerbank speichern"}</button></article>`).join("")}</section>` : ""}
        <div class="session-summary-line">
          <span>Nächste Wiederholung</span>
          <strong>${summary.nextReviewDate ? formatDate(summary.nextReviewDate, { day: "2-digit", month: "short" }) : "Noch offen"}</strong>
        </div>
        <div class="session-summary-line">
          <span>Nächste Empfehlung</span>
          <strong>${C.escapeHtml(summary.recommendation || "Noch eine Runde")}</strong>
        </div>
        <div class="session-summary-line">
          <span>Bis ${C.escapeHtml(progress.next?.title || "Max Level")}</span>
          <strong>${progress.remaining} XP</strong>
        </div>
        ${progressBar(Number(state.xpTotal || 0) - progress.current.min, progress.end - progress.current.min, `Fortschritt bis ${progress.next ? progress.next.title : "Maximalziel"}`, "large")}
        <div class="continue-actions">
          <button class="primary-button start-more-cards" data-mode="${C.escapeHtml(session.mode || "cards")}" type="button">Nochmal lernen</button>
          <button class="secondary-button choose-other-deck" type="button">Anderen Modus wählen</button>
          <a class="secondary-button" href="#mistakes">Fehler wiederholen</a>
          <button class="secondary-button close-study-view" type="button">Zurück zur Übersicht</button>
        </div>
      </section>
    `;
  };
  const renderModeFeedback = (result, isLast) => result ? `
    <div class="mode-feedback ${result.correct ? "correct" : "wrong"}" aria-live="polite">
      <strong>${result.correct ? `Richtig! +${Number(result.xp || 0)} XP` : `Falsch. Richtige Antwort: ${C.escapeHtml(result.correctAnswer)}`}</strong>
      ${!result.correct ? `<button class="secondary-button save-mode-mistake" data-answer-index="${Math.max(0, (state.cardStudySession.answers || []).length - 1)}" type="button" ${result.savedMistake ? "disabled" : ""}>${result.savedMistake ? "In Fehlerbank gespeichert" : "In Fehlerbank speichern"}</button>` : ""}
      <button class="primary-button mode-next-card" type="button">${isLast ? "Zusammenfassung" : "Weiter"}</button>
    </div>
  ` : "";
  const renderWriteMode = (card, index, cards) => {
    const session = state.cardStudySession || {};
    const isLast = index >= cards.length - 1;
    return `
      <article class="mode-question-card">
        <small>${C.escapeHtml(card.subject)}</small>
        <h2>${C.escapeHtml(card.question)}</h2>
      </article>
      <form class="mode-answer-form" data-mode="write">
        <label>Antwort eingeben<input name="answer" autocomplete="off" ${session.awaitingNext ? "disabled" : ""} placeholder="Deine Antwort" /></label>
        <button class="primary-button" type="submit" ${session.awaitingNext ? "disabled" : ""}>Prüfen</button>
      </form>
      ${renderModeFeedback(session.lastResult, isLast)}
    `;
  };
  const renderChoiceMode = (card, index, cards) => {
    const session = state.cardStudySession || {};
    const options = session.mode === "test" || session.mode === "learn"
      ? (session.testQuestions?.[index]?.options || choiceOptionsForCard(card))
      : choiceOptionsForCard(card);
    const isLast = index >= cards.length - 1;
    return `
      <article class="mode-question-card">
        <small>${C.escapeHtml(card.subject)}</small>
        <h2>${C.escapeHtml(card.question)}</h2>
      </article>
      <div class="choice-grid" role="group" aria-label="Antwortmöglichkeiten">
        ${options.map((option) => `<button class="choice-option" data-answer="${C.escapeHtml(option)}" type="button" ${session.awaitingNext ? "disabled" : ""}>${C.escapeHtml(option)}</button>`).join("")}
      </div>
      ${renderModeFeedback(session.lastResult, isLast)}
    `;
  };
  const renderTestMode = (card, index, cards) => {
    const question = state.cardStudySession.testQuestions?.[index] || { type: "write" };
    return `
      <div class="mode-tag-row"><span>${question.type === "choice" ? "Choice-Frage" : "Schreib-Frage"}</span><strong>${index + 1} / ${cards.length}</strong></div>
      ${question.type === "choice" ? renderChoiceMode(card, index, cards) : renderWriteMode(card, index, cards)}
    `;
  };
  const renderMatchMode = () => {
    const session = state.cardStudySession || {};
    const pairs = session.matchPairs || [];
    const pairMap = new Map(pairs.map((pair) => [pair.id, pair]));
    const matched = new Set(session.matchedIds || []);
    const wrongTiles = new Set(session.lastWrongTileIds || []);
    const order = (session.matchTileOrder?.length ? session.matchTileOrder : shuffleList(pairs.flatMap((pair) => [matchTileId("q", pair.id), matchTileId("a", pair.id)])));
    return `
      ${session.matchTimed ? `<article class="match-stopwatch"><span>Stoppuhr</span><strong>${formatStopwatch(matchElapsedSeconds(session))}</strong><small>${Number(session.matchPenaltySeconds || 0) ? `+${Number(session.matchPenaltySeconds || 0)} Strafsek.` : "Jeder Fehler +1 Sekunde"}</small></article>` : ""}
      <article class="mode-question-card">
        <small>Zuordnen</small>
        <h2>Verbinde Begriff und Lösung.</h2>
        <p>${matched.size} / ${pairs.length} Paare geschafft</p>
      </article>
      <div class="match-grid-board" aria-label="Zuordnungsgrid">
        ${order.filter((tileId) => !matched.has(parseMatchTileId(tileId).pairId)).map((tileId) => {
          const parsed = parseMatchTileId(tileId);
          const pair = pairMap.get(parsed.pairId);
          const text = parsed.side === "q" ? pair?.question : pair?.answer;
          const selected = session.selectedMatchTileId === tileId;
          return `<button class="match-grid-tile mode-match-tile ${selected ? "selected" : ""} ${wrongTiles.has(tileId) ? "wrong" : ""}" data-tile-id="${C.escapeHtml(tileId)}" type="button">${C.escapeHtml(text || "")}</button>`;
        }).join("")}
      </div>
      ${session.lastResult ? `<div class="mode-feedback ${session.lastResult.correct ? "correct" : "wrong"}" aria-live="polite"><strong>${session.lastResult.correct ? "Passt!" : "Noch nicht. Versuch ein anderes Paar."}</strong></div>` : ""}
    `;
  };
  const renderCardStudyView = () => {
    const session = state.cardStudySession || {};
    if (session.completed) return renderDeckSessionSummary();
    if (!session.active) return renderDeckSessionChoice();
    const cards = activeStudyCards();
    const index = Math.min(Math.max(0, Number(state.ui.cardStudyIndex || 0)), Math.max(0, cards.length - 1));
    const card = cards[index];
    const meta = currentDeckMeta();
    const mode = learningModeOption(session.mode);
    const reviewed = Number(session.reviewedIds?.length || 0);
    return `
      ${C.sectionTitle("Karten", mode.title)}
      <section class="flashcard-study-area card-study-view">
        <div class="study-view-header">
          <button class="secondary-button close-study-view" type="button">Zurück</button>
          <strong>${cards.length ? `${index + 1} / ${cards.length}` : "0 / 0"}</strong>
        </div>
        <article class="session-mini-status">
          <span>${C.escapeHtml(meta.title)}</span><strong>${reviewed || session.answers?.length || session.matchedIds?.length || 0} / ${Number(session.target || cards.length)}</strong>
          <span>Modus</span><strong>${C.escapeHtml(mode.title)}</strong>
          <span>XP</span><strong>${Number(session.xpEarned || 0)}</strong>
        </article>
        ${session.mode === "cards" ? `${renderStudyCard(card)}
          <div class="study-nav-row">
            <button class="icon-button study-prev" type="button" ${index <= 0 ? "disabled" : ""} title="Vorherige Karte" aria-label="Vorherige Karte">&#8592;</button>
            <span>${card ? C.escapeHtml(card.subject) : "Keine Karten"}</span>
            <button class="icon-button study-next" type="button" ${index >= cards.length - 1 ? "disabled" : ""} title="Nächste Karte" aria-label="Nächste Karte">&#8594;</button>
          </div>
          ${card ? `<div class="srs-rating-grid">
            <button class="srs-rating again" data-rating="again" type="button">Again</button>
            <button class="srs-rating hard" data-rating="hard" type="button">Hard</button>
            <button class="srs-rating good" data-rating="good" type="button">Good</button>
            <button class="srs-rating easy" data-rating="easy" type="button">Easy</button>
          </div>` : ""}` : ""}
        ${session.mode === "write" && card ? renderWriteMode(card, index, cards) : ""}
        ${session.mode === "choice" && card ? renderChoiceMode(card, index, cards) : ""}
        ${session.mode === "learn" && card ? renderTestMode(card, index, cards) : ""}
        ${session.mode === "test" ? (session.testStarted ? renderTestQuestionList(cards) : renderTestSetup(cards)) : ""}
        ${session.mode === "match" ? renderMatchMode() : ""}
      </section>
    `;
  };

  const renderCardCreatePanel = () => `
    ${C.sectionTitle("Karten", "Neue Karte")}
    <section class="create-card-sheet standalone-create show">
      <div class="create-sheet-header">
        <strong>Karte hinzufügen</strong>
        <button class="icon-button close-card-create" type="button" title="Schließen" aria-label="Karten-Erstellung schließen">×</button>
      </div>
      <div class="create-options">
        <button class="secondary-button choose-card-mode" data-mode="ai" type="button">${C.icon("camera")} Mit KI ${isPlus() ? "" : "· Plus"}</button>
        <button class="secondary-button choose-card-mode" data-mode="self" type="button">${C.icon("add")} Selbst</button>
      </div>
      ${state.ui.cardCreateMode === "ai" ? (isPlus() ? `<div class="panel photo-card-panel"><h2>KI-Karten Generator</h2><p class="panel-note">Plus und Pro bekommen KI-Karten. Foto-zu-Karten ist ein Pro-Feature und kommt bald.</p>${state.ui.lastPhotoName ? `<div class="empty-state mascot-empty">${C.mascot("mascot-small")}<div><strong>Ausgewählt: ${C.escapeHtml(state.ui.lastPhotoName)}</strong><p>OCR und automatische Kartenerstellung sind noch nicht aktiv.</p></div></div>` : ""}<label>Fach<input id="photo-card-subject" placeholder="z. B. Französisch" /></label><label class="upload-tile ${isPro() ? "" : "locked-upload"}">${C.icon("camera")} Foto auswählen (${isPro() ? "kommt bald" : "Pro"})<input id="photo-card-input" type="file" accept="image/*" capture="environment" ${isPro() ? "" : "disabled"} /></label></div>` : `<div class="panel locked-feature"><h2>KI-Karten sind Plus</h2><p class="panel-note">Free bleibt für eigene Karten nutzbar. Upgrade auf Plus, wenn Lynxly Karten automatisch vorbereiten soll.</p><a class="primary-button" href="#premium">Pläne ansehen</a></div>`) : ""}
      ${state.ui.cardCreateMode === "self" ? `<form class="panel form-panel" id="card-form"><label>Titel / Fach<input name="subject" required placeholder="z. B. Französisch UNIT 1" /></label><label>Frage<textarea name="question" required rows="3"></textarea></label><label>Antwort<textarea name="answer" required rows="3"></textarea></label><label>Status<select name="difficulty"><option value="1">Gut</option><option value="2" selected>Okay</option><option value="3">Schlecht</option></select></label><button class="primary-button" type="submit">Karte speichern</button></form>` : ""}
    </section>
  `;
  const recentDeckAttrs = (entry) => {
    const deckId = String(entry?.deckId || "");
    if (deckId === "due") return `data-stack="due"`;
    if (deckId.startsWith("personal:")) return `data-stack="personal" data-subject="${C.escapeHtml(deckId.slice("personal:".length) || entry.deckTitle || "")}"`;
    if (deckId.startsWith("recommended:")) return `data-stack="library" data-pack-id="${C.escapeHtml(deckId.slice("recommended:".length))}"`;
    return `data-stack="personal" data-subject="${C.escapeHtml(entry?.deckTitle || "")}"`;
  };
  const renderRecentDeck = () => {
    const recent = (state.deckSessionHistory || [])[0];
    if (!recent) return "";
    return `
      <section class="recent-deck-section">
        <div class="sleek-section-title cards-recent-title"><h2>Zuletzt genutzt</h2><span>${C.escapeHtml(recent.mode || learningModeOption(recent.modeId).title)}</span></div>
        <button class="recent-deck-row" ${recentDeckAttrs(recent)} type="button">
          <div class="mini-deck-stack"><i></i><i></i><i></i></div>
          <div>
            <strong>${C.escapeHtml(recent.deckTitle || "Letzter Stapel")}</strong>
            <small>${C.escapeHtml(recent.mode || learningModeOption(recent.modeId).title)} · ${Number(recent.cardsReviewed || 0)} Karten · ${Number(recent.scorePercent || 0)}%</small>
          </div>
          <em>Öffnen</em>
        </button>
      </section>
    `;
  };

  const renderCards = () => {
    if (state.ui.cardStudyOpen) return renderCardStudyView();
    if (state.ui.cardCreateOpen) return renderCardCreatePanel();
    const dueCount = dueCards().length;
    const mistakeCount = openMistakes().length;
    const query = String(state.ui.cardSearch || "").trim();
    const queryLower = query.toLowerCase();
    const libraryResults = query ? filteredLibrary().slice(0, 6) : [];
    const personalResults = query
      ? personalDecks().filter((deck) => [deck.title, deck.subject].join(" ").toLowerCase().includes(queryLower)).slice(0, 6)
      : [];
    return `
      <section class="cards-page sleek-screen">
        <div class="grade-page-header cards-page-header">
          <h1>Karten</h1>
          <button class="round-add cards-header-add" id="toggle-card-create" type="button" aria-label="Karte hinzufügen">+</button>
        </div>
      <label class="cards-search-shell" for="card-search">
        ${C.icon("search")}
        <input id="card-search" type="search" value="${C.escapeHtml(state.ui.cardSearch || "")}" placeholder="Kärtchen oder Stapel suchen" autocomplete="off" />
      </label>
      ${query ? `
        <section class="card-search-results" aria-label="Suchergebnisse für Karten">
          <div class="sleek-section-title"><h2>Gefunden</h2><span>${libraryResults.length + personalResults.length}</span></div>
          ${libraryResults.map((pack) => `
            <button class="search-deck-row" data-stack="library" data-pack-id="${C.escapeHtml(pack.id)}" type="button">
              <div class="mini-deck-stack database"><i></i><i></i><i></i></div>
              <div><strong>${C.escapeHtml(pack.title)}</strong><small>${C.escapeHtml(pack.subject)} · Lynxly Datenbank · ${Math.min(isPlus() ? pack.cards.length : pack.freeCount || pack.cards.length, pack.cards.length)} Karten</small></div>
              <em>Öffnen</em>
            </button>
          `).join("")}
          ${personalResults.map((deck) => `
            <button class="search-deck-row" data-stack="personal" data-subject="${C.escapeHtml(deck.title)}" type="button">
              <div class="mini-deck-stack"><i></i><i></i><i></i></div>
              <div><strong>${C.escapeHtml(deck.title)}</strong><small>${C.escapeHtml(deck.subject)} · persönlicher Stapel</small></div>
              <em>${deck.cards.length}</em>
            </button>
          `).join("")}
          ${libraryResults.length + personalResults.length ? "" : C.emptyState("Keine Karten gefunden", "Versuche z. B. Französisch, Biologie oder den Namen deines Stapels.")}
        </section>
      ` : ""}
      <section class="card-stack-board cards-main-stacks">
        ${renderStack("Heute fällig", "Spaced Repetition", dueCount, "due", dueCount ? "Starten" : "Leer")}
        ${renderStack("Fehlerbank", "Offene Fehler wiederholen", mistakeCount, "mistakes", "Öffnen")}
      </section>
      ${renderRecentDeck()}
      </section>
    `;
  };

  const renderMistakes = () => {
    const filter = state.ui.mistakeFilter || "open";
    const mistakes = state.mistakes.filter((mistake) => {
      if (filter === "fixed") return mistake.reviewStatus === "fixed";
      if (filter === "all") return true;
      return mistake.reviewStatus !== "fixed";
    });
    return `
      <section class="mistake-page">
        <div class="mistake-header">
          <div>
            <span class="eyebrow">Coach</span>
            <h1>Fehlerbank</h1>
          </div>
          <div class="coach-action-row">
            <a class="secondary-button" href="#cards">Karten lernen</a>
          </div>
        </div>
        <form class="mistake-add-form ${state.ui.showMistakeForm ? "show" : ""}" id="mistake-form">
          <label>Fach<input name="subject" required placeholder="z. B. Mathe" /></label>
          <label>Thema<input name="topic" placeholder="z. B. Klammern" /></label>
          <label>Aufgabe / Frage<textarea name="question" required rows="3"></textarea></label>
          <label>Meine falsche Antwort<textarea name="userAnswer" rows="2"></textarea></label>
          <label>Richtige Antwort<textarea name="correctAnswer" rows="2"></textarea></label>
          <label>Erklärung<textarea name="explanation" rows="3"></textarea></label>
          <div class="coach-action-row">
            <button class="primary-button" type="submit">Fehler speichern</button>
            <button class="secondary-button cancel-mistake-form" type="button">Abbrechen</button>
          </div>
        </form>
        <div class="mistake-stats">
          <article><span>Offen</span><strong>${openMistakes().length}</strong></article>
          <article><span>Behoben</span><strong>${state.mistakes.filter((item) => item.reviewStatus === "fixed").length}</strong></article>
        </div>
        <div class="segmented-actions">
          ${["open", "all", "fixed"].map((item) => `<button class="mistake-filter ${filter === item ? "active" : ""}" data-filter="${item}" type="button">${item === "open" ? "Offen" : item === "fixed" ? "Behoben" : "Alle"}</button>`).join("")}
        </div>
        <section class="mistake-list">
          ${mistakes.map((mistake) => `
            <article class="mistake-card ${mistake.reviewStatus === "fixed" ? "fixed" : ""}">
              <div class="mistake-card-top">
                <strong>${C.escapeHtml(mistake.subject)}</strong>
                <span>${C.escapeHtml(mistake.source)} - ${formatDate(mistake.createdDate)}</span>
              </div>
              <h2>${C.escapeHtml(mistake.question)}</h2>
              <dl>
                ${mistake.userAnswer ? `<div><dt>Deine Antwort</dt><dd>${C.escapeHtml(mistake.userAnswer)}</dd></div>` : ""}
                ${mistake.correctAnswer ? `<div><dt>Richtig</dt><dd>${C.escapeHtml(mistake.correctAnswer)}</dd></div>` : ""}
                ${mistake.explanation ? `<div><dt>Erklärung</dt><dd>${C.escapeHtml(mistake.explanation)}</dd></div>` : ""}
              </dl>
              <button class="${mistake.reviewStatus === "fixed" ? "secondary-button reopen-mistake" : "primary-button fix-mistake"}" data-id="${mistake.id}" type="button">${mistake.reviewStatus === "fixed" ? "Wieder öffnen" : "Als behoben markieren"}</button>
            </article>
          `).join("") || C.emptyState("Noch keine Fehler", "Wenn du Karten mit Nochmal/Schwer bewertest oder KI-Antworten speicherst, entsteht hier deine persönliche Fehlerbank.")}
        </section>
      </section>
    `;
  };

  const translationDictionary = {
    bonjour: "hallo / guten Tag",
    "au revoir": "auf Wiedersehen",
    famille: "Familie",
    "la famille": "die Familie",
    maison: "Haus",
    school: "Schule",
    dog: "Hund",
    cat: "Katze",
    apple: "Apfel",
    hello: "hallo",
    danke: "merci / thank you"
  };

  const extractTranslationTerm = (message) => message
    .replace(/übersetze|uebersetze|translate|was heißt|was heisst|auf deutsch|in deutsch|ins deutsche|bitte/gi, "")
    .replace(/[?:!."]/g, "")
    .trim();

  const botAnswer = (message, inputKind = "Text") => {
    const raw = String(message || "").trim();
    const lower = raw.toLowerCase();
    if (inputKind === "Foto") return "Ich sehe dein Foto als Aufgabe. Schreibe mir kurz, welche Stelle unklar ist, dann führe ich dich Schritt für Schritt durch den ersten Ansatz.";
    if (["übersetze", "uebersetze", "translate", "was heißt", "was heisst", "auf deutsch", "ins deutsche"].some((word) => lower.includes(word))) {
      const term = extractTranslationTerm(raw).toLowerCase();
      const translated = translationDictionary[term];
      return translated ? `${term} heißt: ${translated}.` : `Ich würde das als Übersetzungsfrage behandeln. Schreib mir bitte das einzelne Wort oder den Satz ohne Zusatztext, dann gebe ich dir die passende Übersetzung.`;
    }
    if (/[0-9]\s*[\+\-\*x·:\/]\s*[0-9]|\([^)]*[\+\-\*x·:\/][^)]*\)/.test(lower) || ["mathe", "formel", "funktion", "gleichung", "rechne"].some((word) => lower.includes(word))) {
      const bracket = raw.match(/\(([^()]+)\)/);
      if (bracket) return `Bei Klammern kommt zuerst die Klammer. Dein erster Schritt ist also: ${bracket[1]}. Rechne diesen Teil aus und setze das Ergebnis danach wieder in die Aufgabe ein.`;
      return "Ich helfe dir beim ersten Schritt: Markiere zuerst die Rechenart mit der höchsten Priorität. Punktrechnung vor Strichrechnung, Klammern zuerst. Was würdest du als erstes ausrechnen?";
    }
    if (["lös", "lösung", "antwort", "fertig"].some((word) => lower.includes(word))) return "Ich gebe dir nicht einfach nur eine fertige Lösung. Zeig mir kurz deinen Ansatz, dann gebe ich dir den nächsten Hinweis.";
    return `Kurz erklärt: ${raw || "Diese Frage"} kann ich dir beantworten. Wenn es eine Aufgabe ist, zerlegen wir sie zuerst in: Was ist gegeben? Was wird gesucht? Welcher erste Schritt passt dazu?`;
  };

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Foto konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });

  const prepareChatImage = (file) => new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const maxSize = 900;
      const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        readFileAsDataUrl(file).then(resolve).catch(reject);
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      readFileAsDataUrl(file).then(resolve).catch(reject);
    };
    image.src = url;
  });

  const readFileSnippet = async (file) => {
    if (!file || !file.type.startsWith("text/")) return "";
    try {
      const text = await file.text();
      return text.slice(0, 5000);
    } catch (error) {
      return "";
    }
  };

  const askLynxlyAI = async (message, attachment, imageData) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || attachment || "Hilf mir beim Lernen", attachmentName: attachment || "", imageData: imageData || "" })
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (error) {
        throw new Error(raw || "KI-Antwort war kein JSON");
      }
      if (!response.ok) throw new Error(data.error || "KI-Anfrage fehlgeschlagen");
      state.ui.aiOfflineMode = Boolean(data.offline);
      return data.answer || botAnswer(message || attachment, attachment ? "Foto" : "Text");
    } catch (error) {
      console.warn("Lynxly AI nutzt lokale Antwort.", error);
      state.ui.aiOfflineMode = true;
      return `${botAnswer(message || attachment, attachment ? "Foto" : "Text")}\n\nHinweis: Die echte KI-Route ist lokal gerade nicht verbunden, deshalb nutze ich eine sichere Offline-Antwort.`;
    }
  };

  const lastUserMessageBefore = (messageId) => {
    const index = state.chat.findIndex((message) => message.id === messageId);
    return [...state.chat.slice(0, index)].reverse().find((message) => message.role === "user")?.text || "KI-Frage";
  };

  const aiSectionTypes = {
    antwort: "answer",
    answer: "answer",
    "final answer": "answer",
    lösungsweg: "steps",
    loesungsweg: "steps",
    lösung: "steps",
    loesung: "steps",
    solution: "steps",
    erklärung: "explanation",
    erklaerung: "explanation",
    explanation: "explanation",
    ergebnis: "result",
    result: "result",
    zusammenfassung: "summary",
    summary: "summary",
    probe: "check",
    check: "check",
    beispiel: "example",
    example: "example",
    fehler: "error",
    error: "error"
  };
  const normalizeAiSectionTitle = (title = "") => String(title)
    .toLowerCase()
    .replace(/[:：]/g, "")
    .trim();
  const aiSectionClass = (title = "") => aiSectionTypes[normalizeAiSectionTitle(title)] || "default";
  const isAiThinkingText = (text = "") => /ich denke kurz nach/i.test(String(text || ""));

  const renderSimpleMathFallback = (value = "") => C.escapeHtml(String(value || "").trim())
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '<span class="ai-frac"><span class="ai-frac-top">$1</span><span class="ai-frac-bottom">$2</span></span>')
    .replace(/\\cdot/g, '<span class="ai-math-symbol">×</span>')
    .replace(/\\div/g, '<span class="ai-math-symbol">÷</span>')
    .replace(/\n/g, '<br>');

  const renderMath = (value = "", display = false) => {
    const source = String(value || "").trim();
    const escaped = C.escapeHtml(source);
    if (window.katex?.renderToString) {
      try {
        const math = window.katex.renderToString(source, {
          displayMode: display,
          throwOnError: false,
          strict: "ignore",
          trust: false
        });
        return display
          ? `<div class="ai-math-block" role="img" aria-label="${escaped}">${math}</div>`
          : `<span class="ai-math-inline" role="img" aria-label="${escaped}">${math}</span>`;
      } catch (error) {
        // Fallback below keeps the original formula readable if KaTeX cannot parse it.
      }
    }
    const fallbackMath = renderSimpleMathFallback(source);
    return display
      ? `<div class="ai-math-block ai-math-fallback">${fallbackMath}</div>`
      : `<span class="ai-math-inline ai-math-fallback">${fallbackMath}</span>`;
  };

  const renderInlineMarkdown = (value = "") => {
    const tokens = [];
    const token = (html) => {
      const id = `§§LYNXLYCODE${tokens.length}§§`;
      tokens.push([id, html]);
      return id;
    };
    let text = String(value ?? "").replace(/`([^`\n]+)`/g, (_, code) => token(`<code>${C.escapeHtml(code)}</code>`));
    text = text
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => token(renderMath(math, false)))
      .replace(/\$([^$\n]+)\$/g, (_, math) => token(renderMath(math, false)));
    let html = C.escapeHtml(text);
    html = html
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^\*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
    tokens.forEach(([id, htmlValue]) => {
      html = html.replaceAll(id, htmlValue);
    });
    return html;
  };

  const renderMarkdownTable = (lines) => {
    const rows = lines
      .filter((line, index) => index !== 1)
      .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    const head = rows.shift() || [];
    return `
      <div class="ai-table-wrap">
        <table class="ai-table">
          <thead><tr>${head.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  };

  const renderMarkdownDocument = (markdown = "") => {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let paragraph = [];
    let list = null;
    let index = 0;

    const flushParagraph = () => {
      if (!paragraph.length) return;
      const text = paragraph.join("\n").trim();
      const sectionMatch = text.match(/^\*\*(Antwort|Lösungsweg|Erklärung|Ergebnis|Zusammenfassung|Probe|Beispiel|Fehler):?\*\*\s*(.*)$/i);
      if (sectionMatch) {
        blocks.push({ type: "heading", level: 2, text: sectionMatch[1] });
        if (sectionMatch[2]) blocks.push({ type: "paragraph", text: sectionMatch[2] });
      } else {
        blocks.push({ type: "paragraph", text });
      }
      paragraph = [];
    };
    const flushList = () => {
      if (!list) return;
      blocks.push(list);
      list = null;
    };
    const isTableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    const isTableLine = (line) => line.includes("|") && line.split("|").length >= 3;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        index += 1;
        continue;
      }

      if (trimmed.startsWith("```")) {
        flushParagraph();
        flushList();
        index += 1;
        const codeLines = [];
        while (index < lines.length && !lines[index].trim().startsWith("```")) {
          codeLines.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) index += 1;
        blocks.push({ type: "code", text: codeLines.join("\n") });
        continue;
      }

      if (isTableLine(trimmed) && isTableSeparator(lines[index + 1] || "")) {
        flushParagraph();
        flushList();
        const tableLines = [trimmed, lines[index + 1]];
        index += 2;
        while (index < lines.length && isTableLine(lines[index].trim())) {
          tableLines.push(lines[index].trim());
          index += 1;
        }
        blocks.push({ type: "table", lines: tableLines });
        continue;
      }

      if (trimmed.startsWith("$$") || trimmed.startsWith("\\[")) {
        flushParagraph();
        flushList();
        const open = trimmed.startsWith("$$") ? "$$" : "\\[";
        const close = open === "$$" ? "$$" : "\\]";
        let first = trimmed.slice(open.length).trim();
        const mathLines = [];
        if (first.endsWith(close) && first.length > close.length) {
          mathLines.push(first.slice(0, -close.length).trim());
          index += 1;
        } else {
          if (first) mathLines.push(first);
          index += 1;
          while (index < lines.length && !lines[index].trim().endsWith(close)) {
            mathLines.push(lines[index]);
            index += 1;
          }
          if (index < lines.length) {
            const closingLine = lines[index].trim();
            const content = closingLine.slice(0, -close.length).trim();
            if (content) mathLines.push(content);
            index += 1;
          }
        }
        blocks.push({ type: "math", text: mathLines.join("\n") });
        continue;
      }

      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        blocks.push({ type: "heading", level: heading[1].length, text: heading[2].replace(/#+$/, "").trim() });
        index += 1;
        continue;
      }

      if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
        flushParagraph();
        flushList();
        blocks.push({ type: "hr" });
        index += 1;
        continue;
      }

      const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (numbered || bullet) {
        flushParagraph();
        const ordered = Boolean(numbered);
        if (!list || list.ordered !== ordered) {
          flushList();
          list = { type: "list", ordered, items: [] };
        }
        list.items.push(numbered ? numbered[2] : bullet[1]);
        index += 1;
        continue;
      }

      flushList();
      paragraph.push(line);
      index += 1;
    }
    flushParagraph();
    flushList();

    let html = "";
    let openSection = false;
    const closeSection = () => {
      if (openSection) html += "</section>";
      openSection = false;
    };

    blocks.forEach((block) => {
      if (block.type === "heading") {
        closeSection();
        const title = block.text.replace(/^\*\*|\*\*$/g, "");
        const sectionType = block.level >= 3 ? "step" : aiSectionClass(title);
        const headingLevel = block.level === 1 ? 2 : Math.min(3, block.level);
        html += `<section class="ai-section ai-section-${sectionType}">`;
        openSection = true;
        html += `<h${headingLevel} class="ai-section-title ai-heading-level-${block.level}">${renderInlineMarkdown(title)}</h${headingLevel}>`;
        return;
      }
      if (!openSection) {
        html += `<section class="ai-section ai-section-default">`;
        openSection = true;
      }
      if (block.type === "paragraph") {
        const className = /\d+\s*(stunden?|minuten?|tage?)|^[\s*`]*\d+/.test(block.text.toLowerCase()) ? " ai-final-answer" : "";
        html += `<p class="${className.trim()}">${renderInlineMarkdown(block.text).replace(/\n/g, "<br>")}</p>`;
      } else if (block.type === "list") {
        const tag = block.ordered ? "ol" : "ul";
        const className = block.ordered ? "ai-step-list" : "ai-bullet-list";
        html += `<${tag} class="${className}">${block.items.map((item) => `<li class="${block.ordered ? "ai-step" : ""}">${renderInlineMarkdown(item)}</li>`).join("")}</${tag}>`;
      } else if (block.type === "code") {
        html += `<pre class="ai-code-block"><code>${C.escapeHtml(block.text)}</code></pre>`;
      } else if (block.type === "math") {
        html += renderMath(block.text, true);
      } else if (block.type === "table") {
        html += renderMarkdownTable(block.lines);
      } else if (block.type === "hr") {
        html += `<hr class="ai-divider" />`;
      }
    });
    closeSection();
    return html || `<section class="ai-section ai-section-default"><p>${renderInlineMarkdown(markdown)}</p></section>`;
  };

  const renderChatMessage = (msg) => {
    if (msg.role === "user") {
      return `
        <article class="chat-message-user">
          <p>${C.escapeHtml(msg.text)}</p>
        </article>
      `;
    }

    if (isAiThinkingText(msg.text)) {
      return `
        <article class="chat-message-ai ai-thinking" aria-live="polite">
          <div class="ai-response-header">
            <span class="ai-avatar">${C.mascot("mascot-small")}</span>
            <div><strong>Lynxly AI</strong><small>Lynxly denkt <span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span></small></div>
          </div>
        </article>
      `;
    }

    return `
      <article class="chat-message-ai" aria-live="polite">
        <div class="ai-response">
          <div class="ai-response-header">
            <span class="ai-avatar">${C.mascot("mascot-small")}</span>
            <div><strong>Lynxly AI</strong><small>Antwort</small></div>
          </div>
          <div class="ai-message-content">${renderMarkdownDocument(msg.text)}</div>
          <div class="ai-actions">
            <button class="save-ai-flashcards" data-id="${msg.id}" type="button" aria-label="KI-Antwort als Karten speichern">${C.icon("cards")} Als Karten</button>
            <button class="save-ai-mistake" data-id="${msg.id}" type="button" aria-label="KI-Antwort als Fehler speichern">${C.icon("target")} Als Fehler</button>
            <button class="save-ai-task" data-id="${msg.id}" type="button" aria-label="KI-Antwort als Aufgabe speichern">${C.icon("calendar")} Als Aufgabe</button>
          </div>
        </div>
      </article>
    `;
  };

  const renderBot = () => {
    const hasChat = state.chat.length > 0;
    const messages = state.chat;
    const attachmentReady = Boolean(state.ui.chatAttachmentName && pendingChatAttachment?.name === state.ui.chatAttachmentName);
    const actions = [
      ["Erkläre das", "Erkläre mir das Schritt für Schritt: "],
      ["Frag mich ab", "Frag mich dazu ab: "],
      ["Antwort prüfen", "Prüfe meine Antwort und gib mir Hinweise: "],
      ["Karten erstellen", "Mache daraus Karteikarten: "],
      ["Lernplan machen", "Mache daraus einen Lernplan: "]
    ];
    return `
      <section class="ai-full-page ${hasChat ? "has-chat" : "is-empty"}">
        <h1>Lynxly AI</h1>
        <section class="ai-window">
          ${hasChat ? `
            <div class="ai-output" aria-live="polite" aria-label="Chatverlauf mit Lynxly AI">
              ${messages.map(renderChatMessage).join("")}
            </div>
          ` : `
            <div class="ai-start-screen">
              <h2>Let's start learning</h2>
              <p>Lynxly hilft dir Schritt für Schritt, mit Text, Foto, Datei oder Stimme.</p>
            </div>
          `}
          ${attachmentReady ? `<div class="attachment-pill">${C.icon(pendingChatAttachment?.kind === "file" ? "upload" : "camera")} ${pendingChatAttachment?.kind === "file" ? "Datei" : "Foto"} bereit: ${C.escapeHtml(state.ui.chatAttachmentName)}</div>` : ""}
          <form id="chat-form" class="ai-full-input">
            <div class="ai-search-shell">
              <div class="ai-attach-wrap ${state.ui.aiAttachMenuOpen ? "open" : ""}">
                <button class="ai-plus-button" id="ai-attach-toggle" type="button" aria-label="Foto oder Datei hinzufügen" aria-expanded="${state.ui.aiAttachMenuOpen ? "true" : "false"}">${C.icon("add")}</button>
                <div class="ai-attach-menu">
                  <label class="ai-attach-option">${C.icon("camera")} Foto<input id="ai-photo-input" type="file" accept="image/*" /></label>
                  <label class="ai-attach-option">${C.icon("upload")} Datei<input id="ai-file-input" type="file" accept=".pdf,.txt,.md,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,image/*,text/*,application/pdf" /></label>
                </div>
              </div>
              <button class="ai-mic-button voice-input" type="button" title="Mündlich fragen" aria-label="Mündlich fragen" aria-pressed="false">${C.icon("mic")}</button>
              <textarea id="chat-input" name="message" rows="1" placeholder="Ask anything"></textarea>
              <button class="ai-send-button" type="submit" aria-label="Senden">${C.icon("send")}</button>
            </div>
          </form>
          <div class="ai-quick-actions">
            ${actions.map(([label, prompt]) => `<button class="ai-quick-action" data-prompt="${C.escapeHtml(prompt)}" type="button">${C.escapeHtml(label)}</button>`).join("")}
          </div>
        </section>
      </section>
    `;
  };

  const scrollAiConversation = () => {
    const scrollToBottom = () => {
      const output = document.querySelector(".ai-output");
      if (output) {
        output.scrollTop = output.scrollHeight;
        const messages = output.querySelectorAll(".chat-message-user, .chat-message-ai");
        const latest = messages[messages.length - 1];
        latest?.scrollIntoView({ block: "end", behavior: "auto" });
      }
      document.querySelector("#chat-input")?.focus({ preventScroll: true });
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
    };
    requestAnimationFrame(() => {
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    });
  };

  const startVoiceInput = () => {
    const input = document.querySelector("#chat-input");
    const button = document.querySelector(".voice-input");
    if (!input || !button) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      input.value = `${input.value}${input.value ? "\n" : ""}Mündliche Eingabe wird in diesem Browser nicht unterstützt. Du kannst deine Frage hier eintippen.`.trim();
      input.focus();
      return;
    }
    if (voiceRecognition) {
      voiceRecognition.stop();
      return;
    }
    const recognition = new Recognition();
    voiceRecognition = recognition;
    const startValue = input.value.trim();
    recognition.lang = state.settings.language === "en" ? "en-US" : "de-CH";
    recognition.interimResults = true;
    recognition.continuous = false;
    button.classList.add("listening");
    button.setAttribute("aria-pressed", "true");
    button.title = "Aufnahme läuft";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      input.value = `${startValue}${startValue && transcript ? "\n" : ""}${transcript}`.trim();
      input.focus({ preventScroll: true });
    };
    recognition.onerror = () => {
      input.placeholder = "Mikrofon konnte nicht gestartet werden. Prüfe die Browser-Berechtigung.";
    };
    recognition.onend = () => {
      voiceRecognition = null;
      button.classList.remove("listening");
      button.setAttribute("aria-pressed", "false");
      button.title = "Mündlich fragen";
      input.focus({ preventScroll: true });
    };
    recognition.start();
  };

  const renderPlanCard = ({ id, title, position, price, features, badge, tone }) => {
    const active = currentPlan() === id;
    const buttonLabel = id === "free" ? (active ? "Aktueller Plan" : "Gratis enthalten") : active ? `${title} aktiv` : `Upgrade auf ${title}`;
    return `
      <article class="price-card plan-card ${id === "plus" ? "featured" : ""} ${tone || ""}">
        ${badge ? `<em class="plan-badge">${C.escapeHtml(badge)}</em>` : ""}
        <span>${C.escapeHtml(position)}</span>
        <h2>${C.escapeHtml(title)}</h2>
        <strong>${C.escapeHtml(price)}</strong>
        <ul>${features.map((feature) => `<li>${C.escapeHtml(feature)}</li>`).join("")}</ul>
        <button class="${id === "plus" && !active ? "primary-button" : "secondary-button"} activate-plan" data-plan="${id}" type="button" ${id === "free" ? "disabled" : ""}>${C.escapeHtml(buttonLabel)}</button>
      </article>
    `;
  };

  const renderPlanPricing = () => `
    <section class="panel premium-intro">
      <p>Gratis hilft dir beim Organisieren. Plus macht dein Lernen smarter. Pro bereitet dich wie ein Top-Schüler vor.</p>
    </section>
    <section class="pricing-grid premium-grid plan-stack">
      ${renderPlanCard({
        id: "free",
        title: "Gratis",
        position: "Organisiert starten",
        price: "CHF 0",
        features: ["Noten-Tracker", "Notendurchschnitt", "Einfacher Kalender", "Hausaufgaben und Prüfungen", "3 Kartenstapel", "50 eigene Karten", "10 KI-Fragen pro Monat", "Basis-Erinnerungen", "2 Designs"]
      })}
      ${renderPlanCard({
        id: "plus",
        title: "Plus",
        position: "Smarter lernen",
        price: "CHF 4.90/Monat",
        badge: "Beliebt",
        features: ["Alles aus Gratis", "300 KI-Fragen pro Monat", "KI-Karten Generator", "KI-Quiz Generator", "Smarte Lernpläne", "Vollständige empfohlene Stapel", "Unbegrenzte eigene Karten", "Smarte Erinnerungen", "Wochenbericht", "Eigene Designs"]
      })}
      ${renderPlanCard({
        id: "pro",
        title: "Pro",
        position: "Wie ein Top-Schüler vorbereiten",
        price: "CHF 7.90/Monat",
        tone: "pro-card",
        features: ["Alles aus Plus", "1'000 KI-Fragen pro Monat", "300 KI-Karten-Generierungen pro Monat", "30 Foto-zu-Karten Scans pro Monat", "Erweiterte Auswertungen", "Prüfungsvorbereitung", "Schwere-Karten-Modus", "Karten exportieren", "Früher Zugriff auf neue Features", "Pro Designs"]
      })}
    </section>
    <section class="panel pro-feature-panel ${isPro() ? "" : "locked"}">
      <div class="panel-header"><div><span>Nur Pro</span><h2>Analyse, Export und Prüfungsmodus</h2></div>${isPro() ? C.icon("spark") : C.icon("lock")}</div>
      <p class="panel-note">Erweiterte Auswertungen, Kartenexport, Schwere-Karten-Modus und Pro-Designs sind für Pro reserviert. Foto-zu-Karten ist als Pro-Funktion geplant.</p>
    </section>
  `;

  const renderPremium = () => `
    ${C.sectionTitle("Premium", "Lynxly Pläne")}
    ${renderPlanPricing()}
  `;

  const badgeDefinition = (id) => badgeDefinitions.find((badge) => badge.id === id) || { id, title: id, text: "Freigeschaltet" };
  const progressBar = (value, max, label, className = "") => {
    const safeMax = Math.max(1, Number(max || 1));
    const safeValue = Math.max(0, Math.min(safeMax, Number(value || 0)));
    const percent = Math.round((safeValue / safeMax) * 100);
    return `<span class="xp-progress ${className}" role="progressbar" aria-label="${C.escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${safeMax}" aria-valuenow="${safeValue}"><i style="width:${percent}%"></i></span>`;
  };
  const isoWeekNumber = () => {
    const date = dateObject(todayIso());
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  };
  const friendWeeklyXp = (friend) => {
    if (friend.weeklyXp !== undefined) return Number(friend.weeklyXp || 0);
    return Math.round(
      Number(friend.cardsReviewed || 0) * 5
      + Number(friend.mistakesFixed || 0) * 20
      + Number(friend.studySessions || 0) * 50
      + Number(friend.improved || 0) * 4
    );
  };
  const userLeaderboardStats = () => ({
    id: "you",
    name: state.leaderboardPrivacy.visible ? (state.leaderboardPrivacy.displayName || "Du") : "Du (privat)",
    initials: (state.leaderboardPrivacy.displayName || state.user.name || "D").slice(0, 1).toUpperCase(),
    private: !state.leaderboardPrivacy.visible,
    weeklyXp: Number(state.xpThisWeek || state.weeklyStats.xp || 0)
  });
  const leaderboardRows = () => {
    return [
      ...state.friends.map((friend) => ({ ...friend, weeklyXp: friendWeeklyXp(friend) })),
      userLeaderboardStats()
    ].sort((a, b) => Number(b.weeklyXp || 0) - Number(a.weeklyXp || 0));
  };
  const daysLeftInWeek = () => Math.max(1, 8 - (new Date().getDay() || 7));
  const classLeaderboardRows = () => {
    return [...(state.classLeague.classmates || []), classUserStats()]
      .sort((a, b) => Number(b.weeklyXp || 0) - Number(a.weeklyXp || 0));
  };
  const classRankInfo = () => {
    const rows = [...(state.classLeague.classmates || []), classUserStats()].sort((a, b) => Number(b.weeklyXp || 0) - Number(a.weeklyXp || 0));
    const rank = rows.findIndex((row) => row.id === "you") + 1;
    return { rank: rank || rows.length, total: rows.length, tier: tierById(state.leagueTier) };
  };
  const classLeagueResult = (index) => {
    if (index < 3) return { id: "podium", title: `${index + 1}. Platz`, text: "Aufstieg · Top 3" };
    if (index < 7) return { id: "stay", title: "Bleibt", text: "Bleibt in der Liga" };
    return { id: "demote", title: "Abstieg", text: "Wird heruntergestuft" };
  };
  const podiumTrophy = (place) => `
    <svg class="podium-trophy trophy-${place}" viewBox="0 0 64 64" aria-hidden="true">
      <path class="cup-side left" d="M19 18H9c0 12 5 19 15 21"/>
      <path class="cup-side right" d="M45 18h10c0 12-5 19-15 21"/>
      <path class="cup-main" d="M18 10h28v14c0 12-6 20-14 20S18 36 18 24Z"/>
      <path class="cup-shine" d="M32 10v34"/>
      <path class="cup-stem" d="M28 44h8v8h-8z"/>
      <path class="cup-base" d="M22 52h20v7H22z"/>
    </svg>
  `;
  const renderClassPodium = (rows) => {
    const podium = rows.slice(0, 3);
    return `
      <section class="class-podium" aria-label="Podest der Woche">
        ${podium.map((row, index) => {
          const name = row.private ? "Privat" : row.displayName;
          const place = index + 1;
          return `
            <article class="podium-place place-${place}">
              ${podiumTrophy(place)}
              <div class="podium-block"><span>${place}</span></div>
              <div class="podium-name"><strong>${C.escapeHtml(name)}</strong><small>${Number(row.weeklyXp || 0)} XP</small></div>
            </article>
          `;
        }).join("")}
      </section>
    `;
  };
  const renderBadgeGrid = () => {
    const unlocked = new Set(state.badges.map((badge) => badge.id));
    return `
      <section class="badge-grid">
        ${badgeDefinitions.map((badge) => `
          <article class="badge-chip ${unlocked.has(badge.id) ? "unlocked" : "locked"}">
            <span>${unlocked.has(badge.id) ? C.icon("spark") : C.icon("lock")}</span>
            <div><strong>${C.escapeHtml(badge.title)}</strong><small>${C.escapeHtml(badge.text)}</small></div>
          </article>
        `).join("")}
      </section>
    `;
  };
  const renderProgressPersonal = () => {
    const progress = levelProgress();
    const currentTier = tierById(state.leagueTier);
    const records = state.personalRecords;
    const mascotLine = Number(state.xpThisWeek || 0) > 0
      ? "Lynxly sagt: Du baust diese Woche echte Lernroutine auf. Bleib scharf."
      : "Lynxly sagt: Starte ruhig mit einer Karte oder einem Fehler. Klein zählt auch.";
    return `
      <section class="progress-personal">
        <article class="level-card">
          <div class="level-card-top">
            <div>
              <span>Aktuelle Liga</span>
              <div class="league-title-row">${leagueSymbol(currentTier.id)}</div>
              <p>${progress.next ? `${progress.remaining} XP fehlen bis zum nächsten Ziel: ${C.escapeHtml(progress.next.title)}` : "Höchstes Ziel für dieses MVP erreicht"}</p>
            </div>
            ${C.mascot("mascot-small")}
          </div>
          <div class="level-goal-row">
            <span>${C.escapeHtml(progress.current.title)}</span>
            <strong>${progress.next ? `${progress.remaining} XP bis ${C.escapeHtml(progress.next.title)}` : "Ziel erreicht"}</strong>
            <span>${C.escapeHtml(progress.next?.title || currentTier.name)}</span>
          </div>
          ${progressBar(Number(state.xpTotal || 0) - progress.current.min, progress.end - progress.current.min, `Fortschritt bis ${progress.next ? progress.next.title : currentTier.name}`, "large")}
          <div class="xp-meta"><strong>${state.xpThisWeek} XP diese Woche</strong><span>${state.xpTotal} XP gesamt</span><span>Rang ${classRankInfo().rank} ${leagueSymbol(classRankInfo().tier.id)}</span></div>
        </article>
        <article class="mascot-card progress-mascot-card">${C.mascot("mascot-small")}<p>${C.escapeHtml(mascotLine)}</p></article>
        <section class="progress-stat-grid">
          <article><span>Lerntage</span><strong>${state.weeklyStats.studyDays.length}</strong><small>diese Woche</small></article>
          <article><span>Karten</span><strong>${state.weeklyStats.cardsReviewed}</strong><small>wiederholt</small></article>
          <article><span>Fehler</span><strong>${state.weeklyStats.mistakesFixed}</strong><small>behoben</small></article>
          <article><span>Sessions</span><strong>${state.weeklyStats.studySessions}</strong><small>abgeschlossen</small></article>
        </section>
        <section class="panel personal-records-card">
          <div class="panel-header"><div><span>Persönliche Rekorde</span><h2>Nur gegen dich selbst</h2></div>${C.icon("target")}</div>
          <div class="record-list">
            <span>Beste XP-Woche <strong>${records.bestWeeklyXp}</strong></span>
            <span>Meiste Karten/Woche <strong>${records.bestCardsWeek}</strong></span>
            <span>Meiste Fehler/Woche <strong>${records.bestMistakesWeek}</strong></span>
            <span>Meiste Sessions/Woche <strong>${records.bestSessionsWeek}</strong></span>
          </div>
        </section>
        <div class="sleek-section-title"><h2>Badges</h2><span>${state.badges.length}/${badgeDefinitions.length}</span></div>
        ${renderBadgeGrid()}
      </section>
    `;
  };
  const renderFriendsProgress = () => {
    const rows = leaderboardRows();
    const friendsCards = state.friends.reduce((sum, friend) => sum + Number(friend.cardsReviewed || 0), 0);
    const friendsMistakes = state.friends.reduce((sum, friend) => sum + Number(friend.mistakesFixed || 0), 0);
    const teamCards = friendsCards + Number(state.weeklyStats.cardsReviewed || 0);
    const teamMistakes = friendsMistakes + Number(state.weeklyStats.mistakesFixed || 0);
    return `
      <section class="friends-progress">
        <article class="challenge-card">
          <div>
            <span>Freunde Challenge</span>
            <h2>${C.escapeHtml(state.friendsChallenge.title)}</h2>
            <p>Noch ${daysLeftInWeek()} Tag${daysLeftInWeek() === 1 ? "" : "e"} · Belohnung: ${C.escapeHtml(state.friendsChallenge.reward)}</p>
          </div>
          ${C.mascot("mascot-small")}
        </article>
        <div class="leaderboard-mode-pill" aria-label="Leaderboard nach XP sortiert">XP Leaderboard</div>
        <section class="leaderboard-list">
          ${rows.map((row, index) => `
            <article class="leaderboard-row ${row.id === "you" ? "you" : ""} ${row.private ? "private" : ""}">
              <strong>${index + 1}</strong>
              <span class="friend-avatar">${C.escapeHtml(row.initials || row.name.slice(0, 1))}</span>
              <div><b>${C.escapeHtml(row.name)}</b><small>${row.private ? "Privat sichtbar" : C.escapeHtml(leaderboardCategory.note)}</small></div>
              <em>${row.private ? "Privat" : `${Number(row.weeklyXp || 0)} ${C.escapeHtml(leaderboardCategory.unit)}`}</em>
            </article>
          `).join("")}
        </section>
        <section class="team-goal-card">
          <h2>Gemeinsam diese Woche</h2>
          <div class="team-goal-row"><span>Karten</span><strong>${teamCards} / ${state.friendsChallenge.cardsGoal}</strong>${progressBar(teamCards, state.friendsChallenge.cardsGoal, "Freunde-Ziel Karten")}</div>
          <div class="team-goal-row"><span>Fehler</span><strong>${teamMistakes} / ${state.friendsChallenge.mistakesGoal}</strong>${progressBar(teamMistakes, state.friendsChallenge.mistakesGoal, "Freunde-Ziel Fehler")}</div>
        </section>
        <article class="privacy-note-card">${C.icon("lock")} <span>Keine Noten, E-Mails oder privaten Durchschnitte erscheinen in der Freunde Challenge.</span></article>
      </section>
    `;
  };
  const renderClassLeague = () => {
    const rows = classLeaderboardRows();
    const ownRank = rows.findIndex((row) => row.id === "you") + 1;
    const totals = classTeamTotals();
    const goals = state.classLeague.goals || {};
    const tier = tierById(state.leagueTier);
    return `
      <section class="class-league-page">
        <article class="class-league-hero">
          <div>
            <span>${C.escapeHtml(state.classLeague.demoLabel || "Demo-Klassenliga · lokal gespeichert")}</span>
            <h2>${C.escapeHtml(state.classLeague.className || "Klasse")}</h2>
            <p>Woche ${isoWeekNumber()} · Rang ${ownRank || "–"}</p>
          </div>
          <strong class="league-badge">${leagueSymbol(tier.id)}</strong>
        </article>
        <article class="class-podium-card">
          <div class="panel-header"><div><span>Wochenfinale</span><h2>Podest und Aufstieg</h2></div><strong>Top 3 steigen auf</strong></div>
          ${renderClassPodium(rows)}
          <p>Am Ende der Woche kommen Platz 1, 2 und 3 aufs Podest und steigen eine Liga hoch. Platz 4 bis 7 bleibt. Alle darunter werden heruntergestuft.</p>
        </article>
        <div class="leaderboard-mode-pill" aria-label="Klassenliga nach XP sortiert">XP Leaderboard</div>
        <section class="leaderboard-list class-league-list" aria-label="Wochenranking der Klassenliga">
          ${rows.map((row, index) => {
            const score = Number(row.weeklyXp || 0);
            const name = row.private ? "Privat" : row.displayName;
            const result = classLeagueResult(index);
            return `
              <article class="leaderboard-row class-rank-row result-${result.id} ${row.id === "you" ? "you" : ""} ${row.private ? "private" : ""}" aria-label="${C.escapeHtml(result.title)}, Rang ${index + 1}: ${C.escapeHtml(name)}, ${row.private ? "privat" : `${score} ${classLeagueCategory.unit}`}">
                <strong>${index + 1}</strong>
                <span class="friend-avatar">${C.escapeHtml(row.initials || name.slice(0, 1))}</span>
                <div><b>${C.escapeHtml(name)}</b><small>${row.id === "you" ? `Du · ${result.text}` : C.escapeHtml(result.text)}</small></div>
                <em>${row.private ? "Privat" : `${score} ${C.escapeHtml(classLeagueCategory.unit)}`}</em>
              </article>
            `;
          }).join("")}
        </section>
        <section class="team-goal-card class-team-goal">
          <div class="panel-header"><div><span>Klassenbonus</span><h2>Gemeinsam diese Woche</h2></div><strong>+100 XP</strong></div>
          <div class="team-goal-row"><span>Karten wiederholt</span><strong>${totals.cardsReviewed} / ${goals.cardsReviewed}</strong>${progressBar(totals.cardsReviewed, goals.cardsReviewed, "Klassenziel Karten wiederholt")}</div>
          <div class="team-goal-row"><span>Fehler behoben</span><strong>${totals.mistakesFixed} / ${goals.mistakesFixed}</strong>${progressBar(totals.mistakesFixed, goals.mistakesFixed, "Klassenziel Fehler behoben")}</div>
          <div class="team-goal-row"><span>Lerneinheiten</span><strong>${totals.studySessions} / ${goals.studySessions}</strong>${progressBar(totals.studySessions, goals.studySessions, "Klassenziel Lerneinheiten")}</div>
          <p>${state.classLeague.bonusAwarded ? "Klassenbonus geschafft. Stark zusammen gelernt." : "Wenn alle Ziele erfüllt sind, bekommt deine lokale Demo-Klasse den Bonus."}</p>
        </section>
        <article class="league-reset-note"><strong>Wöchentlicher Neustart</strong><span>Top 3 steigen eine Liga auf. Platz 4 bis 7 bleibt. Alle darunter werden heruntergestuft, aber jede Woche startet frisch.</span></article>
      </section>
    `;
  };
  const renderProgress = () => {
    const tab = ["friends", "class"].includes(state.ui.progressTab) ? state.ui.progressTab : "me";
    return `
      <section class="progress-page sleek-screen">
        <div class="mistake-header">
          <div><span class="eyebrow">Lynxly</span><h1>Fortschritt</h1></div>
        </div>
        <div class="settings-tabs progress-tabs" role="tablist" aria-label="Fortschritt Bereiche">
          <button class="progress-tab ${tab === "me" ? "active" : ""}" data-tab="me" type="button">Ich</button>
          <button class="progress-tab ${tab === "friends" ? "active" : ""}" data-tab="friends" type="button">Freunde</button>
          <button class="progress-tab ${tab === "class" ? "active" : ""}" data-tab="class" type="button">Klasse</button>
        </div>
        ${tab === "class" ? renderClassLeague() : tab === "friends" ? renderFriendsProgress() : renderProgressPersonal()}
      </section>
    `;
  };

  const renderDesignPanel = () => `
    <section class="panel design-settings-panel ${state.ui.designOpen ? "show" : ""}">
      <div class="panel-header"><div><span>Design</span><h2>Lynxly anpassen</h2></div>${isPlus() ? C.icon("palette") : C.icon("lock")}</div>
      <p class="panel-note">${isPlus() ? "Wähle Farben und Kartenstil direkt aus." : "Farben und Kartenstil sind Plus/Pro. Hell und Dunkel kannst du immer nutzen."}</p>
      <div class="interactive-option-grid">
        ${[
          ["blue", "Blau", "#2563eb"],
          ["green", "Grün", "#10b981"],
          ["violet", "Violett", "#7c3aed"],
          ["coral", "Koralle", "#f97316"]
        ].map(([value, label, color]) => `<button class="design-option setting-pick ${state.settings.accent === value ? "active" : ""}" data-name="accent" data-value="${value}" type="button" ${isPlus() ? "" : "disabled"}><i style="--swatch:${color}"></i><strong>${label}</strong><small>Akzent</small></button>`).join("")}
      </div>
      <div class="interactive-option-grid two">
        <button class="design-option setting-pick ${state.settings.cardStyle === "stacked" ? "active" : ""}" data-name="cardStyle" data-value="stacked" type="button" ${isPlus() ? "" : "disabled"}><strong>Gestapelt</strong><small>Karten mit Tiefe</small></button>
        <button class="design-option setting-pick ${state.settings.cardStyle === "clean" ? "active" : ""}" data-name="cardStyle" data-value="clean" type="button" ${isPlus() ? "" : "disabled"}><strong>Clean</strong><small>Ruhiger Look</small></button>
      </div>
      <div class="interactive-option-grid two">
        <button class="design-option setting-pick ${state.settings.theme === "light" ? "active" : ""}" data-name="theme" data-value="light" type="button"><strong>Sonne</strong><small>Hellmodus</small></button>
        <button class="design-option setting-pick ${state.settings.theme === "dark" ? "active" : ""}" data-name="theme" data-value="dark" type="button"><strong>Halbmond</strong><small>Dunkelmodus</small></button>
      </div>
    </section>
  `;

  const renderSettings = () => {
    const maskedPassword = state.user.password ? "•".repeat(Math.min(Math.max(state.user.password.length, 4), 12)) : "Nicht gesetzt";
    const tab = state.ui.settingsTab === "plan" ? "plan" : "profile";
    return `
      <section class="settings-page account-page">
        <div class="mistake-header">
          <div><span class="eyebrow">Account</span><h1>Profil</h1></div>
          <a class="secondary-button" href="#dashboard">Zurück</a>
        </div>
        <div class="settings-tabs" role="tablist" aria-label="Account Bereiche">
          <button class="settings-tab ${tab === "profile" ? "active" : ""}" data-tab="profile" type="button">Profil</button>
          <button class="settings-tab ${tab === "plan" ? "active" : ""}" data-tab="plan" type="button">Plan</button>
        </div>
        ${tab === "plan" ? `
          <section class="account-plan-panel">
            ${renderPlanPricing()}
          </section>
        ` : `
          <section class="panel account-profile-card">
            <div class="account-logo-wrap">${C.mascot("mascot-small")}</div>
            <div>
              <span>Profil</span>
              <h2>${C.escapeHtml(state.user.name || "Lynxly Nutzer")}</h2>
              <p>Lynxly speichert deine Daten lokal in deinem Browser.</p>
            </div>
            <div class="account-detail-grid">
              <article><span>E-Mail</span><strong>${C.escapeHtml(state.user.email || "Keine E-Mail")}</strong></article>
              <article><span>Passwort</span><strong>${C.escapeHtml(maskedPassword)}</strong></article>
              <article><span>Region</span><strong>${C.escapeHtml(currentSystem().name)}</strong></article>
              <article><span>Plan</span><strong>${C.escapeHtml(planLabel(currentPlan()))}</strong></article>
            </div>
          </section>
          <form class="panel leaderboard-privacy-card" id="leaderboard-privacy-form">
            <div class="panel-header"><div><span>Freunde Challenge</span><h2>Privatsphäre</h2></div>${C.icon("lock")}</div>
            <label>Anzeigename<input name="displayName" maxlength="24" value="${C.escapeHtml(state.leaderboardPrivacy.displayName || state.user.name || "Du")}" placeholder="z. B. Max" /></label>
            <label class="toggle-field"><input name="visible" type="checkbox" value="on" ${state.leaderboardPrivacy.visible ? "checked" : ""} /><span>Mich in der Freunde Challenge anzeigen</span><small>Es werden nur Lernaktionen gezeigt, niemals Noten oder E-Mail.</small></label>
            <button class="secondary-button" type="submit">Privatsphäre speichern</button>
          </form>
          <form class="panel leaderboard-privacy-card class-league-form" id="class-league-form">
            <div class="panel-header"><div><span>Klassenliga</span><h2>Privatsphäre</h2></div>${C.icon("lock")}</div>
            <label>Klassen-Code<input name="classCode" value="${C.escapeHtml(state.classCode || state.classLeague.classCode || "LYNX-2B")}" placeholder="LYNX-2B" /></label>
            <label>Anzeigename<input name="displayName" maxlength="24" value="${C.escapeHtml(state.classLeaguePrivacy.displayName || state.user.name || "Du")}" placeholder="z. B. Max" /></label>
            <label class="toggle-field"><input name="joined" type="checkbox" value="on" ${state.classLeaguePrivacy.joined ? "checked" : ""} /><span>Klassenliga nutzen</span><small>Aktuell lokal als Demo gespeichert.</small></label>
            <label class="toggle-field"><input name="visible" type="checkbox" value="on" ${state.classLeaguePrivacy.visible ? "checked" : ""} /><span>Mich in der Klassenliga anzeigen</span><small>Nur XP und Lernaktionen, keine Noten oder E-Mail.</small></label>
            <button class="secondary-button" type="submit">Klassenliga speichern</button>
          </form>
          <button class="design-toggle-button" type="button">${C.icon("palette")} Design anpassen</button>
          ${renderDesignPanel()}
          <button class="danger-logout settings-logout" type="button">${C.icon("trash")} Ausloggen</button>
        `}
      </section>
    `;
  };

  const render = () => {
    ensureCollections();
    if (matchTimer) {
      clearInterval(matchTimer);
      matchTimer = null;
    }
    applyTheme();
    const route = getRoute();
    if (route !== location.hash.replace("#", "") && location.hash) location.hash = route;
    setActiveNav(route);
    const views = { dashboard: renderTodayDashboard, grades: renderGrades, planner: renderPlanner, cards: renderCards, mistakes: renderMistakes, progress: renderProgress, session: renderStudySession, bot: renderBot, premium: renderPremium, settings: renderSettings };
    app.classList.remove("page-enter");
    app.innerHTML = state.user.loggedIn ? views[route]() : renderOnboarding();
    requestAnimationFrame(() => app.classList.add("page-enter"));
    bindEvents(route);
    if (route === "cards" && state.cardStudySession?.active && state.cardStudySession.mode === "match" && state.cardStudySession.matchTimed) {
      matchTimer = window.setInterval(() => {
        if (getRoute() === "cards" && state.cardStudySession?.active && state.cardStudySession.mode === "match" && state.cardStudySession.matchTimed) render();
      }, 1000);
    }
    if (route === "bot") scrollAiConversation();
    else window.scrollTo({ top: 0, behavior: "auto" });
  };

  const bindEvents = (route) => {
    document.querySelector("#onboarding-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const system = state.gradeSystems.find((item) => item.id === data.gradeSystem) || currentSystem();
      state.user = { loggedIn: true, name: data.name, email: data.email || "", password: data.password || "", region: data.gradeSystem };
      state.settings.gradeSystem = system.id;
      state.settings.language = data.language || system.language;
      save();
      render();
    });
    document.querySelector(".settings-logout")?.addEventListener("click", () => {
      state.user.loggedIn = false;
      state.ui.cardCreateOpen = false;
      save();
      location.hash = "#dashboard";
      render();
    });
    document.querySelectorAll(".settings-tab").forEach((button) => button.addEventListener("click", () => {
      state.ui.settingsTab = button.dataset.tab || "profile";
      save();
      render();
    }));
    document.querySelector("#leaderboard-privacy-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      state.leaderboardPrivacy.displayName = String(data.displayName || state.user.name || "Du").trim().slice(0, 24) || "Du";
      state.leaderboardPrivacy.visible = data.visible === "on";
      save();
      render();
    });
    document.querySelectorAll(".progress-tab").forEach((button) => button.addEventListener("click", () => {
      state.ui.progressTab = button.dataset.tab || "me";
      save();
      render();
    }));
    document.querySelector("#class-league-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      state.classCode = String(data.classCode || "LYNX-2B").trim().slice(0, 18) || "LYNX-2B";
      state.classLeague.classCode = state.classCode;
      state.classLeaguePrivacy.displayName = String(data.displayName || state.user.name || "Du").trim().slice(0, 24) || "Du";
      state.classLeaguePrivacy.joined = data.joined === "on";
      state.classLeaguePrivacy.visible = data.visible === "on" && state.classLeaguePrivacy.joined;
      save();
      render();
    });
    document.querySelector(".design-toggle-button")?.addEventListener("click", () => {
      state.ui.designOpen = !state.ui.designOpen;
      save();
      render();
    });
    document.querySelectorAll(".setting-pick").forEach((button) => button.addEventListener("click", () => {
      const name = button.dataset.name;
      const value = button.dataset.value;
      if (!name || value === undefined) return;
      if ((name === "accent" || name === "cardStyle") && !isPlus()) return;
      state.settings[name] = value;
      save();
      render();
    }));
    document.querySelectorAll(".activate-plan").forEach((button) => button.addEventListener("click", () => {
      const plan = button.dataset.plan;
      if (plan !== "plus" && plan !== "pro") return;
      state.settings.plan = plan;
      state.settings.premiumActive = true;
      state.settings.planName = planLabel(plan);
      state.settings.aiLimit = aiLimitForPlan(plan);
      save();
      render();
    }));
    document.querySelectorAll(".notify-now").forEach((button) => button.addEventListener("click", requestNotifications));
    document.querySelector(".start-study-session")?.addEventListener("click", () => {
      state.ui.studySessionStep = 0;
      state.ui.studySessionCardIndex = 0;
      location.hash = "#session";
      pushNotification("Lerneinheit gestartet", "Lynxly führt dich durch Fehler, Karten und Mini-Check.");
      save();
      render();
    });

    if (route === "session") {
      document.querySelectorAll(".study-flashcard").forEach((card) => card.addEventListener("click", () => {
        card.classList.toggle("flipped");
      }));
      document.querySelector(".session-prev-step")?.addEventListener("click", () => {
        state.ui.studySessionStep = Math.max(0, Number(state.ui.studySessionStep || 0) - 1);
        save();
        render();
      });
      document.querySelector(".session-next-step")?.addEventListener("click", () => {
        state.ui.studySessionStep = Math.min(3, Number(state.ui.studySessionStep || 0) + 1);
        save();
        render();
      });
      document.querySelectorAll(".session-fix-mistake").forEach((button) => button.addEventListener("click", () => {
        const mistake = state.mistakes.find((item) => item.id === button.dataset.id);
        markMistakeFixed(mistake);
        save();
        render();
      }));
      document.querySelector(".session-card-prev")?.addEventListener("click", () => {
        state.ui.studySessionCardIndex = Math.max(0, Number(state.ui.studySessionCardIndex || 0) - 1);
        save();
        render();
      });
      document.querySelector(".session-card-next")?.addEventListener("click", () => {
        state.ui.studySessionCardIndex = Math.min(sessionCards().length - 1, Number(state.ui.studySessionCardIndex || 0) + 1);
        save();
        render();
      });
      document.querySelectorAll(".session-rate-card").forEach((button) => button.addEventListener("click", () => {
        const cards = sessionCards();
        const index = Math.min(Math.max(0, Number(state.ui.studySessionCardIndex || 0)), Math.max(0, cards.length - 1));
        const card = cards[index];
        if (card) scheduleCardReview(card, button.dataset.rating, { rewardCard: true, mistakeReward: false });
        state.ui.studySessionCardIndex = Math.min(index + 1, Math.max(0, cards.length - 1));
        save();
        render();
      }));
      document.querySelector("#session-check-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (data.summary?.trim()) {
          state.studyTasks.unshift({ id: uid("task"), subject: "Mini-Check", title: data.summary.trim().slice(0, 90), date: todayIso(), done: true });
        }
        state.ui.studySessionStep = 3;
        save();
        render();
      });
      document.querySelector(".complete-study-session")?.addEventListener("click", () => {
        updateStreak();
        trackStudyAction("studySession");
        state.ui.studySessionStep = 0;
        state.ui.studySessionCardIndex = 0;
        pushNotification("Session abgeschlossen", "Deine Lernserie wurde aktualisiert.");
        save();
        location.hash = "#dashboard";
        render();
      });
    }

    if (route === "grades") {
      const selectedSubject = gradeSubjectById(state.ui.selectedGradeSubject);
      const selectedPartial = selectedSubject ? gradeEntryById(selectedSubject, state.ui.selectedPartialGroup) : null;
      document.querySelector("#toggle-subject-form")?.addEventListener("click", () => {
        state.ui.showSubjectForm = !state.ui.showSubjectForm;
        state.ui.selectedGradeSubject = null;
        state.ui.selectedPartialGroup = null;
        save();
        render();
      });
      document.querySelector("#subject-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        const name = String(data.name || "").trim();
        if (!name) return;
        state.subjects.push({ id: uid("sub"), name, weight: Number(data.weight || 1), grades: [] });
        state.ui.showSubjectForm = false;
        save();
        render();
      });
      document.querySelector(".subject-suggest-toggle")?.addEventListener("click", (event) => {
        const combo = event.currentTarget.closest("[data-subject-combo]");
        const open = !combo.classList.contains("open");
        combo.classList.toggle("open", open);
        event.currentTarget.setAttribute("aria-expanded", String(open));
      });
      document.querySelectorAll(".subject-suggestions button").forEach((button) => button.addEventListener("click", () => {
        const combo = button.closest("[data-subject-combo]");
        const input = combo?.querySelector("input[name='name']");
        if (input) {
          input.value = button.dataset.subject || button.textContent.trim();
          input.focus();
        }
        combo?.classList.remove("open");
        combo?.querySelector(".subject-suggest-toggle")?.setAttribute("aria-expanded", "false");
      }));
      document.querySelector("[data-subject-combo] input")?.addEventListener("input", (event) => {
        const combo = event.currentTarget.closest("[data-subject-combo]");
        combo?.classList.remove("open");
        combo?.querySelector(".subject-suggest-toggle")?.setAttribute("aria-expanded", "false");
      });
      document.querySelector("[data-subject-combo] input")?.addEventListener("focus", (event) => {
        const combo = event.currentTarget.closest("[data-subject-combo]");
        combo?.classList.remove("open");
        combo?.querySelector(".subject-suggest-toggle")?.setAttribute("aria-expanded", "false");
      });
      const openGradeSubject = (subjectId, row = null) => {
        if (!subjectId) return;
        if (row) {
          row.classList.remove("show-actions");
          delete row.dataset.swiped;
          delete row.dataset.swipedAt;
        }
        state.ui.selectedGradeSubject = subjectId;
        state.ui.selectedPartialGroup = null;
        state.ui.showSubjectForm = false;
        state.ui.showGradeEntryForm = false;
        state.ui.showTargetGradeForm = false;
        state.ui.showPartialEntryForm = false;
        state.ui.editingGradeId = "";
        save();
        render();
      };
      document.querySelectorAll(".grade-folder").forEach((button) => button.addEventListener("click", () => {
        const row = button.closest(".subject-folder-row");
        const swipedAt = Number(row?.dataset.swipedAt || 0);
        if (row?.dataset.swiped === "true" && Date.now() - swipedAt < 350) {
          delete row.dataset.swiped;
          delete row.dataset.swipedAt;
          return;
        }
        if (row) {
          row.classList.remove("show-actions");
          delete row.dataset.swiped;
          delete row.dataset.swipedAt;
        }
        openGradeSubject(button.dataset.id || row?.dataset.subjectId, row);
      }));
      document.querySelectorAll(".delete-subject").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        state.subjects = state.subjects.filter((subject) => subject.id !== button.dataset.id);
        if (state.ui.selectedGradeSubject === button.dataset.id) state.ui.selectedGradeSubject = null;
        save();
        render();
      }));
      document.querySelector(".back-to-subjects")?.addEventListener("click", () => {
        state.ui.selectedGradeSubject = null;
        state.ui.selectedPartialGroup = null;
        state.ui.showGradeEntryForm = false;
        state.ui.showTargetGradeForm = false;
        state.ui.showPartialEntryForm = false;
        state.ui.editingGradeId = "";
        save();
        render();
      });
      document.querySelector(".back-to-subject-detail")?.addEventListener("click", () => {
        state.ui.selectedPartialGroup = null;
        state.ui.showPartialEntryForm = false;
        save();
        render();
      });
      document.querySelector("#toggle-grade-entry-form")?.addEventListener("click", () => {
        const willOpen = !state.ui.showGradeEntryForm;
        state.ui.showGradeEntryForm = willOpen;
        state.ui.editingGradeId = "";
        state.ui.showPartialWeightForm = false;
        save();
        render();
      });
      document.querySelector(".target-grade-button")?.addEventListener("click", () => {
        state.ui.showTargetGradeForm = !state.ui.showTargetGradeForm;
        save();
        render();
      });
      document.querySelector("#target-grade-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (selectedSubject) {
          selectedSubject.targetGrade = data.targetGrade || "";
          state.ui.targetGradeWeight = data.targetWeight || "1";
          state.ui.targetGradeCategoryId = data.targetCategoryId || "";
        }
        state.ui.showTargetGradeForm = false;
        save();
        render();
      });
      document.querySelectorAll(".grade-mode-option").forEach((button) => button.addEventListener("click", () => {
        if (!selectedSubject) return;
        selectedSubject.gradeMode = button.dataset.mode || "simple";
        state.ui.whatIfResult = null;
        state.ui.showGradeEntryForm = false;
        state.ui.editingGradeId = "";
        save();
        render();
      }));
      document.querySelector(".category-normalize-toggle")?.addEventListener("change", (event) => {
        if (!selectedSubject) return;
        selectedSubject.normalizeCategories = event.currentTarget.checked;
        save();
        render();
      });
      document.querySelector("#category-add-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!selectedSubject) return;
        const data = formData(event.currentTarget);
        selectedSubject.gradeCategories.push({
          id: uid("cat"),
          name: String(data.name || "").trim() || "Kategorie",
          percentage: Math.max(0, Number(data.percentage || 0))
        });
        save();
        render();
      });
      document.querySelectorAll(".category-name-input").forEach((input) => input.addEventListener("change", () => {
        if (!selectedSubject) return;
        const category = gradeCategoryById(selectedSubject, input.dataset.id);
        if (!category) return;
        category.name = input.value.trim() || "Kategorie";
        save();
        render();
      }));
      document.querySelectorAll(".category-percent-input").forEach((input) => input.addEventListener("change", () => {
        if (!selectedSubject) return;
        const category = gradeCategoryById(selectedSubject, input.dataset.id);
        if (!category) return;
        category.percentage = Math.max(0, Number(input.value || 0));
        save();
        render();
      }));
      document.querySelectorAll(".delete-category").forEach((button) => button.addEventListener("click", () => {
        if (!selectedSubject || selectedSubject.gradeCategories.length <= 1) return;
        selectedSubject.gradeCategories = selectedSubject.gradeCategories.filter((category) => category.id !== button.dataset.id);
        selectedSubject.grades.forEach((grade) => {
          if (grade.categoryId === button.dataset.id) grade.categoryId = "";
        });
        save();
        render();
      }));
      document.querySelectorAll(".weight-quick").forEach((button) => button.addEventListener("click", () => {
        const input = document.querySelector(`#${button.dataset.target}`);
        if (input) input.value = button.dataset.weight || "1";
      }));
      document.querySelector("#what-if-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        if (!subject || data.value === "") return;
        const value = parseNumberInput(data.value);
        if (!Number.isFinite(value)) return;
        const weight = parseWeightInput(data.weight, 1);
        const categoryId = subject.gradeMode === "category" ? (data.categoryId || subject.gradeCategories?.[0]?.id || "") : "";
        state.ui.whatIfResult = {
          subjectId: subject.id,
          title: String(data.title || "").trim(),
          value,
          weight,
          categoryId,
          average: projectSubjectAverage(subject, value, { weight, categoryId })
        };
        save();
        render();
      });
      document.querySelector(".save-what-if-grade")?.addEventListener("click", () => {
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        const result = state.ui.whatIfResult;
        if (!subject || !result || result.subjectId !== subject.id) return;
        const examNumber = subject.grades.filter((grade) => grade.type !== "partial").length + 1;
        subject.grades.push({
          id: uid("grade"),
          type: "exam",
          title: result.title || `Prüfung ${examNumber}`,
          date: todayIso(),
          value: Number(result.value),
          weight: parseWeightInput(result.weight, 1),
          categoryId: result.categoryId || ""
        });
        state.ui.whatIfResult = null;
        save();
        render();
      });
      document.querySelector("#grade-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        if (!subject) return;
        const existingGrade = data.gradeId ? gradeEntryById(subject, data.gradeId) : null;
        const categoryId = subject.gradeMode === "category" ? (data.categoryId || subject.gradeCategories?.[0]?.id || "") : "";
        const weight = parseWeightInput(data.weight, 1);
        if (!existingGrade && data.isPartialFolder === "on") {
          const folderNumber = subject.grades.filter((grade) => grade.type === "partial").length + 1;
          const title = String(data.title || "").trim() || `Noten-Ordner ${folderNumber}`;
          const nextFolder = {
            id: uid("partial"),
            type: "partial",
            title,
            date: data.date || todayIso(),
            weight,
            categoryId,
            partialGrades: []
          };
          subject.grades.push(nextFolder);
          state.ui.selectedPartialGroup = nextFolder.id;
          state.ui.showPartialEntryForm = true;
        } else if (data.value !== "") {
          const value = parseNumberInput(data.value);
          if (!Number.isFinite(value)) return;
          const examNumber = subject.grades.filter((grade) => grade.type !== "partial").length + 1;
          const title = String(data.title || "").trim() || (existingGrade?.title || `Prüfung ${examNumber}`);
          const nextGrade = {
            id: existingGrade?.id || uid("grade"),
            type: "exam",
            title,
            date: data.date || todayIso(),
            value,
            weight,
            categoryId
          };
          if (existingGrade) Object.assign(existingGrade, nextGrade);
          else subject.grades.push(nextGrade);
        } else {
          return;
        }
        state.ui.showGradeEntryForm = false;
        state.ui.whatIfResult = null;
        state.ui.editingGradeId = "";
        save();
        render();
      });
      document.querySelectorAll(".edit-grade-entry").forEach((button) => button.addEventListener("click", () => {
        const row = button.closest(".grade-swipe-row");
        if (row?.dataset.swiped === "true") {
          delete row.dataset.swiped;
          return;
        }
        state.ui.editingGradeId = button.dataset.id || "";
        state.ui.showGradeEntryForm = true;
        state.ui.showTargetGradeForm = false;
        state.ui.whatIfResult = null;
        save();
        render();
      }));
      const openPartialFolder = (folderId, row) => {
        if (row?.dataset.swiped === "true") {
          delete row.dataset.swiped;
          return;
        }
        if (!folderId) return;
        state.ui.selectedPartialGroup = folderId;
        state.ui.showPartialEntryForm = false;
        state.ui.showGradeEntryForm = false;
        state.ui.showTargetGradeForm = false;
        state.ui.showPartialWeightForm = false;
        save();
        render();
      };
      document.querySelectorAll(".open-partial-folder").forEach((button) => button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPartialFolder(button.dataset.id, button.closest(".grade-swipe-row"));
      }));
      document.querySelectorAll(".partial-folder-row").forEach((row) => row.addEventListener("click", (event) => {
        if (event.target.closest(".delete-grade")) return;
        openPartialFolder(row.dataset.partialId, row);
      }));
      document.querySelector("#toggle-partial-entry-form")?.addEventListener("click", () => {
        state.ui.showPartialEntryForm = !state.ui.showPartialEntryForm;
        state.ui.showPartialWeightForm = false;
        save();
        render();
      });
      document.querySelector(".partial-weight-button")?.addEventListener("click", () => {
        state.ui.showPartialWeightForm = !state.ui.showPartialWeightForm;
        state.ui.showPartialEntryForm = false;
        save();
        render();
      });
      document.querySelector("#partial-weight-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (selectedPartial?.type === "partial") selectedPartial.weight = parseWeightInput(data.weight, 1);
        state.ui.showPartialWeightForm = false;
        save();
        render();
      });
      document.querySelector("#partial-grade-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (selectedPartial?.type === "partial" && data.value !== "") {
          const value = parseNumberInput(data.value);
          if (!Number.isFinite(value)) return;
          const partNumber = selectedPartial.partialGrades.length + 1;
          const title = String(data.title || "").trim() || `Teilprüfung ${partNumber}`;
          selectedPartial.partialGrades.push({ id: uid("part"), title, date: data.date || todayIso(), value });
        }
        state.ui.showPartialEntryForm = false;
        save();
        render();
      });
      document.querySelectorAll(".delete-grade").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        if (!subject) return;
        const partialId = button.dataset.partial;
        if (partialId) {
          const partial = gradeEntryById(subject, partialId);
          if (partial?.partialGrades) partial.partialGrades = partial.partialGrades.filter((entry) => entry.id !== button.dataset.grade);
        } else {
          subject.grades = subject.grades.filter((grade) => grade.id !== button.dataset.grade);
          if (state.ui.selectedPartialGroup === button.dataset.grade) state.ui.selectedPartialGroup = null;
        }
        if (state.ui.editingGradeId === button.dataset.grade) state.ui.editingGradeId = "";
        save();
        render();
      }));
      document.querySelectorAll(".grade-swipe-row, .subject-folder-row").forEach((row) => {
        let startX = 0;
        let startY = 0;
        let startOffset = 0;
        let currentOffset = 0;
        let dragging = false;
        let moved = false;
        let tapCanceled = false;
        const swipeWidth = 90;
        const setSwipeOffset = (value) => {
          currentOffset = Math.max(0, Math.min(swipeWidth, value));
          row.style.setProperty("--swipe-offset", `${currentOffset}px`);
          row.classList.toggle("swiping", dragging);
        };
        const finishSwipe = () => {
          if (!dragging) return;
          dragging = false;
          row.classList.remove("swiping");
          row.style.removeProperty("--swipe-offset");
          if (row.classList.contains("subject-folder-row") && !moved && !tapCanceled) {
            openGradeSubject(row.dataset.subjectId || row.querySelector(".grade-folder")?.dataset.id, row);
            return;
          }
          const openedActions = moved && currentOffset > swipeWidth * 0.38;
          row.classList.toggle("show-actions", openedActions);
          if (openedActions) {
            row.dataset.swiped = "true";
            row.dataset.swipedAt = String(Date.now());
          }
        };
        row.addEventListener("pointerdown", (event) => {
          if (event.button && event.button !== 0) return;
          if (event.target.closest(".delete-grade, .delete-subject")) return;
          startX = event.clientX || 0;
          startY = event.clientY || 0;
          startOffset = row.classList.contains("show-actions") ? swipeWidth : 0;
          currentOffset = startOffset;
          dragging = true;
          moved = false;
          tapCanceled = false;
          row.setPointerCapture?.(event.pointerId);
        });
        row.addEventListener("pointermove", (event) => {
          if (!dragging) return;
          const deltaX = startX - (event.clientX || startX);
          const deltaY = Math.abs(startY - (event.clientY || startY));
          if (Math.abs(deltaX) > 10 || deltaY > 10) tapCanceled = true;
          if (Math.abs(deltaX) < 12 && deltaY < 10) return;
          if (deltaY > Math.abs(deltaX) + 8) return;
          if (Math.abs(deltaX) > 16) moved = true;
          if (moved) event.preventDefault();
          setSwipeOffset(startOffset + deltaX);
        });
        row.addEventListener("pointerup", finishSwipe);
        row.addEventListener("pointercancel", finishSwipe);
      });
    }

    if (route === "planner") {
      document.querySelector(".planner-prev-month")?.addEventListener("click", () => {
        state.ui.plannerMonthOffset = Number(state.ui.plannerMonthOffset || 0) - 1;
        save();
        render();
      });
      document.querySelector(".planner-next-month")?.addEventListener("click", () => {
        state.ui.plannerMonthOffset = Number(state.ui.plannerMonthOffset || 0) + 1;
        save();
        render();
      });
      document.querySelector("#toggle-event-form")?.addEventListener("click", () => {
        state.ui.showEventForm = !state.ui.showEventForm;
        save();
        render();
      });
      document.querySelectorAll(".calendar-cell[data-date]").forEach((button) => button.addEventListener("click", () => {
        state.ui.selectedPlannerDate = button.dataset.date || todayIso();
        save();
        render();
      }));
      document.querySelector("#event-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (data.kind === "exam") {
          state.exams.unshift({ id: uid("exam"), subject: data.subject, title: data.title, date: data.date, targetGrade: "", minutesPerDay: 25, topics: [data.title] });
        } else if (data.kind === "homework") {
          state.homework.unshift({ id: uid("hw"), subject: data.subject, title: data.title, description: "", dueDate: data.date, priority: "Mittel", status: "Offen" });
        } else {
          state.planEvents.unshift({ id: uid("event"), subject: data.subject, title: data.title, date: data.date, minutes: 25, type: "Termin", auto: false });
        }
        if (data.autoPlan === "on") {
          state.planEvents.unshift(...createAutoPlan({ subject: data.subject, title: data.title, date: data.date, minutes: 25, topics: data.title }));
        }
        trackStudyAction("studyTaskAdded");
        state.ui.showEventForm = false;
        pushNotification("Eintrag gespeichert", `${data.subject}: ${data.title}`);
        save();
        render();
      });
    }

    if (route === "cards") {
      document.querySelector("#card-search")?.addEventListener("input", (event) => {
        state.ui.cardSearch = event.currentTarget.value;
        save();
        const cursor = event.currentTarget.selectionStart || state.ui.cardSearch.length;
        clearTimeout(cardSearchTimer);
        cardSearchTimer = setTimeout(() => {
          render();
          const input = document.querySelector("#card-search");
          if (input) {
            input.focus();
            input.setSelectionRange(cursor, cursor);
          }
        }, 220);
      });
      document.querySelectorAll(".quizlet-large-stack, .recent-deck-row, .search-deck-row").forEach((button) => button.addEventListener("click", () => {
        if (button.dataset.stack === "mistakes") {
          location.hash = "#mistakes";
          render();
          return;
        }
        state.ui.cardStudyMode = button.dataset.stack;
        state.ui.cardStudyOpen = true;
        state.ui.cardStudyIndex = 0;
        state.ui.selectedCardPackId = button.dataset.packId || "";
        state.ui.selectedCardSubject = button.dataset.subject || (button.dataset.stack === "personal" ? "" : "");
        state.cardStudySession = { ...defaultCardStudySession(), choosing: true };
        save();
        render();
      }));
      document.querySelectorAll(".close-study-view").forEach((button) => button.addEventListener("click", () => {
        state.ui.cardStudyOpen = false;
        state.ui.cardStudyMode = "";
        state.ui.cardStudyIndex = 0;
        resetCardStudySession();
        save();
        render();
      }));
      document.querySelectorAll(".start-deck-session").forEach((button) => button.addEventListener("click", () => {
        startDeckSession(button.dataset.mode || button.dataset.option || "cards");
        save();
        render();
      }));
      document.querySelector(".start-more-cards")?.addEventListener("click", (event) => {
        state.cardStudySession = { ...defaultCardStudySession(), choosing: true };
        startDeckSession(event.currentTarget.dataset.mode || "cards");
        save();
        render();
      });
      document.querySelector(".choose-other-deck")?.addEventListener("click", () => {
        state.ui.cardStudyOpen = true;
        state.cardStudySession = { ...defaultCardStudySession(), choosing: true };
        state.activeModeSession = {};
        state.learningMode = "";
        state.ui.cardStudyIndex = 0;
        save();
        render();
      });
      document.querySelector(".study-prev")?.addEventListener("click", () => {
        state.ui.cardStudyIndex = Math.max(0, Number(state.ui.cardStudyIndex || 0) - 1);
        save();
        render();
      });
      document.querySelector(".study-next")?.addEventListener("click", () => {
        state.ui.cardStudyIndex = Math.min(activeStudyCards().length - 1, Number(state.ui.cardStudyIndex || 0) + 1);
        save();
        render();
      });
      document.querySelectorAll(".srs-rating").forEach((button) => button.addEventListener("click", () => {
        const cards = activeStudyCards();
        const index = Math.min(Math.max(0, Number(state.ui.cardStudyIndex || 0)), Math.max(0, cards.length - 1));
        const card = cards[index];
        if (!card) return;
        if (state.cardStudySession?.active) {
          rateDeckSessionCard(card, button.dataset.rating);
        } else {
          scheduleCardReview(card, button.dataset.rating, { rewardCard: true, mistakeReward: false });
          state.ui.cardStudyIndex = Math.min(index + 1, Math.max(0, cards.length - 1));
        }
        save();
        render();
      }));
      document.querySelector("#test-setup-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        startConfiguredTest({
          write: data.write === "on",
          choice: data.choice === "on",
          mixed: data.mixed === "on",
          direction: data.direction || "front"
        });
        save();
        render();
      });
      document.querySelector("#test-list-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        submitFullTest(event.currentTarget);
        save();
        render();
      });
      document.querySelector(".mode-answer-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (state.cardStudySession?.mode === "test" || state.cardStudySession?.mode === "learn") {
          answerTestQuestion(data.answer || "");
        } else {
          answerCurrentCard(data.answer || "");
        }
        save();
        render();
      });
      document.querySelectorAll(".choice-option").forEach((button) => button.addEventListener("click", () => {
        const answer = button.dataset.answer || button.textContent || "";
        if (state.cardStudySession?.mode === "test" || state.cardStudySession?.mode === "learn") {
          answerTestQuestion(answer);
        } else {
          answerChoiceCard(answer);
        }
        save();
        render();
      }));
      document.querySelector(".mode-next-card")?.addEventListener("click", () => {
        advanceModeSession();
        save();
        render();
      });
      document.querySelectorAll(".save-mode-mistake").forEach((button) => button.addEventListener("click", () => {
        saveModeMistake(button.dataset.answerIndex);
        save();
        render();
      }));
      document.querySelectorAll(".mode-match-tile").forEach((button) => button.addEventListener("click", () => {
        const session = state.cardStudySession || {};
        if (!session.active || session.mode !== "match") return;
        const tileId = button.dataset.tileId || "";
        const selected = session.selectedMatchTileId || "";
        if (!selected) {
          state.cardStudySession = { ...session, selectedMatchTileId: tileId, lastWrongTileIds: [], lastResult: null };
          state.activeModeSession = { ...state.cardStudySession };
          save();
          render();
          return;
        }
        if (selected === tileId) {
          state.cardStudySession = { ...session, selectedMatchTileId: "", lastWrongTileIds: [], lastResult: null };
          state.activeModeSession = { ...state.cardStudySession };
          save();
          render();
          return;
        }
        const first = parseMatchTileId(selected);
        const second = parseMatchTileId(tileId);
        const correct = first.pairId === second.pairId && first.side !== second.side;
        const matchedIds = correct ? [...new Set([...(session.matchedIds || []), first.pairId])] : [...(session.matchedIds || [])];
        state.cardStudySession = {
          ...session,
          matchedIds,
          selectedMatchTileId: "",
          selectedPromptId: "",
          selectedAnswerId: "",
          wrongAttempts: Number(session.wrongAttempts || 0) + (correct ? 0 : 1),
          matchPenaltySeconds: Number(session.matchPenaltySeconds || 0) + (correct ? 0 : 1),
          lastWrongTileIds: correct ? [] : [selected, tileId],
          lastResult: { correct }
        };
        state.activeModeSession = { ...state.cardStudySession };
        if (correct) setCardReviewOnly(activeStudyCards().find((card) => card.id === first.pairId), "good");
        if (matchedIds.length >= Number(session.target || session.matchPairs?.length || 0)) completeDeckSession();
        save();
        render();
      }));
      document.querySelectorAll(".mode-match-prompt").forEach((button) => button.addEventListener("click", () => {
        const session = state.cardStudySession || {};
        const promptId = button.dataset.id;
        const answerId = session.selectedAnswerId || "";
        if (answerId) {
          const correct = promptId === answerId;
          const matchedIds = correct ? [...new Set([...(session.matchedIds || []), promptId])] : [...(session.matchedIds || [])];
          state.cardStudySession = {
            ...session,
            matchedIds,
            selectedPromptId: "",
            selectedAnswerId: "",
            wrongAttempts: Number(session.wrongAttempts || 0) + (correct ? 0 : 1),
            lastResult: { correct }
          };
          state.activeModeSession = { ...state.cardStudySession };
          if (correct) setCardReviewOnly(activeStudyCards().find((card) => card.id === promptId), "good");
          if (matchedIds.length >= Number(session.target || session.matchPairs?.length || 0)) completeDeckSession();
        } else {
          state.cardStudySession.selectedPromptId = promptId;
          state.cardStudySession.lastResult = null;
        }
        save();
        render();
      }));
      document.querySelectorAll(".mode-match-answer").forEach((button) => button.addEventListener("click", () => {
        const session = state.cardStudySession || {};
        const answerId = button.dataset.id;
        const promptId = session.selectedPromptId || "";
        if (!promptId) {
          state.cardStudySession.selectedAnswerId = answerId;
          save();
          render();
          return;
        }
        const correct = promptId === answerId;
        const matchedIds = correct ? [...new Set([...(session.matchedIds || []), promptId])] : [...(session.matchedIds || [])];
        state.cardStudySession = {
          ...session,
          matchedIds,
          selectedPromptId: "",
          selectedAnswerId: "",
          wrongAttempts: Number(session.wrongAttempts || 0) + (correct ? 0 : 1),
          lastResult: { correct }
        };
        state.activeModeSession = { ...state.cardStudySession };
        if (correct) setCardReviewOnly(activeStudyCards().find((card) => card.id === promptId), "good");
        if (matchedIds.length >= Number(session.target || session.matchPairs?.length || 0)) completeDeckSession();
        save();
        render();
      }));
      document.querySelector("#toggle-card-create")?.addEventListener("click", () => {
        state.ui.cardCreateOpen = !state.ui.cardCreateOpen;
        if (!state.ui.cardCreateOpen) state.ui.cardCreateMode = "";
        save();
        render();
      });
      document.querySelector(".close-card-create")?.addEventListener("click", () => {
        state.ui.cardCreateOpen = false;
        state.ui.cardCreateMode = "";
        save();
        render();
      });
      document.querySelectorAll(".choose-card-mode").forEach((button) => button.addEventListener("click", () => {
        state.ui.cardCreateMode = button.dataset.mode;
        save();
        render();
      }));
      document.querySelectorAll(".study-flashcard").forEach((card) => card.addEventListener("click", () => {
        card.classList.toggle("flipped");
      }));
      document.querySelector("#card-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        state.flashcards.push({ id: uid("card"), subject: data.subject, title: data.subject, question: data.question, answer: data.answer, difficulty: Number(data.difficulty), reviewCount: 0, source: "private", published: false });
        state.ui.cardCreateOpen = false;
        save();
        render();
      });
      document.querySelector("#photo-card-input")?.addEventListener("change", (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        state.ui.lastPhotoName = file.name;
        pushNotification("Foto-Funktion kommt bald", "Lynxly speichert hier noch keine Karten aus Fotos.");
        save();
        render();
      });
    }

    if (route === "mistakes") {
      document.querySelector(".toggle-mistake-form")?.addEventListener("click", () => {
        state.ui.showMistakeForm = !state.ui.showMistakeForm;
        save();
        render();
      });
      document.querySelector(".cancel-mistake-form")?.addEventListener("click", () => {
        state.ui.showMistakeForm = false;
        save();
        render();
      });
      document.querySelector("#mistake-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        saveMistake({
          subject: data.subject,
          topic: data.topic,
          question: data.question,
          userAnswer: data.userAnswer,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation,
          source: "Manuell"
        });
        state.ui.showMistakeForm = false;
        save();
        render();
      });
      document.querySelectorAll(".mistake-filter").forEach((button) => button.addEventListener("click", () => {
        state.ui.mistakeFilter = button.dataset.filter;
        save();
        render();
      }));
      document.querySelectorAll(".fix-mistake, .reopen-mistake").forEach((button) => button.addEventListener("click", () => {
        const mistake = state.mistakes.find((item) => item.id === button.dataset.id);
        if (!mistake) return;
        if (button.classList.contains("reopen-mistake")) {
          mistake.reviewStatus = "open";
        } else {
          markMistakeFixed(mistake);
        }
        save();
        render();
      }));
    }

    if (route === "bot") {
      document.querySelector("#ai-attach-toggle")?.addEventListener("click", () => {
        state.ui.aiAttachMenuOpen = !state.ui.aiAttachMenuOpen;
        save();
        render();
      });
      document.querySelector("#ai-photo-input")?.addEventListener("change", async (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
          state.chat.push({ id: uid("msg"), role: "bot", text: "Bitte wähle ein Foto aus deiner Mediathek aus." });
          save();
          render();
          return;
        }
        try {
          pendingChatAttachment = { name: file.name, kind: "photo", dataUrl: await prepareChatImage(file) };
          state.ui.chatAttachmentName = file.name;
          state.ui.aiAttachMenuOpen = false;
          save();
          render();
        } catch (error) {
          pendingChatAttachment = null;
          state.ui.chatAttachmentName = "";
          state.chat.push({ id: uid("msg"), role: "bot", text: "Das Foto konnte nicht gelesen werden. Bitte probiere ein anderes Bild." });
          save();
          render();
        }
      });
      document.querySelector("#ai-file-input")?.addEventListener("change", async (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        const snippet = await readFileSnippet(file);
        pendingChatAttachment = { name: file.name, kind: "file", dataUrl: "", text: snippet };
        state.ui.chatAttachmentName = file.name;
        state.ui.aiAttachMenuOpen = false;
        save();
        render();
      });
      document.querySelector(".voice-input")?.addEventListener("click", startVoiceInput);
      document.querySelector("#chat-input")?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        event.currentTarget.closest("form")?.requestSubmit();
      });
      document.querySelectorAll(".ai-quick-action").forEach((button) => button.addEventListener("click", () => {
        const input = document.querySelector("#chat-input");
        input.value = `${button.dataset.prompt || ""}${input.value}`.trim();
        input.focus();
      }));
      document.querySelectorAll(".save-ai-flashcards").forEach((button) => button.addEventListener("click", () => {
        const answer = state.chat.find((message) => message.id === button.dataset.id)?.text || "";
        const question = lastUserMessageBefore(button.dataset.id);
        state.flashcards.push({ id: uid("card"), subject: "KI", title: "Lynxly AI", question, answer, difficulty: 2, reviewCount: 0, source: "ai", published: false });
        pushNotification("Karte gespeichert", "Die KI-Antwort wurde als Karte abgelegt.");
        save();
        render();
      }));
      document.querySelectorAll(".save-ai-mistake").forEach((button) => button.addEventListener("click", () => {
        const answer = state.chat.find((message) => message.id === button.dataset.id)?.text || "";
        saveMistake({ subject: "KI", topic: "KI-Übung", question: lastUserMessageBefore(button.dataset.id), correctAnswer: "", userAnswer: "", explanation: answer, source: "KI" });
        pushNotification("Fehler gespeichert", "Der Punkt wurde in die Fehlerbank gelegt.");
        save();
        render();
      }));
      document.querySelectorAll(".save-ai-task").forEach((button) => button.addEventListener("click", () => {
        const question = lastUserMessageBefore(button.dataset.id);
        state.studyTasks.unshift({ id: uid("task"), subject: "KI", title: question.slice(0, 80), date: todayIso(), done: false });
        trackStudyAction("studyTaskAdded");
        pushNotification("Lernaufgabe gespeichert", "Die Aufgabe erscheint jetzt auf Home.");
        save();
        render();
      }));
      document.querySelector("#chat-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = formData(event.currentTarget).message.trim();
        const attachment = pendingChatAttachment?.name === state.ui.chatAttachmentName ? state.ui.chatAttachmentName : "";
        const imageData = pendingChatAttachment?.name === attachment && pendingChatAttachment.kind === "photo" ? pendingChatAttachment.dataUrl : "";
        const fileText = pendingChatAttachment?.name === attachment && pendingChatAttachment.kind === "file" && pendingChatAttachment.text ? `\n\nDateiauszug aus ${attachment}:\n${pendingChatAttachment.text}` : "";
        if (!message && !attachment) return;
        if (state.settings.aiQuestionsUsed >= state.settings.aiLimit) {
          state.chat.push({ id: uid("msg"), role: "bot", text: `${planLabel(currentPlan())}-Limit erreicht: ${state.settings.aiLimit} KI-Fragen in diesem Monat sind genutzt.` });
        } else {
          const userText = message || (attachment ? `Bitte hilf mir mit ${pendingChatAttachment?.kind === "file" ? "dieser Datei" : "diesem Foto"}.` : "");
          const attachmentLabel = attachment ? ` [${pendingChatAttachment?.kind === "file" ? "Datei" : "Foto"}: ${attachment}]` : "";
          state.chat.push({ id: uid("msg"), role: "user", text: `${userText}${attachmentLabel}` });
          state.chat.push({ id: uid("msg"), role: "bot", text: "Ich denke kurz nach ..." });
          state.ui.chatAttachmentName = "";
          save();
          render();
          const answer = await askLynxlyAI(`${userText}${fileText}`, attachment, imageData);
          const placeholder = [...state.chat].reverse().find((msg) => msg.role === "bot" && msg.text === "Ich denke kurz nach ...");
          if (placeholder) placeholder.text = answer;
          state.settings.aiQuestionsUsed += 1;
        }
        pendingChatAttachment = null;
        state.ui.chatAttachmentName = "";
        save();
        render();
      });
    }

    if (route === "premium") {
      document.querySelectorAll(".setting-control").forEach((control) => control.addEventListener("change", () => {
        if (!isPlus()) return;
        state.settings[control.name] = control.value;
        save();
        render();
      }));
    }
  };

  themeToggle?.addEventListener("click", () => {
    ensureCollections();
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    save();
    render();
  });
  settingsButton?.addEventListener("click", () => {
    location.hash = "#settings";
  });
  navLinks.forEach((link) => link.addEventListener("click", () => {
    if (link.dataset.route !== "progress") return;
    ensureCollections();
    state.ui.progressTab = "friends";
    state.ui.leaderboardTab = "xp";
    save();
  }));
  logoutButton?.addEventListener("click", () => {
    ensureCollections();
    state.user.loggedIn = false;
    state.ui.selectedGradeSubject = null;
    state.ui.selectedPartialGroup = null;
    state.ui.cardCreateOpen = false;
    save();
    location.hash = "#dashboard";
    render();
  });

  ensureCollections();
  applyTheme();
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#dashboard";
  render();
})();





