(function () {
  window.StudyUpSeed = {
    user: {
      loggedIn: false,
      name: "",
      email: "",
      region: "ch"
    },
    settings: {
      planName: "Basis",
      premiumActive: false,
      aiLimit: 5,
      aiQuestionsUsed: 0,
      theme: "light",
      accent: "blue",
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
    flashcards: [],
    cardLibrary: [
      {
        id: "fr-unit-1",
        title: "Französisch UNIT 1",
        subject: "Französisch",
        author: "StudyUp Database",
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
        author: "StudyUp Database",
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
      cardSearch: "",
      cardCreateOpen: false,
      cardCreateMode: "",
      lastPhotoName: "",
      chatAttachmentName: ""
    }
  };
})();
