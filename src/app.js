(function () {
  const app = document.querySelector("#app");
  const navLinks = document.querySelectorAll("[data-route]");
  const themeToggle = document.querySelector("#theme-toggle");
  const themeIcon = document.querySelector("#theme-icon");
  const accountButton = document.querySelector("#account-button");
  const accountPanel = document.querySelector("#account-panel");
  const accountAvatar = document.querySelector("#account-avatar");
  const accountName = document.querySelector("#account-name");
  const accountEmail = document.querySelector("#account-email");
  const accountPlan = document.querySelector("#account-plan");
  const accountRegion = document.querySelector("#account-region");
  const accountLogout = document.querySelector("#account-logout");
  const accountDesignNote = document.querySelector("#account-design-note");
  const C = window.StudyUpComponents;
  let state = window.StudyUpStorage.load();

  const routes = ["dashboard", "grades", "planner", "cards", "bot", "premium"];
  const accentColors = {
    blue: "#2563eb",
    green: "#10b981",
    violet: "#7c3aed",
    coral: "#f97316",
    teal: "#14b8a6",
    rose: "#e11d48",
    amber: "#f59e0b",
    slate: "#475569"
  };
  const planSteps = ["Wiederholen", "Üben", "Cards", "Mini-Test", "Fehleranalyse", "Prüfungssimulation"];

  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const pad = (value) => String(value).padStart(2, "0");
  const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const todayIso = () => toIso(new Date());
  const dateObject = (iso) => new Date(`${iso}T12:00:00`);
  const save = () => window.StudyUpStorage.save(state);
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  const planNames = { free: "Free", plus: "Plus", pro: "Pro" };
  const planLimits = { free: 10, plus: 300, pro: 1000 };
  const currentMonthKey = () => todayIso().slice(0, 7);
  const currentPlan = () => {
    const plan = String(state.settings?.plan || "").toLowerCase();
    if (plan === "pro") return "pro";
    if (plan === "plus") return "plus";
    return state.settings?.premiumActive ? "plus" : "free";
  };
  const isPlus = () => ["plus", "pro"].includes(currentPlan());
  const isPro = () => currentPlan() === "pro";
  const aiLimitForPlan = (plan = currentPlan()) => planLimits[plan] || planLimits.free;
  const planLabel = (plan = currentPlan()) => planNames[plan] || planNames.free;
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

  const ensureCollections = () => {
    state.user = { ...window.StudyUpSeed.user, ...(state.user || {}) };
    state.settings = { ...window.StudyUpSeed.settings, ...(state.settings || {}) };
    state.settings.plan = currentPlan();
    state.settings.premiumActive = state.settings.plan !== "free";
    state.settings.planName = planLabel(state.settings.plan);
    state.settings.aiLimit = aiLimitForPlan(state.settings.plan);
    state.settings.density = state.settings.density || "comfortable";
    state.settings.radius = state.settings.radius || "soft";
    state.settings.surface = state.settings.surface || "clean";
    state.settings.cardStyle = state.settings.cardStyle || "stacked";
    state.settings.proStyle = state.settings.proStyle || "focus";
    const questionPeriod = String(state.settings.aiQuestionsDate || "");
    if (!questionPeriod.startsWith(currentMonthKey())) {
      state.settings.aiQuestionsDate = currentMonthKey();
      state.settings.aiQuestionsUsed = 0;
    } else {
      state.settings.aiQuestionsDate = currentMonthKey();
    }
    state.gradeSystems = state.gradeSystems?.length ? state.gradeSystems : copy(window.StudyUpSeed.gradeSystems);
    state.gradeSystems = state.gradeSystems.map((system) => (
      system.id === "ch" ? { ...system, step: 0.01, example: "5.75" } : system
    ));
    state.languages = state.languages?.length ? state.languages : copy(window.StudyUpSeed.languages);
    state.notifications = state.notifications || [];
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
    state.flashcards = (state.flashcards || []).map((card) => ({ source: "private", reviewCount: 0, published: false, title: card.subject, ...card }));
    state.cardReviewStatus = state.cardReviewStatus || {};
    Object.keys(state.cardReviewStatus).forEach((cardId) => {
      if (state.cardReviewStatus[cardId] === "ok") delete state.cardReviewStatus[cardId];
    });
    state.cardLibrary = state.cardLibrary?.length ? state.cardLibrary : copy(window.StudyUpSeed.cardLibrary);
    state.chat = state.chat || [];
    state.ui = { ...window.StudyUpSeed.ui, ...(state.ui || {}) };
    state.ui.selectedPartialGroup = state.ui.selectedPartialGroup || null;
    state.ui.showTargetGradeForm = Boolean(state.ui.showTargetGradeForm);
    state.ui.showPartialEntryForm = Boolean(state.ui.showPartialEntryForm);
    state.ui.calendarMonthOffset = Number.isFinite(Number(state.ui.calendarMonthOffset)) ? Number(state.ui.calendarMonthOffset) : 0;
    state.ui.editingGradeId = state.ui.editingGradeId || "";
    state.ui.editingPartialGradeId = state.ui.editingPartialGradeId || "";
    state.ui.cardStudyOpen = Boolean(state.ui.cardStudyOpen);
    state.ui.cardStudyPackId = state.ui.cardStudyPackId || "";
    state.ui.cardStudyIndex = Number.isFinite(Number(state.ui.cardStudyIndex)) ? Number(state.ui.cardStudyIndex) : 0;
    state.ui.cardStudyMode = state.ui.cardStudyMode || "pack";
    state.ui.cardStudyBucket = state.ui.cardStudyBucket || "";
    state.ui.cardStudySource = state.ui.cardStudySource || "";
    if (!state.ui.cleanedHundredthsTest) {
      state.subjects.forEach((subject) => {
        subject.grades = subject.grades.filter((grade) => grade.title !== "Hundertstel-Test");
      });
      state.ui.cleanedHundredthsTest = true;
    }
  };

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
  const currentAiLimit = () => aiLimitForPlan();
  const aiLimitLabel = () => `${currentAiLimit()} AI-Fragen pro Monat`;
  const topicList = (topics) => Array.isArray(topics) ? topics : String(topics || "").split(",").map((topic) => topic.trim()).filter(Boolean);
  const cardText = () => {
    const lang = String(state.settings.language || "en-US").slice(0, 2);
    const labels = {
      de: {
        section: "Karten",
        create: "Karten erstellen",
        personal: "Persönliche Karten",
        search: "Karten-Datenbank durchsuchen",
        recommended: "Empfohlen",
        learn: "Lernen",
        open: "Öffnen",
        good: "Gut",
        bad: "Schlecht",
        back: "Zurück",
        previous: "Vorherige Karte",
        next: "Nächste Karte",
        empty: "Keine Karten",
        emptyText: "Dieser Stapel enthält noch keine Karten."
      },
      en: {
        section: "Cards",
        create: "Create cards",
        personal: "Personal cards",
        search: "Search cards database",
        recommended: "Recommended",
        learn: "Study",
        open: "Open",
        good: "Good",
        bad: "Bad",
        back: "Back",
        previous: "Previous card",
        next: "Next card",
        empty: "No cards",
        emptyText: "This deck has no cards yet."
      },
      fr: {
        section: "Cartes",
        create: "Créer des cartes",
        personal: "Cartes personnelles",
        search: "Rechercher des cartes",
        recommended: "Recommandé",
        learn: "Apprendre",
        open: "Ouvrir",
        good: "Bien",
        bad: "Difficile",
        back: "Retour",
        previous: "Carte précédente",
        next: "Carte suivante",
        empty: "Aucune carte",
        emptyText: "Ce paquet ne contient pas encore de cartes."
      },
      it: {
        section: "Carte",
        create: "Crea carte",
        personal: "Carte personali",
        search: "Cerca carte",
        recommended: "Consigliate",
        learn: "Studia",
        open: "Apri",
        good: "Bene",
        bad: "Difficile",
        back: "Indietro",
        previous: "Carta precedente",
        next: "Carta successiva",
        empty: "Nessuna carta",
        emptyText: "Questo mazzo non contiene ancora carte."
      },
      es: {
        section: "Tarjetas",
        create: "Crear tarjetas",
        personal: "Tarjetas personales",
        search: "Buscar tarjetas",
        recommended: "Recomendado",
        learn: "Estudiar",
        open: "Abrir",
        good: "Bien",
        bad: "Difícil",
        back: "Atrás",
        previous: "Tarjeta anterior",
        next: "Tarjeta siguiente",
        empty: "Sin tarjetas",
        emptyText: "Este mazo todavía no tiene tarjetas."
      }
    };
    return labels[lang] || labels.en;
  };

  const applyTheme = () => {
    const system = currentSystem();
    document.title = "StudyUp.com";
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.density = state.settings.density || "comfortable";
    document.documentElement.dataset.radius = state.settings.radius || "soft";
    document.documentElement.dataset.surface = state.settings.surface || "clean";
    document.documentElement.dataset.cardStyle = state.settings.cardStyle || "stacked";
    document.documentElement.dataset.proStyle = state.settings.proStyle || "focus";
    document.documentElement.lang = state.settings.language || system.language;
    document.body.classList.toggle("is-locked", !state.user.loggedIn);
    const accent = accentColors[state.settings.accent] || accentColors.blue;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-soft", `${accent}1A`);
    if (themeIcon) themeIcon.innerHTML = state.settings.theme === "dark" ? "&#9728;" : "&#9790;";
    if (themeToggle) themeToggle.title = state.settings.theme === "dark" ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren";
    const initials = String(state.user.name || "StudyUp").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SU";
    if (accountAvatar) accountAvatar.textContent = initials;
    if (accountName) accountName.textContent = state.user.name || "StudyUp";
    if (accountEmail) accountEmail.textContent = state.user.email || "Lokaler Account";
    if (accountPlan) accountPlan.textContent = planLabel();
    if (accountRegion) accountRegion.textContent = currentSystem()?.name || state.user.region || "Schweiz";
    document.querySelectorAll(".account-setting").forEach((control) => {
      control.value = state.settings[control.name] || control.value;
      const minPlan = control.dataset.minPlan || "free";
      control.disabled = minPlan === "pro" ? !isPro() : minPlan === "plus" ? !isPlus() : false;
    });
    if (accountDesignNote) {
      accountDesignNote.textContent = isPlus()
        ? "Deine Änderungen werden direkt gespeichert."
        : "Plus und Pro schalten Farben, Kartenstil und Oberflächen frei.";
    }
    const cardsNavLabel = document.querySelector('[data-route="cards"] span:last-child');
    const cardsNavLink = document.querySelector('[data-route="cards"]');
    if (cardsNavLabel) cardsNavLabel.textContent = cardText().section;
    if (cardsNavLink) cardsNavLink.title = cardText().section;
  };

  const getRoute = () => {
    const route = location.hash.replace("#", "");
    if (route === "homework") return "planner";
    return routes.includes(route) ? route : "dashboard";
  };

  const setActiveNav = (route) => navLinks.forEach((link) => link.classList.toggle("active", link.dataset.route === route));

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
    const text = next ? `${next.subject}: ${next.title} ist als Nächstes dran.` : "StudyUp kann dir Geräte-Mitteilungen schicken.";
    await pushNotification("StudyUp Erinnerung", text, true);
    render();
  };

  const renderOnboarding = () => {
    const system = currentSystem();
    return `
      <section class="onboarding-screen">
        <div class="onboarding-logo">
          <span class="logo" aria-hidden="true">
            <img src="src/assets/studyup-logo.png" alt="" />
          </span>
          <h1>StudyUp.com</h1>
        </div>
        <form class="panel onboarding-card" id="onboarding-form">
          <label>Name<input name="name" required placeholder="Dein Name" /></label>
          <label>E-Mail<input name="email" type="email" required placeholder="name@schule.ch" /></label>
          <label>Region / Notensystem<select name="gradeSystem">${state.gradeSystems.map((item) => `<option value="${item.id}" ${item.id === system.id ? "selected" : ""}>${C.escapeHtml(item.name)} · ${C.escapeHtml(item.label)}</option>`).join("")}</select></label>
          <label>App-Sprache<select name="language">${state.languages.map((item) => `<option value="${item.id}" ${item.id === state.settings.language ? "selected" : ""}>${C.escapeHtml(item.name)}</option>`).join("")}</select></label>
          <button class="primary-button" type="submit">StudyUp starten</button>
        </form>
      </section>
    `;
  };

  const calendarItems = () => [
    ...state.planEvents,
    ...state.exams.map((exam) => ({ id: exam.id, subject: exam.subject, title: exam.title, date: exam.date, minutes: exam.minutesPerDay || 30, type: "Prüfung", exam: true })),
    ...state.homework.map((task) => ({ id: task.id, subject: task.subject, title: task.title, date: task.dueDate, minutes: 20, type: "Hausaufgabe", homework: true }))
  ].sort((a, b) => a.date.localeCompare(b.date));

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

  const gradeInputAttrs = () => {
    const system = currentSystem();
    return `min="${system.min}" max="${system.max}" step="0.01"`;
  };
  const gradeInputBounds = () => {
    const system = currentSystem();
    return `min="${system.min}" max="${system.max}" step="0.01"`;
  };

  const gradeSubjectById = (id) => state.subjects.find((subject) => subject.id === id);
  const gradeEntryById = (subject, id) => subject?.grades.find((grade) => grade.id === id);
  const renderGradeEntryRow = (grade) => {
    const isPartial = grade.type === "partial";
    const value = gradeValue(grade);
    return `
      <article class="grade-swipe-row ${isPartial ? "partial-folder-row" : ""}">
        <button class="grade-row-main ${isPartial ? "open-partial-folder" : "open-grade-edit"}" data-id="${grade.id}" type="button">
          <span class="grade-row-icon">${C.icon(isPartial ? "folder" : "chart")}</span>
          <div>
            <strong>${C.escapeHtml(grade.title)}</strong>
            <small>${isPartial ? `${grade.partialGrades.length} Teilprüfungen · Gewicht 1` : (grade.date ? formatDate(grade.date) : "Ohne Datum")}</small>
          </div>
          <em>${Number.isFinite(value) ? value.toFixed(2) : "–"}</em>
        </button>
      </article>
    `;
  };

  const renderSubjectFolders = () => state.subjects.map((subject) => {
    const avg = subjectHasGrades(subject) ? average(subject.grades) : null;
    const points = plusPointsFor(subject);
    return `
      <article class="subject-swipe-row" data-id="${subject.id}">
        <button class="grade-folder" data-id="${subject.id}" type="button">
          <span class="folder-icon">${C.icon("book")}</span>
          <div><strong>${C.escapeHtml(subject.name)}</strong><small>${subject.grades.length} Einträge</small></div>
          <em>${avg === null ? "–" : avg.toFixed(2)}</em>
          <b class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</b>
        </button>
        <div class="subject-row-actions">
          <button class="delete-subject" data-id="${subject.id}" type="button" aria-label="${C.escapeHtml(subject.name)} löschen">${C.icon("trash")}</button>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty-grade-list">Füge oben dein erstes Fach hinzu.</div>`;

  const renderSubjectAddView = () => `
    <section class="grade-page grade-form-only">
      <div class="grade-page-header">
        <button class="secondary-button close-subject-form" type="button">Zurück</button>
        <h1>Fach hinzufügen</h1>
      </div>
      <form class="subject-add-form show" id="subject-form">
        <label>Fach<input name="name" required /></label>
        <label>Gewichtung<input name="weight" type="number" min="0.5" max="4" step="0.5" value="1" /></label>
        <button class="primary-button" type="submit">Fach hinzufügen</button>
      </form>
    </section>
  `;

  const renderGrades = () => {
    const selected = gradeSubjectById(state.ui.selectedGradeSubject);
    const partial = selected ? gradeEntryById(selected, state.ui.selectedPartialGroup) : null;
    if (selected && partial?.type === "partial") return renderPartialGroupDetail(selected, partial);
    if (selected) return renderGradeSubjectDetail(selected);
    if (state.ui.showSubjectForm) return renderSubjectAddView();

    return `
      <section class="grade-page">
        <div class="grade-page-header">
          <h1>Noten</h1>
          <button class="round-add" id="toggle-subject-form" type="button">+</button>
        </div>
        <section class="grade-folder-list">${renderSubjectFolders()}</section>
      </section>
    `;
  };

  const renderGradeEntryFormView = (subject) => {
    const editing = gradeEntryById(subject, state.ui.editingGradeId);
    const isEditing = Boolean(editing);
    const isPartial = editing?.type === "partial";
    return `
      <section class="grade-page grade-form-only">
        <div class="grade-page-header folder-detail-header">
          <button class="secondary-button close-grade-entry-form" type="button">Zurück</button>
          <h1>${isEditing ? "Prüfung bearbeiten" : "Prüfung hinzufügen"}</h1>
        </div>
        <form class="grade-entry-form show" id="grade-form">
          <label>Prüfung oder Ordner<input name="title" required value="${C.escapeHtml(editing?.title || "")}" /></label>
          <label>Note<input name="value" type="number" ${gradeInputBounds()} value="${!isPartial && Number.isFinite(Number(editing?.value)) ? Number(editing.value) : ""}" ${isPartial ? "disabled" : ""} /></label>
          <label class="toggle-field"><input name="isPartial" type="checkbox" value="partial" ${isPartial ? "checked" : ""} ${isEditing ? "disabled" : ""} /><span>Teilnoten</span><small>Erstellt einen Ordner für Teilprüfungen. Gewicht immer 1.</small></label>
          ${isEditing ? `<button class="danger-button delete-editing-grade" type="button">${C.icon("trash")} Löschen</button>` : ""}
          <button class="primary-button" type="submit">Speichern</button>
        </form>
      </section>
    `;
  };

  const renderGradeSubjectDetail = (subject) => {
    if (state.ui.showGradeEntryForm) return renderGradeEntryFormView(subject);
    const avg = subjectHasGrades(subject) ? average(subject.grades) : null;
    const points = plusPointsFor(subject);
    const target = subject.targetGrade ? Number(subject.targetGrade).toFixed(2) : "–";
    return `
      <section class="grade-page">
        <div class="grade-page-header folder-detail-header">
          <button class="secondary-button back-to-subjects" type="button">Zurück</button>
          <h1>${C.escapeHtml(subject.name)}</h1>
          <button class="round-add" id="toggle-grade-entry-form" type="button">+</button>
        </div>
        <div class="subject-score-row">
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article class="target-grade-card"><span>Wunschnote</span><button class="target-grade-button" type="button">${C.escapeHtml(target)}</button></article>
          <article><span>Pluspunkte</span><strong class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</strong></article>
        </div>
        <form class="target-grade-form ${state.ui.showTargetGradeForm ? "show" : ""}" id="target-grade-form">
          <label>Wunschnote<input name="targetGrade" type="number" ${gradeInputAttrs()} value="${C.escapeHtml(subject.targetGrade || "")}" /></label>
          <button class="primary-button" type="submit">Wunschnote speichern</button>
        </form>
        <section class="grade-entry-list">
          ${subject.grades.map(renderGradeEntryRow).join("") || `<div class="empty-grade-list">Drücke +, um die erste Prüfung einzutragen.</div>`}
        </section>
      </section>
    `;
  };

  const renderPartialEntryFormView = (subject, group) => {
    const editing = group.partialGrades.find((grade) => grade.id === state.ui.editingPartialGradeId);
    return `
      <section class="grade-page grade-form-only">
        <div class="grade-page-header folder-detail-header">
          <button class="secondary-button close-partial-entry-form" type="button">Zurück</button>
          <h1>${editing ? "Teilprüfung bearbeiten" : "Teilprüfung hinzufügen"}</h1>
        </div>
        <form class="grade-entry-form show" id="partial-grade-form">
          <label>Teilprüfung<input name="title" required value="${C.escapeHtml(editing?.title || "")}" /></label>
          <label>Note<input name="value" required type="number" ${gradeInputBounds()} value="${Number.isFinite(Number(editing?.value)) ? Number(editing.value) : ""}" /></label>
          <button class="primary-button" type="submit">Teilprüfung speichern</button>
          ${editing ? `<button class="danger-button delete-editing-partial-grade" type="button">${C.icon("trash")} Löschen</button>` : ""}
        </form>
      </section>
    `;
  };

  const renderPartialGroupDetail = (subject, group) => {
    if (state.ui.showPartialEntryForm) return renderPartialEntryFormView(subject, group);
    const avg = group.partialGrades.length ? average(group.partialGrades) : null;
    return `
      <section class="grade-page">
        <div class="grade-page-header folder-detail-header">
          <button class="secondary-button back-to-subject-detail" type="button">Zurück</button>
          <h1>${C.escapeHtml(group.title)}</h1>
          <button class="round-add" id="toggle-partial-entry-form" type="button">+</button>
        </div>
        <div class="subject-score-row partial-score-row">
          <article><span>Fach</span><strong>${C.escapeHtml(subject.name)}</strong></article>
          <article><span>Durchschnitt</span><strong>${avg === null ? "–" : avg.toFixed(2)}</strong></article>
          <article><span>Gewicht</span><strong>1</strong></article>
        </div>
        <section class="grade-entry-list">
          ${group.partialGrades.map((grade) => `
            <article class="grade-swipe-row">
              <button class="grade-row-main open-partial-grade-edit" data-id="${grade.id}" type="button">
                <span class="grade-row-icon">${C.icon("chart")}</span>
                <div><strong>${C.escapeHtml(grade.title)}</strong><small>Gewicht 1</small></div>
                <em>${Number(grade.value).toFixed(2)}</em>
              </button>
            </article>
          `).join("") || `<div class="empty-grade-list">Drücke +, um die erste Teilprüfung einzutragen.</div>`}
        </section>
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

  const createExamWeekPlan = ({ subject, title, date }) => {
    const examDate = dateObject(date);
    return Array.from({ length: 7 }, (_, index) => {
      const stepDate = new Date(examDate);
      stepDate.setDate(stepDate.getDate() - (7 - index));
      const step = planSteps[index % planSteps.length];
      return { id: uid("event"), subject, title: `${step}: ${title}`, date: toIso(stepDate), minutes: 25, type: step, auto: true };
    });
  };

  const renderCalendarMonth = (year, month, items) => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const title = new Intl.DateTimeFormat(state.settings.language || currentSystem().language, { month: "long" }).format(first);
    const cells = [
      ...Array.from({ length: offset }, () => `<div class="calendar-cell empty"></div>`),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const iso = toIso(new Date(year, month, day));
        const dayItems = items.filter((item) => item.date === iso);
        return `<div class="calendar-cell ${iso === todayIso() ? "today" : ""}"><strong>${day}</strong>${dayItems.slice(0, 2).map((item) => `<span class="${item.exam ? "exam-dot" : item.homework ? "homework-dot" : ""}" title="${C.escapeHtml(item.title)}">${C.escapeHtml(item.subject)}</span>`).join("")}</div>`;
      })
    ];
    return `<article class="calendar-month-panel"><h3>${C.escapeHtml(title)}</h3><div class="weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div class="calendar-grid">${cells.join("")}</div></article>`;
  };

  const currentCalendarDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + Number(state.ui.calendarMonthOffset || 0), 1);
  };

  const calendarOffsetForDate = (date) => {
    const now = new Date();
    const target = dateObject(date || todayIso());
    return (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  };

  const renderCalendar = () => {
    const selectedMonth = currentCalendarDate();
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const items = calendarItems();
    return `<div class="calendar-current-grid">${renderCalendarMonth(year, month, items)}</div>`;
  };

  const renderPlannerAddForm = () => `
    ${C.sectionTitle("Plan", "Kalender")}
    <section class="panel calendar-only-panel calendar-add-only">
      <div class="panel-header"><div><span>Neu</span><h2>Eintrag hinzufügen</h2></div><button class="round-add" id="toggle-event-form" type="button" aria-label="Formular schließen">&times;</button></div>
      <form id="event-form" class="calendar-entry-form ${state.ui.showEventForm ? "show" : ""}">
        <label>Eintrag<select name="kind"><option value="event">Termin</option><option value="exam">Prüfung</option><option value="homework">Hausaufgabe</option></select></label>
        <label>Fach<input name="subject" required /></label>
        <label>Titel<input name="title" required /></label>
        <label>Datum<input name="date" required type="date" value="${todayIso()}" /></label>
        <label class="toggle-field"><input name="autoPlan" type="checkbox" value="yes" /><span>Automatische Lerntermine</span><small>Bei Prüfungen wird eine Woche vorher automatisch geplant.</small></label>
        <button class="primary-button" type="submit">Eintragen</button>
      </form>
    </section>
  `;

  const renderPlanner = () => state.ui.showEventForm ? renderPlannerAddForm() : `
    ${C.sectionTitle("Plan", "Kalender")}
    <section class="panel calendar-only-panel">
      <div class="panel-header"><div><span>${new Intl.DateTimeFormat(state.settings.language || currentSystem().language, { month: "long", year: "numeric" }).format(currentCalendarDate())}</span><h2>Kalender</h2></div><div class="calendar-header-actions"><button class="calendar-month-step" data-offset="-1" type="button" aria-label="Vorheriger Monat">‹</button><button class="calendar-month-step" data-offset="1" type="button" aria-label="Nächster Monat">›</button><button class="round-add" id="toggle-event-form" type="button" aria-label="Eintrag hinzufügen">+</button></div></div>
      ${renderCalendar()}
    </section>
  `;

  const filteredLibrary = () => {
    const query = String(state.ui.cardSearch || "").toLowerCase();
    return state.cardLibrary.filter((pack) => [pack.title, pack.subject, pack.description].join(" ").toLowerCase().includes(query));
  };

  const personalCards = () => state.flashcards.filter((card) => card.source !== "database");
  const recommendedPack = () => filteredLibrary()[0] || state.cardLibrary[0];
  const cardsForPack = (pack) => {
    if (!pack?.cards?.length) return [];
    const limit = isPlus() ? pack.cards.length : Math.min(pack.freeCount || pack.cards.length, pack.cards.length);
    return pack.cards.slice(0, limit).map((card, index) => ({
      id: `${pack.id}-${index}`,
      subject: pack.subject,
      packId: pack.id,
      source: "database",
      published: true,
      reviewCount: 0,
      ...card
    }));
  };
  const activeStudyPack = () => state.cardLibrary.find((pack) => pack.id === state.ui.cardStudyPackId) || recommendedPack();
  const allCardsForReview = () => [
    ...state.cardLibrary.flatMap(cardsForPack),
    ...personalCards().map((card) => ({ ...card, id: card.id || uid("card") }))
  ];
  const cardsForBucket = (bucket, source = state.ui.cardStudySource, packId = state.ui.cardStudyPackId) => allCardsForReview().filter((card) => {
    if (state.cardReviewStatus[card.id] !== bucket) return false;
    if (source === "personal") return card.source !== "database";
    if (source === "pack") return card.packId === packId;
    return true;
  });
  const activeStudyCards = () => {
    if (state.ui.cardStudyMode === "bucket") return cardsForBucket(state.ui.cardStudyBucket);
    if (state.ui.cardStudyMode === "personal") return personalCards();
    return cardsForPack(activeStudyPack());
  };
  const cardBucketCountsFor = (cards) => ({
    good: cards.filter((card) => state.cardReviewStatus[card.id] === "good").length,
    bad: cards.filter((card) => state.cardReviewStatus[card.id] === "bad").length
  });
  const cardBucketTitle = (bucket) => {
    const t = cardText();
    return { good: t.good, bad: t.bad }[bucket] || t.section;
  };
  const rateStudyCard = (card, rating) => {
    if (!card?.id) return;
    state.cardReviewStatus[card.id] = rating === "good" ? "good" : "bad";
    const cards = activeStudyCards();
    state.ui.cardStudyIndex = Math.min(Number(state.ui.cardStudyIndex || 0) + 1, Math.max(cards.length - 1, 0));
  };

  const renderCardCreateView = () => {
    const aiAllowed = isPlus();
    const freeCardLimitReached = !isPlus() && personalCards().length >= 50;
    return `
      ${C.sectionTitle(cardText().section, cardText().section)}
      <section class="create-card-sheet standalone-create show">
        <div class="create-sheet-header">
          <div><span>Neu</span><h2>${C.escapeHtml(cardText().create)}</h2></div>
          <button class="ghost-icon close-card-create" type="button" aria-label="Schließen">&times;</button>
        </div>
        <div class="create-options">
          <button class="secondary-button choose-card-mode" data-mode="ai" type="button" ${aiAllowed ? "" : "disabled"}>${C.icon("camera")} ${aiAllowed ? "Mit AI" : "AI ab Plus"}</button>
          <button class="secondary-button choose-card-mode" data-mode="self" type="button">${C.icon("add")} Selbst</button>
        </div>
        ${!aiAllowed ? `<div class="empty-state"><strong>AI-Karten sind Plus und Pro.</strong><p>Free bleibt zum Organisieren stark. Für AI-Karten kannst du später Plus oder Pro aktivieren.</p></div>` : ""}
        ${state.ui.cardCreateMode === "ai" && aiAllowed ? `<div class="panel photo-card-panel"><h2>Vokabelheft fotografieren</h2><button class="ghost-button close-card-create" type="button">Abbrechen</button><label>Fach<input id="photo-card-subject" /></label><label class="upload-tile">${C.icon("camera")} Foto auswählen<input id="photo-card-input" type="file" accept="image/*" capture="environment" /></label><p class="plan-note">Plus enthält AI-Karten. Pro ist für größere Foto-Scans und Prüfungsvorbereitung gedacht.</p></div>` : ""}
        ${state.ui.cardCreateMode === "self" ? `<form class="panel form-panel" id="card-form"><div class="form-title-row"><h2>Eigene Karte</h2><button class="ghost-button close-card-create" type="button">Abbrechen</button></div>${freeCardLimitReached ? `<div class="empty-state"><strong>Free-Limit erreicht.</strong><p>Free enthält 50 persönliche Karten. Plus und Pro heben dieses Limit auf.</p></div>` : ""}<label>Titel / Fach<input name="subject" required ${freeCardLimitReached ? "disabled" : ""} /></label><label>Frage<textarea name="question" required rows="3" ${freeCardLimitReached ? "disabled" : ""}></textarea></label><label>Antwort<textarea name="answer" required rows="3" ${freeCardLimitReached ? "disabled" : ""}></textarea></label><label>Status<select name="difficulty" ${freeCardLimitReached ? "disabled" : ""}><option value="1" selected>Gut</option><option value="3">Schlecht</option></select></label><button class="primary-button" type="submit" ${freeCardLimitReached ? "disabled" : ""}>Card speichern</button></form>` : ""}
      </section>
    `;
  };

  const renderCardStudyView = () => {
    const t = cardText();
    const pack = activeStudyPack();
    const cards = activeStudyCards();
    const safeIndex = Math.min(Math.max(Number(state.ui.cardStudyIndex || 0), 0), Math.max(cards.length - 1, 0));
    const card = cards[safeIndex];
    const isBucketMode = state.ui.cardStudyMode === "bucket";
    const studyTitle = isBucketMode ? `${cardBucketTitle(state.ui.cardStudyBucket)} ${t.section}` : state.ui.cardStudyMode === "personal" ? t.personal : pack?.title || t.recommended;
    return `
      ${C.sectionTitle(t.section, t.section)}
      <section class="card-study-view">
        <div class="card-study-header">
          <button class="ghost-button close-card-study" type="button">${C.escapeHtml(t.back)}</button>
          <div><span>${C.escapeHtml(isBucketMode ? cardBucketTitle(state.ui.cardStudyBucket) : pack?.subject || t.recommended)}</span><h2>${C.escapeHtml(studyTitle)}</h2></div>
        </div>
        ${card ? `
          <button class="study-flashcard" type="button" aria-label="Karte umdrehen">
            <span class="study-flashcard-inner">
              <span class="study-flashcard-face front"><small>Frage</small><strong>${C.escapeHtml(card.question)}</strong></span>
              <span class="study-flashcard-face back"><small>Antwort</small><strong>${C.escapeHtml(card.answer)}</strong></span>
            </span>
          </button>
          <div class="card-study-controls">
            <button class="study-arrow-button study-prev" type="button" aria-label="${C.escapeHtml(t.previous)}" ${safeIndex <= 0 ? "disabled" : ""}>‹</button>
            <span class="card-counter">${safeIndex + 1} / ${cards.length}</span>
            <button class="study-arrow-button study-next" type="button" aria-label="${C.escapeHtml(t.next)}" ${safeIndex >= cards.length - 1 ? "disabled" : ""}>›</button>
          </div>
          <div class="card-rating-grid two-options">
            <button class="card-rating-card good" data-rating="good" type="button"><span></span><strong>${C.escapeHtml(t.good)}</strong></button>
            <button class="card-rating-card bad" data-rating="bad" type="button"><span></span><strong>${C.escapeHtml(t.bad)}</strong></button>
          </div>
        ` : C.emptyState(t.empty, t.emptyText)}
      </section>
    `;
  };

  const renderStack = ({ title, subtitle, count, kind, actionText, source, packId, cards }) => {
    const counts = cardBucketCountsFor(cards);
    return `
      <article class="quizlet-large-stack deck-stack" data-stack="${kind}" data-source="${source}" data-pack="${C.escapeHtml(packId || "")}">
        <button class="stack-main" data-stack="${kind}" data-source="${source}" data-pack="${C.escapeHtml(packId || "")}" type="button">
          <div class="big-card-stack"><i></i><i></i><i></i></div>
          <strong>${C.escapeHtml(title)}</strong>
          <span>${C.escapeHtml(subtitle)}</span>
          <small>${count} ${C.escapeHtml(cardText().section)}</small>
          <em>${actionText}</em>
        </button>
        <div class="deck-status-column">
          <button class="deck-count-pill good" data-bucket="good" data-source="${source}" data-pack="${C.escapeHtml(packId || "")}" type="button" aria-label="${C.escapeHtml(cardText().good)}: ${counts.good}"><strong>${counts.good}</strong></button>
          <button class="deck-count-pill bad" data-bucket="bad" data-source="${source}" data-pack="${C.escapeHtml(packId || "")}" type="button" aria-label="${C.escapeHtml(cardText().bad)}: ${counts.bad}"><strong>${counts.bad}</strong></button>
        </div>
      </article>
    `;
  };

  const renderCards = () => {
    if (state.ui.cardCreateOpen) return renderCardCreateView();
    if (state.ui.cardStudyOpen) return renderCardStudyView();
    const t = cardText();
    const pack = recommendedPack();
    const personal = personalCards();
    const packCards = cardsForPack(pack);
    return `
      ${C.sectionTitle(t.section, t.section)}
      <section class="cards-search-panel">
        <div class="search-box">${C.icon("search")}<input id="card-search" placeholder="${C.escapeHtml(t.search)}" value="${C.escapeHtml(state.ui.cardSearch || "")}" /></div>
      </section>
      <section class="card-stack-board">
        ${renderStack({ title: t.personal, subtitle: "Nur für dich", count: personal.length, kind: "personal", actionText: t.open, source: "personal", cards: personal })}
        ${renderStack({ title: pack ? pack.title : t.recommended, subtitle: pack ? pack.subject : "Datenbank", count: pack ? pack.totalCount : 0, kind: "recommended", actionText: t.learn, source: "pack", packId: pack?.id || "", cards: packCards })}
      </section>
      <button class="floating-create-button" id="toggle-card-create" type="button">+</button>
    `;
  };

const askStudyUpAI = async (message, attachment) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message || attachment || "Help me with homework",
      attachmentName: attachment || ""
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "AI request failed");
  }

  return data.answer || "Sorry, I could not make an answer.";
};
  const renderBot = () => {
    const messages = state.chat.length ? state.chat : [{ id: "intro", role: "bot", text: "Stell deine Frage. Ich helfe dir Schritt für Schritt, ohne dir einfach die fertige Lösung zu geben." }];
    return `
      <section class="ai-full-page">
        <h1>StudyUp AI</h1>
        <section class="ai-window">
          <div class="ai-output">
            ${messages.map((msg) => `<article class="message ${msg.role === "user" ? "user" : "bot"}"><p>${C.escapeHtml(msg.text)}</p></article>`).join("")}
          </div>
          ${state.ui.chatAttachmentName ? `<div class="attachment-pill">${C.icon("camera")} ${C.escapeHtml(state.ui.chatAttachmentName)}</div>` : ""}
          <form id="chat-form" class="ai-full-input">
            <textarea id="chat-input" name="message" placeholder="Frag StudyUp AI"></textarea>
            <div class="ai-input-tools">
              <label class="tool-button">${C.icon("camera")}<input id="ai-photo-input" type="file" accept="image/*" capture="environment" /></label>
              <button class="tool-button voice-input" type="button">${C.icon("mic")}</button>
              <button class="primary-button" type="submit">${C.icon("send")} Senden</button>
            </div>
          </form>
        </section>
      </section>
    `;
  };

  const renderPremium = () => {
    const plan = currentPlan();
    const lang = String(state.settings.language || "en-US").slice(0, 2);
    const premiumText = lang === "de" ? {
      title: "StudyUp Pläne",
      planWord: "Plan",
      headline: "Free, Plus oder Pro",
      intro: "Free hilft dir beim Organisieren. Plus hilft dir, smarter zu lernen. Pro hilft dir, dich wie ein Top-Schüler auf Prüfungen vorzubereiten.",
      freePosition: "Organisiert starten",
      plusPosition: "Smarter lernen",
      proPosition: "Wie ein Top-Schüler vorbereiten",
      month: "/ Monat",
      badge: "Am beliebtesten",
      currentPlan: "Aktueller Plan",
      included: "Enthalten",
      plusIncluded: "In Pro enthalten",
      plusActive: "Plus aktiv",
      proActive: "Pro aktiv",
      upgradePlus: "Auf Plus wechseln",
      upgradePro: "Auf Pro wechseln",
      customKicker: "Plus und Pro",
      customTitle: "Eigene Designs",
      proKicker: "Nur Pro",
      proTitle: "Erweiterte Tools",
      analytics: "Erweiterte Analysen",
      analyticsText: "Erkenne Trends, bevor Noten fallen.",
      exportCards: "Karteikarten exportieren",
      exportText: "Lerne deine Sets auch außerhalb von StudyUp.",
      examPrep: "Prüfungsvorbereitung",
      examPrepText: "Schwierige Karten, Prüfungsmodus und Pro-Styles.",
      features: {
        free: [
          "Notenübersicht",
          "Notendurchschnitt berechnen",
          "Einfacher Planer/Kalender",
          "Hausaufgaben und Prüfungen verfolgen",
          "3 Karteikarten-Stapel",
          "50 persönliche Karten",
          "10 AI-Fragen/Monat",
          "Einfache Warnung bei schwachen Fächern",
          "Einfache Lern-Erinnerungen",
          "2 Basis-Designs"
        ],
        plus: [
          "Alles aus Free",
          "300 AI-Fragen/Monat",
          "AI-Karteikarten-Generator",
          "AI-Quiz-Generator",
          "Smarte Lernpläne",
          "Alle empfohlenen Karten-Stapel",
          "Unbegrenzte persönliche Karteikarten",
          "Smarte Erinnerungen",
          "Wöchentlicher Lernbericht",
          "Eigene Designs",
          "Smarte Erkennung schwacher Fächer"
        ],
        pro: [
          "Alles aus Plus",
          "1.000 AI-Fragen/Monat",
          "300 AI-Karteikarten-Generierungen/Monat",
          "30 Foto-zu-Karteikarten-Scans/Monat",
          "Erweiterte Analysen",
          "Erweiterte Prüfungsvorbereitung",
          "Modus für schwierige Karten",
          "Karteikarten exportieren",
          "Früher Zugang zu neuen Features",
          "Pro-Styles und Designs"
        ]
      }
    } : {
      title: "StudyUp Plans",
      planWord: "plan",
      headline: "Free, Plus or Pro",
      intro: "Free helps you get organized. Plus helps you study smarter. Pro helps you prepare like a top student.",
      freePosition: "Get organized",
      plusPosition: "Study smarter",
      proPosition: "Prepare like a top student",
      month: "/ month",
      badge: "Most popular",
      currentPlan: "Current plan",
      included: "Included",
      plusIncluded: "Included in Pro",
      plusActive: "Plus active",
      proActive: "Pro active",
      upgradePlus: "Upgrade to Plus",
      upgradePro: "Upgrade to Pro",
      customKicker: "Plus and Pro",
      customTitle: "Custom themes",
      proKicker: "Pro only",
      proTitle: "Advanced tools",
      analytics: "Advanced analytics",
      analyticsText: "See trends before grades drop.",
      exportCards: "Export flashcards",
      exportText: "Prepare sets outside StudyUp.",
      examPrep: "Exam preparation",
      examPrepText: "Hard-card review, exam mode and Pro styles.",
      features: {
        free: [
          "Grades tracker",
          "Grade average calculator",
          "Basic planner/calendar",
          "Homework and test tracking",
          "3 flashcard decks",
          "50 personal cards",
          "10 AI questions/month",
          "Basic weak subject warning",
          "Basic study reminders",
          "2 basic themes"
        ],
        plus: [
          "Everything in Free",
          "300 AI questions/month",
          "AI flashcard generator",
          "AI quiz generator",
          "Smart study plans",
          "Full recommended card decks",
          "Unlimited personal flashcards",
          "Smart reminders",
          "Weekly study report",
          "Custom themes",
          "Smart weak subject detection"
        ],
        pro: [
          "Everything in Plus",
          "1,000 AI questions/month",
          "300 AI flashcard generations/month",
          "30 photo-to-flashcard scans/month",
          "Advanced analytics",
          "Advanced exam preparation",
          "Hard-card review mode",
          "Export flashcards",
          "Early access to new features",
          "Pro styles/themes"
        ]
      }
    };
    const list = (items) => `<ul>${items.map((item) => `<li>${C.escapeHtml(item)}</li>`).join("")}</ul>`;
    const freeButton = plan === "free" ? premiumText.currentPlan : premiumText.included;
    const plusButton = plan === "plus" ? premiumText.plusActive : plan === "pro" ? premiumText.plusIncluded : premiumText.upgradePlus;
    const proButton = plan === "pro" ? premiumText.proActive : premiumText.upgradePro;
    return `
      ${C.sectionTitle("Premium", premiumText.title)}
      <section class="pricing-grid premium-grid three-plans">
        <article class="price-card ${plan === "free" ? "current" : ""}">
          <div class="price-card-top"><span>${C.escapeHtml(premiumText.freePosition)}</span></div>
          <h2>Free</h2>
          <strong>CHF 0</strong>
          ${list(premiumText.features.free)}
          <button class="secondary-button plan-button" type="button" disabled>${freeButton}</button>
        </article>
        <article class="price-card featured ${plan === "plus" ? "current" : ""}">
          <div class="price-card-top"><span>${C.escapeHtml(premiumText.plusPosition)}</span><em class="plan-badge">${C.escapeHtml(premiumText.badge)}</em></div>
          <h2>Plus</h2>
          <strong>CHF 4.90 <small>${C.escapeHtml(premiumText.month)}</small></strong>
          ${list(premiumText.features.plus)}
          <button class="primary-button activate-plan" data-plan="plus" type="button" ${plan === "plus" || plan === "pro" ? "disabled" : ""}>${plusButton}</button>
        </article>
        <article class="price-card pro ${plan === "pro" ? "current" : ""}">
          <div class="price-card-top"><span>${C.escapeHtml(premiumText.proPosition)}</span></div>
          <h2>Pro</h2>
          <strong>CHF 7.90 <small>${C.escapeHtml(premiumText.month)}</small></strong>
          ${list(premiumText.features.pro)}
          <button class="secondary-button activate-plan" data-plan="pro" type="button" ${plan === "pro" ? "disabled" : ""}>${proButton}</button>
        </article>
      </section>
      <section class="panel pro-tools-panel ${isPro() ? "" : "locked"}">
        <div class="panel-header"><div><span>${C.escapeHtml(premiumText.proKicker)}</span><h2>${C.escapeHtml(premiumText.proTitle)}</h2></div>${isPro() ? C.icon("chart") : C.icon("lock")}</div>
        <div class="pro-tool-grid">
          <article><strong>${C.escapeHtml(premiumText.analytics)}</strong><span>${C.escapeHtml(premiumText.analyticsText)}</span></article>
          <article><strong>${C.escapeHtml(premiumText.exportCards)}</strong><span>${C.escapeHtml(premiumText.exportText)}</span></article>
          <article><strong>${C.escapeHtml(premiumText.examPrep)}</strong><span>${C.escapeHtml(premiumText.examPrepText)}</span></article>
        </div>
      </section>
    `;
  };

  const render = () => {
    ensureCollections();
    applyTheme();
    const route = getRoute();
    if (route !== location.hash.replace("#", "") && location.hash) location.hash = route;
    setActiveNav(route);
    const views = { dashboard: renderDashboard, grades: renderGrades, planner: renderPlanner, cards: renderCards, bot: renderBot, premium: renderPremium };
    app.classList.remove("page-enter");
    app.innerHTML = state.user.loggedIn ? views[route]() : renderOnboarding();
    requestAnimationFrame(() => app.classList.add("page-enter"));
    bindEvents(route);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const bindEvents = (route) => {
    document.querySelector("#onboarding-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formData(event.currentTarget);
      const system = state.gradeSystems.find((item) => item.id === data.gradeSystem) || currentSystem();
      state.user = { loggedIn: true, name: data.name, email: data.email, region: data.gradeSystem };
      state.settings.gradeSystem = system.id;
      state.settings.language = data.language || system.language;
      save();
      render();
    });
    document.querySelectorAll(".notify-now").forEach((button) => button.addEventListener("click", requestNotifications));

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
      document.querySelector(".close-subject-form")?.addEventListener("click", () => {
        state.ui.showSubjectForm = false;
        save();
        render();
      });
      document.querySelectorAll(".grade-folder").forEach((button) => button.addEventListener("click", () => {
        const row = button.closest(".subject-swipe-row");
        if (row?.classList.contains("show-actions")) return;
        state.ui.selectedGradeSubject = button.dataset.id;
        state.ui.selectedPartialGroup = null;
        state.ui.showSubjectForm = false;
        state.ui.showGradeEntryForm = false;
        state.ui.showTargetGradeForm = false;
        state.ui.showPartialEntryForm = false;
        state.ui.editingGradeId = "";
        state.ui.editingPartialGradeId = "";
        save();
        render();
      }));
      document.querySelectorAll(".subject-swipe-row").forEach((row) => {
        let startX = 0;
        let startY = 0;
        row.addEventListener("pointerdown", (event) => {
          startX = event.clientX || 0;
          startY = event.clientY || 0;
        }, { passive: true });
        row.addEventListener("pointerup", (event) => {
          const endX = event.clientX || startX;
          const endY = event.clientY || startY;
          const deltaX = startX - endX;
          const deltaY = Math.abs(startY - endY);
          if (deltaX > 34 && deltaY < 40) row.classList.add("show-actions");
          if (deltaX < -24) row.classList.remove("show-actions");
        }, { passive: true });
      });
      document.querySelectorAll(".delete-subject").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        const id = button.dataset.id;
        state.subjects = state.subjects.filter((subject) => subject.id !== id);
        if (state.ui.selectedGradeSubject === id) {
          state.ui.selectedGradeSubject = null;
          state.ui.selectedPartialGroup = null;
        }
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
        state.ui.editingPartialGradeId = "";
        save();
        render();
      });
      document.querySelector(".back-to-subject-detail")?.addEventListener("click", () => {
        state.ui.selectedPartialGroup = null;
        state.ui.showPartialEntryForm = false;
        state.ui.editingPartialGradeId = "";
        save();
        render();
      });
      document.querySelector("#toggle-grade-entry-form")?.addEventListener("click", () => {
        state.ui.showGradeEntryForm = true;
        state.ui.editingGradeId = "";
        save();
        render();
      });
      document.querySelector(".close-grade-entry-form")?.addEventListener("click", () => {
        state.ui.showGradeEntryForm = false;
        state.ui.editingGradeId = "";
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
          const editing = gradeEntryById(subject, state.ui.editingGradeId);
          if (editing) {
            editing.title = data.title;
            if (editing.type !== "partial" && data.value !== "") editing.value = Number(data.value);
          } else if (data.isPartial === "partial") {
            subject.grades.push({ id: uid("partial"), type: "partial", title: data.title, date: todayIso(), partialGrades: [] });
          } else if (data.value !== "") {
            subject.grades.push({ id: uid("grade"), type: "exam", title: data.title, date: todayIso(), value: Number(data.value) });
          }
        }
        state.ui.showGradeEntryForm = false;
        state.ui.editingGradeId = "";
        save();
        render();
      });
      document.querySelector(".delete-editing-grade")?.addEventListener("click", () => {
        const subject = gradeSubjectById(state.ui.selectedGradeSubject);
        if (!subject || !state.ui.editingGradeId) return;
        subject.grades = subject.grades.filter((grade) => grade.id !== state.ui.editingGradeId);
        if (state.ui.selectedPartialGroup === state.ui.editingGradeId) state.ui.selectedPartialGroup = null;
        state.ui.showGradeEntryForm = false;
        state.ui.editingGradeId = "";
        save();
        render();
      });
      document.querySelectorAll(".open-grade-edit").forEach((button) => button.addEventListener("click", () => {
        state.ui.editingGradeId = button.dataset.id;
        state.ui.showGradeEntryForm = true;
        save();
        render();
      }));
      document.querySelectorAll(".open-partial-folder").forEach((button) => button.addEventListener("click", () => {
        state.ui.selectedPartialGroup = button.dataset.id;
        state.ui.showPartialEntryForm = false;
        state.ui.editingPartialGradeId = "";
        save();
        render();
      }));
      document.querySelector("#toggle-partial-entry-form")?.addEventListener("click", () => {
        state.ui.showPartialEntryForm = true;
        state.ui.editingPartialGradeId = "";
        save();
        render();
      });
      document.querySelector(".close-partial-entry-form")?.addEventListener("click", () => {
        state.ui.showPartialEntryForm = false;
        state.ui.editingPartialGradeId = "";
        save();
        render();
      });
      document.querySelector("#partial-grade-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (selectedPartial?.type === "partial") {
          const editing = selectedPartial.partialGrades.find((grade) => grade.id === state.ui.editingPartialGradeId);
          if (editing) {
            editing.title = data.title;
            editing.value = Number(data.value);
          } else {
            selectedPartial.partialGrades.push({ id: uid("part"), title: data.title, date: todayIso(), value: Number(data.value) });
          }
        }
        state.ui.showPartialEntryForm = false;
        state.ui.editingPartialGradeId = "";
        save();
        render();
      });
      document.querySelector(".delete-editing-partial-grade")?.addEventListener("click", () => {
        if (selectedPartial?.type !== "partial" || !state.ui.editingPartialGradeId) return;
        selectedPartial.partialGrades = selectedPartial.partialGrades.filter((entry) => entry.id !== state.ui.editingPartialGradeId);
        state.ui.showPartialEntryForm = false;
        state.ui.editingPartialGradeId = "";
        save();
        render();
      });
      document.querySelectorAll(".open-partial-grade-edit").forEach((button) => button.addEventListener("click", () => {
        state.ui.editingPartialGradeId = button.dataset.id;
        state.ui.showPartialEntryForm = true;
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
    }

    if (route === "planner") {
      document.querySelector("#toggle-event-form")?.addEventListener("click", () => {
        state.ui.showEventForm = !state.ui.showEventForm;
        save();
        render();
      });
      document.querySelectorAll(".calendar-month-step").forEach((button) => button.addEventListener("click", () => {
        state.ui.calendarMonthOffset = Number(state.ui.calendarMonthOffset || 0) + Number(button.dataset.offset || 0);
        save();
        render();
      }));
      document.querySelector("#event-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        const subject = String(data.subject || "").trim();
        const title = String(data.title || "").trim();
        const date = data.date || todayIso();
        if (!subject || !title || !date) return;
        if (data.kind === "exam") {
          state.exams.unshift({ id: uid("exam"), subject, title, date, targetGrade: "", minutesPerDay: 25, topics: [title] });
          if (data.autoPlan === "yes") state.planEvents.unshift(...createExamWeekPlan({ subject, title, date }));
        } else if (data.kind === "homework") {
          state.homework.unshift({ id: uid("hw"), subject, title, description: "", dueDate: date, priority: "Mittel", status: "Offen" });
        } else {
          state.planEvents.unshift({ id: uid("event"), subject, title, date, minutes: 25, type: "Termin", auto: false });
        }
        state.ui.showEventForm = false;
        state.ui.calendarMonthOffset = calendarOffsetForDate(date);
        pushNotification("Eintrag gespeichert", `${subject}: ${title}`);
        save();
        render();
      });
    }

    if (route === "cards") {
      document.querySelector("#card-search")?.addEventListener("input", (event) => {
        state.ui.cardSearch = event.currentTarget.value;
        save();
      });
      document.querySelector("#card-search")?.addEventListener("change", () => {
        render();
      });
     document.querySelectorAll(".stack-main").forEach((button) => button.addEventListener("click", () => {
  const pack = recommendedPack();
  state.ui.cardStudyOpen = true;
  state.ui.cardStudyBucket = "";
  state.ui.cardStudySource = button.dataset.source || "";
  state.ui.cardStudyIndex = 0;
  if (button.dataset.stack === "recommended" && pack) {
    state.ui.cardStudyMode = "pack";
    state.ui.cardStudyPackId = pack.id;
  } else {
    state.ui.cardStudyMode = "personal";
    state.ui.cardStudyPackId = "";
  }
  save();
  render();
}));
      document.querySelectorAll(".deck-count-pill").forEach((button) => button.addEventListener("click", () => {
        state.ui.cardStudyOpen = true;
        state.ui.cardStudyMode = "bucket";
        state.ui.cardStudyBucket = button.dataset.bucket || "";
        state.ui.cardStudySource = button.dataset.source || "";
        state.ui.cardStudyPackId = button.dataset.pack || "";
        state.ui.cardStudyIndex = 0;
        save();
        render();
      }));

document.querySelector("#toggle-card-create")?.addEventListener("click", () => {
  state.ui.cardCreateOpen = true;
  state.ui.cardCreateMode = "";
  save();
  render();
});

document.querySelectorAll(".choose-card-mode").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.mode === "ai" && !isPlus()) return;
  state.ui.cardCreateMode = button.dataset.mode;
  save();
  render();
}));
      document.querySelectorAll(".close-card-create").forEach((button) => button.addEventListener("click", () => {
        state.ui.cardCreateOpen = false;
        state.ui.cardCreateMode = "";
        save();
        render();
      }));
      document.querySelector("#card-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!isPlus() && personalCards().length >= 50) {
          pushNotification("Free-Limit erreicht", "Free enthält 50 persönliche Karten. Plus und Pro heben dieses Limit auf.");
          return;
        }
        const data = formData(event.currentTarget);
        state.flashcards.unshift({
          id: uid("card"),
          subject: data.subject,
          title: data.subject,
          question: data.question,
          answer: data.answer,
          difficulty: Number(data.difficulty || 2),
          reviewCount: 0,
          source: "private",
          published: false
        });
        state.ui.cardCreateOpen = false;
        state.ui.cardCreateMode = "";
        state.ui.selectedCardSubject = data.subject;
        save();
        render();
      });
      document.querySelector(".study-flashcard")?.addEventListener("click", (event) => {
        event.currentTarget.classList.toggle("flipped");
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
      document.querySelectorAll(".card-rating-card").forEach((button) => button.addEventListener("click", () => {
        const cards = activeStudyCards();
        const index = Math.min(Math.max(Number(state.ui.cardStudyIndex || 0), 0), Math.max(cards.length - 1, 0));
        rateStudyCard(cards[index], button.dataset.rating);
        save();
        render();
      }));
      document.querySelector(".close-card-study")?.addEventListener("click", () => {
        state.ui.cardStudyOpen = false;
        state.ui.cardStudyPackId = "";
        state.ui.cardStudyIndex = 0;
        state.ui.cardStudyMode = "pack";
        state.ui.cardStudyBucket = "";
        state.ui.cardStudySource = "";
        save();
        render();
      });
      document.querySelector("#photo-card-input")?.addEventListener("change", (event) => {
        if (!isPlus()) {
          pushNotification("AI-Karten sind Plus und Pro", "Aktiviere Plus oder Pro, um Karten aus Fotos zu erstellen.");
          return;
        }
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        const subject = document.querySelector("#photo-card-subject")?.value.trim() || "AI Cards";
        [
          { question: "Wort 1 aus dem Foto", answer: "Bedeutung prüfen", difficulty: 2 },
          { question: "Wort 2 aus dem Foto", answer: "Beispielsatz bilden", difficulty: 3 },
          { question: "Wort 3 aus dem Foto", answer: "Übersetzung wiederholen", difficulty: 2 }
        ].forEach((card) => state.flashcards.push({ id: uid("card"), subject, title: subject, reviewCount: 0, source: "ai", published: false, imageName: file.name, ...card }));
        state.ui.cardCreateOpen = false;
        state.ui.cardCreateMode = "";
        state.ui.selectedCardSubject = subject;
        save();
        render();
      });
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

  document.querySelector("#chat-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = formData(event.currentTarget).message.trim();
    const attachment = state.ui.chatAttachmentName;

    if (!message && !attachment) return;

    if (state.settings.aiQuestionsUsed >= currentAiLimit()) {
      state.chat.push({ id: uid("msg"), role: "bot", text: `${planLabel()}-Limit erreicht: ${aiLimitLabel()} sind diesen Monat genutzt.` });
    } else {
      state.chat.push({ id: uid("msg"), role: "user", text: `${message || "Foto-Frage"}${attachment ? ` [Foto: ${attachment}]` : ""}` });

      const botMessage = { id: uid("msg"), role: "bot", text: "StudyUp AI denkt …" };
      state.chat.push(botMessage);

      try {
        botMessage.text = await askStudyUpAI(message, attachment);
      } catch (error) {
        botMessage.text = "AI error: " + error.message;
      }

      state.settings.aiQuestionsUsed += 1;
    }

    state.ui.chatAttachmentName = "";
    save();
    render();
  });
}
    if (route === "premium") {
      document.querySelectorAll(".activate-plan").forEach((button) => button.addEventListener("click", () => {
        const plan = button.dataset.plan === "pro" ? "pro" : "plus";
        state.settings.plan = plan;
        state.settings.premiumActive = true;
        state.settings.planName = planLabel(plan);
        state.settings.aiLimit = aiLimitForPlan(plan);
        save();
        render();
      }));
      document.querySelectorAll(".setting-control").forEach((control) => control.addEventListener("change", () => {
        const minPlan = control.dataset.minPlan || "plus";
        if (minPlan === "pro" ? !isPro() : !isPlus()) return;
        state.settings[control.name] = control.value;
        save();
        render();
      }));
    }
  };

  document.querySelectorAll(".account-setting").forEach((control) => control.addEventListener("change", () => {
    ensureCollections();
    const minPlan = control.dataset.minPlan || "free";
    if (minPlan === "pro" ? !isPro() : minPlan === "plus" ? !isPlus() : false) return;
    state.settings[control.name] = control.value;
    save();
    applyTheme();
  }));

  themeToggle?.addEventListener("click", () => {
    ensureCollections();
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    save();
    render();
  });
  const logoutUser = () => {
    state.user = {
      ...state.user,
      loggedIn: false
    };
    state.ui = {
      ...state.ui,
      selectedGradeSubject: null,
      selectedPartialGroup: null,
      showSubjectForm: false,
      showGradeEntryForm: false,
      showTargetGradeForm: false,
      showPartialEntryForm: false,
      showEventForm: false,
      cardCreateOpen: false,
      cardStudyOpen: false
    };
    accountPanel?.classList.remove("open");
    accountButton?.setAttribute("aria-expanded", "false");
    location.hash = "#dashboard";
    save();
    render();
  };
  accountButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !accountPanel?.classList.contains("open");
    accountPanel?.classList.toggle("open", open);
    accountButton.setAttribute("aria-expanded", String(open));
  });
  accountLogout?.addEventListener("click", (event) => {
    event.stopPropagation();
    logoutUser();
  });
  document.addEventListener("click", (event) => {
    if (!accountPanel?.classList.contains("open")) return;
    if (event.target.closest(".account-menu")) return;
    accountPanel.classList.remove("open");
    accountButton?.setAttribute("aria-expanded", "false");
  });

  ensureCollections();
  applyTheme();
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#dashboard";
  render();
})();
