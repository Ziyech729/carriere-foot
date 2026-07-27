import React, { useState, useMemo } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from "recharts";
import {
  Heart, Wallet, TrendingUp, Activity, Smile, Trophy, ChevronRight, RotateCcw,
} from "lucide-react";

/* ---------------------------------- THEME ---------------------------------- */
const C = {
  pitch: "#122A1D",
  pitchDeep: "#0C1F15",
  chalk: "#F2EFE4",
  gold: "#C9A227",
  goldSoft: "#E4C765",
  risk: "#9B3A32",
  sage: "#7C9885",
  ink: "#16201A",
  fadedGold: "rgba(201,162,39,0.35)",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@400;600&display=swap');`;

/* ------------------------------- GAME CONSTANTS ------------------------------ */
const MATCHES_PER_SEASON = 15;
const ATTR_KEYS = ["pace", "shooting", "passing", "defending", "physical", "technique"];
const ATTR_LABELS = { pace: "Vitesse", shooting: "Tir", passing: "Passe", defending: "Défense", physical: "Physique", technique: "Technique" };

const TIERS = [
  { name: "National 2 (amateur)", wage: 80, difficulty: 25 },
  { name: "Ligue 2", wage: 350, difficulty: 40 },
  { name: "Ligue 1", wage: 1200, difficulty: 55 },
  { name: "Ligue 1 (haut de tableau) / Europa", wage: 4000, difficulty: 70 },
  { name: "Élite européenne + Équipe de France", wage: 15000, difficulty: 85 },
];

const CLUB_NAMES = [
  ["FC Vallée-Verte", "US Rochebrune", "AS Pont-Neuf"],
  ["Stade Lainois", "FC Argentière", "US Béthune-Marais"],
  ["Girondins d'Ambre", "RC Solenne", "Olympique de Vasterre"],
  ["AS Monteroy", "FC Bellerive", "Stade Nordique"],
  ["Real Estrella", "FC Continental", "Milan Stellare"],
];

const OFFER_THRESHOLD = [0, 25, 45, 65, 85];

const POSITIONS = [
  {
    id: "Attaquant", label: "Attaquant",
    weights: { pace: .25, shooting: .35, passing: .15, defending: .05, physical: .1, technique: .1 },
    archetypes: [
      { name: "Finisseur clinique", desc: "Sang-froid devant le but.", base: { pace: 55, shooting: 65, passing: 40, defending: 20, physical: 45, technique: 50 } },
      { name: "Ailier explosif", desc: "Vitesse pure et débordements.", base: { pace: 65, shooting: 50, passing: 45, defending: 20, physical: 40, technique: 55 } },
    ],
  },
  {
    id: "Milieu", label: "Milieu de terrain",
    weights: { pace: .15, shooting: .1, passing: .3, defending: .15, physical: .1, technique: .2 },
    archetypes: [
      { name: "Métronome", desc: "Vision de jeu et passes clés.", base: { pace: 45, shooting: 35, passing: 65, defending: 40, physical: 45, technique: 60 } },
      { name: "Box-to-box", desc: "Poumon de l'équipe, partout à la fois.", base: { pace: 55, shooting: 40, passing: 50, defending: 45, physical: 60, technique: 45 } },
    ],
  },
  {
    id: "Défenseur", label: "Défenseur",
    weights: { pace: .1, shooting: .05, passing: .15, defending: .4, physical: .2, technique: .1 },
    archetypes: [
      { name: "Mur défensif", desc: "Rien ne passe.", base: { pace: 35, shooting: 15, passing: 40, defending: 65, physical: 60, technique: 40 } },
      { name: "Relanceur", desc: "Sort le ballon proprement.", base: { pace: 45, shooting: 20, passing: 55, defending: 55, physical: 45, technique: 50 } },
    ],
  },
  {
    id: "Gardien", label: "Gardien",
    weights: { pace: .05, shooting: 0, passing: .1, defending: .45, physical: .2, technique: .2 },
    archetypes: [
      { name: "Réflexes félins", desc: "Arrêts impossibles.", base: { pace: 30, shooting: 5, passing: 35, defending: 65, physical: 50, technique: 55 } },
      { name: "Meneur de défense", desc: "Organise sa surface à la voix.", base: { pace: 25, shooting: 5, passing: 45, defending: 60, physical: 45, technique: 60 } },
    ],
  },
];

/* --------------------------------- LIFE EVENTS -------------------------------- */
const LIFE_EVENTS = {
  famille: [
    {
      title: "Coup de fil de ta mère",
      text: "Ta mère t'appelle en larmes : ton père doit être opéré et la clinique privée coûte cher. La sécu ne couvre pas tout.",
      choices: [
        { label: "Payer l'opération (-2500€)", effect: () => ({ argent: -2500, santeMentale: +12, moral: +6 }), result: "Tu as payé sans hésiter. Ta famille est soulagée, et toi aussi." },
        { label: "Proposer un échéancier", effect: () => ({ argent: -600, santeMentale: -4, moral: -2 }), result: "Tu aides comme tu peux, mais la culpabilité te ronge un peu." },
      ],
    },
    {
      title: "Un cap dans le couple",
      text: "Ton/ta partenaire évoque le mariage. Le rythme des matchs et des déplacements complique tout, mais l'envie est là.",
      requires: (p) => p.relation === "couple",
      choices: [
        { label: "Se marier", effect: () => ({ argent: -4000, moral: +15, santeMentale: +10, relation: "marié" }), result: "Petite fête entre proches. Tu te sens ancré, stable, prêt à performer." },
        { label: "Se concentrer sur la carrière", effect: () => ({ santeMentale: -8, moral: -5, relation: "célibataire" }), result: "La relation ne survit pas à l'absence. Tu es libre, mais seul." },
      ],
    },
    {
      title: "Nuits blanches",
      text: "Le bébé ne fait pas ses nuits. Tu arrives à l'entraînement épuisé, les jambes lourdes.",
      requires: (p) => p.relation === "marié",
      choices: [
        { label: "Embaucher une nounou (-800€)", effect: () => ({ argent: -800, forme: +10, santeMentale: +5 }), result: "Tu récupères enfin un sommeil correct avant les matchs." },
        { label: "Assumer seul avec ton/ta partenaire", effect: () => ({ forme: -10, santeMentale: -6, moral: +8 }), result: "C'est dur physiquement, mais ces moments en famille te touchent profondément." },
      ],
    },
    {
      title: "Ton frère a besoin d'un prêt",
      text: "Ton petit frère veut monter un commerce et te demande de l'argent, en te rappelant tout ce qu'il a fait pour toi petit.",
      choices: [
        { label: "Lui prêter 3000€", effect: () => ({ argent: -3000, moral: +5 }), result: "Il te promet de te rembourser. Le temps dira si c'était une bonne idée." },
        { label: "Refuser poliment", effect: () => ({ santeMentale: -6, moral: -3 }), result: "L'ambiance est tendue au prochain repas de famille." },
      ],
    },
    {
      title: "La presse people rôde",
      text: "Un tabloïd publie des photos de ta famille prises devant chez vous, sans autorisation. Tes proches sont secoués.",
      choices: [
        { label: "Engager un avocat (-1500€)", effect: () => ({ argent: -1500, reputation: +3, santeMentale: +4 }), result: "Le journal retire l'article et présente ses excuses." },
        { label: "Laisser passer", effect: () => ({ santeMentale: -8, moral: -4 }), result: "Ta famille se sent exposée, et toi impuissant à les protéger." },
      ],
    },
  ],
  argent: [
    {
      title: "Ton agent a une idée",
      text: "Ton agent te propose d'investir dans une start-up de complémentaires alimentaires 'qui va exploser'.",
      choices: [
        { label: "Investir 5000€", effect: () => (Math.random() < 0.45 ? { argent: +9000, moral: +8 } : { argent: -5000, santeMentale: -6 }), result: "Le pari est lancé, à toi de voir ce que ça donne." },
        { label: "Décliner", effect: () => ({ santeMentale: +2 }), result: "Tu préfères la prudence, ton agent est déçu mais respecte ton choix." },
      ],
    },
    {
      title: "Contrat d'équipementier",
      text: "Une marque de crampons te propose un contrat d'image, avec séances photo et déplacements promo à la clé.",
      choices: [
        { label: "Signer", effect: () => ({ argent: +2200, reputation: +6, forme: -5 }), result: "Beau contrat, mais ton emploi du temps se remplit sérieusement." },
        { label: "Refuser pour te concentrer sur le jeu", effect: () => ({ santeMentale: +3, forme: +3 }), result: "Tu gardes ton énergie pour le terrain, sans le cachet en plus." },
      ],
    },
    {
      title: "La voiture de tes rêves",
      text: "Un concessionnaire te fait de l'œil avec un modèle de sport dernier cri, en leasing avantageux.",
      choices: [
        { label: "Craquer (-3500€)", effect: () => ({ argent: -3500, moral: +10, reputation: +4 }), result: "Tu roules fièrement au centre d'entraînement. Sacré style." },
        { label: "Rester raisonnable", effect: () => ({ argent: +0, santeMentale: +2 }), result: "Tu gardes ton budget sous contrôle, sans regret particulier." },
      ],
    },
    {
      title: "Litige avec ton ancien agent",
      text: "Ton ancien agent réclame des commissions sur ton transfert, en menaçant de porter l'affaire en justice.",
      choices: [
        { label: "Négocier un arrangement (-1800€)", effect: () => ({ argent: -1800, santeMentale: +5 }), result: "Affaire classée, tu tournes la page l'esprit tranquille." },
        { label: "Aller au clash juridique", effect: () => ({ argent: -400, santeMentale: -10, reputation: -3 }), result: "L'affaire traîne en longueur et empoisonne ta tête toute la saison." },
      ],
    },
    {
      title: "Ton village d'origine t'appelle",
      text: "La mairie de ton village natal veut refaire le terrain municipal où tu as tout appris, mais manque de budget.",
      choices: [
        { label: "Financer les travaux (-2000€)", effect: () => ({ argent: -2000, reputation: +8, moral: +10 }), result: "Une plaque à ton nom est posée à l'entrée du stade. Émouvant." },
        { label: "Décliner cette fois", effect: () => ({ santeMentale: -3 }), result: "Tu te sens un peu mal, mais tes finances passent avant." },
      ],
    },
  ],
  scandale: [
    {
      title: "Photo sortie de son contexte",
      text: "Une photo de soirée entre coéquipiers, plutôt sage, est publiée avec une légende racoleuse par un site people.",
      choices: [
        { label: "Répondre publiquement", effect: () => ({ reputation: +2, santeMentale: -3 }), result: "Ta mise au point calme le jeu, mais t'a coûté de l'énergie." },
        { label: "Ignorer totalement", effect: () => ({ reputation: -3, santeMentale: -1 }), result: "L'histoire s'éteint doucement, sans que tu n'aies rien dit." },
      ],
    },
    {
      title: "Clash de vestiaire qui fuite",
      text: "Une engueulade tactique avec un coéquipier est filmée en douce et finit sur les réseaux sociaux.",
      choices: [
        { label: "Vous réconcilier publiquement", effect: () => ({ reputation: +4, moral: +5 }), result: "Une photo bras dessus bras dessous éteint la polémique." },
        { label: "Laisser planer le froid", effect: () => ({ reputation: -6, santeMentale: -5, moral: -4 }), result: "L'ambiance du groupe reste électrique plusieurs semaines." },
      ],
    },
    {
      title: "Post réseaux sociaux qui dérape",
      text: "Une story publiée un soir de fatigue, un brin sarcastique envers un adversaire, devient virale pour de mauvaises raisons.",
      choices: [
        { label: "Supprimer et s'excuser", effect: () => ({ reputation: -2, santeMentale: +2 }), result: "L'excuse rapide limite les dégâts médiatiques." },
        { label: "Assumer et ne rien changer", effect: () => ({ reputation: -8, moral: +3 }), result: "Une partie du public apprécie ton authenticité, une autre s'indigne." },
      ],
    },
    {
      title: "Soirée qui dépasse le couvre-feu",
      text: "Tu rentres bien après l'heure fixée par le staff la veille d'un match. Un journaliste t'a vu sortir de la boîte de nuit.",
      choices: [
        { label: "Prévenir le coach avant que ça sorte", effect: () => ({ reputation: -2, santeMentale: +3, forme: -5 }), result: "Le coach apprécie ta franchise, une amende symbolique suffit." },
        { label: "Espérer que ça passe inaperçu", effect: () => ({ reputation: -10, santeMentale: -8, forme: -5 }), result: "L'article sort le lendemain. Le vestiaire chuchote dans ton dos." },
      ],
    },
    {
      title: "Contrôle antidopage suspect",
      text: "Un contrôle inopiné revient avec un résultat limite, probablement à cause d'un complément alimentaire mal étiqueté.",
      choices: [
        { label: "Communiquer en toute transparence", effect: () => ({ reputation: +3, santeMentale: -6 }), result: "L'enquête te blanchit après quelques semaines de stress intense." },
        { label: "Rester silencieux et attendre", effect: () => ({ reputation: -12, santeMentale: -12 }), result: "La rumeur enfle avant que la contre-expertise ne te disculpe enfin." },
      ],
    },
  ],
  mental: [
    {
      title: "Trac avant le grand match",
      text: "La veille d'un match décisif, tu ne dors presque pas, le ventre noué à l'idée de décevoir.",
      choices: [
        { label: "Séance avec le psychologue du club", effect: () => ({ santeMentale: +12, forme: +2 }), result: "Tu poses des mots sur cette pression. Ça va déjà mieux." },
        { label: "Serrer les dents et jouer quand même", effect: () => ({ santeMentale: -8, forme: -3 }), result: "Tu tiens le coup, mais le corps encaisse le stress accumulé." },
      ],
    },
    {
      title: "Surmenage",
      text: "Entre matchs, déplacements et sollicitations, ton corps envoie des signaux de fatigue extrême que tu ignores depuis des semaines.",
      choices: [
        { label: "Demander une coupure au staff", effect: () => ({ forme: +15, santeMentale: +10, reputation: -2 }), result: "Le staff comprend et t'accorde quelques jours de repos complet." },
        { label: "Continuer à pousser", effect: () => ({ forme: -15, santeMentale: -12 }), result: "Tu tiens en apparence, mais tu sens que quelque chose va lâcher." },
      ],
    },
    {
      title: "Syndrome de l'imposteur",
      text: "Après un transfert dans un club plus huppé, tu te sens illégitime au milieu de joueurs que tu admirais enfant.",
      choices: [
        { label: "En parler ouvertement à un vétéran du groupe", effect: () => ({ santeMentale: +10, moral: +6 }), result: "Il te raconte avoir vécu la même chose. Un poids s'envole." },
        { label: "Garder ça pour toi", effect: () => ({ santeMentale: -10 }), result: "Le doute s'installe en silence, match après match." },
      ],
    },
    {
      title: "La flamme vacille",
      text: "Pour la première fois, enfiler les crampons ne te procure plus aucune joie. Juste de la routine et de la fatigue.",
      choices: [
        { label: "Prendre du recul, revoir pourquoi tu as commencé", effect: () => ({ santeMentale: +10, moral: +10 }), result: "Tu revisionnes tes vieux matchs d'enfance. La passion revient doucement." },
        { label: "Continuer mécaniquement", effect: () => ({ santeMentale: -8, moral: -8 }), result: "Tu fais le travail, mais sans étincelle. Ça se voit sur le terrain." },
      ],
    },
    {
      title: "Deuil difficile",
      text: "Ton ancien entraîneur de jeunesse, celui qui a cru en toi le premier, vient de décéder subitement.",
      choices: [
        { label: "Prendre le temps de faire son deuil", effect: () => ({ santeMentale: +6, forme: -5, moral: -5 }), result: "Tu lui dédies ton prochain but. Ça fait un bien fou de l'honorer." },
        { label: "Se réfugier dans le travail", effect: () => ({ santeMentale: -14, forme: +2 }), result: "Tu fuis la tristesse par l'entraînement, mais elle te rattrape la nuit." },
      ],
    },
  ],
};

/* --------------------------------- HELPERS ------------------------------------ */
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function computeOverall(attrs, positionId) {
  const w = POSITIONS.find((p) => p.id === positionId).weights;
  return Math.round(ATTR_KEYS.reduce((sum, k) => sum + attrs[k] * w[k], 0));
}

function applyPatch(player, patch) {
  const next = { ...player, attrs: { ...player.attrs } };
  if (patch.argent !== undefined) next.argent = Math.round(next.argent + patch.argent);
  if (patch.santeMentale !== undefined) next.santeMentale = clamp(next.santeMentale + patch.santeMentale);
  if (patch.moral !== undefined) next.moral = clamp(next.moral + patch.moral);
  if (patch.reputation !== undefined) next.reputation = clamp(next.reputation + patch.reputation);
  if (patch.forme !== undefined) next.forme = clamp(next.forme + patch.forme);
  if (patch.relation !== undefined) next.relation = patch.relation;
  return next;
}

/* =================================================================================
   MAIN COMPONENT
=================================================================================== */
export default function CarriereFoot() {
  const [stage, setStage] = useState("creation"); // creation | hub | over
  const [player, setPlayer] = useState(null);
  const [log, setLog] = useState([]); // career feed
  const [screenQueue, setScreenQueue] = useState([]); // pending modal screens
  const [seenEvents, setSeenEvents] = useState(new Set());

  const active = screenQueue[0] || null;

  /* ------------------------------ CREATION ------------------------------ */
  const [formName, setFormName] = useState("");
  const [formPos, setFormPos] = useState(POSITIONS[0].id);
  const [formArchetype, setFormArchetype] = useState(0);

  function startCareer() {
    const posDef = POSITIONS.find((p) => p.id === formPos);
    const arche = posDef.archetypes[formArchetype];
    const attrs = { ...arche.base };
    const clubName = pick(CLUB_NAMES[0]);
    const newPlayer = {
      name: formName.trim() || "Joueur Inconnu",
      position: formPos,
      age: 17,
      attrs,
      tier: 0,
      clubName,
      season: 1,
      matchInSeason: 0,
      argent: 200,
      santeMentale: 70,
      moral: 65,
      reputation: 10,
      forme: 90,
      relation: "célibataire",
      trainingPoints: 0,
      injuredWeeks: 0,
      career: { matches: 0, goals: 0, assists: 0, ratingSum: 0 },
    };
    setPlayer(newPlayer);
    setLog([{ text: `Tu débutes ta carrière à ${clubName} (${TIERS[0].name}).`, kind: "info" }]);
    setStage("hub");
  }

  /* ------------------------------ MATCH SIM ------------------------------ */
  function playMatch() {
    const overall = computeOverall(player.attrs, player.position);
    const tierInfo = TIERS[player.tier];
    const oppDiff = clamp(tierInfo.difficulty + rand(-12, 12), 10, 99);

    let ratingRaw = overall * 0.4 + player.forme * 0.2 + player.santeMentale * 0.15 + player.moral * 0.15
      - (oppDiff - 50) * 0.25 + rand(-15, 15);
    let rating = clamp(ratingRaw / 10, 2, 10);
    rating = Math.round(rating * 10) / 10;

    let goals = 0, assists = 0, cleanSheet = false;
    const attackFactor = Math.max(0, rating - 5);
    if (player.position === "Attaquant") {
      const expG = (player.attrs.shooting / 100) * (attackFactor / 4);
      for (let i = 0; i < 3; i++) if (Math.random() < expG) goals++;
      if (Math.random() < (player.attrs.passing / 100) * (attackFactor / 5)) assists++;
    } else if (player.position === "Milieu") {
      if (Math.random() < (player.attrs.shooting / 100) * (attackFactor / 6)) goals++;
      const expA = (player.attrs.passing / 100) * (attackFactor / 4);
      for (let i = 0; i < 2; i++) if (Math.random() < expA) assists++;
    } else {
      if (Math.random() < 0.06 * (attackFactor / 4)) goals++;
      cleanSheet = rating > 6.5 && Math.random() < 0.5;
    }

    const fatigue = rand(15, 25);
    const forme2 = clamp(player.forme - fatigue + 12);
    const injuryChance = 0.04 + (player.forme < 40 ? 0.1 : 0) + (player.santeMentale < 30 ? 0.06 : 0);
    const injured = Math.random() < injuryChance;
    const injuryWeeks = injured ? (Math.random() < 0.7 ? rand(1, 2) : Math.random() < 0.85 ? rand(3, 5) : rand(6, 10)) : 0;

    const wage = tierInfo.wage;
    const trainingGain = Math.max(1, Math.floor(rating / 2));

    let next = { ...player, attrs: { ...player.attrs } };
    next.forme = injured ? clamp(forme2 - 20) : forme2;
    next.argent += wage;
    next.trainingPoints += trainingGain;
    next.matchInSeason += 1;
    next.career = {
      matches: next.career.matches + 1,
      goals: next.career.goals + goals,
      assists: next.career.assists + assists,
      ratingSum: next.career.ratingSum + rating,
    };
    next.reputation = clamp(next.reputation + Math.round(rating - 5) + goals * 2 + assists);
    if (next.argent < 0) next.santeMentale = clamp(next.santeMentale - 3);
    if (injured) {
      next.injuredWeeks = injuryWeeks;
      next.moral = clamp(next.moral - 8);
    }

    const oppName = pick(["l'AS rivale", "le club voisin", "l'équipe promue", "le leader du championnat", "l'outsider du soir"]);
    const report = {
      type: "matchResult",
      oppName, rating, goals, assists, cleanSheet, injured, injuryWeeks, wage,
    };

    const queue = [report];

    if (injured) {
      queue.push({ type: "injury", weeks: injuryWeeks });
    }

    if (!injured && next.trainingPoints >= 10) {
      next.trainingPoints -= 10;
      queue.push({ type: "levelUp" });
    }

    if (!injured && Math.random() < 0.4) {
      const evt = rollLifeEvent(next);
      if (evt) queue.push({ type: "lifeEvent", ...evt });
    }

    if (next.matchInSeason >= MATCHES_PER_SEASON) {
      queue.push({ type: "seasonEnd" });
    }

    setPlayer(next);
    setLog((l) => [
      { text: `Match ${next.career.matches} vs ${oppName} — note ${rating}/10${goals ? `, ${goals} but(s)` : ""}${assists ? `, ${assists} passe(s) D.` : ""}${cleanSheet ? ", clean sheet" : ""}.`, kind: "match" },
      ...l,
    ].slice(0, 30));
    setScreenQueue(queue);
  }

  function rollLifeEvent(p) {
    const categories = Object.keys(LIFE_EVENTS);
    const cat = pick(categories);
    const candidates = LIFE_EVENTS[cat].filter((e) => !e.requires || e.requires(p));
    if (candidates.length === 0) return null;
    const evt = pick(candidates);
    return { category: cat, event: evt };
  }

  function resolveEvent(choice) {
    const patch = choice.effect(player);
    const next = applyPatch(player, patch);
    setPlayer(next);
    setLog((l) => [{ text: choice.result, kind: "event" }, ...l].slice(0, 30));
    advance();
  }

  function advance() {
    setScreenQueue((q) => q.slice(1));
  }

  function continueRecovery() {
    const weeksLeft = player.injuredWeeks - 1;
    const next = { ...player, injuredWeeks: weeksLeft, forme: clamp(player.forme + 8) };
    if (weeksLeft <= 0) {
      next.forme = clamp(65 + rand(-5, 5));
      setLog((l) => [{ text: "Tu es enfin remis et prêt à rejouer.", kind: "info" }, ...l]);
    }
    setPlayer(next);
  }

  function levelUpAttr(key) {
    const next = { ...player, attrs: { ...player.attrs } };
    next.attrs[key] = clamp(next.attrs[key] + 2, 0, 99);
    setPlayer(next);
    setLog((l) => [{ text: `Entraînement payant : ${ATTR_LABELS[key]} augmente (+2).`, kind: "levelup" }, ...l].slice(0, 30));
    advance();
  }

  function resolveSeasonEnd() {
    const avgRating = (player.career.ratingSum / player.career.matches).toFixed(1);
    let next = { ...player, age: player.age + 1, season: player.season + 1, matchInSeason: 0 };

    if (next.age > 29) {
      ATTR_KEYS.forEach((k) => {
        if (k === "technique") return;
        next.attrs[k] = clamp(next.attrs[k] - rand(0, 3), 1, 99);
      });
    } else {
      const k = pick(ATTR_KEYS);
      next.attrs = { ...next.attrs, [k]: clamp(next.attrs[k] + rand(0, 1), 0, 99) };
    }

    setPlayer(next);
    setLog((l) => [{ text: `Fin de saison ${player.season} : ${player.career.matches ? avgRating : "-"} de moyenne cette saison, ${next.age} ans désormais.`, kind: "season" }, ...l]);

    const queue = [];
    const canOffer = next.tier < 4 && next.reputation >= OFFER_THRESHOLD[next.tier + 1] && Math.random() < 0.6;
    if (canOffer) {
      queue.push({ type: "transferOffer", targetTier: next.tier + 1 });
    }
    if (next.age >= 34) {
      queue.push({ type: "retirementChoice" });
    }
    setScreenQueue(queue);
  }

  function resolveTransfer(accept, targetTier) {
    if (accept) {
      const newClub = pick(CLUB_NAMES[targetTier]);
      const next = { ...player, tier: targetTier, clubName: newClub, moral: clamp(player.moral + 10), santeMentale: clamp(player.santeMentale - 5) };
      setPlayer(next);
      setLog((l) => [{ text: `Transfert accepté ! Tu rejoins ${newClub} (${TIERS[targetTier].name}).`, kind: "transfer" }, ...l]);
    } else {
      setLog((l) => [{ text: `Tu refuses l'offre et restes à ${player.clubName}.`, kind: "info" }, ...l]);
    }
    advance();
  }

  function resolveRetirement(retire) {
    if (retire || player.age >= 40) {
      setScreenQueue([{ type: "retired" }]);
    } else {
      advance();
    }
  }

  function resetGame() {
    setPlayer(null);
    setLog([]);
    setScreenQueue([]);
    setStage("creation");
    setFormName("");
    setFormPos(POSITIONS[0].id);
    setFormArchetype(0);
  }

  /* ------------------------------ RENDER ------------------------------ */
  if (stage === "creation") {
    return <CreationScreen
      formName={formName} setFormName={setFormName}
      formPos={formPos} setFormPos={setFormPos}
      formArchetype={formArchetype} setFormArchetype={setFormArchetype}
      onStart={startCareer}
    />;
  }

  if (active && active.type === "retired") {
    return <RetiredScreen player={player} onReset={resetGame} />;
  }

  return (
    <div style={{ background: `linear-gradient(180deg, ${C.pitchDeep}, ${C.pitch})`, minHeight: "100vh", fontFamily: "'Source Serif 4', serif", color: C.chalk }} className="p-4 md:p-8">
      <style>{`${FONT_IMPORT}
        .disp { font-family: 'Oswald', sans-serif; letter-spacing: 0.03em; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.35s ease-out; }
        .ticket-edge { background-image: radial-gradient(circle, ${C.pitchDeep} 3px, transparent 3.5px); background-size: 14px 14px; background-position: bottom; height: 8px; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <Header player={player} />

        <div className="grid md:grid-cols-5 gap-5 mt-6">
          <div className="md:col-span-2 fade-in">
            <PlayerCard player={player} />
            <MetersPanel player={player} />
          </div>

          <div className="md:col-span-3">
            {!active && <HubPanel player={player} onPlay={playMatch} onRecover={continueRecovery} />}
            {active && active.type === "matchResult" && <MatchResultCard data={active} onNext={advance} />}
            {active && active.type === "injury" && <InjuryCard data={active} onNext={advance} />}
            {active && active.type === "levelUp" && <LevelUpCard player={player} onPick={levelUpAttr} />}
            {active && active.type === "lifeEvent" && <LifeEventCard category={active.category} event={active.event} onChoose={resolveEvent} />}
            {active && active.type === "seasonEnd" && <SeasonEndCard player={player} onNext={resolveSeasonEnd} />}
            {active && active.type === "transferOffer" && <TransferCard player={player} targetTier={active.targetTier} onChoose={resolveTransfer} />}
            {active && active.type === "retirementChoice" && <RetirementCard player={player} onChoose={resolveRetirement} />}

            <FeedPanel log={log} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================================================================================
   SUBCOMPONENTS
=================================================================================== */

function CreationScreen({ formName, setFormName, formPos, setFormPos, formArchetype, setFormArchetype, onStart }) {
  const posDef = POSITIONS.find((p) => p.id === formPos);
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.pitchDeep}, ${C.pitch})`, minHeight: "100vh", fontFamily: "'Source Serif 4', serif", color: C.chalk }} className="flex items-center justify-center p-6">
      <style>{`${FONT_IMPORT} .disp { font-family: 'Oswald', sans-serif; letter-spacing: 0.03em; }`}</style>
      <div className="max-w-lg w-full rounded-lg p-7" style={{ background: C.chalk, color: C.ink, boxShadow: `0 0 0 1px ${C.fadedGold}` }}>
        <p className="mono text-xs tracking-widest uppercase mb-1" style={{ color: C.sage }}>Fiche de recrutement</p>
        <h1 className="disp text-3xl font-semibold mb-5" style={{ color: C.pitchDeep }}>Crée ton joueur</h1>

        <label className="block mono text-xs uppercase mb-1" style={{ color: C.sage }}>Nom du joueur</label>
        <input
          value={formName} onChange={(e) => setFormName(e.target.value)}
          placeholder="Ex. Sami Belkacem"
          className="w-full mb-4 px-3 py-2 rounded border outline-none"
          style={{ borderColor: C.sage, fontFamily: "'Source Serif 4', serif" }}
        />

        <label className="block mono text-xs uppercase mb-2" style={{ color: C.sage }}>Poste</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {POSITIONS.map((p) => (
            <button key={p.id} onClick={() => { setFormPos(p.id); setFormArchetype(0); }}
              className="px-3 py-2 rounded border text-sm text-left disp"
              style={{ borderColor: formPos === p.id ? C.gold : C.sage, background: formPos === p.id ? C.fadedGold : "transparent" }}>
              {p.label}
            </button>
          ))}
        </div>

        <label className="block mono text-xs uppercase mb-2" style={{ color: C.sage }}>Profil de jeu</label>
        <div className="grid grid-cols-1 gap-2 mb-6">
          {posDef.archetypes.map((a, i) => (
            <button key={a.name} onClick={() => setFormArchetype(i)}
              className="px-3 py-2 rounded border text-left"
              style={{ borderColor: formArchetype === i ? C.gold : C.sage, background: formArchetype === i ? C.fadedGold : "transparent" }}>
              <div className="font-semibold">{a.name}</div>
              <div className="text-sm" style={{ color: C.sage }}>{a.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={onStart} className="w-full disp text-lg py-3 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>
          Débuter ta carrière →
        </button>
        <p className="mono text-xs mt-3 text-center" style={{ color: C.sage }}>Tu commences en National 2, à 17 ans, dans un petit club amateur.</p>
      </div>
    </div>
  );
}

function Header({ player }) {
  const posLabel = POSITIONS.find((p) => p.id === player.position).label;
  return (
    <div className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: C.fadedGold }}>
      <div>
        <h1 className="disp text-2xl md:text-3xl font-semibold" style={{ color: C.goldSoft }}>{player.name}</h1>
        <p className="mono text-xs" style={{ color: C.sage }}>{posLabel} · {player.clubName} · {TIERS[player.tier].name}</p>
      </div>
      <div className="text-right mono text-xs" style={{ color: C.sage }}>
        Saison {player.season} · Match {player.matchInSeason}/{MATCHES_PER_SEASON}<br />{player.age} ans
      </div>
    </div>
  );
}

function PlayerCard({ player }) {
  const data = ATTR_KEYS.map((k) => ({ attribute: ATTR_LABELS[k], value: player.attrs[k] }));
  const overall = computeOverall(player.attrs, player.position);
  return (
    <div className="rounded-lg p-4" style={{ background: C.chalk, color: C.ink }}>
      <div className="flex justify-between items-center mb-1">
        <span className="mono text-xs uppercase" style={{ color: C.sage }}>Rapport de scouting</span>
        <span className="disp text-xl font-bold" style={{ color: C.pitchDeep }}>{overall}</span>
      </div>
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke={C.sage} />
            <PolarAngleAxis dataKey="attribute" tick={{ fill: C.ink, fontSize: 11 }} />
            <Radar dataKey="value" stroke={C.gold} fill={C.gold} fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="ticket-edge -mx-4 mt-2" />
    </div>
  );
}

function Meter({ icon: Icon, label, value, suffix = "", warn }) {
  const pct = typeof value === "number" && suffix !== "€" ? clamp(value) : null;
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center text-xs mono mb-1">
        <span className="flex items-center gap-1" style={{ color: C.sage }}><Icon size={12} /> {label}</span>
        <span style={{ color: warn ? C.risk : C.chalk }}>{suffix === "€" ? `${value}€` : `${value}`}</span>
      </div>
      {pct !== null && (
        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: warn ? C.risk : C.gold }} />
        </div>
      )}
    </div>
  );
}

function MetersPanel({ player }) {
  return (
    <div className="rounded-lg p-4 mt-4" style={{ background: "rgba(255,255,255,0.05)" }}>
      <Meter icon={Wallet} label="Finances" value={player.argent} suffix="€" warn={player.argent < 0} />
      <Meter icon={Heart} label="Santé mentale" value={player.santeMentale} warn={player.santeMentale < 30} />
      <Meter icon={Smile} label="Moral" value={player.moral} warn={player.moral < 30} />
      <Meter icon={Activity} label="Forme physique" value={player.forme} warn={player.forme < 30} />
      <Meter icon={TrendingUp} label="Réputation" value={player.reputation} />
      <p className="mono text-xs mt-2" style={{ color: C.sage }}>Statut : {player.relation}</p>
    </div>
  );
}

function HubPanel({ player, onPlay, onRecover }) {
  const injured = player.injuredWeeks > 0;
  return (
    <div className="rounded-lg p-6 text-center fade-in" style={{ background: C.chalk, color: C.ink }}>
      {injured ? (
        <>
          <p className="disp text-lg mb-1" style={{ color: C.risk }}>En convalescence</p>
          <p className="mb-4 text-sm" style={{ color: C.sage }}>Encore {player.injuredWeeks} semaine(s) avant de rejouer.</p>
          <button onClick={onRecover} className="disp px-6 py-3 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>
            Continuer la convalescence
          </button>
        </>
      ) : (
        <>
          <p className="disp text-lg mb-1">Prochain match</p>
          <p className="mb-4 text-sm" style={{ color: C.sage }}>{player.clubName} affronte un adversaire de {TIERS[player.tier].name}.</p>
          <button onClick={onPlay} className="disp px-6 py-3 rounded flex items-center gap-2 mx-auto" style={{ background: C.pitchDeep, color: C.goldSoft }}>
            Jouer le match suivant <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}

function Card({ children, accent }) {
  return (
    <div className="rounded-lg p-5 mb-4 fade-in" style={{ background: C.chalk, color: C.ink, boxShadow: `0 0 0 1px ${accent || C.fadedGold}` }}>
      {children}
    </div>
  );
}

function MatchResultCard({ data, onNext }) {
  return (
    <Card>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.sage }}>Rapport de match</p>
      <h2 className="disp text-xl font-semibold mb-2">Face à {data.oppName}</h2>
      <p className="mb-1">Note de match : <b>{data.rating}/10</b></p>
      {data.goals > 0 && <p className="mb-1">⚽ {data.goals} but(s) inscrit(s)</p>}
      {data.assists > 0 && <p className="mb-1">🎯 {data.assists} passe(s) décisive(s)</p>}
      {data.cleanSheet && <p className="mb-1">🧤 Clean sheet !</p>}
      <p className="mono text-sm mt-2" style={{ color: C.sage }}>Prime de match : +{data.wage}€</p>
      <button onClick={onNext} className="disp mt-4 px-5 py-2 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>Continuer</button>
    </Card>
  );
}

function InjuryCard({ data, onNext }) {
  return (
    <Card accent={C.risk}>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.risk }}>Blessure</p>
      <h2 className="disp text-xl font-semibold mb-2">Coup dur physique</h2>
      <p className="mb-3">Tu ressens une douleur nette pendant le match. Le staff médical t'écarte des terrains pour <b>{data.weeks} semaine(s)</b>.</p>
      <button onClick={onNext} className="disp px-5 py-2 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>Comprendre</button>
    </Card>
  );
}

function LevelUpCard({ player, onPick }) {
  return (
    <Card accent={C.gold}>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.gold }}>Progression</p>
      <h2 className="disp text-xl font-semibold mb-3">Choisis ton axe de travail</h2>
      <div className="grid grid-cols-2 gap-2">
        {ATTR_KEYS.map((k) => (
          <button key={k} onClick={() => onPick(k)} className="px-3 py-2 rounded border text-left" style={{ borderColor: C.sage }}>
            <div className="font-semibold">{ATTR_LABELS[k]}</div>
            <div className="mono text-xs" style={{ color: C.sage }}>{player.attrs[k]} → {clamp(player.attrs[k] + 2, 0, 99)}</div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function LifeEventCard({ category, event, onChoose }) {
  const catLabel = { famille: "Famille", argent: "Argent", scandale: "Scandale", mental: "Mental" }[category];
  return (
    <Card accent={C.risk}>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.risk }}>Aléa de vie · {catLabel}</p>
      <h2 className="disp text-xl font-semibold mb-2">{event.title}</h2>
      <p className="mb-4" style={{ lineHeight: 1.5 }}>{event.text}</p>
      <div className="flex flex-col gap-2">
        {event.choices.map((c, i) => (
          <button key={i} onClick={() => onChoose(c)} className="px-4 py-2 rounded border text-left" style={{ borderColor: C.sage }}>
            {c.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function SeasonEndCard({ player, onNext }) {
  const avg = player.career.matches ? (player.career.ratingSum / player.career.matches).toFixed(1) : "-";
  return (
    <Card accent={C.gold}>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.gold }}>Bilan de saison</p>
      <h2 className="disp text-xl font-semibold mb-2">Saison {player.season} terminée</h2>
      <p className="mb-1">Matchs joués (carrière) : {player.career.matches}</p>
      <p className="mb-1">Buts (carrière) : {player.career.goals} · Passes D. (carrière) : {player.career.assists}</p>
      <p className="mb-3">Note moyenne (carrière) : {avg}/10</p>
      <button onClick={onNext} className="disp px-5 py-2 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>Passer à la saison suivante</button>
    </Card>
  );
}

function TransferCard({ player, targetTier, onChoose }) {
  const club = TIERS[targetTier];
  return (
    <Card accent={C.gold}>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.gold }}>Offre de transfert</p>
      <h2 className="disp text-xl font-semibold mb-2">Un club de {club.name} veut te recruter</h2>
      <p className="mb-3">Salaire proposé : environ {club.wage}€ par match, un vrai bond en avant — mais aussi plus de pression et d'exposition médiatique.</p>
      <div className="flex gap-2">
        <button onClick={() => onChoose(true, targetTier)} className="disp px-4 py-2 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>Accepter</button>
        <button onClick={() => onChoose(false, targetTier)} className="px-4 py-2 rounded border" style={{ borderColor: C.sage }}>Rester par loyauté</button>
      </div>
    </Card>
  );
}

function RetirementCard({ player, onChoose }) {
  const forced = player.age >= 40;
  return (
    <Card accent={C.risk}>
      <p className="mono text-xs uppercase mb-1" style={{ color: C.risk }}>Fin de parcours ?</p>
      <h2 className="disp text-xl font-semibold mb-2">{forced ? "Le corps ne suit plus" : `${player.age} ans, une question se pose`}</h2>
      <p className="mb-3">{forced ? "À ton âge, il est temps de raccrocher les crampons." : "Continuer encore une saison, ou raccrocher au sommet ?"}</p>
      {forced ? (
        <button onClick={() => onChoose(true)} className="disp px-5 py-2 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>Prendre ta retraite</button>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => onChoose(false)} className="disp px-4 py-2 rounded" style={{ background: C.pitchDeep, color: C.goldSoft }}>Continuer</button>
          <button onClick={() => onChoose(true)} className="px-4 py-2 rounded border" style={{ borderColor: C.sage }}>Prendre ta retraite</button>
        </div>
      )}
    </Card>
  );
}

function FeedPanel({ log }) {
  return (
    <div className="rounded-lg p-4 mt-2" style={{ background: "rgba(255,255,255,0.05)" }}>
      <p className="mono text-xs uppercase mb-2" style={{ color: C.sage }}>Journal de carrière</p>
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {log.map((entry, i) => (
          <div key={i} className="text-sm pl-2 border-l-2" style={{ borderColor: C.fadedGold, color: C.chalk }}>{entry.text}</div>
        ))}
      </div>
    </div>
  );
}

function RetiredScreen({ player, onReset }) {
  const avg = player.career.matches ? (player.career.ratingSum / player.career.matches).toFixed(1) : "-";
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.pitchDeep}, ${C.pitch})`, minHeight: "100vh", fontFamily: "'Source Serif 4', serif", color: C.chalk }} className="flex items-center justify-center p-6">
      <style>{FONT_IMPORT}</style>
      <div className="max-w-lg w-full rounded-lg p-7 text-center" style={{ background: C.chalk, color: C.ink }}>
        <Trophy size={40} style={{ color: C.gold, margin: "0 auto 12px" }} />
        <p className="mono text-xs uppercase mb-1" style={{ color: C.sage }}>Fin de carrière</p>
        <h1 className="disp text-3xl font-semibold mb-4" style={{ color: C.pitchDeep }}>{player.name}</h1>
        <p className="mb-1">Retraité à {player.age} ans, dernier club : {player.clubName}</p>
        <p className="mb-1">{player.career.matches} matchs · {player.career.goals} buts · {player.career.assists} passes décisives</p>
        <p className="mb-6">Note moyenne sur la carrière : {avg}/10</p>
        <button onClick={onReset} className="disp px-6 py-3 rounded flex items-center gap-2 mx-auto" style={{ background: C.pitchDeep, color: C.goldSoft }}>
          <RotateCcw size={16} /> Nouvelle carrière
        </button>
      </div>
    </div>
  );
}
