const $app = document.getElementById("app");
const $toast = document.getElementById("toast");

const roster = [
  ["Alex", "char_alex.webp"],
  ["Billy", "char_billy.webp"],
  ["Catherine", "char_catherine.png"],
  ["Demarin", "char_demarin.webp"],
  ["Elisa", "char_elisa.webp"],
  ["Eva", "char_eva.png"],
  ["Evaggelia", "char_evaggelia.png"],
  ["Evelyn", "char_evelyn.webp"],
  ["Hope", "char_hope.webp"],
  ["Jasmine", "char_jasmine.png"],
  ["Luna", "char_luna.webp"],
  ["Pauline", "char_pauline.webp"],
  ["Phillip", "char_phillip.webp"],
  ["Rino", "char_rino.webp"],
  ["Sargenie", "char_sargenie.jpeg"],
  ["Smaragda", "char_smaragda.jpeg"],
  ["Sorina", "char_sorina.png"],
  ["Tony", "char_tony.webp"],
  ["Vicky", "char_vicky.jpg"],
  ["Violet", "char_violet.png"],
  ["Zoe", "char_zoe.jpeg"],
  ["Irene", "char_irene.png"]
].map(([name, file]) => ({ name, file }));

let state = freshState();
let introDone = false;
let currentAudio = null;
let seerReturnsToNightResolution = false;
let currentIntroVideo = null;
let speechUnlocked = false;
let activeUtterance = null;

function freshState() {
  return {
    gamePlayers: [],
    eliminated: [],
    placements: [],
    killers: [],
    log: [],
    tally: {},
    gameMaster: null,
    seer: null,
    witch: null,
    king: null,
    nightTarget: null,
    witchSave: null,
    pendingFirstRoundFallenKiller: null,
    playerCount: 8,
    killerCount: 2,
    round: 1,
    votingIndex: 0,
    blankVotes: 0,
    lastSpiritsWin: null,
    lastVictorySound: null
  };
}

function id(player) {
  return player && player.name;
}

function byName(name) {
  return roster.find(player => player.name === name) || null;
}

function inList(list, player) {
  return !!player && list.includes(player.name);
}

function addTo(list, player) {
  if (player && !inList(list, player)) list.push(player.name);
}

function removeFrom(list, player) {
  if (!player) return;
  const index = list.indexOf(player.name);
  if (index >= 0) list.splice(index, 1);
}

function livingPlayers() {
  return state.gamePlayers.map(byName).filter(player => player && !inList(state.eliminated, player));
}

function livingKillers() {
  return state.killers.map(byName).filter(player => player && !inList(state.eliminated, player));
}

function livingNonKillers() {
  return livingPlayers().filter(player => !inList(state.killers, player));
}

function roleName(player) {
  return player ? player.name : "κανείς";
}

function names(players) {
  return players.map(player => player.name).join(", ");
}

function maxKillers() {
  if (state.playerCount <= 6) return 1;
  if (state.playerCount <= 9) return 2;
  if (state.playerCount <= 14) return 3;
  if (state.playerCount <= 18) return 4;
  if (state.playerCount <= 20) return 5;
  return 6;
}

function revealRole(player) {
  if (inList(state.killers, player)) return "Δολοφόνος";
  if (id(player) === state.seer) return "Μάντης";
  if (id(player) === state.witch) return "Μάγισσα";
  if (id(player) === state.king) return "Βασιλιάς";
  return "Spirit";
}

function spokenRole(player) {
  if (inList(state.killers, player)) return "the murderer";
  if (id(player) === state.seer) return "the seer";
  if (id(player) === state.witch) return "the witch";
  if (id(player) === state.king) return "the king";
  return "a spirit";
}

function placementReason(reason) {
  if (reason === "murdered") return "Δολοφονήθηκε";
  if (reason === "voted") return "Ψηφοφορία";
  if (reason === "manual") return "Χειροκίνητα";
  if (reason === "winner") return "Νικητής";
  return "Εκτός";
}

function roleLabel(player) {
  const roles = [];
  if (id(player) === state.gameMaster) roles.push("Game Master");
  if (inList(state.killers, player)) roles.push("Δολοφόνος");
  if (id(player) === state.seer) roles.push("Μάντης");
  if (id(player) === state.witch) roles.push("Μάγισσα");
  if (id(player) === state.king) roles.push("Βασιλιάς");
  return roles.join(" / ");
}

function h(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.html !== undefined) element.innerHTML = options.html;
  if (options.src) element.src = options.src;
  if (options.alt !== undefined) element.alt = options.alt;
  if (options.type) element.type = options.type;
  if (options.controls) element.controls = true;
  if (options.autoplay) element.autoplay = true;
  if (options.playsInline) element.playsInline = true;
  if (options.loop) element.loop = true;
  if (options.onClick) element.addEventListener("click", options.onClick);
  children.forEach(child => element.append(child));
  return element;
}

function screen(kicker, title) {
  stopSound();
  $app.textContent = "";
  const root = h("section", { className: "screen" });
  root.append(
    h("div", { className: "brand", text: "SPIRITS" }),
    h("div", { className: "kicker", text: kicker }),
    h("h1", { className: "title", text: title })
  );
  $app.append(root);
  return root;
}

function paragraph(text, className = "") {
  return h("p", { className: `paragraph ${className}`.trim(), text });
}

function pill(text) {
  return h("div", { className: "pill", text });
}

function button(text, onClick, kind = "") {
  return h("button", { className: `btn ${kind}`.trim(), text, onClick });
}

function actions(...buttons) {
  return h("div", { className: "actions" }, buttons);
}

function toast(message) {
  $toast.textContent = message;
  $toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $toast.classList.remove("show"), 2200);
}

function imgPath(player) {
  return `assets/characters/${player.file}`;
}

function playerCard(player, { selected = false, crossed = false, enabled = true, label = "", onClick = () => {} } = {}) {
  const card = h("button", {
    className: `card ${selected ? "selected" : ""} ${!enabled ? "disabled" : ""}`.trim(),
    onClick: () => enabled && onClick()
  });
  const imageWrap = h("div");
  imageWrap.style.position = "relative";
  imageWrap.append(h("img", { className: "avatar", src: imgPath(player), alt: player.name }));
  if (crossed) imageWrap.append(h("div", { className: "cross", text: "X" }));
  card.append(imageWrap, h("div", { className: "card-name", text: player.name }));
  if (label) card.append(h("div", { className: "card-role", text: label }));
  return card;
}

function grid(cards) {
  return h("div", { className: "grid" }, cards);
}

function statusPanel() {
  return h("section", { className: "status" }, [
    h("div", { className: "label", text: "PALERMO TABLET" }),
    h("div", { className: "stats", text: `Ζωντανοί: ${livingPlayers().length}   Δολοφόνοι: ${livingKillers().length}   Εκτός: ${state.eliminated.length}` })
  ]);
}

function roleSummary() {
  return h("div", {
    className: "panel role-summary",
    text: `Δολοφόνοι: ${names(state.killers.map(byName).filter(Boolean))}\nΜάντης: ${roleName(byName(state.seer))}\nΜάγισσα: ${roleName(byName(state.witch))}\nΒασιλιάς: ${roleName(byName(state.king))}`
  });
}

function cinematic(text, accent = "var(--danger)") {
  const panel = h("section", { className: "cinematic" }, [
    h("div", { className: "label", text: "SPIRITS CONTROL" }),
    h("div", { className: "body", text })
  ]);
  panel.style.borderColor = accent;
  return panel;
}

function showConfirm({ kicker = "επιβεβαίωση", title, message, accent = "var(--pink)", confirmText = "Confirm", onConfirm, backText = "Πίσω", onBack }) {
  const root = screen(kicker, title);
  root.append(cinematic(message, accent));
  root.append(actions(
    button(confirmText, onConfirm),
    button(backText, onBack || showDashboard, "ghost")
  ));
}

function addHistory(root) {
  if (!state.log.length) return;
  const box = h("section", { className: "history" }, [h("h2", { text: "Ιστορικό" })]);
  for (let i = state.log.length - 1; i >= 0; i--) box.append(paragraph(state.log[i]));
  root.append(box);
}

function showIntroVideo() {
  if (introDone) return showIntro();
  $app.textContent = "";
  const root = h("section", { className: "intro-screen" });
  const video = h("video", {
    className: "intro-video",
    src: "assets/video/intro_spirits.mov",
    playsInline: true
  });
  currentIntroVideo = video;
  video.preload = "auto";
  video.muted = false;
  video.volume = 1;
  video.addEventListener("ended", finishIntro);
  root.append(
    video,
    actions(
      button("Έναρξη intro με ήχο", () => {
        unlockSpeech();
        video.muted = false;
        video.volume = 1;
        video.currentTime = 0;
        video.play().catch(() => toast("Το iOS μπλόκαρε τον ήχο. Πάτα ξανά ή έλεγξε silent mode."));
      }),
      button("Παράλειψη intro", finishIntro, "ghost")
    )
  );
  $app.append(root);
}

function finishIntro() {
  if (introDone) return;
  introDone = true;
  if (currentIntroVideo) {
    currentIntroVideo.pause();
    currentIntroVideo = null;
  }
  showIntro();
}

function showIntro() {
  state = freshState();
  const root = screen("κεντρικός συντονιστής", "Spirits");
  root.append(
    h("h2", { className: "title hero-title", text: "Game Master Mode" }),
    paragraph("Βάλε το iPad στη μέση. Ο πρώτος παίκτης που πεθαίνει γίνεται Game Master και από εδώ ελέγχει δολοφόνους, ειδικούς ρόλους, νύχτα και ψηφοφορίες.", "center"),
    actions(button("Νέο παιχνίδι", showSetupCounts))
  );
}

function counterBlock(label, value, minus, plus, accent = "var(--lilac)") {
  const block = h("section", { className: "counter" });
  block.append(
    h("div", { className: "counter-label", text: label }),
    h("div", { className: "counter-number", text: String(value) }),
    h("div", { className: "counter-controls" }, [
      h("button", { className: "small", text: "-", onClick: minus }),
      h("button", { className: "small", text: "+", onClick: plus })
    ])
  );
  block.querySelector(".counter-label").style.color = accent;
  block.querySelector(".counter-number").style.color = accent;
  return block;
}

function showSetupCounts() {
  state.killerCount = Math.max(1, Math.min(state.killerCount, maxKillers()));
  const root = screen("ρύθμιση παιχνιδιού", "Παίκτες και δολοφόνοι");
  root.append(
    counterBlock("Παίκτες", state.playerCount, () => {
      state.playerCount = Math.max(5, state.playerCount - 1);
      state.killerCount = Math.max(1, Math.min(state.killerCount, maxKillers()));
      showSetupCounts();
    }, () => {
      state.playerCount = Math.min(roster.length, state.playerCount + 1);
      state.killerCount = Math.max(1, Math.min(state.killerCount, maxKillers()));
      showSetupCounts();
    }),
    counterBlock("Δολοφόνοι", state.killerCount, () => {
      state.killerCount = Math.max(1, state.killerCount - 1);
      showSetupCounts();
    }, () => {
      const max = maxKillers();
      if (state.killerCount >= max) return toast(`Maximum ${max} δολοφόνοι για ${state.playerCount} παίκτες.`);
      state.killerCount += 1;
      showSetupCounts();
    }, "var(--danger)"),
    actions(button("Επιλογή χαρακτήρων", showPlayerSelection))
  );
}

function showPlayerSelection() {
  const root = screen("επιλογή παρέας", "Ποιοι παίζουν;");
  root.append(pill(`${state.gamePlayers.length} / ${state.playerCount} επιλεγμένοι`));
  root.append(grid(roster.map(player => playerCard(player, {
    selected: inList(state.gamePlayers, player),
    onClick: () => {
      if (inList(state.gamePlayers, player)) removeFrom(state.gamePlayers, player);
      else if (state.gamePlayers.length < state.playerCount) addTo(state.gamePlayers, player);
      else return toast(`Έχεις ήδη διαλέξει ${state.playerCount} παίκτες.`);
      showPlayerSelection();
    }
  }))));
  root.append(actions(button("Συνέχεια", () => {
    if (state.gamePlayers.length !== state.playerCount) return toast(`Διάλεξε ακριβώς ${state.playerCount} παίκτες.`);
    showGameMasterSelection();
  })));
}

function showGameMasterSelection() {
  const root = screen("πρώτος νεκρός", "Ποιος πέθανε πρώτος;");
  root.append(paragraph("Αυτός ο παίκτης βγαίνει από το παιχνίδι και γίνεται Game Master."));
  root.append(grid(state.gamePlayers.map(byName).map(player => playerCard(player, {
    selected: id(player) === state.gameMaster,
    onClick: () => {
      state.gameMaster = id(player);
      showGameMasterSelection();
    }
  }))));
  root.append(actions(button("Ορισμός Game Master", () => {
    if (!state.gameMaster) return toast("Διάλεξε ποιος πέθανε πρώτος.");
    showConfirm({
      title: state.gameMaster,
      message: `Επιβεβαίωσε ότι ο/η ${state.gameMaster} πέθανε πρώτος/η και γίνεται Game Master.`,
      confirmText: "Confirm Game Master",
      onConfirm: () => {
        state.eliminated = [state.gameMaster];
        state.log.push(`${state.gameMaster} πέθανε πρώτος και έγινε Game Master.`);
        showKillerSelection();
      },
      onBack: showGameMasterSelection
    });
  }), button("Τυχαίος Game Master", () => {
    const pick = shuffle(state.gamePlayers.map(byName))[0];
    if (!pick) return;
    state.gameMaster = pick.name;
    showConfirm({
      title: state.gameMaster,
      message: `Τυχαία επιλογή: ο/η ${state.gameMaster} πέθανε πρώτος/η και γίνεται Game Master.`,
      confirmText: "Confirm random GM",
      onConfirm: () => {
        state.eliminated = [state.gameMaster];
        state.log.push(`${state.gameMaster} πέθανε πρώτος και έγινε Game Master.`);
        showKillerSelection();
      },
      onBack: showGameMasterSelection
    });
  }, "secondary")));
}

function showKillerSelection() {
  const root = screen("κρυφοί ρόλοι", "Ποιοι είναι δολοφόνοι;");
  root.append(pill(`${state.killers.length} / ${state.killerCount} δολοφόνοι`));
  root.append(grid(state.gamePlayers.map(byName).map(player => {
    const disabled = inList(state.eliminated, player);
    const selected = inList(state.killers, player);
    return playerCard(player, {
      selected,
      crossed: disabled,
      enabled: !disabled,
      label: selected ? "Δολοφόνος" : "",
      onClick: () => {
        if (selected) removeFrom(state.killers, player);
        else if (state.killers.length < state.killerCount) addTo(state.killers, player);
        else return toast(`Έχεις ήδη διαλέξει ${state.killerCount} δολοφόνους.`);
        showKillerSelection();
      }
    });
  })));
  root.append(actions(
    button("Τυχαία επιλογή δολοφόνων", () => {
      state.killers = shuffle(livingPlayers()).slice(0, state.killerCount).map(id);
      showKillerSelection();
    }, "secondary"),
    button("Συνέχεια στους ειδικούς ρόλους", () => {
      if (state.killers.length !== state.killerCount) return toast(`Διάλεξε ακριβώς ${state.killerCount} δολοφόνους.`);
      showSpecialRoles();
    })
  ));
}

function showSpecialRoles() {
  const root = screen("ειδικοί ρόλοι", "Μάντης, Μάγισσα, Βασιλιάς");
  root.append(roleSummary());
  root.append(actions(
    button(`Μάντης: ${roleName(byName(state.seer))}`, () => showRolePicker("Μάντης", player => { state.seer = id(player); showSpecialRoles(); }), "secondary"),
    button(`Μάγισσα: ${roleName(byName(state.witch))}`, () => showRolePicker("Μάγισσα", player => { state.witch = id(player); showSpecialRoles(); }), "secondary"),
    button(`Βασιλιάς: ${roleName(byName(state.king))}`, () => showRolePicker("Βασιλιάς", player => { state.king = id(player); showSpecialRoles(); }), "secondary"),
    button("Τυχαία επιλογή ειδικών ρόλων", () => {
      const pool = shuffle(livingNonKillers());
      state.seer = id(pool[0]) || null;
      state.witch = id(pool[1]) || null;
      state.king = id(pool[2]) || null;
      showSpecialRoles();
    }, "secondary"),
    button("Έναρξη παιχνιδιού", () => {
      if (!state.seer || !state.witch || !state.king) return toast("Διάλεξε όλους τους ειδικούς ρόλους ή πάτα τυχαία επιλογή.");
      state.log.push("Οι ρόλοι ορίστηκαν. Το παιχνίδι ξεκινά.");
      showDashboard();
    })
  ));
}

function showRolePicker(roleTitle, setter) {
  const root = screen("ανάθεση ρόλου", roleTitle);
  root.append(paragraph("Διάλεξε ποιος θα έχει αυτόν τον ρόλο. Ο πρώτος νεκρός και οι δολοφόνοι δεν προτείνονται για ειδικούς ρόλους."));
  root.append(grid(state.gamePlayers.map(byName).map(player => {
    const disabled = inList(state.eliminated, player) || inList(state.killers, player) || hasOtherSpecialRole(player, roleTitle);
    return playerCard(player, {
      selected: roleForTitle(roleTitle) === id(player),
      crossed: disabled,
      enabled: !disabled,
      label: roleLabel(player),
      onClick: () => showConfirm({
        title: `${roleTitle}: ${player.name}`,
        message: `Επιβεβαίωσε ότι ο/η ${player.name} παίρνει τον ρόλο ${roleTitle}.`,
        confirmText: "Confirm role",
        onConfirm: () => setter(player),
        onBack: () => showRolePicker(roleTitle, setter)
      })
    });
  })));
  root.append(actions(button("Πίσω", showSpecialRoles, "ghost")));
}

function hasOtherSpecialRole(player, roleTitle) {
  return (roleTitle !== "Μάντης" && id(player) === state.seer)
    || (roleTitle !== "Μάγισσα" && id(player) === state.witch)
    || (roleTitle !== "Βασιλιάς" && id(player) === state.king);
}

function roleForTitle(roleTitle) {
  if (roleTitle === "Μάντης") return state.seer;
  if (roleTitle === "Μάγισσα") return state.witch;
  return state.king;
}

function showDashboard() {
  if (checkGameOver()) return;
  const root = screen("κέντρο ελέγχου", `Γύρος ${state.round}`);
  root.append(statusPanel(), roleSummary());
  root.append(actions(
    button("Νύχτα", showNightStart),
    button("Ψηφοφορία ημέρας", startDayVoting, "secondary"),
    button("Χειροκίνητη αποχώρηση", showManualElimination, "secondary"),
    button("Test voice", () => speak("Spirits voice test. Alex voted Billy."), "ghost")
  ));
  addHistory(root);
}

function showNightStart() {
  state.nightTarget = null;
  state.witchSave = null;
  const root = screen("νύχτα", "Οι δολοφόνοι ξυπνούν");
  root.append(paragraph("Ο Game Master ρωτά τους δολοφόνους ποιον σκοτώνουν και επιλέγει τον στόχο."));
  root.append(actions(button("Επιλογή στόχου δολοφόνων", showNightKillPick), button("Πίσω", showDashboard, "ghost")));
}

function showNightKillPick() {
  const root = screen("δολοφόνοι", "Ποιον σκοτώνουν;");
  root.append(grid(state.gamePlayers.map(byName).map(player => {
    const disabled = inList(state.eliminated, player) || inList(state.killers, player);
    return playerCard(player, {
      selected: id(player) === state.nightTarget,
      crossed: disabled,
      enabled: !disabled,
      onClick: () => showNightTargetConfirm(player)
    });
  })));
  root.append(actions(button("Δεν σκοτώνουν κανέναν", () => showNightTargetConfirm(null), "secondary")));
}

function showNightTargetConfirm(player) {
  const root = screen("επιβεβαίωση νύχτας", player ? `Στόχος: ${player.name}` : "Καμία δολοφονία;");
  root.append(cinematic(player ? `Κλείδωσε τον/την ${player.name} ως στόχο των δολοφόνων.` : "Οι δολοφόνοι περνούν τη νύχτα χωρίς στόχο."));
  root.append(actions(
    button(player ? "Confirm target" : "Confirm no kill", () => {
      state.nightTarget = id(player);
      if (!state.witch || inList(state.eliminated, byName(state.witch))) {
        state.witchSave = null;
        beginSeerStepForNight();
      } else showWitchSavePick();
    }),
    button("Πίσω στη λίστα", showNightKillPick, "ghost")
  ));
}

function showWitchSavePick() {
  const root = screen("μάγισσα", "Ποιον σώζει;");
  root.append(paragraph("Μετά την επιλογή των δολοφόνων, διάλεξε ποιον προσπάθησε να σώσει η Μάγισσα."));
  root.append(grid(state.gamePlayers.map(byName).map(player => {
    const disabled = inList(state.eliminated, player);
    return playerCard(player, {
      selected: id(player) === state.witchSave,
      crossed: disabled,
      enabled: !disabled,
      onClick: () => {
        confirmWitchSave(player);
      }
    });
  })));
  root.append(actions(button("Η Μάγισσα δεν σώζει κανέναν", () => {
    confirmWitchSave(null);
  }, "secondary")));
}

function confirmWitchSave(player) {
  showConfirm({
    kicker: "μάγισσα",
    title: player ? `Σώζει: ${player.name}` : "Δεν σώζει κανέναν",
    message: player ? `Επιβεβαίωσε ότι η Μάγισσα προσπάθησε να σώσει τον/την ${player.name}.` : "Επιβεβαίωσε ότι η Μάγισσα δεν σώζει κανέναν αυτή τη νύχτα.",
    accent: "var(--lilac)",
    confirmText: "Confirm witch action",
    onConfirm: () => {
      state.witchSave = id(player);
      beginSeerStepForNight();
    },
    onBack: showWitchSavePick
  });
}

function beginSeerStepForNight() {
  if (!state.seer || inList(state.eliminated, byName(state.seer))) return showNightResolution();
  seerReturnsToNightResolution = true;
  showSeerGuess();
}

function showSeerGuess() {
  const root = screen("μάντης", "Ποιον μαντεύει;");
  root.append(paragraph("Ο Μάντης διαλέγει έναν παίκτη. Ο Game Master βλέπει τον πραγματικό ρόλο και του τον λέει."));
  root.append(grid(state.gamePlayers.map(byName).map(player => {
    const disabled = inList(state.eliminated, player) || id(player) === state.seer;
    return playerCard(player, { crossed: disabled, enabled: !disabled, onClick: () => confirmSeerGuess(player) });
  })));
}

function confirmSeerGuess(player) {
  showConfirm({
    kicker: "μάντης",
    title: `Μαντεύει: ${player.name}`,
    message: `Επιβεβαίωσε ότι ο Μάντης θέλει να δει τον ρόλο του/της ${player.name}.`,
    accent: "var(--lilac)",
    confirmText: "Confirm seer guess",
    onConfirm: () => showSeerAnswer(player),
    onBack: showSeerGuess
  });
}

function showSeerAnswer(player) {
  const role = revealRole(player);
  const root = screen("απάντηση μάντη", role);
  root.append(h("div", { className: "cinematic", text: `${player.name} έχει ρόλο: ${role}.` }));
  state.log.push(`Μάντης: ρώτησε για ${player.name} -> ${role}`);
  root.append(actions(button(seerReturnsToNightResolution ? "Ανακοίνωση νύχτας" : "Πίσω στο κέντρο ελέγχου", () => {
    if (seerReturnsToNightResolution) {
      seerReturnsToNightResolution = false;
      showNightResolution();
    } else showDashboard();
  })));
}

function showNightResolution() {
  const root = screen("ανακοίνωση νύχτας", "Τι συνέβη;");
  if (!state.nightTarget) {
    root.append(paragraph("Οι δολοφόνοι δεν σκότωσαν κανέναν αυτή τη νύχτα."));
    state.log.push(`Νύχτα ${state.round}: οι δολοφόνοι δεν σκότωσαν κανέναν.`);
    root.append(actions(button("Συνέχεια ημέρας", showDashboard)));
    return;
  }
  const target = byName(state.nightTarget);
  const saved = state.nightTarget === state.witchSave;
  const message = saved
    ? `Η Μάγισσα προσπάθησε να σώσει τον/την ${roleName(byName(state.witchSave))}. Κανείς δεν πέθανε.`
    : `Η Μάγισσα προσπάθησε να σώσει ${roleName(byName(state.witchSave))}. Ο/Η ${target.name} δολοφονήθηκε. Ρόλος: ${revealRole(target)}.`;
  root.append(cinematic(message, saved ? "var(--mint)" : "var(--danger)"));
  speak(saved ? `The witch saved ${byName(state.witchSave).name}` : `${target.name} was murdered. ${target.name} was ${spokenRole(target)}`);
  if (!saved) eliminate(target, "murdered", revealRole(target));
  state.log.push(`Νύχτα ${state.round}: ${message}`);
  root.append(actions(button("Συνέχεια ημέρας", showDashboard)));
}

function startDayVoting() {
  state.tally = {};
  state.blankVotes = 0;
  state.votingIndex = 0;
  showVotingTurn();
}

function showVotingTurn() {
  const voters = livingPlayers();
  if (state.votingIndex >= voters.length) return showVotingResult();
  const voter = voters[state.votingIndex];
  speak(`Now voting ${voter.name}`);
  const root = screen("ψηφοφορία ημέρας", `Ψηφίζει: ${voter.name}`);
  root.append(voteProgressPanel(state.votingIndex, voters.length), votingSpotlight(voter, state.votingIndex + 1, voters.length));
  root.append(grid(state.gamePlayers.map(byName).map(candidate => {
    const disabled = inList(state.eliminated, candidate) || id(candidate) === id(voter);
    return playerCard(candidate, { crossed: disabled, enabled: !disabled, onClick: () => showVoteConfirm(voter, candidate) });
  })));
  root.append(actions(
    button("🎙 Πες όνομα", () => startVoteRecognition(voter), "secondary"),
    button("Λευκή ψήφος", () => showVoteConfirm(voter, null), "secondary")
  ));
}

function startVoteRecognition(voter) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    toast("Η αναγνώριση φωνής δεν υποστηρίζεται σε αυτή τη συσκευή/browser.");
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 4;
  toast("Άκουω... πες το όνομα του παίκτη.");
  recognition.onresult = event => {
    const heard = Array.from(event.results[0])
      .map(result => result.transcript)
      .join(" ");
    const candidate = matchVoteSpeech(heard, voter);
    if (candidate === "blank") {
      showVoteConfirm(voter, null);
    } else if (candidate) {
      showVoteConfirm(voter, candidate);
    } else {
      toast(`Δεν βρήκα παίκτη από: ${heard}`);
    }
  };
  recognition.onerror = event => {
    toast(event.error === "not-allowed" ? "Δώσε άδεια μικροφώνου στο Safari/Browser." : "Δεν άκουσα καθαρά. Δοκίμασε ξανά.");
  };
  recognition.start();
}

function matchVoteSpeech(heard, voter) {
  const value = normalizeSpeech(heard);
  if (!value) return null;
  if (["blank", "white", "lefki", "leuki", "lefko", "λευκη", "λευκο"].some(word => value.includes(word))) {
    return "blank";
  }
  const candidates = livingPlayers().filter(player => player.name !== voter.name);
  let best = null;
  for (const player of candidates) {
    const aliases = speechAliases(player.name);
    if (aliases.some(alias => value.includes(normalizeSpeech(alias)))) {
      best = player;
      break;
    }
  }
  return best;
}

function speechAliases(name) {
  const map = {
    Alex: ["Alex", "Αλεξ"],
    Billy: ["Billy", "Billie", "Μπιλυ"],
    Catherine: ["Catherine", "Katherine", "Κατεριν"],
    Demarin: ["Demarin", "Deh mareen", "Demarine", "Ντεμαριν"],
    Elisa: ["Elisa", "Elisa Lanchava", "Lanchava", "Ελισα"],
    Eva: ["Eva", "Εβα"],
    Evaggelia: ["Evaggelia", "Evangelia", "Ευαγγελια"],
    Evelyn: ["Evelyn", "Εβελυν"],
    Hope: ["Hope"],
    Jasmine: ["Jasmine", "Jasmin"],
    Luna: ["Luna", "Λουνα"],
    Pauline: ["Pauline", "Polin"],
    Phillip: ["Phillip", "Philip"],
    Rino: ["Rino", "Reeno", "Ρινο"],
    Sargenie: ["Sargenie", "Sarjeenee", "Sargini", "Σαρτζινι"],
    Smaragda: ["Smaragda", "Σμαραγδα"],
    Sorina: ["Sorina", "Soreena", "Σορινα"],
    Tony: ["Tony", "Toni"],
    Vicky: ["Vicky", "Vicki", "Βικυ"],
    Violet: ["Violet", "Βιολετ"],
    Zoe: ["Zoe", "Zoey", "Ζωη"],
    Irene: ["Irene", "Eirini", "Irini", "Ειρηνη"]
  };
  return map[name] || [name];
}

function normalizeSpeech(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function voteProgressPanel(voted, total) {
  const board = voteBoardText();
  return h("section", { className: "panel vote-board" }, [
    h("div", { className: "stats", text: `Έχουν ψηφίσει ${voted} / ${total}` }),
    h("div", { className: "score", text: board || "Δεν υπάρχει ακόμα ψήφος." })
  ]);
}

function voteBoardText() {
  const rows = Object.entries(state.tally).sort(([a], [b]) => a.localeCompare(b)).map(([name, votes]) => `${name} (${votes})`);
  if (state.blankVotes > 0) rows.push(`Λευκή (${state.blankVotes})`);
  return rows.join("   ");
}

function votingSpotlight(voter, current, total) {
  return h("section", { className: "spotlight" }, [
    h("div", { className: "step", text: `ΨΗΦΟΦΟΡΙΑ ${current} / ${total}` }),
    h("img", { src: imgPath(voter), alt: voter.name }),
    h("div", { className: "who", text: `Τώρα ψηφίζει: ${voter.name}` }),
    paragraph("Ο Game Master πατάει ποιον/ποια ψήφισε.", "center")
  ]);
}

function showVoteConfirm(voter, candidate) {
  const root = screen("confirm vote", candidate ? `${voter.name} votes ${candidate.name}` : `${voter.name} votes blank`);
  root.append(votingSpotlight(voter, state.votingIndex + 1, livingPlayers().length));
  root.append(cinematic(candidate ? `Επιβεβαίωσε ότι ο/η ${voter.name} ψηφίζει ${candidate.name}.` : `Επιβεβαίωσε ότι ο/η ${voter.name} ρίχνει λευκή ψήφο.`, candidate ? "var(--pink)" : "var(--lilac)"));
  root.append(actions(
    button("Confirm vote", () => {
      const finalVote = state.votingIndex >= livingPlayers().length - 1;
      if (candidate) {
        state.tally[candidate.name] = (state.tally[candidate.name] || 0) + 1;
        state.log.push(`${voter.name} ψήφισε ${candidate.name}`);
        if (!finalVote) speak(`${voter.name} voted ${candidate.name}`);
      } else {
        state.blankVotes += 1;
        state.log.push(`${voter.name} έριξε λευκή ψήφο.`);
        if (!finalVote) speak(`${voter.name} voted blank`);
      }
      state.votingIndex += 1;
      showVotingTurn();
    }),
    button("Αλλαγή επιλογής", showVotingTurn, "ghost")
  ));
}

function topVotedPlayers() {
  let max = 0;
  const top = [];
  for (const [name, votes] of Object.entries(state.tally)) {
    if (votes > max) {
      max = votes;
      top.length = 0;
      top.push(byName(name));
    } else if (votes === max) top.push(byName(name));
  }
  return top.filter(Boolean);
}

function blankVoteWins(top, topVotes) {
  if (state.blankVotes > topVotes) return true;
  return state.blankVotes === topVotes && top.length === 1;
}

function showVotingResult() {
  const root = screen("αποτέλεσμα ψηφοφορίας", "Οι ψήφοι μίλησαν");
  const top = topVotedPlayers();
  if (!top.length) return noOneLeaves(root, "Όλοι έριξαν λευκή ψήφο. Δεν αποχωρεί κανείς.", "Μόνο λευκές ψήφοι: δεν αποχώρησε κανείς.");
  const votes = state.tally[top[0].name];
  root.append(paragraph(`Περισσότερες ψήφοι: ${names(top)} (${votes})`));
  if (blankVoteWins(top, votes)) return noOneLeaves(root, "Η λευκή ψήφος βγήκε πρώτη ή ισοψήφησε με έναν παίκτη. Δεν αποχωρεί κανείς.", "Λευκή ψήφος: δεν αποχώρησε κανείς.");
  if (top.length === 1) {
    root.append(actions(button(`Αποχωρεί: ${top[0].name}`, () => voteOut(top[0]))));
  } else {
    root.append(paragraph("Υπάρχει ισοψηφία. Αν ο Βασιλιάς θέλει, αποκαλύπτει τον ρόλο του και διαλέγει ποιος θα φύγει. Αλλιώς δεν αποχωρεί κανείς."));
    const buttons = [];
    if (state.king && !inList(state.eliminated, byName(state.king))) buttons.push(button("Ο Βασιλιάς αποφασίζει", () => showKingTieBreak(top)));
    buttons.push(button("Δεν αποχωρεί κανείς", () => {
      state.log.push("Ισοψηφία: δεν αποχώρησε κανείς.");
      state.round += 1;
      showDashboard();
    }, "secondary"));
    root.append(actions(...buttons));
  }
}

function noOneLeaves(root, message, logEntry) {
  root.append(paragraph(message));
  root.append(actions(button("Συνέχεια", () => {
    state.log.push(logEntry);
    state.round += 1;
    showDashboard();
  })));
}

function showKingTieBreak(tiedPlayers) {
  const root = screen("βασιλιάς", "Ποιος φεύγει;");
  playSound("isopalia");
  root.append(paragraph("Ο Βασιλιάς αποκαλύπτει τον ρόλο του και διαλέγει έναν από τους ισόψηφους."));
  root.append(grid(tiedPlayers.map(player => playerCard(player, {
    onClick: () => showConfirm({
      kicker: "βασιλιάς",
      title: `Φεύγει: ${player.name}`,
      message: `Επιβεβαίωσε ότι ο Βασιλιάς διαλέγει να αποχωρήσει ο/η ${player.name}.`,
      confirmText: "Confirm king choice",
      onConfirm: () => voteOut(player),
      onBack: () => showKingTieBreak(tiedPlayers)
    })
  }))));
}

function voteOut(player) {
  const reveal = revealRole(player);
  const spoken = spokenRole(player);
  eliminate(player, "voted", reveal);
  state.log.push(`${player.name} αποχώρησε από ψηφοφορία. Ρόλος: ${reveal}.`);
  speak(`${player.name} was voted out. ${player.name} was ${spoken}`);
  if (state.round === 1 && inList(state.killers, player)) return showFirstRoundReplacement(player);
  if (inList(state.killers, player) && !livingKillers().length) return showGameOver("Τα Spirits κέρδισαν. Όλοι οι δολοφόνοι βρέθηκαν.", true);
  if (killersHaveWon()) return showGameOver(killerWinMessage(), false);
  state.round += 1;
  showDashboard();
}

function showFirstRoundReplacement(fallenKiller) {
  if (fallenKiller) state.pendingFirstRoundFallenKiller = fallenKiller.name;
  const candidates = livingNonKillers();
  if (!candidates.length) return showGameOver("Τα Spirits κέρδισαν. Όλοι οι δολοφόνοι βρέθηκαν.", true);
  removeFrom(state.killers, byName(state.pendingFirstRoundFallenKiller));
  const root = screen("ανατροπή πρώτου γύρου", "Οι δολοφόνοι επιλέγουν διάδοχο");
  root.classList.add("twist-screen");
  playSound("isopalia");
  root.append(cinematic(`Ο/Η ${state.pendingFirstRoundFallenKiller || "δολοφόνος"} βγήκε στον πρώτο γύρο. Οι δολοφόνοι μπορούν να μετατρέψουν έναν ζωντανό παίκτη σε νέο δολοφόνο. Η επιλογή θα χρειαστεί επιβεβαίωση.`, "var(--danger)"));
  root.append(grid(candidates.map(player => playerCard(player, { onClick: () => confirmFirstRoundReplacement(player) }))));
}

function confirmFirstRoundReplacement(replacement) {
  const root = screen("νέος δολοφόνος", replacement.name);
  root.classList.add("twist-screen");
  playSound("isopalia");
  root.append(cinematic(`Τελική επιβεβαίωση: ο/η ${replacement.name} θα γίνει νέος δολοφόνος. Αν είχε ειδικό ρόλο, ο ρόλος θα μεταφερθεί σε άλλο Spirit.`, "var(--danger)"));
  root.append(actions(
    button("Confirm new murderer", () => {
      const movedRole = reassignSpecialRoleIfNeeded(replacement);
      addTo(state.killers, replacement);
      state.log.push(`${replacement.name} έγινε νέος δολοφόνος στον πρώτο γύρο.${movedRole ? " " + movedRole : ""}`);
      state.pendingFirstRoundFallenKiller = null;
      state.round += 1;
      showDashboard();
    }),
    button("Πίσω στη λίστα", () => showFirstRoundReplacement(byName(state.pendingFirstRoundFallenKiller)), "ghost")
  ));
}

function reassignSpecialRoleIfNeeded(replacement) {
  if (![state.seer, state.witch, state.king].includes(replacement.name)) return "";
  const pool = livingPlayers().filter(player => player.name !== replacement.name && !inList(state.killers, player) && ![state.seer, state.witch, state.king].includes(player.name));
  if (!pool.length) {
    clearSpecialRole(replacement);
    return "Δεν βρέθηκε διαθέσιμο Spirit για μεταφορά ειδικού ρόλου. Ο ειδικός ρόλος χάθηκε.";
  }
  const newHolder = shuffle(pool)[0];
  let role;
  if (state.seer === replacement.name) {
    state.seer = newHolder.name;
    role = "Μάντης";
  } else if (state.witch === replacement.name) {
    state.witch = newHolder.name;
    role = "Μάγισσα";
  } else {
    state.king = newHolder.name;
    role = "Βασιλιάς";
  }
  return `Ο ρόλος ${role} μεταφέρθηκε στον/στην ${newHolder.name}.`;
}

function showManualElimination() {
  const root = screen("χειροκίνητη αποχώρηση", "Ποιος βγαίνει;");
  root.append(grid(state.gamePlayers.map(byName).map(player => {
    const disabled = inList(state.eliminated, player);
    return playerCard(player, {
      crossed: disabled,
      enabled: !disabled,
      label: roleLabel(player),
      onClick: () => {
        showConfirm({
          kicker: "χειροκίνητη αποχώρηση",
          title: `Βγαίνει: ${player.name}`,
          message: `Επιβεβαίωσε ότι ο/η ${player.name} βγαίνει χειροκίνητα από το παιχνίδι.`,
          confirmText: "Confirm out",
          onConfirm: () => {
            const reveal = revealRole(player);
            const spoken = spokenRole(player);
            eliminate(player, "manual", reveal);
            state.log.push(`${player.name} αφαιρέθηκε χειροκίνητα. Ρόλος: ${reveal}.`);
            speak(`${player.name} was out. ${player.name} was ${spoken}`);
            showDashboard();
          },
          onBack: showManualElimination
        });
      }
    });
  })));
}

function checkGameOver() {
  if (!state.killers.length || !state.gamePlayers.length) return false;
  if (!livingKillers().length) {
    showGameOver("Τα Spirits κέρδισαν. Όλοι οι δολοφόνοι βρέθηκαν.", true);
    return true;
  }
  if (killersHaveWon()) {
    showGameOver(killerWinMessage(), false);
    return true;
  }
  return false;
}

function killersHaveWon() {
  if (!livingKillers().length) return false;
  if (!livingNonKillers().length) return true;
  const finalThreshold = state.killerCount === 1 ? 2 : 3;
  return livingPlayers().length <= finalThreshold;
}

function killerWinMessage() {
  if (!livingNonKillers().length) return "Οι δολοφόνοι κέρδισαν. Δεν έμεινε κανένα Spirit ζωντανό.";
  if (livingKillers().length === 1) return `${livingKillers()[0].name} κέρδισε ατομικά ως τελευταίος δολοφόνος.`;
  return `Οι δολοφόνοι κέρδισαν μαζί: ${names(livingKillers())}.`;
}

function showGameOver(message, spiritsWin) {
  state.lastSpiritsWin = spiritsWin;
  state.lastVictorySound = spiritsWin ? "spirits" : (livingKillers().length === 1 && livingPlayers().length <= 3 ? "oneVillain" : "manyVillains");
  const root = screen("τέλος παιχνιδιού", "Game Over");
  root.append(cinematic(message, spiritsWin ? "var(--mint)" : "var(--danger)"), winnerPanel(spiritsWin));
  playSound(state.lastVictorySound);
  speak(spiritsWin ? "The spirits win" : "The murderers win");
  addHistory(root);
  root.append(actions(button("Δες κατάταξη", showPlacementLoading)));
}

function winnerPanel(spiritsWin) {
  const winners = spiritsWin ? livingNonKillers() : livingKillers();
  return h("section", { className: "winner-panel" }, [
    h("div", { className: "label", text: spiritsWin ? "SPIRITS VICTORY" : "MURDERER VICTORY" }),
    grid(winners.map(player => playerCard(player, { selected: true, enabled: false, label: spiritsWin ? "Spirit" : "Winner" })))
  ]);
}

function showPlacementLoading() {
  stopSound();
  const root = screen("τελική αναφορά", "Φόρτωση κατάταξης");
  root.append(h("section", { className: "loading-panel" }, [
    h("div", { className: "knife-loader" }),
    h("div", { className: "scanner" }),
    h("div", { className: "loading-title", text: "Murder board loading..." }),
    paragraph("Το Spirits ανοίγει τους φακέλους αποχώρησης.", "center")
  ]));
  setTimeout(showPlacements, 950);
}

function showPlacements() {
  const winnerGroup = state.lastSpiritsWin ? livingNonKillers() : livingKillers();
  const finalPlayers = [
    ...winnerGroup,
    ...livingPlayers().filter(player => !winnerGroup.some(winner => winner.name === player.name))
  ];
  const eliminated = state.placements
    .slice()
    .reverse()
    .filter(entry => !finalPlayers.some(player => player.name === entry.name));
  const root = screen("placements", "Τελική κατάταξη");
  root.append(h("div", { className: "placement-subtitle", text: "Spirits: Final Files" }));
  playSound(state.lastVictorySound || "spirits");

  const board = h("section", { className: "placements-board" });
  finalPlayers.forEach((player, index) => {
    const isWinner = winnerGroup.some(winner => winner.name === player.name);
    board.append(placementCard({
      player,
      place: isWinner ? "Winner" : `${index + 1}η θέση`,
      role: revealRole(player),
      reason: "Finalist"
    }, isWinner));
  });
  eliminated.forEach((entry, index) => {
    board.append(placementCard({
      player: byName(entry.name),
      place: `${finalPlayers.length + index + 1}η θέση`,
      role: entry.role,
      reason: placementReason(entry.reason)
    }));
  });
  root.append(board);

  const gm = byName(state.gameMaster);
  if (gm) {
    root.append(h("section", { className: "gm-box" }, [
      h("div", { className: "label", text: "GAME MASTER - εκτός κατάταξης" }),
      placementCard({
        player: gm,
        place: "Game Master",
        role: "Δεν υπολογίζεται",
        reason: "Πρώτος νεκρός"
      })
    ]));
  }

  root.append(actions(button("Νέο παιχνίδι", showIntro)));
}

function placementCard(entry, winner = false) {
  if (!entry.player) return h("div");
  return h("article", { className: `placement-card ${winner ? "winner" : ""}` }, [
    h("img", { src: imgPath(entry.player), alt: entry.player.name }),
    h("div", { className: "placement-name", text: entry.player.name }),
    h("div", { className: "placement-place", text: entry.place }),
    h("div", { className: "placement-meta", text: entry.role }),
    h("div", { className: "placement-meta", text: entry.reason })
  ]);
}

function eliminate(player, reason = "out", role = null) {
  const wasAlreadyOut = inList(state.eliminated, player);
  addTo(state.eliminated, player);
  if (!wasAlreadyOut && id(player) !== state.gameMaster) {
    state.placements.push({
      name: player.name,
      role: role || revealRole(player),
      reason
    });
  }
  clearSpecialRole(player);
}

function clearSpecialRole(player) {
  if (!player) return;
  if (state.seer === player.name) state.seer = null;
  if (state.witch === player.name) state.witch = null;
  if (state.king === player.name) state.king = null;
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function speak(value) {
  if (!("speechSynthesis" in window)) return;
  unlockSpeech();
  window.speechSynthesis.cancel();
  activeUtterance = new SpeechSynthesisUtterance(ttsText(value));
  activeUtterance.lang = "en-US";
  activeUtterance.rate = 0.88;
  activeUtterance.pitch = 1;
  const voice = bestEnglishVoice();
  if (voice) activeUtterance.voice = voice;
  activeUtterance.onend = () => { activeUtterance = null; };
  activeUtterance.onerror = () => { activeUtterance = null; };
  window.speechSynthesis.speak(activeUtterance);
  setTimeout(() => window.speechSynthesis.resume(), 80);
}

function unlockSpeech() {
  if (!("speechSynthesis" in window)) return;
  speechUnlocked = true;
  window.speechSynthesis.resume();
  window.speechSynthesis.getVoices();
}

function bestEnglishVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => voice.lang === "en-US" && /samantha|ava|allison|google|natural/i.test(voice.name))
    || voices.find(voice => voice.lang === "en-US")
    || voices.find(voice => voice.lang && voice.lang.startsWith("en"))
    || null;
}

function ttsText(value) {
  return value
    .replaceAll("Alex", "Alex")
    .replaceAll("Rino", "Reeno")
    .replaceAll("Billy", "Billy")
    .replaceAll("Demarin", "Deh mareen")
    .replaceAll("Elisa", "Elisa Lanchava")
    .replaceAll("Evelyn", "Evelyn")
    .replaceAll("Sargenie", "Sarjeenee")
    .replaceAll("Sorina", "Soreena")
    .replaceAll("Evaggelia", "Evangelia")
    .replaceAll("Zoe", "Zoey");
}

function playSound(kind) {
  stopSound();
  const files = {
    isopalia: "assets/audio/isopalia.mp3",
    spirits: "assets/audio/spirits_victory.mp3",
    oneVillain: "assets/audio/one_villain_victory.mp3",
    manyVillains: "assets/audio/many_villains_victory.mp3"
  };
  currentAudio = new Audio(files[kind]);
  currentAudio.play().catch(() => {});
}

function stopSound() {
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}

document.addEventListener("click", () => {
  unlockSpeech();
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("portrait").catch(() => {});
  }
}, { once: true });

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("portrait").catch(() => {});
    }
  }, 250);
});

showIntroVideo();
