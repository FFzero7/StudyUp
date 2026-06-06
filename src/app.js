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
  const progressFab = document.querySelector("#progress-fab");
  const logoutButton = document.querySelector("#logout-button");
  const C = window.StudyUpComponents;
  let state = window.StudyUpStorage.load();
  let cardSearchTimer = null;

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
  const leaderboardCategory = { label: "XP", field: "weeklyXp", unit: "XP", note: "diese Woche gelernt" };
  const leagueTiers = [
    { id: "snow", name: "Snow Lynx League", min: 0 },
    { id: "forest", name: "Forest Lynx League", min: 250 },
    { id: "alpine", name: "Alpine Lynx League", min: 650 },
    { id: "shadow", name: "Shadow Lynx League", min: 1250 },
    { id: "northern", name: "Northern Lynx League", min: 2100 }
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
  const normalizePartialGrade = (grade) => ({
    id: grade.id || uid("part"),
    title: grade.title || "Teilprüfung",
    date: grade.date || todayIso(),
    value: Number(grade.value || 0)
  });
  const normalizeGradeEntry = (grade) => {
    if (grade.type === "partial") {
      return {
        id: grade.id || uid("partial"),
        type: "partial",
        title: grade.title || "Teilnoten",
        date: grade.date || todayIso(),
        partialGrades: (grade.partialGrades || []).map(normalizePartialGrade)
      };
    }
    return {
      id: grade.id || uid("grade"),
      type: "exam",
      title: grade.title || "Prüfung",
      date: grade.date || todayIso(),
      value: Number(grade.value || 0)
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
  const tierForXp = (xp) => [...leagueTiers].reverse().find((tier) => Number(xp || 0) >= tier.min) || leagueTiers[0];
  const tierById = (id) => leagueTiers.find((tier) => tier.id === id) || leagueTiers[1];
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
    state.leagueTier = state.leagueTier || state.classLeague.tier || "forest";
    state.classCode = state.classCode || state.classLeague.classCode || "LYNX-2B";
    state.classLeague.tier = state.leagueTier;
    state.classLeague.classCode = state.classCode;
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
    toast.innerHTML = `<strong>+${xp} XP</strong><span>${C.escapeHtml(cleanReason)}</span><i aria-hidden="true"></i>`;
    xpToastLayer.appendChild(toast);
    window.setTimeout(() => toast.remove(), options.levelUp ? 1800 : 1250);
  };
  const showLevelUpToast = (level) => {
    const name = level?.title || "Sharp Lynx";
    if (xpLive) xpLive.textContent = `Level up! Du bist jetzt ${name}.`;
    if (!xpToastLayer) return;
    const toast = document.createElement("div");
    toast.className = "xp-toast level-up-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `${C.mascot("mascot-small")}<div><strong>Level up!</strong><span>Du bist jetzt ${C.escapeHtml(name)}.</span></div>`;
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
    state.leagueTier = tierForXp(state.xpThisWeek).id;
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
    tier: state.leagueTier || "forest"
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
      grades: [],
      ...subject,
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
  const subjectHasGrades = (subject) => gradeValues(subject.grades || []).length > 0;

  const weightedAverage = () => {
    const weighted = state.subjects
      .filter(subjectHasGrades)
      .map((subject) => ({ value: average(subject.grades), weight: Number(subject.weight || 1) }));
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

  const plusPointsFor = (subject) => subjectHasGrades(subject) ? plusPointsForAverage(average(subject.grades)) * Number(subject.weight || 1) : 0;
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
    state.leagueTier = "snow";
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
      const due = dueCards().length;
      cardsNavBadge.textContent = String(due);
      cardsNavBadge.hidden = due === 0;
    }
    if (themeIcon) themeIcon.innerHTML = state.settings.theme === "dark" ? "&#9728;" : "&#9790;";
    if (themeLabel) themeLabel.textContent = state.settings.theme === "dark" ? "Hell" : "Dunkel";
    if (progressFab) progressFab.hidden = !state.user.loggedIn;
  };

  const getRoute = () => {
    const route = location.hash.replace("#", "");
    if (route === "homework") return "planner";
    return routes.includes(route) ? route : "dashboard";
  };

  const setActiveNav = (route) => {
    const visibleRoute = { mistakes: "dashboard", progress: "dashboard", session: "dashboard", premium: "dashboard", settings: "dashboard" }[route] || route;
    navLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === visibleRoute));
    progressFab?.classList.toggle("active", route === "progress");
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
  const dueCards = () => allCardsForReview().filter((card) => !card.nextReview || card.nextReview <= todayIso());
  const nextExamOrHomework = () => calendarItems().find((item) => (item.exam || item.homework) && item.date >= todayIso());
  const weakestSubject = () => {
    const graded = [...state.subjects].filter(subjectHasGrades).sort((a, b) => plusPointsFor(a) - plusPointsFor(b))[0];
    if (graded) return { name: graded.name, reason: `${formatPlusPoints(plusPointsFor(graded))} und ${average(graded.grades).toFixed(2)} Schnitt`, href: "#grades" };
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
    const cards = dueCards().slice(0, 3).map((card) => ({ id: card.id, title: card.question, subject: card.subject, href: "#cards", kind: "Karte fällig" }));
    const mistakes = openMistakes().slice(0, 3).map((mistake) => ({ id: mistake.id, title: mistake.question, subject: mistake.subject, href: "#mistakes", kind: "Fehler wiederholen" }));
    return [...manual, ...calendar, ...mistakes, ...cards].slice(0, 6);
  };
  const saveMistake = (mistake, options = {}) => {
    state.mistakes.unshift(normalizeMistake(mistake));
    state.mistakes = state.mistakes.slice(0, 200);
    if (options.reward !== false) trackStudyAction("mistakeSaved");
  };
  const reviewOffsetForRating = (rating) => ({ again: 1, hard: 2, good: 4, easy: 7 })[rating] || 3;
  const scheduleCardReview = (card, rating) => {
    state.cardSchedule[card.id] = { rating, nextReview: addDays(todayIso(), reviewOffsetForRating(rating)), lastReviewed: todayIso() };
    state.cardReviewStatus = state.cardReviewStatus || {};
    state.cardReviewStatus[card.id] = rating;
    const ownedCard = state.flashcards.find((item) => item.id === card.id);
    if (ownedCard) ownedCard.reviewCount = Number(ownedCard.reviewCount || 0) + 1;
    trackStudyAction("cardReviewed");
    if (rating === "again" || rating === "hard") {
      saveMistake({
        subject: card.subject,
        topic: card.title || card.subject,
        question: card.question,
        correctAnswer: card.answer,
        userAnswer: rating === "again" ? "Nicht gewusst" : "Unsicher",
        explanation: "Aus Karteikarten-Wiederholung gespeichert.",
        source: "Karten"
      });
    }
  };
  const updateStreak = () => {
    const today = todayIso();
    if (state.streak.lastStudyDate === today) return;
    const yesterday = addDays(today, -1);
    state.streak.current = state.streak.lastStudyDate === yesterday ? Number(state.streak.current || 0) + 1 : 1;
    state.streak.weeklySessions = Number(state.streak.weeklySessions || 0) + 1;
    state.streak.lastStudyDate = today;
  };
  const requiredNextGrade = (subject) => {
    if (!subject?.targetGrade || !subjectHasGrades(subject)) return null;
    const values = gradeValues(subject.grades);
    const target = Number(subject.targetGrade);
    if (!Number.isFinite(target)) return null;
    return target * (values.length + 1) - values.reduce((sum, value) => sum + value, 0);
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
    if (dueCards().length) return { title: `${dueCards().length} Karte(n) heute wiederholen`, href: "#cards" };
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
    const dueBySubject = dueCards().reduce((counts, card) => {
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
    return `
      <a class="progress-teaser-card focus-card" href="#progress">
        <div class="mascot-card-head">${C.mascot("mascot-small")}<div><span>Fortschritt</span><h2>Level ${progress.current.level}: ${C.escapeHtml(progress.current.title)}</h2></div></div>
        <p>${state.xpThisWeek} XP diese Woche · ${state.xpTotal} XP gesamt</p>
        ${progressBar(Number(state.xpTotal || 0) - progress.current.min, progress.end - progress.current.min, `Level ${progress.current.level} Fortschritt`)}
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
    const dueCount = dueCards().length;
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
  const sessionCards = () => dueCards().slice(0, 5);
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
    return `min="${system.min}" max="${system.max}" step="0.01" placeholder="${C.escapeHtml(system.example)}"`;
  };

  const gradeSubjectById = (id) => state.subjects.find((subject) => subject.id === id);
  const gradeEntryById = (subject, id) => subject?.grades.find((grade) => grade.id === id);
  const renderGradeActions = (gradeId, partialId = "") => `
    <div class="grade-row-actions">
      <button class="icon-action rename-grade" data-grade="${gradeId}" data-partial="${partialId}" type="button" title="Umbenennen" aria-label="Prüfung umbenennen">${C.icon("edit")}</button>
      <button class="icon-action delete-grade" data-grade="${gradeId}" data-partial="${partialId}" type="button" title="Löschen" aria-label="Prüfung löschen">${C.icon("trash")}</button>
    </div>
  `;
  const renderGradeEntryRow = (grade) => {
    const isPartial = grade.type === "partial";
    const value = gradeValue(grade);
    return `
      <article class="grade-swipe-row ${isPartial ? "partial-folder-row" : ""}">
        <button class="grade-row-main ${isPartial ? "open-partial-folder" : ""}" data-id="${grade.id}" type="button">
          <span class="grade-row-icon">${C.icon(isPartial ? "folder" : "chart")}</span>
          <div>
            <strong>${C.escapeHtml(grade.title)}</strong>
            <small>${isPartial ? `${grade.partialGrades.length} Teilprüfungen · Gewicht 1` : (grade.date ? formatDate(grade.date) : "Ohne Datum")}</small>
          </div>
          <em>${Number.isFinite(value) ? value.toFixed(2) : "–"}</em>
        </button>
        ${renderGradeActions(grade.id)}
      </article>
    `;
  };

  const renderSubjectFolders = () => state.subjects.map((subject) => {
    const avg = subjectHasGrades(subject) ? average(subject.grades) : null;
    const points = plusPointsFor(subject);
    return `
      <article class="subject-folder-row">
        <button class="grade-folder" data-id="${subject.id}" type="button">
          <span class="folder-icon">${C.icon("book")}</span>
          <div><strong>${C.escapeHtml(subject.name)}</strong><small>${subject.grades.length} Prüfung${subject.grades.length === 1 ? "" : "en"}</small></div>
          <em>${avg === null ? "–" : avg.toFixed(2)}</em>
          <b class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</b>
        </button>
        <button class="icon-action delete-subject" data-id="${subject.id}" type="button" title="Fach löschen" aria-label="${C.escapeHtml(subject.name)} löschen">${C.icon("trash")}</button>
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
          <label>Fach<select name="name" required>${subjectChoices.map((subject) => `<option value="${C.escapeHtml(subject)}">${C.escapeHtml(subject)}</option>`).join("")}</select></label>
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

  const renderGradeSubjectDetail = (subject) => {
    const avg = subjectHasGrades(subject) ? average(subject.grades) : null;
    const points = plusPointsFor(subject);
    const target = subject.targetGrade ? Number(subject.targetGrade).toFixed(2) : "–";
    const needed = requiredNextGrade(subject);
    const trend = subjectTrend(subject);
    return `
      <section class="grade-page">
        <div class="grade-page-header folder-detail-header">
          <button class="secondary-button back-to-subjects" type="button">Zurück</button>
          <h1>${C.escapeHtml(subject.name)}</h1>
          <button class="round-add" id="toggle-grade-entry-form" type="button" aria-label="Prüfung hinzufügen">+</button>
        </div>
        <div class="subject-score-row">
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article class="target-grade-card"><span>Wunschnote</span><button class="target-grade-button" type="button">${C.escapeHtml(target)}</button></article>
          <article><span>Pluspunkte</span><strong class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</strong></article>
        </div>
        <div class="grade-coach-row">
          <article><span>Nächste Note für Ziel</span><strong>${Number.isFinite(needed) ? needed.toFixed(2) : "-"}</strong></article>
          <article><span>Trend</span><strong>${C.escapeHtml(trend)}</strong></article>
          <button class="secondary-button create-subject-task" data-subject="${C.escapeHtml(subject.name)}" type="button">Lerntermin planen</button>
        </div>
        <form class="target-grade-form ${state.ui.showTargetGradeForm ? "show" : ""}" id="target-grade-form">
          <label>Wunschnote<input name="targetGrade" type="number" ${gradeInputAttrs()} value="${C.escapeHtml(subject.targetGrade || "")}" /></label>
          <button class="primary-button" type="submit">Wunschnote speichern</button>
        </form>
        <form class="grade-entry-form ${state.ui.showGradeEntryForm ? "show" : ""}" id="grade-form">
          <label>Prüfung oder Ordner<input name="title" required placeholder="z. B. Mathe-Test" /></label>
          <label>Datum<input name="date" type="date" value="${todayIso()}" /></label>
          <label>Note<input name="value" type="number" ${gradeInputAttrs()} /></label>
          <label class="toggle-field"><input name="isPartial" type="checkbox" value="partial" /><span>Teilnoten</span><small>Erstellt einen Ordner für Teilprüfungen. Gewicht immer 1.</small></label>
          <button class="primary-button" type="submit">Speichern</button>
        </form>
        ${state.ui.showGradeEntryForm ? "" : `<section class="grade-entry-list">
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
          <button class="secondary-button back-to-subject-detail" type="button">Zurück</button>
          <h1>${C.escapeHtml(group.title)}</h1>
          <button class="round-add" id="toggle-partial-entry-form" type="button" aria-label="Teilprüfung hinzufügen">+</button>
        </div>
        <div class="subject-score-row partial-score-row">
          <article><span>Fach</span><strong>${C.escapeHtml(subject.name)}</strong></article>
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article><span>Gewicht</span><strong>1</strong></article>
        </div>
        <form class="grade-entry-form ${state.ui.showPartialEntryForm ? "show" : ""}" id="partial-grade-form">
          <label>Teilprüfung<input name="title" required placeholder="z. B. Kurztest 1" /></label>
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
  const recommendedPack = () => filteredLibrary()[0] || state.cardLibrary[0];
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

  const activeStudyCards = () => {
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

  const renderCardStudyView = () => {
    const cards = activeStudyCards();
    const index = Math.min(Math.max(0, Number(state.ui.cardStudyIndex || 0)), Math.max(0, cards.length - 1));
    const card = cards[index];
    return `
      ${C.sectionTitle("Karten", state.ui.cardStudyMode === "personal" ? "Persönliche Karten" : state.ui.cardStudyMode === "due" ? "Heute fällig" : "Empfohlener Stapel")}
      <section class="flashcard-study-area card-study-view">
        <div class="study-view-header">
          <button class="secondary-button close-study-view" type="button">Zurück</button>
          <strong>${cards.length ? `${index + 1} / ${cards.length}` : "0 / 0"}</strong>
        </div>
        ${renderStudyCard(card)}
        <div class="study-nav-row">
          <button class="icon-button study-prev" type="button" ${index <= 0 ? "disabled" : ""} title="Vorherige Karte" aria-label="Vorherige Karte">&#8592;</button>
          <span>${card ? C.escapeHtml(card.subject) : "Keine Karten"}</span>
          <button class="icon-button study-next" type="button" ${index >= cards.length - 1 ? "disabled" : ""} title="Nächste Karte" aria-label="Nächste Karte">&#8594;</button>
        </div>
        ${card ? `<div class="srs-rating-grid">
          <button class="srs-rating again" data-rating="again" type="button">Nochmal</button>
          <button class="srs-rating hard" data-rating="hard" type="button">Schwer</button>
          <button class="srs-rating good" data-rating="good" type="button">Gut</button>
          <button class="srs-rating easy" data-rating="easy" type="button">Einfach</button>
        </div>` : ""}
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

  const renderCards = () => {
    if (state.ui.cardStudyOpen) return renderCardStudyView();
    if (state.ui.cardCreateOpen) return renderCardCreatePanel();
    const personal = personalCards();
    const dueCount = dueCards().length;
    const mistakeCount = openMistakes().length;
    const recentDecks = personalDecks().slice(0, 5);
    return `
      <section class="cards-page sleek-screen">
        <div class="grade-page-header cards-page-header">
          <h1>Karten</h1>
          <button class="round-add cards-header-add" id="toggle-card-create" type="button" aria-label="Karte hinzufügen">+</button>
        </div>
      <section class="card-stack-board cards-main-stacks">
        ${renderStack("Heute fällig", "Spaced Repetition", dueCount, "due", dueCount ? "Starten" : "Leer")}
        ${renderStack("Fehlerbank", "Offene Fehler wiederholen", mistakeCount, "mistakes", "Öffnen")}
      </section>
      <div class="sleek-section-title cards-recent-title"><h2>Zuletzt genutzt</h2><span>${recentDecks.length}</span></div>
      <section class="recent-deck-list">
        ${recentDecks.map((deck) => `
          <button class="recent-deck-row" data-stack="personal" data-subject="${C.escapeHtml(deck.title)}" type="button">
            <div class="mini-deck-stack"><i></i><i></i><i></i></div>
            <div><strong>${C.escapeHtml(deck.title)}</strong><small>${C.escapeHtml(deck.subject)} · persönlicher Stapel</small></div>
            <em>${deck.cards.length}</em>
          </button>
        `).join("") || C.emptyState("Noch keine Stapel", "Drücke auf + und erstelle z. B. einen Stapel „Biologie Kl.1“.")}
      </section>
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
            <button class="primary-button toggle-mistake-form" type="button">+ Fehler hinzufügen</button>
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

  const askLynxlyAI = async (message, attachment) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || attachment || "Hilf mir beim Lernen", attachmentName: attachment || "" })
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

  const renderBot = () => {
    const messages = state.chat.length ? state.chat : [{ id: "intro", role: "bot", text: "Stell deine Frage. Ich helfe dir Schritt für Schritt, ohne dir einfach die fertige Lösung zu geben." }];
    const actions = [
      ["Erkläre das", "Erkläre mir das Schritt für Schritt: "],
      ["Frag mich ab", "Frag mich dazu ab: "],
      ["Antwort prüfen", "Prüfe meine Antwort und gib mir Hinweise: "],
      ["Karten erstellen", "Mache daraus Karteikarten: "],
      ["Lernplan machen", "Mache daraus einen Lernplan: "]
    ];
    return `
      <section class="ai-full-page">
        <h1>Lynxly AI</h1>
        <div class="mascot-card ai-mascot-card">${C.mascot("mascot-small")}<p>Lynxly: dein smarter Lerncoach. Ich erkläre ruhig, stelle Rückfragen und helfe dir beim nächsten Schritt.</p></div>
        <section class="ai-window">
          <div class="ai-output">
            ${messages.map((msg) => `<article class="message ${msg.role === "user" ? "user" : "bot"}"><p>${C.escapeHtml(msg.text)}</p>${msg.role === "bot" && msg.id !== "intro" ? `<div class="message-actions"><button class="save-ai-flashcards" data-id="${msg.id}" type="button">Als Karten</button><button class="save-ai-mistake" data-id="${msg.id}" type="button">Als Fehler</button><button class="save-ai-task" data-id="${msg.id}" type="button">Als Aufgabe</button></div>` : ""}</article>`).join("")}
          </div>
          ${state.ui.chatAttachmentName ? `<div class="attachment-pill">${C.icon("camera")} ${C.escapeHtml(state.ui.chatAttachmentName)}</div>` : ""}
          <div class="ai-quick-actions">
            ${actions.map(([label, prompt]) => `<button class="ai-quick-action" data-prompt="${C.escapeHtml(prompt)}" type="button">${C.escapeHtml(label)}</button>`).join("")}
          </div>
          <form id="chat-form" class="ai-full-input">
            <textarea id="chat-input" name="message" placeholder="Frag Lynxly AI"></textarea>
            <div class="ai-input-tools">
              <label class="tool-button" title="Fotoanalyse kommt bald">${C.icon("camera")}<input id="ai-photo-input" type="file" accept="image/*" capture="environment" /></label>
              <button class="tool-button voice-input" type="button" title="Mündlicher Input als Textnotiz">${C.icon("mic")}</button>
              <button class="primary-button" type="submit">${C.icon("send")} Senden</button>
            </div>
          </form>
        </section>
      </section>
    `;
  };

  const scrollAiConversation = () => {
    requestAnimationFrame(() => {
      const output = document.querySelector(".ai-output");
      if (output) output.scrollTop = output.scrollHeight;
      document.querySelector(".ai-window")?.scrollIntoView({ block: "end", behavior: "auto" });
      document.querySelector("#chat-input")?.focus({ preventScroll: true });
    });
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
    const records = state.personalRecords;
    const mascotLine = Number(state.xpThisWeek || 0) > 0
      ? "Lynxly sagt: Du baust diese Woche echte Lernroutine auf. Bleib scharf."
      : "Lynxly sagt: Starte ruhig mit einer Karte oder einem Fehler. Klein zählt auch.";
    return `
      <section class="progress-personal">
        <article class="level-card">
          <div class="level-card-top">
            <div>
              <span>Level ${progress.current.level}</span>
              <h2>${C.escapeHtml(progress.current.title)}</h2>
              <p>${progress.next ? `${progress.remaining} XP bis ${C.escapeHtml(progress.next.title)}` : "Max-Level für dieses MVP erreicht"}</p>
            </div>
            ${C.mascot("mascot-small")}
          </div>
          ${progressBar(Number(state.xpTotal || 0) - progress.current.min, progress.end - progress.current.min, `Level ${progress.current.level} Fortschritt`, "large")}
          <div class="xp-meta"><strong>${state.xpThisWeek} XP diese Woche</strong><span>${state.xpTotal} XP gesamt</span><span>Rang ${classRankInfo().rank} · ${C.escapeHtml(classRankInfo().tier.name)}</span></div>
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
    const mascotText = ownRank > 4
      ? "Lynxly sagt: Eine Karte reicht, um wieder reinzukommen. Kleine Schritte zählen."
      : "Lynxly sagt: Du bist diese Woche stärker geworden. Bleib scharf.";
    return `
      <section class="class-league-page">
        <article class="class-league-hero">
          <div>
            <span>${C.escapeHtml(state.classLeague.demoLabel || "Demo-Klassenliga · lokal gespeichert")}</span>
            <h2>${C.escapeHtml(state.classLeague.className || "Klasse")}</h2>
            <p>${C.escapeHtml(tier.name)} · Woche ${isoWeekNumber()} · Rang ${ownRank || "–"}</p>
          </div>
          <strong class="league-badge">${C.escapeHtml(tier.name)}</strong>
        </article>
        <form class="panel class-league-form" id="class-league-form">
          <div class="panel-header"><div><span>Privatsphäre</span><h2>Klassenliga beitreten</h2></div>${C.icon("lock")}</div>
          <label>Klassen-Code<input name="classCode" value="${C.escapeHtml(state.classCode || state.classLeague.classCode || "LYNX-2B")}" placeholder="LYNX-2B" /></label>
          <label>Anzeigename<input name="displayName" maxlength="24" value="${C.escapeHtml(state.classLeaguePrivacy.displayName || state.user.name || "Du")}" placeholder="z. B. Max" /></label>
          <label class="toggle-field"><input name="joined" type="checkbox" value="on" ${state.classLeaguePrivacy.joined ? "checked" : ""} /><span>Klassenliga nutzen</span><small>Aktuell lokal als Demo gespeichert.</small></label>
          <label class="toggle-field"><input name="visible" type="checkbox" value="on" ${state.classLeaguePrivacy.visible ? "checked" : ""} /><span>Mich in der Klassenliga anzeigen</span><small>Nur XP und Lernaktionen, keine Noten oder E-Mail.</small></label>
          <button class="secondary-button" type="submit">Klassenliga speichern</button>
        </form>
        <article class="mascot-card progress-mascot-card">${C.mascot("mascot-small")}<p>${C.escapeHtml(mascotText)}</p></article>
        <div class="leaderboard-mode-pill" aria-label="Klassenliga nach XP sortiert">XP Leaderboard</div>
        <section class="leaderboard-list class-league-list" aria-label="Wochenranking der Klassenliga">
          ${rows.map((row, index) => {
            const score = Number(row.weeklyXp || 0);
            const name = row.private ? "Privat" : row.displayName;
            return `
              <article class="leaderboard-row class-rank-row ${row.id === "you" ? "you" : ""} ${row.private ? "private" : ""}" aria-label="Rang ${index + 1}: ${C.escapeHtml(name)}, ${row.private ? "privat" : `${score} ${classLeagueCategory.unit}`}">
                <strong>${index + 1}</strong>
                <span class="friend-avatar">${C.escapeHtml(row.initials || name.slice(0, 1))}</span>
                <div><b>${C.escapeHtml(name)}</b><small>${row.id === "you" ? "Du" : C.escapeHtml(classLeagueCategory.note)}</small></div>
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
        <article class="privacy-note-card">${C.icon("lock")} <span>Klassenliga ist opt-in. Gezeigt werden nur sichere Lernwerte: XP, Karten, Fehler, Sessions und Verbesserungswert.</span></article>
        <article class="league-reset-note"><strong>Wöchentlicher Neustart</strong><span>Top-Lernende können sanft aufsteigen. Unten heißt es nur: Bleib dran, nächste Woche startet frisch.</span></article>
      </section>
    `;
  };
  const renderProgress = () => {
    const tab = ["friends", "class"].includes(state.ui.progressTab) ? state.ui.progressTab : "me";
    return `
      <section class="progress-page sleek-screen">
        <div class="mistake-header">
          <div><span class="eyebrow">Lynxly</span><h1>Fortschritt</h1></div>
          <a class="secondary-button" href="#dashboard">Start</a>
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
          <button class="design-toggle-button" type="button">${C.icon("palette")} Design anpassen</button>
          ${renderDesignPanel()}
          <button class="danger-logout settings-logout" type="button">${C.icon("trash")} Ausloggen</button>
        `}
      </section>
    `;
  };

  const render = () => {
    ensureCollections();
    applyTheme();
    const route = getRoute();
    if (route !== location.hash.replace("#", "") && location.hash) location.hash = route;
    setActiveNav(route);
    const views = { dashboard: renderTodayDashboard, grades: renderGrades, planner: renderPlanner, cards: renderCards, mistakes: renderMistakes, progress: renderProgress, session: renderStudySession, bot: renderBot, premium: renderPremium, settings: renderSettings };
    app.classList.remove("page-enter");
    app.innerHTML = state.user.loggedIn ? views[route]() : renderOnboarding();
    requestAnimationFrame(() => app.classList.add("page-enter"));
    bindEvents(route);
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
        if (card) scheduleCardReview(card, button.dataset.rating);
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
        state.subjects.push({ id: uid("sub"), name: data.name, weight: Number(data.weight || 1), grades: [] });
        state.ui.showSubjectForm = false;
        save();
        render();
      });
      document.querySelectorAll(".grade-folder").forEach((button) => button.addEventListener("click", () => {
        state.ui.selectedGradeSubject = button.dataset.id;
        state.ui.selectedPartialGroup = null;
        state.ui.showSubjectForm = false;
        state.ui.showGradeEntryForm = false;
        state.ui.showTargetGradeForm = false;
        state.ui.showPartialEntryForm = false;
        save();
        render();
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
        state.ui.showGradeEntryForm = !state.ui.showGradeEntryForm;
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
        if (selectedSubject) selectedSubject.targetGrade = data.targetGrade || "";
        state.ui.showTargetGradeForm = false;
        save();
        render();
      });
      document.querySelector("#grade-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        if (subject) {
          if (data.isPartial === "partial") {
            subject.grades.push({ id: uid("partial"), type: "partial", title: data.title, date: data.date || todayIso(), partialGrades: [] });
          } else if (data.value !== "") {
            subject.grades.push({ id: uid("grade"), type: "exam", title: data.title, date: data.date || todayIso(), value: Number(data.value) });
          }
        }
        state.ui.showGradeEntryForm = false;
        save();
        render();
      });
      document.querySelectorAll(".open-partial-folder").forEach((button) => button.addEventListener("click", () => {
        state.ui.selectedPartialGroup = button.dataset.id;
        state.ui.showPartialEntryForm = false;
        save();
        render();
      }));
      document.querySelector("#toggle-partial-entry-form")?.addEventListener("click", () => {
        state.ui.showPartialEntryForm = !state.ui.showPartialEntryForm;
        save();
        render();
      });
      document.querySelector("#partial-grade-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (selectedPartial?.type === "partial") {
          selectedPartial.partialGrades.push({ id: uid("part"), title: data.title, date: data.date || todayIso(), value: Number(data.value) });
        }
        state.ui.showPartialEntryForm = false;
        save();
        render();
      });
      document.querySelectorAll(".rename-grade").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        if (!subject) return;
        const partialId = button.dataset.partial;
        const grade = partialId ? gradeEntryById(subject, partialId)?.partialGrades.find((entry) => entry.id === button.dataset.grade) : gradeEntryById(subject, button.dataset.grade);
        if (!grade) return;
        const nextTitle = prompt("Neuer Name", grade.title);
        if (nextTitle?.trim()) {
          grade.title = nextTitle.trim();
          save();
          render();
        }
      }));
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
        save();
        render();
      }));
      document.querySelectorAll(".grade-swipe-row").forEach((row) => {
        let startX = 0;
        row.addEventListener("touchstart", (event) => {
          startX = event.touches[0]?.clientX || 0;
        }, { passive: true });
        row.addEventListener("touchend", (event) => {
          const endX = event.changedTouches[0]?.clientX || startX;
          if (startX - endX > 34) row.classList.add("show-actions");
          if (endX - startX > 34) row.classList.remove("show-actions");
        }, { passive: true });
      });
      document.querySelector(".create-subject-task")?.addEventListener("click", (event) => {
        const subject = event.currentTarget.dataset.subject || selectedSubject?.name || "Lernen";
        state.studyTasks.unshift({ id: uid("task"), subject, title: `${subject} 15 Minuten üben`, date: todayIso(), done: false });
        trackStudyAction("studyTaskAdded");
        pushNotification("Lerntermin geplant", `${subject}: 15 Minuten üben`);
        save();
        location.hash = "#dashboard";
        render();
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
      document.querySelectorAll(".quizlet-large-stack, .recent-deck-row").forEach((button) => button.addEventListener("click", () => {
        if (button.dataset.stack === "mistakes") {
          location.hash = "#mistakes";
          render();
          return;
        }
        state.ui.cardStudyMode = button.dataset.stack;
        state.ui.cardStudyOpen = true;
        state.ui.cardStudyIndex = 0;
        state.ui.selectedCardSubject = button.dataset.subject || (button.dataset.stack === "personal" ? "" : state.ui.selectedCardSubject);
        save();
        render();
      }));
      document.querySelector(".close-study-view")?.addEventListener("click", () => {
        state.ui.cardStudyOpen = false;
        state.ui.cardStudyMode = "";
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
        scheduleCardReview(card, button.dataset.rating);
        state.ui.cardStudyIndex = Math.min(index + 1, Math.max(0, cards.length - 1));
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
      document.querySelector("#ai-photo-input")?.addEventListener("change", (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        state.ui.chatAttachmentName = file.name;
        save();
        render();
      });
      document.querySelector(".voice-input")?.addEventListener("click", () => {
        const input = document.querySelector("#chat-input");
        input.value = `${input.value} Mündliche Notiz: `.trim();
        input.focus();
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
        const attachment = state.ui.chatAttachmentName;
        if (!message && !attachment) return;
        if (state.settings.aiQuestionsUsed >= state.settings.aiLimit) {
          state.chat.push({ id: uid("msg"), role: "bot", text: `${planLabel(currentPlan())}-Limit erreicht: ${state.settings.aiLimit} KI-Fragen in diesem Monat sind genutzt.` });
        } else {
          state.chat.push({ id: uid("msg"), role: "user", text: `${message || "Foto-Frage"}${attachment ? ` [Foto bald: ${attachment}]` : ""}` });
          state.chat.push({ id: uid("msg"), role: "bot", text: "Ich denke kurz nach ..." });
          state.ui.chatAttachmentName = "";
          save();
          render();
          const answer = await askLynxlyAI(message || attachment, attachment);
          const placeholder = [...state.chat].reverse().find((msg) => msg.role === "bot" && msg.text === "Ich denke kurz nach ...");
          if (placeholder) placeholder.text = answer;
          state.settings.aiQuestionsUsed += 1;
        }
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
  progressFab?.addEventListener("click", () => {
    ensureCollections();
    state.ui.progressTab = "friends";
    state.ui.leaderboardTab = "xp";
    save();
    if (getRoute() === "progress") render();
  });
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





