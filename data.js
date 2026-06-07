(function () {
  window.StudyUpSeed = {
    user: {
      loggedIn: false,
      name: "",
      email: "",
      password: "",
      region: "ch"
    },
    settings: {
      plan: "free",
      planName: "Free",
      premiumActive: false,
      aiLimit: 10,
      aiQuestionsUsed: 0,
      aiQuestionsMonth: "",
      theme: "light",
      accent: "green",
      gradeSystem: "ch",
      language: "de-CH",
      dashboardStyle: "compact",
      cardStyle: "stacked"
    },
    gradeSystems: [
      { id: "ch", name: "Schweiz", language: "de-CH", label: "Noten 1-6", min: 1, max: 6, step: 0.01, pass: 4, higherIsBetter: true, example: "5.75" },
      { id: "de", name: "Deutschland", language: "de-DE", label: "Noten 1-6", min: 1, max: 6, step: 0.1, pass: 4, higherIsBetter: false, example: "2.0" },
      { id: "us", name: "USA", language: "en-US", label: "GPA 0-4", min: 0, max: 4, step: 0.1, pass: 2, higherIsBetter: true, example: "3.6" },
      { id: "fr", name: "France", language: "fr-FR", label: "Notes 0-20", min: 0, max: 20, step: 0.5, pass: 10, higherIsBetter: true, example: "15" },
      { id: "uk", name: "United Kingdom", language: "en-GB", label: "GCSE 1-9", min: 1, max: 9, step: 1, pass: 4, higherIsBetter: true, example: "7" },
      { id: "it", name: "Italia", language: "it-IT", label: "Voti 1-10", min: 1, max: 10, step: 0.5, pass: 6, higherIsBetter: true, example: "8" },
      { id: "es", name: "España", language: "es-ES", label: "Notas 0-10", min: 0, max: 10, step: 0.1, pass: 5, higherIsBetter: true, example: "8.5" },
      { id: "nl", name: "Nederland", language: "nl-NL", label: "Cijfers 1-10", min: 1, max: 10, step: 0.1, pass: 5.5, higherIsBetter: true, example: "7.8" },
      { id: "jp", name: "日本", language: "ja-JP", label: "Score 0-100", min: 0, max: 100, step: 1, pass: 60, higherIsBetter: true, example: "82" },
      { id: "br", name: "Brasil", language: "pt-BR", label: "Notas 0-10", min: 0, max: 10, step: 0.1, pass: 6, higherIsBetter: true, example: "8.0" },
      { id: "dk", name: "Danmark", language: "da-DK", label: "7-trins-skala", min: -3, max: 12, step: 1, pass: 2, higherIsBetter: true, example: "10" },
      { id: "ib", name: "International Baccalaureate", language: "en-GB", label: "IB 1-7", min: 1, max: 7, step: 1, pass: 4, higherIsBetter: true, example: "6" }
    ],
    languages: [
      { id: "de-CH", name: "Deutsch" },
      { id: "en-US", name: "English" },
      { id: "fr-FR", name: "Français" },
      { id: "it-IT", name: "Italiano" },
      { id: "es-ES", name: "Español" }
    ],
    notifications: [],
    homework: [],
    subjects: [],
    exams: [],
    goals: [],
    planEvents: [],
    studyTasks: [],
    mistakes: [],
    flashcards: [],
    cardSchedule: {},
    deckSessions: {},
    deckSessionHistory: [],
    cardXpHistory: {},
    cardStudySession: {
      choosing: false,
      active: false,
      completed: false
    },
    weeklyDeckChallenge: {
      weekKey: "",
      target: 5,
      progress: 0,
      rewardXp: 150,
      rewarded: false
    },
    dailyDeckStats: {
      date: "",
      fullSessions: 0,
      sessionsCompleted: 0,
      cardXp: 0,
      deckXp: 0
    },
    xpTotal: 0,
    xpThisWeek: 0,
    level: 1,
    badges: [],
    dailyQuests: [],
    dailyQuestDate: "",
    weeklyStats: {
      weekKey: "",
      xp: 0,
      cardsReviewed: 0,
      mistakesFixed: 0,
      mistakesReviewed: 0,
      studySessions: 0,
      studyDays: [],
      studyTasksAdded: 0,
      questsCompleted: 0
    },
    personalRecords: {
      bestWeeklyXp: 0,
      bestCardsWeek: 0,
      bestMistakesWeek: 0,
      bestSessionsWeek: 0,
      totalCardsReviewed: 0,
      totalMistakesFixed: 0,
      totalStudySessions: 0
    },
    friends: [
      { id: "mia", name: "Mia", initials: "M", weeklyXp: 620, improved: 18, mistakesFixed: 12, cardsReviewed: 64, studySessions: 5 },
      { id: "leo", name: "Leo", initials: "L", weeklyXp: 540, improved: 14, mistakesFixed: 9, cardsReviewed: 58, studySessions: 4 },
      { id: "nora", name: "Nora", initials: "N", weeklyXp: 430, improved: 11, mistakesFixed: 7, cardsReviewed: 45, studySessions: 3 }
    ],
    friendsChallenge: {
      title: "Ruhige Lernwoche",
      reward: "100 XP Bonus",
      weekKey: "",
      cardsGoal: 150,
      mistakesGoal: 40
    },
    leaderboardPrivacy: {
      visible: false,
      displayName: "Du"
    },
    classLeague: {
      className: "Klasse 2B",
      classCode: "LYNX-2B",
      weekKey: "",
      tier: "forest",
      bonusAwarded: false,
      demoLabel: "Demo-Klassenliga · lokal gespeichert",
      goals: {
        cardsReviewed: 400,
        mistakesFixed: 80,
        studySessions: 40
      },
      classmates: [
        { id: "mia", displayName: "Mia", initials: "M", weeklyXp: 620, cardsReviewed: 76, mistakesFixed: 18, studySessions: 7, improved: 24, tier: "forest" },
        { id: "leo", displayName: "Leo", initials: "L", weeklyXp: 540, cardsReviewed: 68, mistakesFixed: 14, studySessions: 6, improved: 20, tier: "forest" },
        { id: "nora", displayName: "Nora", initials: "N", weeklyXp: 430, cardsReviewed: 45, mistakesFixed: 9, studySessions: 4, improved: 16, tier: "forest" },
        { id: "sam", displayName: "Sam", initials: "S", weeklyXp: 390, cardsReviewed: 38, mistakesFixed: 7, studySessions: 3, improved: 14, tier: "forest" },
        { id: "elif", displayName: "Elif", initials: "E", weeklyXp: 340, cardsReviewed: 31, mistakesFixed: 5, studySessions: 3, improved: 12, tier: "forest" }
      ]
    },
    classLeaguePrivacy: {
      joined: false,
      visible: false,
      displayName: "Du"
    },
    classLeagueDemo: true,
    recentXpEvents: [],
    weeklyLeagueStats: {
      weekKey: "",
      weeklyXp: 0,
      cardsReviewed: 0,
      mistakesFixed: 0,
      studySessions: 0,
      improved: 0
    },
    leagueTier: "forest",
    classCode: "LYNX-2B",
    streak: {
      current: 0,
      weeklySessions: 0,
      lastStudyDate: ""
    },
    cardLibrary: [
      {
        id: "fr-unit-1",
        title: "Französisch UNIT 1",
        subject: "Französisch",
        author: "Lynxly Datenbank",
        description: "Grundwortschatz für Begrüßung, Familie und Schule.",
        freeCount: 5,
        totalCount: 18,
        cards: [
          { question: "bonjour", answer: "guten Tag / hallo", difficulty: 2 },
          { question: "au revoir", answer: "auf Wiedersehen", difficulty: 1 },
          { question: "la famille", answer: "die Familie", difficulty: 1 },
          { question: "le collège", answer: "die Schule", difficulty: 2 },
          { question: "j'habite", answer: "ich wohne", difficulty: 3 },
          { question: "un ami / une amie", answer: "ein Freund / eine Freundin", difficulty: 2 },
          { question: "écouter", answer: "zuhören", difficulty: 3 },
          { question: "écrire", answer: "schreiben", difficulty: 2 }
        ]
      },
      {
        id: "bio-cells",
        title: "Biologie Zellen",
        subject: "Biologie",
        author: "Lynxly Datenbank",
        description: "Organellen, Zelltypen und Funktionen für kurze Wiederholung.",
        freeCount: 4,
        totalCount: 14,
        cards: [
          { question: "Zellkern", answer: "Steuert die Zelle und enthält DNA.", difficulty: 2 },
          { question: "Ribosomen", answer: "Bauen Proteine zusammen.", difficulty: 2 },
          { question: "Chloroplasten", answer: "Betreiben Fotosynthese in Pflanzenzellen.", difficulty: 1 },
          { question: "Zellmembran", answer: "Regelt Stoffaustausch und grenzt ab.", difficulty: 1 },
          { question: "Vakuole", answer: "Speichert Wasser und sorgt für Stabilität.", difficulty: 3 }
        ]
      }
    ],
    chat: [],
    ui: {
      selectedCardSubject: null,
      selectedGradeSubject: null,
      selectedPartialGroup: null,
      showSubjectForm: false,
      showGradeEntryForm: false,
      showTargetGradeForm: false,
      showPartialEntryForm: false,
      showEventForm: false,
      showExamForm: false,
      showMistakeForm: false,
      progressTab: "me",
      leaderboardTab: "xp",
      classLeagueTab: "xp",
      plannerMonthOffset: 0,
      selectedPlannerDate: "",
      cardSearch: "",
      cardCreateOpen: false,
      cardCreateMode: "",
      cardStudyOpen: false,
      cardStudyMode: "",
      cardStudyIndex: 0,
      studySessionStep: 0,
      studySessionCardIndex: 0,
      mistakeFilter: "open",
      settingsTab: "profile",
      designOpen: false,
      aiOfflineMode: true,
      lastPhotoName: "",
      chatAttachmentName: ""
    }
  };
})();

