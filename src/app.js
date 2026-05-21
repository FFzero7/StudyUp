(function () {
  const app = document.querySelector("#app");
  const navLinks = document.querySelectorAll("[data-route]");
  const themeToggle = document.querySelector("#theme-toggle");
  const themeIcon = document.querySelector("#theme-icon");
  const themeLabel = document.querySelector("#theme-label");
  const notificationButton = document.querySelector("#notification-button");
  const C = window.StudyUpComponents;
  let state = window.StudyUpStorage.load();

  const routes = ["dashboard", "grades", "planner", "cards", "bot", "premium"];
  const accentColors = { blue: "#2563eb", green: "#10b981", violet: "#7c3aed", coral: "#f97316" };
  const planSteps = ["Wiederholen", "Üben", "Karteikarten", "Mini-Test", "Fehleranalyse", "Prüfungssimulation"];

  const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const pad = (value) => String(value).padStart(2, "0");
  const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const todayIso = () => toIso(new Date());
  const dateObject = (iso) => new Date(`${iso}T12:00:00`);
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

  const ensureCollections = () => {
    state.user = { ...window.StudyUpSeed.user, ...(state.user || {}) };
    state.settings = { ...window.StudyUpSeed.settings, ...(state.settings || {}) };
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
    state.cardLibrary = state.cardLibrary?.length ? state.cardLibrary : copy(window.StudyUpSeed.cardLibrary);
    state.chat = state.chat || [];
    state.ui = { ...window.StudyUpSeed.ui, ...(state.ui || {}) };
    state.ui.selectedPartialGroup = state.ui.selectedPartialGroup || null;
    state.ui.showTargetGradeForm = Boolean(state.ui.showTargetGradeForm);
    state.ui.showPartialEntryForm = Boolean(state.ui.showPartialEntryForm);
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
  const topicList = (topics) => Array.isArray(topics) ? topics : String(topics || "").split(",").map((topic) => topic.trim()).filter(Boolean);

  const applyTheme = () => {
    const system = currentSystem();
    document.title = "StudyUp.com";
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.lang = state.settings.language || system.language;
    document.body.classList.toggle("is-locked", !state.user.loggedIn);
    const accent = accentColors[state.settings.accent] || accentColors.blue;
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent-soft", `${accent}1A`);
    if (themeIcon) themeIcon.innerHTML = state.settings.theme === "dark" ? "&#9728;" : "&#9790;";
    if (themeLabel) themeLabel.textContent = state.settings.theme === "dark" ? "Hell" : "Dunkel";
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
            <svg viewBox="0 0 48 48"><path d="M8 12.5c5.7-.9 10.6.2 14 3.1v21.1c-3.4-2.9-8.3-4-14-3.1V12.5Z" /><path d="M40 12.5c-5.7-.9-10.6.2-14 3.1v21.1c3.4-2.9 8.3-4 14-3.1V12.5Z" /><path d="M24 10v28" /><path d="M31 20.5 36 15l5 5.5" /><path d="M36 15v12" /></svg>
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
    return `min="${system.min}" max="${system.max}" step="0.01" placeholder="${C.escapeHtml(system.example)}"`;
  };

  const gradeSubjectById = (id) => state.subjects.find((subject) => subject.id === id);
  const gradeEntryById = (subject, id) => subject?.grades.find((grade) => grade.id === id);
  const renderGradeActions = (gradeId, partialId = "") => `
    <div class="grade-row-actions">
      <button class="icon-action rename-grade" data-grade="${gradeId}" data-partial="${partialId}" type="button" title="Umbenennen">${C.icon("edit")}</button>
      <button class="icon-action delete-grade" data-grade="${gradeId}" data-partial="${partialId}" type="button" title="Löschen">${C.icon("trash")}</button>
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
      <button class="grade-folder" data-id="${subject.id}" type="button">
        <span class="folder-icon">${C.icon("book")}</span>
        <div><strong>${C.escapeHtml(subject.name)}</strong><small>${subject.grades.length} Einträge</small></div>
        <em>${avg === null ? "–" : avg.toFixed(2)}</em>
        <b class="${points >= 0 ? "positive" : "negative"}">${formatPlusPoints(points)}</b>
      </button>
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
          <button class="round-add" id="toggle-subject-form" type="button">+</button>
        </div>
        <form class="subject-add-form ${state.ui.showSubjectForm ? "show" : ""}" id="subject-form">
          <label>Fach<input name="name" required placeholder="z. B. Mathe" /></label>
          <label>Gewichtung<input name="weight" type="number" min="0.5" max="4" step="0.5" value="1" /></label>
          <button class="primary-button" type="submit">Fach hinzufügen</button>
        </form>
        <section class="grade-folder-list">${renderSubjectFolders()}</section>
      </section>
    `;
  };

  const renderGradeSubjectDetail = (subject) => {
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
        <form class="grade-entry-form ${state.ui.showGradeEntryForm ? "show" : ""}" id="grade-form">
          <label>Prüfung oder Ordner<input name="title" required placeholder="z. B. Mathe-Test" /></label>
          <label>Datum<input name="date" type="date" value="${todayIso()}" /></label>
          <label>Note<input name="value" type="number" ${gradeInputAttrs()} /></label>
          <label class="toggle-field"><input name="isPartial" type="checkbox" value="partial" /><span>Teilnoten</span><small>Erstellt einen Ordner für Teilprüfungen. Gewicht immer 1.</small></label>
          <button class="primary-button" type="submit">Speichern</button>
        </form>
        <section class="grade-entry-list">
          ${subject.grades.map(renderGradeEntryRow).join("") || `<div class="empty-grade-list">Drücke +, um die erste Prüfung einzutragen.</div>`}
        </section>
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
          <button class="round-add" id="toggle-partial-entry-form" type="button">+</button>
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
        <section class="grade-entry-list">
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

  const renderCalendar = () => {
    const now = new Date();
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
        return `<div class="calendar-cell ${iso === todayIso() ? "today" : ""}"><strong>${day}</strong>${dayItems.slice(0, 3).map((item) => `<span class="${item.exam ? "exam-dot" : item.homework ? "homework-dot" : ""}">${C.escapeHtml(item.subject)}</span>`).join("")}</div>`;
      })
    ];
    return `<div class="weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div class="calendar-grid">${cells.join("")}</div>`;
  };

  const renderPlanner = () => `
    ${C.sectionTitle("Plan", "Kalender")}
    <section class="panel calendar-only-panel">
      <div class="panel-header"><div><span>${formatDate(todayIso(), { month: "long", year: "numeric" })}</span><h2>Kalender</h2></div><button class="round-add" id="toggle-event-form" type="button">+</button></div>
      ${renderCalendar()}
      <form id="event-form" class="calendar-entry-form ${state.ui.showEventForm ? "show" : ""}">
        <label>Eintrag<select name="kind"><option value="event">Termin</option><option value="exam">Prüfung</option><option value="homework">Hausaufgabe</option></select></label>
        <label>Fach<input name="subject" required placeholder="z. B. Französisch" /></label>
        <label>Titel<input name="title" required placeholder="z. B. UNIT 1" /></label>
        <label>Datum<input name="date" required type="date" value="${todayIso()}" /></label>
        <label>Minuten<input name="minutes" type="number" min="10" max="180" step="5" value="25" /></label>
        <label>Themen<textarea name="topics" rows="2" placeholder="optional, für automatische Einteilung"></textarea></label>
        <button class="primary-button" type="submit">Eintragen</button>
      </form>
    </section>
  `;

  const filteredLibrary = () => {
    const query = String(state.ui.cardSearch || "").toLowerCase();
    return state.cardLibrary.filter((pack) => [pack.title, pack.subject, pack.description].join(" ").toLowerCase().includes(query));
  };

  const personalCards = () => state.flashcards.filter((card) => card.source !== "database");
  const recommendedPack = () => filteredLibrary()[0] || state.cardLibrary[0];
  const renderStack = (title, subtitle, count, kind, actionText) => `
    <button class="quizlet-large-stack" data-stack="${kind}" type="button">
      <div class="big-card-stack"><i></i><i></i><i></i></div>
      <strong>${C.escapeHtml(title)}</strong>
      <span>${C.escapeHtml(subtitle)}</span>
      <small>${count} Karten</small>
      <em>${actionText}</em>
    </button>
  `;

  const renderCards = () => {
    const pack = recommendedPack();
    const personal = personalCards();
    return `
      ${C.sectionTitle("Karten", "Karten")}
      <section class="cards-search-panel">
        <div class="search-box">${C.icon("search")}<input id="card-search" placeholder="Karten-Datenbank durchsuchen" value="${C.escapeHtml(state.ui.cardSearch || "")}" /></div>
      </section>
      <section class="card-stack-board">
        ${renderStack("Persönliche Karten", "Nur für dich", personal.length, "personal", "Öffnen")}
        ${renderStack(pack ? pack.title : "Empfohlen", pack ? pack.subject : "Datenbank", pack ? pack.totalCount : 0, "recommended", "Laden")}
      </section>
      <section class="panel card-results">
        ${(state.ui.selectedCardSubject ? state.flashcards.filter((card) => card.subject === state.ui.selectedCardSubject) : state.flashcards).slice(0, 8).map((card) => `<article class="mini-card ${C.difficultyClass(card.difficulty)}"><span>${C.difficultyLabel(card.difficulty)}</span><h3>${C.escapeHtml(card.question)}</h3><p>${C.escapeHtml(card.answer)}</p><small>${C.escapeHtml(card.subject)} · ${card.source === "ai" ? "AI" : card.source === "database" ? "Datenbank" : "Privat"}</small></article>`).join("") || C.emptyState("Keine Karten", "Drücke auf + und erstelle Karten.")}
      </section>
      <button class="floating-create-button" id="toggle-card-create" type="button">+</button>
      <section class="create-card-sheet ${state.ui.cardCreateOpen ? "show" : ""}">
        <div class="create-options">
          <button class="secondary-button choose-card-mode" data-mode="ai" type="button">${C.icon("camera")} Mit AI</button>
          <button class="secondary-button choose-card-mode" data-mode="self" type="button">${C.icon("add")} Selbst</button>
        </div>
        ${state.ui.cardCreateMode === "ai" ? `<div class="panel photo-card-panel"><h2>Vokabelheft fotografieren</h2><label>Fach<input id="photo-card-subject" placeholder="z. B. Französisch" /></label><label class="upload-tile">${C.icon("camera")} Foto auswählen<input id="photo-card-input" type="file" accept="image/*" capture="environment" /></label></div>` : ""}
        ${state.ui.cardCreateMode === "self" ? `<form class="panel form-panel" id="card-form"><label>Titel / Fach<input name="subject" required placeholder="z. B. Französisch UNIT 1" /></label><label>Frage<textarea name="question" required rows="3"></textarea></label><label>Antwort<textarea name="answer" required rows="3"></textarea></label><label>Status<select name="difficulty"><option value="1">Gut</option><option value="2" selected>Okay</option><option value="3">Schlecht</option></select></label><button class="primary-button" type="submit">Karte speichern</button></form>` : ""}
      </section>
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

  const renderPremium = () => `
    ${C.sectionTitle("Premium", "StudyUp Plus")}
    <section class="pricing-grid premium-grid">
      <article class="price-card"><span>Basis Version</span><h2>Basis</h2><strong>CHF 0</strong><ul><li>5 AI-Fragen</li><li>Begrenzte Datenbank-Karten</li><li>Einfache Lernpläne</li></ul><button class="secondary-button" type="button">Aktueller Plan</button></article>
      <article class="price-card featured"><span>Premium</span><h2>StudyUp Plus</h2><strong>CHF 4.90</strong><ul><li>Unbegrenzte AI-Hilfe</li><li>Alle Datenbank-Sets</li><li>Automatische Lernpläne</li><li>Eigene Farben und Kartenstil</li></ul><button class="primary-button activate-plus" type="button">${state.settings.premiumActive ? "Plus aktiv" : "Zahlen und Plus aktivieren"}</button></article>
    </section>
    <section class="panel customize-panel ${state.settings.premiumActive ? "" : "locked"}">
      <div class="panel-header"><div><span>Selbstgestaltung</span><h2>Dein Look</h2></div>${state.settings.premiumActive ? C.icon("palette") : C.icon("lock")}</div>
      <div class="custom-grid">
        <label>Akzentfarbe<select name="accent" class="setting-control" ${state.settings.premiumActive ? "" : "disabled"}><option value="blue" ${state.settings.accent === "blue" ? "selected" : ""}>Blau</option><option value="green" ${state.settings.accent === "green" ? "selected" : ""}>Grün</option><option value="violet" ${state.settings.accent === "violet" ? "selected" : ""}>Violett</option><option value="coral" ${state.settings.accent === "coral" ? "selected" : ""}>Koralle</option></select></label>
        <label>Kartenstil<select name="cardStyle" class="setting-control" ${state.settings.premiumActive ? "" : "disabled"}><option value="stacked" ${state.settings.cardStyle === "stacked" ? "selected" : ""}>Gestapelt</option><option value="clean" ${state.settings.cardStyle === "clean" ? "selected" : ""}>Clean</option></select></label>
      </div>
    </section>
  `;

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
    }

    if (route === "planner") {
      document.querySelector("#toggle-event-form")?.addEventListener("click", () => {
        state.ui.showEventForm = !state.ui.showEventForm;
        save();
        render();
      });
      document.querySelector("#event-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = formData(event.currentTarget);
        if (data.kind === "exam") {
          state.exams.unshift({ id: uid("exam"), subject: data.subject, title: data.title, date: data.date, targetGrade: "", minutesPerDay: Number(data.minutes || 25), topics: topicList(data.topics || data.title) });
          state.planEvents.unshift(...createAutoPlan({ subject: data.subject, title: data.title, date: data.date, minutes: data.minutes, topics: data.topics || data.title }));
        } else if (data.kind === "homework") {
          state.homework.unshift({ id: uid("hw"), subject: data.subject, title: data.title, description: data.topics || "", dueDate: data.date, priority: "Mittel", status: "Offen" });
        } else {
          state.planEvents.unshift({ id: uid("event"), subject: data.subject, title: data.title, date: data.date, minutes: Number(data.minutes || 25), type: "Termin", auto: false });
        }
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
        render();
      });
     document.querySelectorAll(".quizlet-large-stack").forEach((button) => button.addEventListener("click", () => {
  const pack = recommendedPack();
  if (button.dataset.stack === "recommended" && pack) {
    const limit = state.settings.premiumActive ? pack.cards.length : Math.min(pack.freeCount, pack.cards.length);
    const existing = new Set(state.flashcards.filter((card) => card.packId === pack.id).map((card) => card.question));
    pack.cards.slice(0, limit).forEach((card) => {
      if (!existing.has(card.question)) state.flashcards.push({ id: uid("card"), subject: pack.subject, packId: pack.id, source: "database", reviewCount: 0, published: true, ...card });
    });
    state.ui.selectedCardSubject = pack.subject;
  } else {
    state.ui.selectedCardSubject = "";
  }
  save();
  render();
}));

document.querySelector("#toggle-card-create")?.addEventListener("click", () => {
  state.ui.cardCreateOpen = !state.ui.cardCreateOpen;
  save();
  render();
});

document.querySelectorAll(".choose-card-mode").forEach((button) => button.addEventListener("click", () => {
  state.ui.cardCreateMode = button.dataset.mode;
  save();
  render();
}));
      document.querySelector("#photo-card-input")?.addEventListener("change", (event) => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        const subject = document.querySelector("#photo-card-subject")?.value.trim() || "AI Karten";
        [
          { question: "Wort 1 aus dem Foto", answer: "Bedeutung prüfen", difficulty: 2 },
          { question: "Wort 2 aus dem Foto", answer: "Beispielsatz bilden", difficulty: 3 },
          { question: "Wort 3 aus dem Foto", answer: "Übersetzung wiederholen", difficulty: 2 }
        ].forEach((card) => state.flashcards.push({ id: uid("card"), subject, title: subject, reviewCount: 0, source: "ai", published: false, imageName: file.name, ...card }));
        state.ui.cardCreateOpen = false;
        state.ui.selectedCardSubject = subject;
        save();
        render();
      });
    }

    if (route === "bot") {
      document.querySelector("#chat-form")?.addEventListener("submit", async (event) => {
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
      document.querySelector("#chat-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const message = formData(event.currentTarget).message.trim();
        const attachment = state.ui.chatAttachmentName;
        if (!message && !attachment) return;
        if (!state.settings.premiumActive && state.settings.aiQuestionsUsed >= state.settings.aiLimit) {
          state.chat.push({ id: uid("msg"), role: "bot", text: "Basis-Limit erreicht: 5 AI-Fragen sind genutzt." });
        } else {
          state.chat.push({ id: uid("msg"), role: "user", text: `${message || "Foto-Frage"}${attachment ? ` [Foto: ${attachment}]` : ""}` });
          state.chat.push({ id: uid("msg"), role: "bot", text: "StudyUp AI denkt …" }); const botMessage = state.chat[state.chat.length - 1];  try {   botMessage.text = await askStudyUpAI(message, attachment); } catch (error) {   botMessage.text = "AI error: " + error.message; }
          if (!state.settings.premiumActive) state.settings.aiQuestionsUsed += 1;
        }
        state.ui.chatAttachmentName = "";
        save();
        render();
      });
    }

    if (route === "premium") {
      document.querySelector(".activate-plus")?.addEventListener("click", () => {
        state.settings.premiumActive = true;
        save();
        render();
      });
      document.querySelectorAll(".setting-control").forEach((control) => control.addEventListener("change", () => {
        if (!state.settings.premiumActive) return;
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
  notificationButton?.addEventListener("click", requestNotifications);

  ensureCollections();
  applyTheme();
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#dashboard";
  render();
})();
