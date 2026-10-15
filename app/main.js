(() => {
  "use strict";

  const ALL_CATEGORIES = "__all__";
  const state = {
    mode: "learn",
    unit: "",
    category: ALL_CATEGORIES,
    cards: [],
    currentIndex: 0,
    answers: [],
    data: null,
    testDirection: "question",
    lastValidation: null,
    reviewQueue: [],
    stats: {
      sessions: 0,
      correct: 0,
      total: 0,
      reviewQueue: 0,
    },
  };

  const $ = (selector) => document.querySelector(selector);
  const screens = {
    setup: $("#setupScreen"),
    exercise: $("#exerciseScreen"),
    result: $("#resultScreen"),
  };
  const flashcard = $("#flashcard");

  function normalizeCard(card) {
    if (!card || typeof card !== "object") return card;

    const normalized = { ...card };
    if (normalized.frensh_word === undefined) {
      normalized.frensh_word =
        normalized.french_word ??
        normalized.french ??
        normalized.question ??
        "";
    }
    if (normalized.german_word === undefined) {
      normalized.german_word = normalized.german ?? normalized.answer ?? "";
    }
    if (normalized.freansh_example === undefined) {
      normalized.freansh_example =
        normalized.frensh_example ??
        normalized.french_example ??
        normalized.frenchExample ??
        normalized.example ??
        "";
    }
    if (normalized.german_example === undefined) {
      normalized.german_example =
        normalized.germanExample ?? normalized.german_example ?? "";
    }
    return normalized;
  }

  function getFrenchValue(card) {
    return String(
      card?.frensh_word ??
        card?.french_word ??
        card?.french ??
        card?.question ??
        "",
    ).trim();
  }

  function getGermanValue(card) {
    return String(
      card?.german_word ?? card?.german ?? card?.answer ?? "",
    ).trim();
  }

  function getQuestionValue(card) {
    return String(card?.frage ?? getFrenchValue(card)).trim();
  }

  function getAnswerValue(card) {
    return String(card?.antwort ?? getGermanValue(card)).trim();
  }

  function isFrenchCard(card) {
    return Boolean(getFrenchValue(card));
  }

  function getQuestionLanguage(card) {
    return isFrenchCard(card) ? "fr-FR" : "de-DE";
  }

  function getFrenchExampleValue(card) {
    return String(
      card?.freansh_example ??
        card?.frensh_example ??
        card?.french_example ??
        card?.frenchExample ??
        card?.example ??
        "",
    ).trim();
  }

  function getGermanExampleValue(card) {
    return String(card?.german_example ?? card?.germanExample ?? "").trim();
  }

  function showScreen(name) {
    Object.values(screens).forEach((screen) =>
      screen.classList.remove("active"),
    );
    screens[name].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function normalizeCategories(fileData) {
    const rawCategories = Array.isArray(fileData)
      ? fileData
      : Array.isArray(fileData?.categories)
        ? fileData.categories
        : [];

    return rawCategories.flatMap((category) => {
      if (!category || typeof category !== "object") return [];

      const ids = Array.isArray(category.id) ? category.id : [category.id];
      return ids
        .filter(Boolean)
        .map((id) => ({ ...category, id: String(id).trim() }));
    });
  }

  function makeUniqueCategoryKey(baseId, usedKeys) {
    if (!usedKeys.has(baseId)) return baseId;

    let suffix = 2;
    let key = `${baseId}_${suffix}`;
    while (usedKeys.has(key)) {
      suffix += 1;
      key = `${baseId}_${suffix}`;
    }
    return key;
  }

  function updateChapterSelect() {
    const chapterSelect = $("#chapterSelect");
    const unit = state.data?.units?.[state.unit];
    chapterSelect.innerHTML = "";

    if (!unit || !unit.categories.length) {
      chapterSelect.hidden = true;
      state.category = "";
      return;
    }

    const allOption = document.createElement("option");
    allOption.value = ALL_CATEGORIES;
    allOption.textContent = "Alle";
    chapterSelect.appendChild(allOption);

    unit.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name || category.id;
      chapterSelect.appendChild(option);
    });

    chapterSelect.hidden = false;
    if (
      state.category === ALL_CATEGORIES ||
      unit.categories.some((category) => category.id === state.category)
    ) {
      chapterSelect.value = state.category;
    } else {
      state.category = ALL_CATEGORIES;
      chapterSelect.value = state.category;
    }
  }

  async function loadData() {
    const unitSelect = $("#unitSelect");
    const chapterSelect = $("#chapterSelect");
    const cacheBuster = Date.now();
    try {
      const config = await fetch(`data/categories.json?cb=${cacheBuster}`).then(
        (response) => response.json(),
      );
      const fileEntries = await Promise.all(
        config.files.map(async (entry) => {
          const file = typeof entry === "string" ? entry : entry.file;
          const label = typeof entry === "string" ? "" : entry.label;
          try {
            const response = await fetch(`data/${file}?cb=${cacheBuster}`);
            if (!response.ok) return { file, label, payload: null };
            return { file, label, payload: await response.json() };
          } catch {
            return { file, label, payload: null };
          }
        }),
      );

      const units = {};
      fileEntries.forEach(({ file, label, payload }) => {
        if (!payload) return;
        const unitId = file.replace(/\.json$/i, "");
        const categories = normalizeCategories(payload).map((category) => ({
          ...category,
          id: String(category.id || `${unitId}_category`).trim(),
          name: String(category.name || category.id || unitId),
          cards: Array.isArray(category.cards)
            ? category.cards.filter((card) => card?.frage && card?.antwort)
            : [],
        }));

        if (!categories.some((category) => category.cards.length)) return;
        units[unitId] = {
          id: unitId,
          label: label || unitId.replace(/[_-]/g, " "),
          categories,
        };
      });

      state.data = { units, categories: {} };
      Object.values(units).forEach((unit) => {
        unit.categories.forEach((category) => {
          state.data.categories[`${unit.id}:${category.id}`] = category;
        });
      });

      unitSelect.innerHTML = "";
      Object.entries(units).forEach(([unitId, unit]) => {
        const option = document.createElement("option");
        option.value = unitId;
        option.textContent = unit.label;
        unitSelect.appendChild(option);
      });

      if (unitSelect.options.length) {
        state.unit = unitSelect.value || unitSelect.options[0].value;
        unitSelect.value = state.unit;
      } else {
        unitSelect.innerHTML =
          "<option value=''>Keine Lernkarten verfügbar</option>";
        unitSelect.disabled = true;
        $("#startButton").disabled = true;
        $("#setupStatus").textContent =
          "Noch keine gültigen Lernkarten gefunden. Prüfe die JSON-Dateien im Ordner data.";
      }

      updateChapterSelect();
      chapterSelect.hidden = !state.category;
    } catch (error) {
      unitSelect.innerHTML =
        "<option>Daten konnten nicht geladen werden</option>";
      unitSelect.disabled = true;
      $("#startButton").disabled = true;
      chapterSelect.hidden = true;
      $("#setupStatus").textContent =
        "Die Daten konnten nicht geladen werden. Bitte prüfe die JSON-Dateien.";
      console.error(error);
    }
  }

  function selectMode(mode) {
    state.mode = mode;
    if (mode === "test") state.testDirection = "question";
    document
      .querySelectorAll(".mode-card")
      .forEach((button) =>
        button.classList.toggle("selected", button.dataset.mode === mode),
      );
  }

  function normalizeAnswerValue(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u2019']/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function speakText(text, lang = "de-DE") {
    if (!text || !("speechSynthesis" in window)) return;

    const speech = window.speechSynthesis;
    speech.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = speech.getVoices();
    const matchingVoice =
      voices.find(
        (voice) =>
          voice.lang && voice.lang.toLowerCase().startsWith(lang.toLowerCase()),
      ) ||
      voices.find(
        (voice) =>
          voice.lang &&
          voice.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase()),
      ) ||
      voices[0];

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    speech.speak(utterance);
  }

  function getSpeechText(text, lang) {
    const value = String(text || "").trim();
    if (!lang.toLowerCase().startsWith("fr")) return value;

    return value
      .replace(/\ble\/la\s+([\p{L}]+)\/e\b/giu, (match, word) => {
        const stem = word.toLowerCase();
        return `le ${stem}, la ${stem}e`;
      })
      .replace(/([\p{L}]+)\/e\b/giu, "$1, $1e")
      .replace(/\ble\/la\s+([\p{L}]+(?:-[\p{L}]+)*)\b/giu, "le $1, la $1")
      .replace(/\bqn\/qc\b/gi, "quelqu'un ou quelque chose")
      .replace(/\bqc\/qn\b/gi, "quelque chose ou quelqu'un")
      .replace(/\bqn\b/gi, "quelqu'un")
      .replace(/\bqc\b/gi, "quelque chose")
      .replace(/\binf\./gi, "infinitif")
      .replace(/^(.+?)\s+\/\s+(.+)$/u, "$1, $2")
      .replace(/\b([\p{L}]+)\/([\p{L}]+)\b/giu, "$1, $2")
      .replace(/\+\s*nom\b/gi, " plus un nom")
      .replace(/\s*\+\s*/g, " plus ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function renderTextWithPlay(element, text, lang, label) {
    if (!element) return;

    const safeText = String(text || "").trim();
    element.innerHTML = "";

    if (!safeText) {
      element.hidden = true;
      return;
    }

    const row = document.createElement("div");
    row.className = "text-with-play";

    const value = document.createElement("div");
    value.className = "text-value";
    value.textContent = safeText;
    value.dataset.speechText = getSpeechText(safeText, lang);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "play-button";
    button.setAttribute("aria-label", `Vorlesen: ${label}`);
    button.title = `Vorlesen: ${label}`;
    button.innerHTML = "▶";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      speakText(value.dataset.speechText, lang);
    });

    row.appendChild(value);
    row.appendChild(button);
    element.appendChild(row);
    element.hidden = false;
  }

  function loadStats() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("informatik10_progress") || "{}",
      );
      return {
        sessions: Number(saved.sessions) || 0,
        correct: Number(saved.correct) || 0,
        total: Number(saved.total) || 0,
        reviewQueue: Number(saved.reviewQueue) || 0,
      };
    } catch {
      return { sessions: 0, correct: 0, total: 0, reviewQueue: 0 };
    }
  }

  function saveStats() {
    localStorage.setItem(
      "informatik10_progress",
      JSON.stringify({
        sessions: state.stats.sessions,
        correct: state.stats.correct,
        total: state.stats.total,
        reviewQueue: state.stats.reviewQueue,
      }),
    );
  }

  function updateProgressSummary() {
    state.stats = loadStats();
    $("#setupStatSessions").textContent = String(state.stats.sessions);
    const accuracy = state.stats.total
      ? Math.round((state.stats.correct / state.stats.total) * 100)
      : 0;
    $("#setupStatAccuracy").textContent = `${accuracy}%`;
    $("#setupStatReview").textContent = String(state.stats.reviewQueue);
  }

  function start() {
    const unit = state.data?.units?.[state.unit];
    const categories =
      unit?.categories?.filter(
        (category) =>
          state.category === ALL_CATEGORIES || category.id === state.category,
      ) || [];
    const cards = categories.flatMap((category) => category.cards);

    if (!cards.length) return;
    state.cards = cards.map(normalizeCard);
    state.currentIndex = 0;
    state.answers = [];
    state.testDirection = "question";
    $("#testDirectionButton").hidden = false;
    $("#categoryLabel").textContent =
      `${unit?.label || "Fachbereich"} · ${state.category === ALL_CATEGORIES ? "Alle Themen" : categories[0].name}`;
    $("#modeLabel").textContent = state.mode === "learn" ? "Lernen" : "Test";
    $("#exerciseTitle").textContent =
      state.mode === "learn" ? "Lernkarte" : "Teste dein Wissen";
    showScreen("exercise");
    renderCard();
  }

  function toggleTestDirection() {
    state.testDirection =
      state.testDirection === "question" ? "answer" : "question";
    state.lastValidation = null;
    if (state.mode === "test") state.answers[state.currentIndex] = null;
    renderCard();
  }

  function validateAndCorrectCurrentAnswer() {
    const answerInput = $("#answerInput");
    const currentCard = state.cards[state.currentIndex];
    if (state.mode !== "test" || !answerInput || !currentCard) return false;

    const typedValue = answerInput.value || "";
    const expectedValue =
      state.testDirection === "question"
        ? getAnswerValue(currentCard)
        : getQuestionValue(currentCard);
    const isCorrect =
      normalizeAnswerValue(typedValue) === normalizeAnswerValue(expectedValue);
    const correctedValue = String(expectedValue).trim();

    answerInput.value = correctedValue;
    state.answers[state.currentIndex] = {
      input: correctedValue,
      side: state.testDirection,
      expected: correctedValue,
      isCorrect,
    };
    state.lastValidation = {
      cardIndex: state.currentIndex,
      message: isCorrect ? "Richtig!" : `Korrigiert: ${correctedValue}`,
      isCorrect,
    };
    $("#feedback").textContent = state.lastValidation.message;
    $("#feedback").className = `feedback ${isCorrect ? "success" : "warning"}`;
    return true;
  }

  function renderCard() {
    const card = state.cards[state.currentIndex];
    if (!card) return finish();
    const total = state.cards.length;
    const isValidated =
      state.mode === "test" &&
      state.lastValidation &&
      state.lastValidation.cardIndex === state.currentIndex;
    $("#progressLabel").textContent = `${state.currentIndex + 1} / ${total}`;
    $("#progressBar").style.width =
      `${((state.currentIndex + 1) / total) * 100}%`;
    const feedback = $("#feedback");
    if (isValidated) {
      feedback.textContent = state.lastValidation.message;
      feedback.className = `feedback ${state.lastValidation.isCorrect ? "success" : "warning"}`;
    } else {
      feedback.textContent = "";
      feedback.className = "feedback";
    }
    $("#backButton").hidden = state.currentIndex === 0;
    const nextButton = $("#nextButton");
    if (state.mode === "test") {
      const answerInput = $("#answerInput");
      const hasTypedAnswer =
        !!answerInput && String(answerInput.value || "").trim().length > 0;

      nextButton.textContent = isValidated
        ? state.currentIndex === total - 1
          ? "Fertig"
          : "Weiter"
        : "Prüfen";
      nextButton.disabled = !isValidated && !hasTypedAnswer;
    } else {
      nextButton.textContent =
        state.currentIndex === total - 1 ? "Fertig" : "Weiter";
      nextButton.disabled = false;
    }

    const answerArea = $("#answerArea");
    const frontLabel = $(".flashcard-front .card-label");
    const backLabel = $(".flashcard-back .card-label");
    answerArea.innerHTML = "";
    flashcard.classList.remove("is-flipped", "is-test");
    flashcard.classList.toggle("is-learn", state.mode === "learn");

    const exampleTextContainer = $("#exampleText");
    if (exampleTextContainer) {
      exampleTextContainer.textContent = "";
      exampleTextContainer.hidden = true;
    }

    if (state.mode === "learn") {
      const questionTextContainer = $("#questionText");
      const isQuestionPrompt = state.testDirection === "question";
      const promptText = isQuestionPrompt
        ? getQuestionValue(card)
        : getAnswerValue(card);
      const promptLanguage = isQuestionPrompt
        ? getQuestionLanguage(card)
        : "de-DE";
      renderTextWithPlay(
        questionTextContainer,
        promptText,
        promptLanguage,
        promptLanguage === "fr-FR" ? "Französisch" : "Deutsch",
      );

      const frenchExample = getFrenchExampleValue(card);
      const germanExample = getGermanExampleValue(card);
      const exampleValue = isQuestionPrompt
        ? frenchExample || germanExample
        : germanExample || frenchExample;
      const exampleLang = isQuestionPrompt && frenchExample ? "fr-FR" : "de-DE";
      renderTextWithPlay(
        exampleTextContainer,
        exampleValue,
        exampleLang,
        exampleLang === "fr-FR" ? "Französisch" : "Deutsch",
      );

      const answerWrap = document.createElement("div");
      answerWrap.className = "answer-wrap";

      const answer = document.createElement("div");
      answer.className = "answer-display";
      answer.textContent = isQuestionPrompt
        ? getAnswerValue(card)
        : getQuestionValue(card);
      answerWrap.appendChild(answer);

      const backExample = isQuestionPrompt ? germanExample : frenchExample;
      if (backExample) {
        const answerExample = document.createElement("div");
        answerExample.className = "answer-example-wrap";
        const exampleLabel = document.createElement("span");
        exampleLabel.className = "example-label";
        exampleLabel.textContent = "Beispiel";
        const exampleText = document.createElement("div");
        exampleText.className = "question-example";
        exampleText.textContent = backExample;
        answerExample.appendChild(exampleLabel);
        answerExample.appendChild(exampleText);
        answerWrap.appendChild(answerExample);
      }

      answerArea.appendChild(answerWrap);
      flashcard.tabIndex = 0;
      flashcard.setAttribute("role", "button");
      flashcard.setAttribute("aria-pressed", "false");
      flashcard.setAttribute(
        "aria-label",
        `Karte umdrehen und ${isQuestionPrompt ? "Antwort" : "Frage"} anzeigen`,
      );
      if (frontLabel)
        frontLabel.textContent = isQuestionPrompt ? "Frage" : "Antwort";
      if (backLabel)
        backLabel.textContent = isQuestionPrompt ? "Antwort" : "Frage";
      return;
    }

    const isQuestionPrompt = state.testDirection === "question";
    const promptText = isQuestionPrompt
      ? getQuestionValue(card)
      : getAnswerValue(card);
    const promptLanguage = isQuestionPrompt
      ? getQuestionLanguage(card)
      : "de-DE";
    renderTextWithPlay(
      $("#questionText"),
      promptText,
      promptLanguage,
      promptLanguage === "fr-FR" ? "Französisch" : "Deutsch",
    );

    const exampleValue = isQuestionPrompt
      ? getFrenchExampleValue(card)
      : getGermanExampleValue(card);
    const exampleLang = isQuestionPrompt ? getQuestionLanguage(card) : "de-DE";
    renderTextWithPlay(
      exampleTextContainer,
      exampleValue ||
        (isQuestionPrompt
          ? getGermanExampleValue(card)
          : getFrenchExampleValue(card)),
      exampleLang,
      exampleLang === "fr-FR" ? "Französisch" : "Deutsch",
    );

    flashcard.classList.add("is-test");
    flashcard.removeAttribute("tabindex");
    flashcard.removeAttribute("role");
    flashcard.removeAttribute("aria-pressed");
    flashcard.setAttribute(
      "aria-label",
      isQuestionPrompt ? "Antwort eingeben" : "Frage eingeben",
    );
    if (frontLabel)
      frontLabel.textContent = isQuestionPrompt ? "Frage" : "Antwort";
    if (backLabel)
      backLabel.textContent = isQuestionPrompt ? "Antwort" : "Frage";

    const input = document.createElement("input");
    input.id = "answerInput";
    input.className = "answer-input";
    input.placeholder = isQuestionPrompt
      ? "Antwort eingeben ..."
      : "Frage eingeben ...";
    input.autocomplete = "off";
    input.setAttribute(
      "aria-label",
      isQuestionPrompt ? "Antwort eingeben" : "Frage eingeben",
    );
    input.addEventListener("input", () => {
      const nextButton = $("#nextButton");
      if (!nextButton) return;
      const hasTypedAnswer = String(input.value || "").trim().length > 0;
      nextButton.disabled =
        state.lastValidation?.cardIndex !== state.currentIndex &&
        !hasTypedAnswer;
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        next();
      }
    });
    answerArea.appendChild(input);
    setTimeout(() => input.focus(), 80);
  }

  function next() {
    if (state.mode === "test") {
      const isValidated =
        state.lastValidation &&
        state.lastValidation.cardIndex === state.currentIndex;

      if (!isValidated) {
        const processed = validateAndCorrectCurrentAnswer();
        renderCard();

        if (
          processed &&
          state.lastValidation &&
          state.lastValidation.isCorrect
        ) {
          const currentCardIndex = state.currentIndex;
          window.setTimeout(() => {
            if (state.mode !== "test") return;
            if (state.currentIndex !== currentCardIndex) return;

            const hasMoreCards = state.currentIndex < state.cards.length - 1;
            state.lastValidation = null;
            if (!hasMoreCards) {
              finish();
              return;
            }

            state.currentIndex += 1;
            renderCard();
          }, 700);
        }
        return;
      }

      const hasMoreCards = state.currentIndex < state.cards.length - 1;
      state.lastValidation = null;
      if (!hasMoreCards) {
        finish();
        return;
      }

      state.currentIndex += 1;
      renderCard();
      return;
    }
    if (state.currentIndex >= state.cards.length - 1) return finish();
    state.currentIndex += 1;
    renderCard();
  }

  function previous() {
    if (state.currentIndex === 0) return;
    state.currentIndex -= 1;
    renderCard();
  }

  function finish() {
    if (state.mode === "learn") return showScreen("setup");
    const wrongCards = [];
    const correct = state.cards.reduce((count, card, index) => {
      const answerData = state.answers[index];
      if (!answerData) return count;

      const typedValue = normalizeAnswerValue(answerData.input || "");
      const expectedValue = normalizeAnswerValue(
        answerData.side === "question"
          ? getAnswerValue(card)
          : getQuestionValue(card),
      );

      const isCorrect = typedValue === expectedValue;
      if (!isCorrect) wrongCards.push(card);
      return count + (isCorrect ? 1 : 0);
    }, 0);
    const total = state.cards.length;
    state.reviewQueue = wrongCards;
    state.stats = loadStats();
    state.stats.sessions += 1;
    state.stats.correct += correct;
    state.stats.total += total;
    state.stats.reviewQueue = wrongCards.length;
    saveStats();
    updateProgressSummary();
    $("#scorePercent").textContent =
      `${total ? Math.round((correct / total) * 100) : 0}%`;
    $("#scoreSummary").textContent = `${correct} von ${total} richtig`;
    const mistakesLabel = $("#resultMistakes");
    const retryButton = $("#retryMistakesButton");

    if (wrongCards.length > 0) {
      mistakesLabel.textContent = `${wrongCards.length} Karte(n) solltest du noch einmal üben.`;
      retryButton.hidden = false;
      retryButton.textContent = `Falsche erneut (${wrongCards.length})`;
    } else {
      mistakesLabel.textContent = "Perfekt! Keine Fehler in dieser Runde.";
      retryButton.hidden = true;
    }
    showScreen("result");
  }

  function returnHome() {
    showScreen("setup");
  }

  function setTheme(theme) {
    const dark = theme === "dark";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    $("#themeIcon").textContent = dark ? "☀" : "☾";
    $("#themeButton").setAttribute(
      "aria-label",
      dark ? "Hellmodus aktivieren" : "Dunkelmodus aktivieren",
    );
    localStorage.setItem("informatik10_theme", theme);
  }

  function flipCard() {
    if (state.mode !== "learn") return;
    const flipped = flashcard.classList.toggle("is-flipped");
    const frontLabel =
      $(".flashcard-front .card-label")?.textContent || "Frage";
    const backLabel =
      $(".flashcard-back .card-label")?.textContent || "Antwort";
    flashcard.setAttribute("aria-pressed", String(flipped));
    flashcard.setAttribute(
      "aria-label",
      flipped
        ? `Karte zurückdrehen und ${frontLabel} anzeigen`
        : `Karte umdrehen und ${backLabel} anzeigen`,
    );
  }

  $("#unitSelect").addEventListener("change", (event) => {
    state.unit = event.target.value;
    state.category = ALL_CATEGORIES;
    updateChapterSelect();
  });
  $("#chapterSelect").addEventListener("change", (event) => {
    state.category = event.target.value;
  });
  document
    .querySelectorAll(".mode-card")
    .forEach((button) =>
      button.addEventListener("click", () => selectMode(button.dataset.mode)),
    );
  $("#startButton").addEventListener("click", start);
  $("#backButton").addEventListener("click", previous);
  $("#nextButton").addEventListener("click", next);
  $("#finishButton").addEventListener("click", returnHome);
  $("#restartButton").addEventListener("click", start);
  $("#retryMistakesButton").addEventListener("click", () => {
    if (!state.reviewQueue.length) return;
    const unit = state.data?.units?.[state.unit];
    if (!unit?.categories?.length) return;
    state.cards = [...state.reviewQueue].map(normalizeCard);
    state.currentIndex = 0;
    state.answers = [];
    state.testDirection = "question";
    state.lastValidation = null;
    $("#categoryLabel").textContent =
      `${unit.label || "Einheit"} · ${state.category === ALL_CATEGORIES ? "Alle Themen" : unit.categories.find((category) => category.id === state.category)?.name || "Alle Themen"}`;
    $("#modeLabel").textContent = "Test";
    $("#exerciseTitle").textContent = "Teste dein Wissen";
    showScreen("exercise");
    renderCard();
  });
  $("#resultHomeButton").addEventListener("click", returnHome);
  $("#testDirectionButton").addEventListener("click", toggleTestDirection);
  $("#themeButton").addEventListener("click", () =>
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    ),
  );
  flashcard.addEventListener("click", flipCard);
  flashcard.addEventListener("keydown", (event) => {
    const isTypingField =
      event.target instanceof HTMLElement &&
      (event.target.closest("input") || event.target.closest("textarea"));

    if (isTypingField) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flipCard();
    }
  });

  updateProgressSummary();
  setTheme(localStorage.getItem("informatik10_theme") || "light");
  loadData();
})();
