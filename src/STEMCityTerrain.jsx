import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createGameplayMusic, playCoinSound, playBuildSound, playErrorSound, playSuccessSound, playTaskComplete, playClickSound } from "./MusicEngine";

// ═══ TERRAIN THEMES BY CLIMATE ═══
const CLIMATE_THEMES = {
  tropical: { ground: "#2d5a27", groundAlt: "#3a6b33", water: "#1a8a7a", waterDeep: "#0d6b5e", tree: "#1e7a22", treeAlt: "#4a9a30", sand: "#c4a44a", sky: "linear-gradient(180deg, #1a6090 0%, #5ab0d0 40%, #2d5a27 100%)", ambient: "#e8f5e0", name: "Tropical" },
  dry: { ground: "#b8956a", groundAlt: "#a88555", water: "#5a9ab5", waterDeep: "#3a7a9a", tree: "#7a8a3a", treeAlt: "#9a9a4a", sand: "#d4b87a", sky: "linear-gradient(180deg, #c4880a 0%, #e8c060 40%, #b8956a 100%)", ambient: "#f8f0e0", name: "Arid" },
  temperate: { ground: "#4a7a3a", groundAlt: "#5a8a4a", water: "#3a7ab0", waterDeep: "#2a5a8a", tree: "#2a6a25", treeAlt: "#5a9a40", sand: "#c4b07a", sky: "linear-gradient(180deg, #4a80b0 0%, #8ac0e0 40%, #4a7a3a 100%)", ambient: "#f0f5f0", name: "Temperate" },
  continental: { ground: "#5a6a4a", groundAlt: "#6a7a5a", water: "#4a6a8a", waterDeep: "#3a5a7a", tree: "#3a5a30", treeAlt: "#5a7a45", sand: "#9a8a6a", sky: "linear-gradient(180deg, #4a5a7a 0%, #8a9ab0 40%, #5a6a4a 100%)", ambient: "#e8eae0", name: "Continental" },
  polar: { ground: "#c8d8e8", groundAlt: "#b0c4d8", water: "#4a7090", waterDeep: "#3a5a7a", tree: "#4a6a5a", treeAlt: "#6a8a7a", sand: "#a0b0c0", sky: "linear-gradient(180deg, #2a3a5a 0%, #6a8aaa 40%, #c8d8e8 100%)", ambient: "#f0f4f8", name: "Polar" },
};

const TERRAIN_FEATURES = {
  island: { waterPct: 0.4, label: "Island" },
  rural: { waterPct: 0.08, label: "Rural" },
  coastal: { waterPct: 0.25, label: "Coastal" },
  town: { waterPct: 0.05, label: "Town" },
  busy: { waterPct: 0.03, label: "Metropolis" },
};

// ═══ BUILDING CATALOG ═══
const BUILDINGS = {
  road: { icon: "🛤️", name: "Road", cat: "infra", cost: 10, size: 1, color: "#555" },
  house: { icon: "🏠", name: "House", cat: "residential", cost: 50, size: 1, color: "#4ade80" },
  apartment: { icon: "🏢", name: "Apartment", cat: "residential", cost: 120, size: 1, color: "#22c55e" },
  shop: { icon: "🏪", name: "Shop", cat: "commercial", cost: 80, size: 1, color: "#3b82f6" },
  office: { icon: "🏬", name: "Office", cat: "commercial", cost: 150, size: 1, color: "#2563eb" },
  factory: { icon: "🏭", name: "Factory", cat: "industrial", cost: 200, size: 1, color: "#f59e0b" },
  school: { icon: "🏫", name: "School", cat: "civic", cost: 300, size: 1, color: "#8b5cf6" },
  hospital: { icon: "🏥", name: "Hospital", cat: "civic", cost: 500, size: 1, color: "#ec4899" },
  park: { icon: "🌳", name: "Park", cat: "civic", cost: 100, size: 1, color: "#10b981" },
  power: { icon: "⚡", name: "Power Plant", cat: "utility", cost: 400, size: 1, color: "#ef4444" },
  water: { icon: "💧", name: "Water Tower", cat: "utility", cost: 250, size: 1, color: "#06b6d4" },
  fire: { icon: "🚒", name: "Fire Station", cat: "civic", cost: 350, size: 1, color: "#f97316" },
  police: { icon: "🚔", name: "Police", cat: "civic", cost: 300, size: 1, color: "#6366f1" },
  temple: { icon: "🕌", name: "Temple", cat: "culture", cost: 200, size: 1, color: "#a855f7" },
  market: { icon: "🏪", name: "Market", cat: "commercial", cost: 60, size: 1, color: "#14b8a6" },
  port: { icon: "⚓", name: "Port", cat: "infra", cost: 400, size: 1, color: "#0ea5e9" },
  fort: { icon: "🏰", name: "Fort", cat: "military", cost: 500, size: 1, color: "#78716c" },
};

const TOOL_CATEGORIES = [
  { id: "select", icon: "🖱️", name: "Select" },
  { id: "road", icon: "🛤️", name: "Roads" },
  { id: "zone", icon: "🗺️", name: "Zones" },
  { id: "build", icon: "🏗️", name: "Build" },
  { id: "demolish", icon: "🗑️", name: "Demolish" },
  { id: "info", icon: "ℹ️", name: "Info" },
];

const ZONE_TYPES = [
  { id: "residential", color: "#4ade8060", border: "#4ade80", icon: "🏠", name: "Residential" },
  { id: "commercial", color: "#3b82f660", border: "#3b82f6", icon: "🏪", name: "Commercial" },
  { id: "industrial", color: "#f59e0b60", border: "#f59e0b", icon: "🏭", name: "Industrial" },
];

const BUILD_ITEMS = [
  { section: "Civic", items: ["school", "hospital", "park", "fire", "police"] },
  { section: "Utility", items: ["power", "water"] },
  { section: "Commercial", items: ["shop", "office", "market"] },
  { section: "Residential", items: ["house", "apartment"] },
  { section: "Industrial", items: ["factory"] },
  { section: "Culture", items: ["temple"] },
  { section: "Special", items: ["port", "fort"] },
];

const GRID_W = 40;
const GRID_H = 30;
const METERS_PER_CELL = 100; // Each grid cell = 100m × 100m

export default function STEMCityTerrain({ config, muted, onToggleMute }) {
  // ═══ GAMEPLAY MUSIC ═══
  const gameMusicRef = useRef(null);
  useEffect(() => {
    if (muted) {
      if (gameMusicRef.current) { try { gameMusicRef.current.stop(); gameMusicRef.current.dispose(); } catch(e){} gameMusicRef.current = null; }
      return;
    }
    let cancelled = false;
    const startMusic = async () => {
      try {
        if (gameMusicRef.current) { gameMusicRef.current.stop(); gameMusicRef.current.dispose(); }
        const engine = await createGameplayMusic();
        if (cancelled) { engine.dispose(); return; }
        gameMusicRef.current = engine;
        engine.start();
      } catch (e) { console.log("Audio not available:", e.message); }
    };
    startMusic();
    return () => { cancelled = true; if (gameMusicRef.current) { try { gameMusicRef.current.stop(); gameMusicRef.current.dispose(); } catch(e){} gameMusicRef.current = null; } };
  }, [muted]);

  // SFX helper — only plays if not muted
  const sfx = useCallback((fn) => { if (!muted) fn().catch(() => {}); }, [muted]);
  const climate = config?.climate || "temperate";
  const terrain = config?.terrain || "rural";
  const government = config?.government || "education";
  const civics = config?.civics || "technologist";
  const cityName = config?.cityName || "New City";
  const calcMode = config?.calcMode !== false;
  const startingMoney = config?.startMoney || 5000000;
  const mathDifficulty = config?.mathDifficulty || "medium";

  const theme = CLIMATE_THEMES[climate];
  const terrainCfg = TERRAIN_FEATURES[terrain];

  // ═══ STATE ═══
  const [cells, setCells] = useState(() => generateTerrain(climate, terrain));
  const [placed, setPlaced] = useState({}); // "x,y" → { type, rotation }
  const [zones, setZones] = useState({}); // "x,y" → zoneType
  const [tool, setTool] = useState("select");
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [coins, setCoins] = useState(config?.startMoney || 5000000);
  const [population, setPopulation] = useState(0);
  const [happiness, setHappiness] = useState(70);
  const [power, setPower] = useState(0);
  const [waterSupply, setWaterSupply] = useState(0);
  const [research, setResearch] = useState(250); // Starting RP — enough to unlock Wind Turbine path

  // ═══ EDUCATION SYSTEM ═══
  const [selectedEducation, setSelectedEducation] = useState(null); // "school" | "university"
  const [activeResearch, setActiveResearch] = useState(null); // techId being researched, or null
  const [showResearchCalc, setShowResearchCalc] = useState(false);
  const [researchCalcAnswer, setResearchCalcAnswer] = useState("");
  const [researchCalcFeedback, setResearchCalcFeedback] = useState(null);
  const [researchCalcQ, setResearchCalcQ] = useState(null); // {question, answer, hint}
  const [researchProgress, setResearchProgress] = useState(0); // RP accumulated toward active tech
  const [totalResearched, setTotalResearched] = useState(0); // tracks difficulty scaling

  const EDUCATION_BUILDINGS = {
    school: { id: "school", name: "School", cost: 0, energyCost: 15, graduates: 5, desc: "Educates children. Produces 5 graduates per cycle. FREE.",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="6" y="12" width="20" height="14" rx="2" fill="#3b1f7a" stroke="#c084fc" strokeWidth="1.5"/><path d="M4 12l12-6 12 6" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="13" y="18" width="6" height="8" rx="1" fill="#8b5cf6"/><rect x="8" y="15" width="4" height="4" rx="0.5" fill="#a78bfa" opacity="0.5"/><rect x="20" y="15" width="4" height="4" rx="0.5" fill="#a78bfa" opacity="0.5"/></svg> },
    university: { id: "university", name: "University", cost: 500000, energyCost: 40, rpPerCycle: 20, desc: "Converts graduates into research. §500K. Generates 20 RP per solved challenge.",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="14" width="24" height="14" rx="2" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5"/><path d="M2 14l14-10 14 10" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="8" y1="14" x2="8" y2="28" stroke="#3b82f6" strokeWidth="1.5"/><line x1="16" y1="14" x2="16" y2="28" stroke="#3b82f6" strokeWidth="1.5"/><line x1="24" y1="14" x2="24" y2="28" stroke="#3b82f6" strokeWidth="1.5"/><rect x="12" y="20" width="8" height="8" rx="1" fill="#2563eb"/><circle cx="16" cy="6" r="2" fill="#60a5fa"/></svg> },
  };

  // Count education buildings
  const schoolCount = useMemo(() => Object.values(placed).filter(b => b.type === "school").length, [placed]);
  const universityCount = useMemo(() => Object.values(placed).filter(b => b.type === "university").length, [placed]);
  const graduatesPerCycle = schoolCount * 5;

  // Generate a maths question scaled to difficulty
  const generateResearchQuestion = useCallback(() => {
    const difficulty = Math.min(10, Math.floor(totalResearched / 3) + 1); // scales up every 3 techs
    let q, a, h;

    if (difficulty <= 2) {
      // Simple arithmetic
      const x = 10 + Math.floor(Math.random() * 40);
      const y = 5 + Math.floor(Math.random() * 30);
      const ops = ["+", "-", "×"];
      const op = ops[Math.floor(Math.random() * ops.length)];
      a = op === "+" ? x + y : op === "-" ? x - y : x * y;
      q = `${x} ${op} ${y}`;
      h = "Basic arithmetic";
    } else if (difficulty <= 4) {
      // Solve simple equation
      const ans = Math.floor(Math.random() * 20) - 10;
      const b = Math.floor(Math.random() * 15) + 1;
      const c = ans * b;
      q = `Solve: ${b}x = ${c}`;
      a = ans;
      h = "Divide both sides by " + b;
    } else if (difficulty <= 6) {
      // Quadratic factoring or Pythagoras
      if (Math.random() > 0.5) {
        const trips = [[3,4,5],[5,12,13],[6,8,10],[8,15,17],[7,24,25]];
        const [aa, bb, cc] = trips[Math.floor(Math.random() * trips.length)];
        const missing = Math.floor(Math.random() * 3);
        if (missing === 0) { q = `Pythagoras: a² + ${bb}² = ${cc}². Find a.`; a = aa; }
        else if (missing === 1) { q = `Pythagoras: ${aa}² + b² = ${cc}². Find b.`; a = bb; }
        else { q = `Pythagoras: ${aa}² + ${bb}² = c². Find c.`; a = cc; }
        h = "a² + b² = c²";
      } else {
        const r1 = Math.floor(Math.random() * 8) + 1;
        const r2 = Math.floor(Math.random() * 8) + 1;
        q = `Expand: (x + ${r1})(x + ${r2}). What is the coefficient of x?`;
        a = r1 + r2;
        h = "Multiply out the brackets";
      }
    } else if (difficulty <= 8) {
      // Simultaneous equations or trig
      const x = Math.floor(Math.random() * 10) + 1;
      const y = Math.floor(Math.random() * 10) + 1;
      const a1 = Math.floor(Math.random() * 5) + 1;
      const b1 = Math.floor(Math.random() * 5) + 1;
      const c1 = a1 * x + b1 * y;
      const a2 = Math.floor(Math.random() * 5) + 1;
      const b2 = Math.floor(Math.random() * 5) + 1;
      const c2 = a2 * x + b2 * y;
      q = `Solve: ${a1}x + ${b1}y = ${c1} and ${a2}x + ${b2}y = ${c2}. What is x?`;
      a = x;
      h = "Elimination or substitution method";
    } else {
      // Integration, differentiation, or harder
      const coeff = Math.floor(Math.random() * 5) + 2;
      const pow = Math.floor(Math.random() * 3) + 2;
      const xVal = 2;
      if (Math.random() > 0.5) {
        q = `Differentiate: y = ${coeff}x^${pow}. Find dy/dx when x = ${xVal}.`;
        a = coeff * pow * Math.pow(xVal, pow - 1);
        h = `dy/dx = ${coeff * pow}x^${pow - 1}`;
      } else {
        q = `Integrate: ∫${coeff}x^${pow} dx. Evaluate from 0 to ${xVal} (ignore +c).`;
        a = Math.round(coeff * Math.pow(xVal, pow + 1) / (pow + 1) * 100) / 100;
        h = `= ${coeff}x^${pow + 1}/${pow + 1}`;
      }
    }
    return { question: q, answer: a, hint: h, difficulty };
  }, [totalResearched]);

  // Trigger research challenge when clicking "Research" on a tech
  const startResearchChallenge = (techId) => {
    if (activeResearch && activeResearch !== techId) {
      addNotification("⚠ Already researching " + TECH_TREE[activeResearch]?.name + ". Finish or cancel first.");
      return;
    }
    if (universityCount === 0) {
      addNotification("🏫 Build a university first to conduct research!");
      return;
    }
    setActiveResearch(techId);
    const q = generateResearchQuestion();
    setResearchCalcQ(q);
    setResearchCalcAnswer("");
    setResearchCalcFeedback(null);
    setShowResearchCalc(true);
  };

  const checkResearchAnswer = () => {
    if (!researchCalcQ || !activeResearch) return;
    const ans = parseFloat(researchCalcAnswer);
    const correct = researchCalcQ.answer;
    const tolerance = typeof correct === "number" && correct % 1 !== 0 ? Math.abs(correct) * 0.05 : 0.01;

    if (!isNaN(ans) && Math.abs(ans - correct) <= tolerance) {
      const rpGain = universityCount * EDUCATION_BUILDINGS.university.rpPerCycle;
      const tech = TECH_TREE[activeResearch];
      const newProgress = researchProgress + rpGain;

      if (newProgress >= tech.cost) {
        // Tech fully researched!
        setUnlockedTechs(prev => new Set([...prev, activeResearch]));
        setTotalResearched(prev => prev + 1);
        setResearchCalcFeedback({ type: "success", msg: `🎉 ${tech.name} fully researched! +${rpGain} RP` });
        addNotification(`🔓 Unlocked: ${tech.name}`);
        setTimeout(() => { setShowResearchCalc(false); setActiveResearch(null); setResearchProgress(0); }, 2000);
      } else {
        setResearchProgress(newProgress);
        setResearchCalcFeedback({ type: "success", msg: `✓ +${rpGain} RP! Progress: ${newProgress}/${tech.cost}` });
        setTimeout(() => {
          const q = generateResearchQuestion();
          setResearchCalcQ(q);
          setResearchCalcAnswer("");
          setResearchCalcFeedback(null);
        }, 1200);
      }
    } else {
      setResearchCalcFeedback({ type: "error", msg: `❌ Incorrect. ${researchCalcQ.hint}. Try again.` });
    }
  };
  const [materials, setMaterials] = useState(500);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [hoverCell, setHoverCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [notifications, setNotifications] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [bottomCategory, setBottomCategory] = useState(null);
  const [showTaskPopup, setShowTaskPopup] = useState(true);
  const [taskId, setTaskId] = useState(1);
  const TASKS = {
    1: { id: 1, title: "Power Up!", desc: "Your city needs energy! Build 5 wind turbines to power the grid. Other generators require tech research.", target: 5, type: "energy", icon: "⚡", reward: 500000 },
    2: { id: 2, title: "Population Boom!", desc: "Build enough housing for 200 new residents. Use houses (10 people) and condos (50 people).", target: 200, type: "housing", icon: "🏠", reward: 300000 },
    3: { id: 3, title: "Clean City!", desc: "Your city is growing but so is the waste. Build a garbage disposal unit to manage pollution.", target: 1, type: "pollution", icon: "♻️", reward: 200000 },
  };
  const currentTask = TASKS[taskId];
  const [taskComplete, setTaskComplete] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState(null);
  const [showCalcChallenge, setShowCalcChallenge] = useState(false);
  const [calcAnswerEnergy, setCalcAnswerEnergy] = useState("");
  const [calcAnswerCost, setCalcAnswerCost] = useState("");
  const [calcAnswerKW, setCalcAnswerKW] = useState("");
  const [calcPhase, setCalcPhase] = useState(1); // 1=MW+cost, 2=convert to KW (medium only)
  const [calcAttempts, setCalcAttempts] = useState(0);
  const [calcFeedback, setCalcFeedback] = useState(null);
  const [calcPassed, setCalcPassed] = useState(false);

  // Standard form helpers
  const toStdForm = (n) => {
    if (n === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(n)));
    const coeff = n / Math.pow(10, exp);
    return `${parseFloat(coeff.toFixed(2))} × 10^${exp}`;
  };
  const parseStdForm = (str) => {
    const s = str.trim().replace(/\s/g, "").replace(/×/g, "x").replace(/\*/g, "x");
    // Try "AxB^C" or "Ax10^C" or "AeC" patterns
    let m = s.match(/^([0-9.]+)x10\^([0-9-]+)$/i) || s.match(/^([0-9.]+)e([0-9-]+)$/i);
    if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2]));
    // Also accept plain numbers
    const plain = parseFloat(s);
    if (!isNaN(plain)) return plain;
    return NaN;
  };

  // ═══ PIPE STATE ═══
  const [pipeMode, setPipeMode] = useState(null); // "water" | "sewage" | null
  const [pipeDragStart, setPipeDragStart] = useState(null); // {x, y} grid coords
  const [pipeDragEnd, setPipeDragEnd] = useState(null); // {x, y} grid coords while dragging
  const [placedPipes, setPlacedPipes] = useState([]); // [{type, x1, y1, x2, y2, lengthM, radiusCm, volumeM3, flowRate}]
  const [showPipeCalc, setShowPipeCalc] = useState(false);
  const [pendingPipe, setPendingPipe] = useState(null); // pipe awaiting calculation
  const [pipeCalcAnswer, setPipeCalcAnswer] = useState({ h: "", v: "", q: "" });
  const [pipeCalcStep, setPipeCalcStep] = useState(1); // 1=distance, 2=volume, 3=flow rate
  const [pipeCalcFeedback, setPipeCalcFeedback] = useState(null);
  const [pipeAttempts, setPipeAttempts] = useState(0);
  const [pipeCalcDone, setPipeCalcDone] = useState(new Set()); // pipe types already calculated

  // ═══ HOUSING STATE ═══
  const [selectedHousing, setSelectedHousing] = useState(null); // "house" | "condo" | null
  const [selectedUtility, setSelectedUtility] = useState(null); // "garbage" | null

  // ═══ ROAD SYSTEM ═══
  const [roadMode, setRoadMode] = useState(false);
  const [roadStart, setRoadStart] = useState(null);
  const [placedRoads, setPlacedRoads] = useState([]);
  const [showRoadCalc, setShowRoadCalc] = useState(false);
  const [roadCalcPassed, setRoadCalcPassed] = useState(false);
  const [pendingRoad, setPendingRoad] = useState(null);
  const [roadCalcAnswer, setRoadCalcAnswer] = useState("");
  const [roadCalcFeedback, setRoadCalcFeedback] = useState(null);
  const [roadCalcAttempts, setRoadCalcAttempts] = useState(0);
  const [roadQuestionType, setRoadQuestionType] = useState(0); // 1-4 for medium
  const [roadCalcDone, setRoadCalcDone] = useState(false); // after first correct, skip
  // Easy mode: specific lines to draw
  const [easyRoadPhase, setEasyRoadPhase] = useState(1); // 1=y=5, 2=x=-2, 3=done
  // Perpendicular road for medium Q3
  const [awaitingPerp, setAwaitingPerp] = useState(null); // {parentRoad, perpGradient}
  const [perpRoadStart, setPerpRoadStart] = useState(null);

  // Curved road state (hard mode)
  const [curvedRoadMode, setCurvedRoadMode] = useState(false);
  const [curvedRoadStart, setCurvedRoadStart] = useState(null);
  const [placedCurvedRoads, setPlacedCurvedRoads] = useState([]);
  const [showCurvedCalc, setShowCurvedCalc] = useState(false);
  const [pendingCurved, setPendingCurved] = useState(null);
  const [curvedAnswers, setCurvedAnswers] = useState({ a: "", b: "" });
  const [curvedCalcFeedback, setCurvedCalcFeedback] = useState(null);
  const [curvedCalcAttempts, setCurvedCalcAttempts] = useState(0);
  const [curvedBonusPhase, setCurvedBonusPhase] = useState(0); // 0=find A&B, 1=linearisation, 2=domain&range
  const [curvedBonusAnswers, setCurvedBonusAnswers] = useState({ m: "", c: "", domMin: "", domMax: "", ranMin: "", ranMax: "" });

  // Coordinate system: origin at grid center (20, 15)
  // Maths coords: x increases right, y increases UP (inverted from grid)
  const ORIGIN = { x: 20, y: 15 };
  const toMathCoords = (gx, gy) => ({ x: gx - ORIGIN.x, y: ORIGIN.y - gy });

  // Roads unlocked when at least one water pipe exists
  const roadsUnlocked = useMemo(() => {
    return placedPipes.some(p => p.type === "water");
  }, [placedPipes]);

  const HOUSING_TYPES = {
    house: { id: "house", name: "Houses", icon: "🏠", cost: 0, energyCost: 20, population: 10, desc: "5 family homes. Free to build, 20 kW/turn.", size: "1×1",
      ratio: { adults: 5, children: 4, elderly: 1 }, // 5:4:1 out of 10
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M4 16L16 6l12 10" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14v13h18V14" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="2"/><rect x="13" y="20" width="6" height="7" rx="1" fill="#3b82f6"/><rect x="10" y="16" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.6"/><rect x="18" y="16" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.6"/></svg> },
    condo: { id: "condo", name: "Condo Block", icon: "🏢", cost: 0, energyCost: 40, population: 50, desc: "Apartment complex. Free to build, 40 kW/turn.", size: "1×1",
      ratio: { adults: 8, children: 1, elderly: 1 }, // 8:1:1 out of 10
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="6" y="4" width="20" height="24" rx="2" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5"/><rect x="9" y="7" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.5"/><rect x="15" y="7" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.5"/><rect x="21" y="7" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.3"/><rect x="9" y="12" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.5"/><rect x="15" y="12" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.5"/><rect x="21" y="12" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.3"/><rect x="9" y="17" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.5"/><rect x="15" y="17" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.5"/><rect x="21" y="17" width="4" height="3" rx="0.5" fill="#818cf8" opacity="0.3"/><rect x="13" y="22" width="6" height="6" rx="1" fill="#4f46e5"/></svg> },
  };

  // ═══ DEMOGRAPHICS ═══
  const INITIAL_POP = { adults: 70, children: 20, elderly: 10 }; // 100 starting citizens
  const housingPop = useMemo(() => {
    let total = 0, adults = 0, children = 0, elderly = 0;
    Object.values(placed).forEach(b => {
      const h = HOUSING_TYPES[b.type];
      if (!h) return;
      const totalParts = h.ratio.adults + h.ratio.children + h.ratio.elderly;
      const perPart = h.population / totalParts;
      const a = Math.round(h.ratio.adults * perPart);
      const c = Math.round(h.ratio.children * perPart);
      const e = Math.round(h.ratio.elderly * perPart);
      adults += a; children += c; elderly += e; total += h.population;
    });
    return { total, adults, children, elderly };
  }, [placed]);
  const demographics = { adults: INITIAL_POP.adults + housingPop.adults, children: INITIAL_POP.children + housingPop.children, elderly: INITIAL_POP.elderly + housingPop.elderly };
  const totalPop = demographics.adults + demographics.children + demographics.elderly;


  // ═══ DEMOGRAPHICS CHALLENGE ═══
  const [showDemoCalc, setShowDemoCalc] = useState(false);
  const [demoCalcAnswers, setDemoCalcAnswers] = useState({ adults: "", children: "", elderly: "" });
  const [demoCalcFeedback, setDemoCalcFeedback] = useState(null);
  const [demoCalcPassed, setDemoCalcPassed] = useState(false);
  const [demoCalcAttempts, setDemoCalcAttempts] = useState(0);
  const [demoPhase, setDemoPhase] = useState(1); // 1=basic ratios, 2=medium followup, 3=hard followup
  const [demoMediumAnswers, setDemoMediumAnswers] = useState({ adults: "", children: "", elderly: "" });
  const [demoHardAnswer, setDemoHardAnswer] = useState("");

  // Population from housing only (excluding initial 100)
  const popFromHousing = useMemo(() => {
    let p = 0;
    Object.values(placed).forEach(b => { if (HOUSING_TYPES[b.type]) p += HOUSING_TYPES[b.type].population; });
    return p;
  }, [placed]);

  // ═══ JOB SECTOR RANDOMIZER ═══
  const [showJobRandom, setShowJobRandom] = useState(false);
  const [jobBallPos, setJobBallPos] = useState(0.5); // 0-1 position on bar
  const [jobTimerRunning, setJobTimerRunning] = useState(false);
  const [jobTimeLeft, setJobTimeLeft] = useState(5);
  const [jobResult, setJobResult] = useState(null); // { dominant: "primary"|"secondary"|"tertiary", split: {primary, secondary, tertiary} }
  const [jobResultLocked, setJobResultLocked] = useState(false);

  // Bar distribution based on civics
  const jobBarSections = useMemo(() => {
    if (civics === "technologist") {
      return [
        { id: "primary", label: "Primary", color: "#ef4444", start: 0, end: 0.25 },
        { id: "secondary", label: "Secondary", color: "#eab308", start: 0.25, end: 0.50 },
        { id: "tertiary", label: "Tertiary", color: "#22c55e", start: 0.50, end: 1.0 },
      ];
    }
    return [
      { id: "primary", label: "Primary", color: "#ef4444", start: 0, end: 0.3333 },
      { id: "secondary", label: "Secondary", color: "#eab308", start: 0.3333, end: 0.6667 },
      { id: "tertiary", label: "Tertiary", color: "#22c55e", start: 0.6667, end: 1.0 },
    ];
  }, [civics]);

  // Ball animation
  useEffect(() => {
    if (!jobTimerRunning) return;
    const ballInterval = setInterval(() => {
      setJobBallPos(prev => {
        const speed = 0.02 + Math.random() * 0.06;
        const direction = Math.random() > 0.5 ? 1 : -1;
        const next = prev + speed * direction;
        return Math.max(0.02, Math.min(0.98, next));
      });
    }, 50);
    return () => clearInterval(ballInterval);
  }, [jobTimerRunning]);

  // Timer countdown
  useEffect(() => {
    if (!jobTimerRunning || jobTimeLeft <= 0) return;
    const timer = setTimeout(() => {
      setJobTimeLeft(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          setJobTimerRunning(false);
          // Determine result
          const section = jobBarSections.find(s => jobBallPos >= s.start && jobBallPos < s.end) || jobBarSections[jobBarSections.length - 1];
          const dominant = section.id;
          const others = ["primary", "secondary", "tertiary"].filter(s => s !== dominant);
          const split = { [dominant]: 60, [others[0]]: 20, [others[1]]: 20 };
          setJobResult({ dominant, split });
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [jobTimerRunning, jobTimeLeft, jobBallPos, jobBarSections]);

  // Trigger job randomizer after demographics passed
  useEffect(() => {
    if (demoCalcPassed && !showJobRandom && !jobResultLocked) {
      setTimeout(() => setShowJobRandom(true), 1500);
    }
  }, [demoCalcPassed, showJobRandom, jobResultLocked]);
  const housingCount = useMemo(() => {
    let houses = 0, condos = 0;
    Object.values(placed).forEach(b => { if (b.type === "house") houses++; if (b.type === "condo") condos++; });
    return { houses, condos, total: houses + condos };
  }, [placed]);

  // Trigger demographics challenge when housing target (200 people) reached
  useEffect(() => {
    if (taskId === 2 && popFromHousing >= 200 && !demoCalcPassed && !showDemoCalc && !taskComplete) {
      setShowDemoCalc(true);
      setDemoCalcAnswers({ adults: "", children: "", elderly: "" });
      setDemoMediumAnswers({ adults: "", children: "", elderly: "" });
      setDemoHardAnswer("");
      setDemoPhase(1);
      setDemoCalcFeedback(null);
    }
  }, [taskId, popFromHousing, demoCalcPassed, showDemoCalc, taskComplete]);

  // Demographics from NEW residents only (200 movers, not the initial 100)
  const newResidentDemo = useMemo(() => {
    const d = { adults: 0, children: 0, elderly: 0 };
    Object.values(placed).forEach(b => {
      const h = HOUSING_TYPES[b.type];
      if (!h) return;
      const totalParts = h.ratio.adults + h.ratio.children + h.ratio.elderly;
      const perPart = h.population / totalParts;
      d.adults += Math.round(h.ratio.adults * perPart);
      d.children += Math.round(h.ratio.children * perPart);
      d.elderly += Math.round(h.ratio.elderly * perPart);
    });
    return d;
  }, [placed]);

  // Medium mode: after subtracting 10 adults, 2 children, 2 elderly
  const mediumAdjusted = useMemo(() => ({
    adults: newResidentDemo.adults - 10,
    children: newResidentDemo.children - 2,
    elderly: newResidentDemo.elderly - 2,
  }), [newResidentDemo]);

  // GCD for simplifying ratios (use function declaration to avoid TDZ)
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }
  function gcd3(a, b, c) { return gcd(gcd(a, b), c); }

  const mediumRatio = useMemo(() => {
    const g = gcd3(Math.abs(mediumAdjusted.adults), Math.abs(mediumAdjusted.children), Math.abs(mediumAdjusted.elderly)) || 1;
    return { adults: mediumAdjusted.adults / g, children: mediumAdjusted.children / g, elderly: mediumAdjusted.elderly / g };
  }, [mediumAdjusted]);

  // Hard mode: permutations P(H, 3) = H × (H-1) × (H-2) for H housing units, 3 groups
  const hardPermutations = useMemo(() => {
    const H = housingCount.total;
    if (H < 3) return 6; // fallback 3!
    return H * (H - 1) * (H - 2);
  }, [housingCount.total]);

  const checkDemoCalc = () => {
    const applyPenalty = () => {
      const penalty = Math.floor(coins * 0.1);
      setCoins(prev => prev - penalty);
      setDemoCalcAttempts(prev => prev + 1);
      return penalty;
    };

    if (demoPhase === 1) {
      // All difficulties: calculate demographics from ratios
      const a = parseInt(demoCalcAnswers.adults);
      const c = parseInt(demoCalcAnswers.children);
      const e = parseInt(demoCalcAnswers.elderly);
      const correct = a === newResidentDemo.adults && c === newResidentDemo.children && e === newResidentDemo.elderly;

      if (correct) {
        if (mathDifficulty === "easy") {
          // Easy: done!
          setDemoCalcFeedback({ type: "success", msg: `✓ Correct! Adults: ${newResidentDemo.adults}, Children: ${newResidentDemo.children}, Elderly: ${newResidentDemo.elderly}` });
          setDemoCalcPassed(true);
          setTaskComplete(true);
          setTimeout(() => { setShowDemoCalc(false); setShowTaskPopup(true); addNotification(`🎉 Demographics verified! +§${TASKS[2].reward.toLocaleString()}`); setCoins(prev => prev + TASKS[2].reward); }, 2000);
        } else if (mathDifficulty === "medium") {
          setDemoCalcFeedback({ type: "success", msg: `✓ Correct! Now... 10 adults, 2 children, and 2 elderly don't move in as planned.` });
          setTimeout(() => { setDemoPhase(2); setDemoCalcFeedback(null); }, 1500);
        } else {
          setDemoCalcFeedback({ type: "success", msg: `✓ Correct! Now for a combinatorics challenge...` });
          setTimeout(() => { setDemoPhase(3); setDemoCalcFeedback(null); }, 1500);
        }
      } else {
        const penalty = applyPenalty();
        let msg = "❌ Not quite. ";
        if (a !== newResidentDemo.adults) msg += "Adults incorrect. ";
        if (c !== newResidentDemo.children) msg += "Children incorrect. ";
        if (e !== newResidentDemo.elderly) msg += "Elderly incorrect. ";
        msg += `(-§${penalty.toLocaleString()})`;
        setDemoCalcFeedback({ type: "error", msg });
      }
    } else if (demoPhase === 2) {
      // Medium: new totals after people don't show up, express as ratio
      const a = parseInt(demoMediumAnswers.adults);
      const c = parseInt(demoMediumAnswers.children);
      const e = parseInt(demoMediumAnswers.elderly);
      // Accept either exact numbers or simplified ratio
      const exactMatch = a === mediumAdjusted.adults && c === mediumAdjusted.children && e === mediumAdjusted.elderly;
      const ratioMatch = a === mediumRatio.adults && c === mediumRatio.children && e === mediumRatio.elderly;
      if (exactMatch || ratioMatch) {
        setDemoCalcFeedback({ type: "success", msg: `✓ Correct! ${mediumAdjusted.adults} : ${mediumAdjusted.children} : ${mediumAdjusted.elderly} (simplifies to ${mediumRatio.adults} : ${mediumRatio.children} : ${mediumRatio.elderly})` });
        setDemoCalcPassed(true);
        setTaskComplete(true);
        setTimeout(() => { setShowDemoCalc(false); setShowTaskPopup(true); addNotification(`🎉 Demographics verified! +§${TASKS[2].reward.toLocaleString()}`); setCoins(prev => prev + TASKS[2].reward); }, 2000);
      } else {
        const penalty = applyPenalty();
        setDemoCalcFeedback({ type: "error", msg: `❌ Incorrect. Subtract 10 adults, 2 children, 2 elderly from your totals, then simplify the ratio. (-§${penalty.toLocaleString()})` });
      }
    } else if (demoPhase === 3) {
      // Hard: permutations
      const ans = parseInt(demoHardAnswer.replace(/[^0-9]/g, ""));
      if (ans === hardPermutations) {
        setDemoCalcFeedback({ type: "success", msg: `✓ Correct! P(${housingCount.total}, 3) = ${housingCount.total} × ${housingCount.total - 1} × ${housingCount.total - 2} = ${hardPermutations}` });
        setDemoCalcPassed(true);
        setTaskComplete(true);
        setTimeout(() => { setShowDemoCalc(false); setShowTaskPopup(true); addNotification(`🎉 Demographics verified! +§${TASKS[2].reward.toLocaleString()}`); setCoins(prev => prev + TASKS[2].reward); }, 2000);
      } else {
        const penalty = applyPenalty();
        setDemoCalcFeedback({ type: "error", msg: `❌ Incorrect. Think: for the first house you have ${housingCount.total} choices, then ${housingCount.total - 1}, then ${housingCount.total - 2}. (-§${penalty.toLocaleString()})` });
      }
    }
  };

  // Pipe specs shown to student
  const PIPE_SPECS = {
    water: { label: "Water Pipe", color: "#22d3ee", radiusCm: 15, timeSeconds: 60, icon: "💧", costPerM: 500 },
    sewage: { label: "Sewage Pipe", color: "#a3e635", radiusCm: 20, timeSeconds: 90, icon: "🟢", costPerM: 350 },
  };

  // Water sources are cells adjacent to water
  const waterSources = useMemo(() => {
    const sources = [];
    cells.forEach((row, y) => row.forEach((cell, x) => {
      if (cell.type !== "land") return;
      const adj = [[0,1],[0,-1],[1,0],[-1,0]];
      const nearWater = adj.some(([dx, dy]) => cells[y + dy]?.[x + dx]?.type === "water");
      if (nearWater) sources.push({ x, y });
    }));
    return sources;
  }, [cells]);

  // ═══ POLLUTION SYSTEM ═══
  const UTILITY_BUILDINGS = {
    garbage: { id: "garbage", name: "Garbage Disposal", icon: "♻️", cost: 350000, energyCost: 30,
      pollution: { noise: 200, ground: 1000, air: 900 }, // metres
      desc: "Processes city waste. Generates noise (0.2km), ground (1km), and air (0.9km) pollution.",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="6" y="10" width="20" height="16" rx="2" fill="#3f3f46" stroke="#71717a" strokeWidth="1.5"/><rect x="8" y="6" width="16" height="4" rx="1" fill="#52525b" stroke="#71717a" strokeWidth="1"/><path d="M14 6V4h4v2" stroke="#a1a1aa" strokeWidth="1"/><rect x="10" y="14" width="3" height="4" rx="0.5" fill="#4ade80" opacity="0.5"/><rect x="15" y="14" width="3" height="4" rx="0.5" fill="#facc15" opacity="0.5"/><rect x="20" y="14" width="3" height="4" rx="0.5" fill="#f87171" opacity="0.5"/><path d="M10 22h12" stroke="#71717a" strokeWidth="1"/><circle cx="13" cy="28" r="2" fill="#52525b"/><circle cx="19" cy="28" r="2" fill="#52525b"/></svg> },
  };

  // Pollution sources: all things that generate pollution
  const POLLUTION_SOURCES = {
    // Pipes generate noise pollution along their length
    water_pipe: { noise: 300 }, // 0.3km
    sewage_pipe: { noise: 300 }, // 0.3km
    // Garbage disposal generates all three types
    garbage: { noise: 200, ground: 1000, air: 900 },
  };

  // Calculate pollution zones from all sources
  const pollutionZones = useMemo(() => {
    const zones = { noise: [], ground: [], air: [] };

    // From placed pipes
    placedPipes.forEach(p => {
      const src = p.type === "water" ? POLLUTION_SOURCES.water_pipe : POLLUTION_SOURCES.sewage_pipe;
      if (src.noise) {
        // Pollution along pipe endpoints
        zones.noise.push({ x: p.x1, y: p.y1, radiusM: src.noise, source: `${p.type} pipe` });
        zones.noise.push({ x: p.x2, y: p.y2, radiusM: src.noise, source: `${p.type} pipe` });
      }
    });

    // From placed utility buildings
    Object.entries(placed).forEach(([k, b]) => {
      const src = POLLUTION_SOURCES[b.type];
      if (!src) return;
      const [gx, gy] = k.split(",").map(Number);
      if (src.noise) zones.noise.push({ x: gx, y: gy, radiusM: src.noise, source: UTILITY_BUILDINGS[b.type]?.name || b.type });
      if (src.ground) zones.ground.push({ x: gx, y: gy, radiusM: src.ground, source: UTILITY_BUILDINGS[b.type]?.name || b.type });
      if (src.air) zones.air.push({ x: gx, y: gy, radiusM: src.air, source: UTILITY_BUILDINGS[b.type]?.name || b.type });
    });

    return zones;
  }, [placed, placedPipes]);

  // Count pollution sources for task tracking
  const garbageCount = useMemo(() => Object.values(placed).filter(b => b.type === "garbage").length, [placed]);

  // Check if a cell is in any pollution zone
  const getCellPollution = useCallback((cx, cy) => {
    const result = { noise: false, ground: false, air: false, sources: [] };
    pollutionZones.noise.forEach(z => {
      if (distanceInMeters(cx, cy, z.x, z.y) <= z.radiusM) { result.noise = true; result.sources.push(`🔊 Noise: ${z.source} (${z.radiusM}m)`); }
    });
    pollutionZones.ground.forEach(z => {
      if (distanceInMeters(cx, cy, z.x, z.y) <= z.radiusM) { result.ground = true; result.sources.push(`🟤 Ground: ${z.source} (${z.radiusM}m)`); }
    });
    pollutionZones.air.forEach(z => {
      if (distanceInMeters(cx, cy, z.x, z.y) <= z.radiusM) { result.air = true; result.sources.push(`💨 Air: ${z.source} (${z.radiusM}m)`); }
    });
    return result;
  }, [pollutionZones]);

  // ═══ SAVE GAME ═══
  const [lastSaved, setLastSaved] = useState(null);
  const [saveFlash, setSaveFlash] = useState(false);

  const saveGame = () => {
    try {
      const saveData = {
        // Config
        climate, terrain, government, civics, cityName, calcMode, mathDifficulty,
        startMoney: config?.startMoney,
        // Game state
        coins, happiness, speed, taskId, taskComplete, research,
        placed: Object.fromEntries(Object.entries(placed).map(([k, v]) => [k, { type: v.type }])),
        zones,
        placedPipes: placedPipes.map(p => ({ type: p.type, x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, lengthM: p.lengthM, radiusCm: p.radiusCm, rMeters: p.rMeters, volumeM3: p.volumeM3, flowRate: p.flowRate, timeSeconds: p.timeSeconds, cost: p.cost })),
        placedRoads: placedRoads.map(r => ({ x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, gradient: r.gradient, yIntercept: r.yIntercept, equation: r.equation })),
        placedCurvedRoads: placedCurvedRoads.map(cr => ({ x1: cr.x1, y1: cr.y1, x2: cr.x2, y2: cr.y2, mc1: cr.mc1, mc2: cr.mc2, A: cr.A, B: cr.B })),
        // Progress flags
        calcPassed, demoCalcPassed, pollCalcPassed, roadCalcDone, jobResultLocked,
        pipeCalcDone: [...pipeCalcDone],
        unlockedTechs: [...unlockedTechs],
        activeResearch, researchProgress, totalResearched,
        easyRoadPhase,
        // Job result
        jobResult,
        // Timestamps
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem("supercity_save", JSON.stringify(saveData));
      setLastSaved(new Date());
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
      addNotification("💾 Game saved!");
    } catch (e) {
      addNotification("❌ Save failed: " + e.message);
    }
  };

  // Load saved state on mount
  useEffect(() => {
    if (config?._loaded) {
      // Restore from save data
      const s = config;
      if (s.coins != null) setCoins(s.coins);
      if (s.research != null) setResearch(s.research);
      if (s.happiness != null) setHappiness(s.happiness);
      if (s.taskId != null) setTaskId(s.taskId);
      if (s.taskComplete != null) setTaskComplete(s.taskComplete);
      if (s.placed) setPlaced(s.placed);
      if (s.zones) setZones(s.zones);
      if (s.placedPipes) setPlacedPipes(s.placedPipes);
      if (s.placedRoads) setPlacedRoads(s.placedRoads);
      if (s.placedCurvedRoads) setPlacedCurvedRoads(s.placedCurvedRoads);
      if (s.calcPassed) setCalcPassed(true);
      if (s.demoCalcPassed) setDemoCalcPassed(true);
      if (s.pollCalcPassed) setPollCalcPassed(true);
      if (s.roadCalcDone) setRoadCalcDone(true);
      if (s.pipeCalcDone) setPipeCalcDone(new Set(s.pipeCalcDone));
      if (s.unlockedTechs) setUnlockedTechs(new Set(s.unlockedTechs));
      if (s.activeResearch) setActiveResearch(s.activeResearch);
      if (s.researchProgress) setResearchProgress(s.researchProgress);
      if (s.totalResearched) setTotalResearched(s.totalResearched);
      if (s.easyRoadPhase) setEasyRoadPhase(s.easyRoadPhase);
      if (s.jobResultLocked) setJobResultLocked(true);
      if (s.jobResult) setJobResult(s.jobResult);
      setShowTaskPopup(false); // Don't show popup on load
    }
  }, []); // eslint-disable-line

  // ═══ TECH TREE ═══
  const TECH_TREE = {
    // ── SHARED FOUNDATIONS ──
    basic_engineering: { id: "basic_engineering", name: "Basic Engineering", branch: "engineering", cost: 30, icon: "🔧", desc: "Construction fundamentals, structural loads", requires: [], unlocks: ["Wind","Hydro","Nuclear"] },
    basic_electrics: { id: "basic_electrics", name: "Basic Electrics", branch: "electrical", cost: 30, icon: "🔌", desc: "Circuits, AC/DC, wiring", requires: [], unlocks: ["Wind","Solar"] },
    basic_mining: { id: "basic_mining", name: "Basic Mining", branch: "mining", cost: 30, icon: "⛏️", desc: "Extract common ores and stone", requires: [], unlocks: ["Oil","Geothermal","Nuclear"] },
    basic_physics: { id: "basic_physics", name: "Basic Physics", branch: "physics", cost: 30, icon: "📐", desc: "Mechanics, thermodynamics, waves", requires: [], unlocks: ["Solar","Geothermal","Nuclear"] },
    basic_metallurgy: { id: "basic_metallurgy", name: "Basic Metallurgy", branch: "materials", cost: 30, icon: "🔩", desc: "Smelt and shape common metals", requires: [], unlocks: ["Solar","Nuclear"] },
    basic_chemistry: { id: "basic_chemistry", name: "Basic Chemistry", branch: "chemistry", cost: 30, icon: "🧪", desc: "Chemical reactions, hydrocarbons", requires: [], unlocks: ["Oil"] },

    // ── WIND TURBINE (5 techs) ──
    gear_systems: { id: "gear_systems", name: "Gear Systems", branch: "engineering", cost: 60, icon: "⚙️", desc: "Gearbox converts slow blade rotation to fast generator spin", requires: ["basic_engineering"], unlocks: ["Wind"] },
    generator_coils: { id: "generator_coils", name: "Generator Coils", branch: "electrical", cost: 60, icon: "🧲", desc: "Electromagnetic induction — spinning magnets produce current", requires: ["basic_electrics"], unlocks: ["Wind"] },
    blade_design: { id: "blade_design", name: "Blade Design", branch: "aerodynamics", cost: 50, icon: "🌀", desc: "Aerofoil shape to maximise lift, lightweight composites", requires: [], unlocks: ["Wind"] },

    // ── OIL POWER PLANT (7 techs) ──
    geological_survey: { id: "geological_survey", name: "Geological Survey", branch: "mining", cost: 80, icon: "🗺️", desc: "Locate underground deposits — oil, minerals, uranium", requires: ["basic_mining"], unlocks: ["Oil","Geothermal","Nuclear"] },
    oil_drilling: { id: "oil_drilling", name: "Oil Drilling", branch: "mining", cost: 120, icon: "🛢️", desc: "Drill wells, pump crude oil to surface", requires: ["geological_survey"], unlocks: ["Oil"] },
    oil_refining: { id: "oil_refining", name: "Oil Refining", branch: "chemistry", cost: 150, icon: "🏭", desc: "Fractional distillation — separate crude into fuel grades", requires: ["basic_chemistry"], unlocks: ["Oil"] },
    combustion_engines: { id: "combustion_engines", name: "Combustion Engines", branch: "engineering", cost: 100, icon: "🔥", desc: "Burn fuel to create high-pressure steam", requires: ["basic_engineering"], unlocks: ["Oil"] },
    steam_turbines: { id: "steam_turbines", name: "Steam Turbines", branch: "engineering", cost: 150, icon: "💨", desc: "Convert steam pressure to rotational energy for generators", requires: ["combustion_engines"], unlocks: ["Oil","Nuclear"] },

    // ── SOLAR POWER PLANT (7 techs) ──
    photovoltaic_theory: { id: "photovoltaic_theory", name: "Photovoltaic Theory", branch: "physics", cost: 100, icon: "☀️", desc: "Photons knock electrons free in semiconductor junctions", requires: ["basic_physics"], unlocks: ["Solar"] },
    silicon_processing: { id: "silicon_processing", name: "Silicon Processing", branch: "materials", cost: 120, icon: "💎", desc: "Purify silicon crystals for semiconductor wafers", requires: ["basic_metallurgy"], unlocks: ["Solar"] },
    solar_cell_fab: { id: "solar_cell_fab", name: "Solar Cell Fabrication", branch: "materials", cost: 180, icon: "🔲", desc: "Layer p-type and n-type silicon to create photovoltaic cells", requires: ["silicon_processing"], unlocks: ["Solar"] },
    inverter_tech: { id: "inverter_tech", name: "Inverter Technology", branch: "electrical", cost: 100, icon: "🔄", desc: "Convert DC from panels to AC for the city grid", requires: ["basic_electrics"], unlocks: ["Solar"] },

    // ── HYDRO POWER PLANT (7 techs) ──
    concrete_engineering: { id: "concrete_engineering", name: "Concrete Engineering", branch: "engineering", cost: 100, icon: "🧱", desc: "Mass concrete for dam walls — hundreds of metres thick", requires: ["basic_engineering"], unlocks: ["Hydro","Nuclear"] },
    dam_construction: { id: "dam_construction", name: "Dam Construction", branch: "engineering", cost: 200, icon: "🌊", desc: "Arch or gravity dam across river to create reservoir", requires: ["concrete_engineering"], unlocks: ["Hydro"] },
    fluid_mechanics: { id: "fluid_mechanics", name: "Fluid Mechanics", branch: "physics", cost: 80, icon: "💧", desc: "Water pressure, flow rates, pipe dynamics", requires: [], unlocks: ["Hydro"] },
    penstock_design: { id: "penstock_design", name: "Penstock Design", branch: "engineering", cost: 150, icon: "🔧", desc: "Large pipe channelling water from reservoir to turbine", requires: ["fluid_mechanics"], unlocks: ["Hydro"] },
    water_turbines: { id: "water_turbines", name: "Water Turbines", branch: "engineering", cost: 120, icon: "⚡", desc: "Francis or Kaplan turbine — water spins blades at high RPM", requires: [], unlocks: ["Hydro"] },
    transformer_tech: { id: "transformer_tech", name: "Transformer Technology", branch: "electrical", cost: 120, icon: "🔌", desc: "Step up voltage for long-distance grid transmission", requires: ["water_turbines"], unlocks: ["Hydro"] },

    // ── GEOTHERMAL PLANT (9 techs) ──
    deep_drilling: { id: "deep_drilling", name: "Deep Drilling", branch: "mining", cost: 200, icon: "🕳️", desc: "Drill 2-5km into Earth's crust to reach hot rock", requires: ["geological_survey"], unlocks: ["Geothermal","Nuclear"] },
    heat_exchange: { id: "heat_exchange", name: "Heat Exchange Systems", branch: "thermal", cost: 120, icon: "🌡️", desc: "Transfer underground heat to working fluid without mixing", requires: ["basic_physics"], unlocks: ["Geothermal"] },
    heat_pump_tech: { id: "heat_pump_tech", name: "Heat Pump Technology", branch: "thermal", cost: 180, icon: "♨️", desc: "Cycle fluid underground — absorb heat at depth, release at surface", requires: ["heat_exchange"], unlocks: ["Geothermal"] },
    corrosion_resistance: { id: "corrosion_resistance", name: "Corrosion Resistance", branch: "materials", cost: 150, icon: "🛡️", desc: "Pipes survive acidic fluids, extreme heat, mineral deposits", requires: ["basic_metallurgy"], unlocks: ["Geothermal"] },
    binary_cycle_turbines: { id: "binary_cycle_turbines", name: "Binary Cycle Turbines", branch: "engineering", cost: 200, icon: "🔄", desc: "Low-boiling-point fluid drives turbine at lower temps", requires: ["basic_engineering"], unlocks: ["Geothermal"] },

    // ── NUCLEAR POWER PLANT (22 techs — includes shared + unique) ──
    // Mining path
    uranium_extraction: { id: "uranium_extraction", name: "Uranium Extraction", branch: "mining", cost: 300, icon: "☢️", desc: "Mine and separate raw uranium ore (U₃O₈ yellowcake)", requires: ["deep_drilling"], unlocks: ["Nuclear"] },
    uranium_enrichment: { id: "uranium_enrichment", name: "Uranium Enrichment", branch: "mining", cost: 500, icon: "🔬", desc: "Centrifuge separation to increase U-235 to 3-5%", requires: ["uranium_extraction", "nuclear_physics"], unlocks: ["Nuclear"] },
    // Materials path
    steel_production: { id: "steel_production", name: "Steel Production", branch: "materials", cost: 100, icon: "🏗️", desc: "Structural steel for reactor containment building", requires: ["basic_metallurgy"], unlocks: ["Nuclear"] },
    reinforced_concrete: { id: "reinforced_concrete", name: "Reinforced Concrete", branch: "materials", cost: 180, icon: "🧱", desc: "Ultra-thick containment walls (1m+ reinforced)", requires: ["steel_production"], unlocks: ["Nuclear"] },
    alloy_research: { id: "alloy_research", name: "Alloy Research", branch: "materials", cost: 200, icon: "⚗️", desc: "Zircaloy cladding for fuel rods — resists corrosion at extreme heat", requires: ["steel_production"], unlocks: ["Nuclear"] },
    radiation_shielding: { id: "radiation_shielding", name: "Radiation Shielding", branch: "materials", cost: 350, icon: "🛡️", desc: "Lead, boron, and concrete composites to contain gamma rays", requires: ["alloy_research", "nuclear_physics"], unlocks: ["Nuclear"] },
    // Physics path
    atomic_theory: { id: "atomic_theory", name: "Atomic Theory", branch: "physics", cost: 100, icon: "⚛️", desc: "Structure of the atom: protons, neutrons, electrons, isotopes", requires: ["basic_physics"], unlocks: ["Nuclear"] },
    nuclear_physics: { id: "nuclear_physics", name: "Nuclear Physics", branch: "physics", cost: 250, icon: "🧬", desc: "Radioactive decay, half-lives, binding energy", requires: ["atomic_theory"], unlocks: ["Nuclear"] },
    fission_theory: { id: "fission_theory", name: "Fission Theory", branch: "physics", cost: 400, icon: "💥", desc: "Splitting U-235: neutron bombardment releases energy + more neutrons", requires: ["nuclear_physics"], unlocks: ["Nuclear"] },
    chain_reaction_control: { id: "chain_reaction_control", name: "Chain Reaction Control", branch: "physics", cost: 500, icon: "🎛️", desc: "Control rods (boron/cadmium) absorb neutrons to regulate reaction rate", requires: ["fission_theory"], unlocks: ["Nuclear"] },
    // Engineering path
    pressure_vessels: { id: "pressure_vessels", name: "Pressure Vessels", branch: "engineering", cost: 200, icon: "🫙", desc: "Sealed steel vessel containing reactor core at 150+ atmospheres", requires: ["basic_engineering", "steel_production"], unlocks: ["Nuclear"] },
    cooling_systems: { id: "cooling_systems", name: "Cooling Systems", branch: "engineering", cost: 250, icon: "❄️", desc: "Primary/secondary water loops to transfer heat from core", requires: ["pressure_vessels"], unlocks: ["Nuclear"] },
    reactor_core_design: { id: "reactor_core_design", name: "Reactor Core Design", branch: "engineering", cost: 600, icon: "☢️", desc: "Fuel rod arrangement, moderator, control rod placement", requires: ["steam_turbines", "fission_theory", "alloy_research"], unlocks: ["Nuclear"] },
    // Safety path
    environmental_survey: { id: "environmental_survey", name: "Environmental Survey", branch: "safety", cost: 100, icon: "🌍", desc: "Assess site geology, water table, seismic risk, population radius", requires: ["geological_survey"], unlocks: ["Nuclear"] },
    emergency_systems: { id: "emergency_systems", name: "Emergency Systems", branch: "safety", cost: 350, icon: "🚨", desc: "SCRAM shutdown, backup cooling, diesel generators", requires: ["cooling_systems", "radiation_shielding"], unlocks: ["Nuclear"] },
    containment_building: { id: "containment_building", name: "Containment Building", branch: "safety", cost: 500, icon: "🏛️", desc: "Multi-layer dome: inner steel liner + outer reinforced concrete shell", requires: ["emergency_systems", "reinforced_concrete"], unlocks: ["Nuclear"] },
  };

  const TECH_BRANCHES = {
    mining: { label: "Mining & Resources", icon: "⛏️", color: "#a16207" },
    materials: { label: "Materials Science", icon: "🧪", color: "#0F6E56" },
    physics: { label: "Physics", icon: "⚛️", color: "#534AB7" },
    engineering: { label: "Engineering", icon: "⚙️", color: "#5F5E5A" },
    electrical: { label: "Electrical", icon: "⚡", color: "#185FA5" },
    chemistry: { label: "Chemistry", icon: "🧪", color: "#993C1D" },
    aerodynamics: { label: "Aerodynamics", icon: "🌀", color: "#0F6E56" },
    thermal: { label: "Thermal Science", icon: "🌡️", color: "#D85A30" },
    safety: { label: "Safety & Containment", icon: "🛡️", color: "#A32D2D" },
  };

  const [unlockedTechs, setUnlockedTechs] = useState(new Set());
  const [showTechTree, setShowTechTree] = useState(false);

  const hasTech = useCallback((techId) => unlockedTechs.has(techId), [unlockedTechs]);
  const canUnlockTech = useCallback((techId) => {
    const tech = TECH_TREE[techId];
    if (!tech || unlockedTechs.has(techId)) return false;
    return tech.requires.every(r => unlockedTechs.has(r));
  }, [unlockedTechs]);
  const unlockTech = (techId) => {
    const tech = TECH_TREE[techId];
    if (!tech || !canUnlockTech(techId)) return;
    if (research < tech.cost) { addNotification(`Need ${tech.cost} RP — you have ${research}`); return; }
    setResearch(r => r - tech.cost);
    setUnlockedTechs(prev => new Set([...prev, techId]));
    addNotification(`🔓 Unlocked: ${tech.name} — enables: ${tech.unlocks.join(", ")}`);
  };

  // ═══ ENERGY GENERATORS ═══
  const GENERATORS = {
    wind: { id: "wind", icon: "🌬️", name: "Wind Turbine", cost: 150000, power: 80, co2: 0, radiusM: 300, reliability: "Variable — depends on wind",
      techReqs: [], techLabel: "No research needed — available from start",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="15" y="12" width="2" height="18" fill="#94a3b8"/><circle cx="16" cy="12" r="2.5" fill="#e2e8f0" stroke="#64748b" strokeWidth="1"/><path d="M16 12L10 4" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/><path d="M16 12L24 8" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/><path d="M16 12L14 22" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round"/></svg> },
    oil: { id: "oil", icon: "🛢️", name: "Oil Power Plant", cost: 400000, power: 300, co2: 85, radiusM: 500, reliability: "High — runs continuously",
      techReqs: ["oil_drilling", "oil_refining", "steam_turbines"], techLabel: "Oil Drilling + Oil Refining + Steam Turbines",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="14" width="16" height="14" rx="2" fill="#44403c" stroke="#78716c" strokeWidth="1.5"/><rect x="22" y="8" width="5" height="20" rx="1" fill="#57534e" stroke="#78716c" strokeWidth="1.5"/><path d="M24 4v4" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round"/><circle cx="24" cy="3" r="1.5" fill="#78716c"/><rect x="7" y="18" width="4" height="3" rx="0.5" fill="#fbbf24" opacity="0.6"/><rect x="13" y="18" width="4" height="3" rx="0.5" fill="#fbbf24" opacity="0.6"/></svg> },
    solar: { id: "solar", icon: "☀️", name: "Solar Power Plant", cost: 250000, power: 120, co2: 0, radiusM: 400, reliability: "Daytime only — reduced in cloudy/polar",
      techReqs: ["photovoltaic_theory", "solar_cell_fab", "inverter_tech"], techLabel: "Photovoltaic Theory + Solar Cells + Inverter",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="16" width="24" height="2" fill="#475569" rx="1"/><rect x="6" y="8" width="20" height="8" rx="1" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="1.5"/><line x1="10" y1="8" x2="10" y2="16" stroke="#3b82f6" strokeWidth="0.5"/><line x1="16" y1="8" x2="16" y2="16" stroke="#3b82f6" strokeWidth="0.5"/><line x1="22" y1="8" x2="22" y2="16" stroke="#3b82f6" strokeWidth="0.5"/><line x1="6" y1="12" x2="26" y2="12" stroke="#3b82f6" strokeWidth="0.5"/><rect x="14" y="18" width="4" height="10" fill="#475569" rx="0.5"/></svg> },
    hydro: { id: "hydro", icon: "🌊", name: "Hydro Power Plant", cost: 500000, power: 400, co2: 0, radiusM: 600, reliability: "Steady — requires river or coast",
      techReqs: ["dam_construction", "penstock_design", "transformer_tech"], techLabel: "Dam + Penstock + Transformer",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="10" width="24" height="16" rx="2" fill="#1e3a5f" stroke="#0ea5e9" strokeWidth="1.5"/><path d="M4 18c4-3 8 3 12 0s8 3 12 0" stroke="#38bdf8" strokeWidth="2" fill="none"/><path d="M4 22c4-3 8 3 12 0s8 3 12 0" stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.5"/><rect x="12" y="4" width="8" height="6" rx="1" fill="#0c4a6e" stroke="#0ea5e9" strokeWidth="1"/></svg> },
    geothermal: { id: "geothermal", icon: "🌋", name: "Geothermal Plant", cost: 600000, power: 350, co2: 5, radiusM: 500, reliability: "Very steady — location dependent",
      techReqs: ["deep_drilling", "heat_pump_tech", "corrosion_resistance", "binary_cycle_turbines"], techLabel: "Deep Drilling + Heat Pumps + Corrosion Resistance + Binary Turbines",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="6" y="14" width="20" height="14" rx="2" fill="#7c2d12" stroke="#ea580c" strokeWidth="1.5"/><path d="M12 14V8c0-2 2-4 4-4s4 2 4 4v6" stroke="#f97316" strokeWidth="2" fill="none"/><path d="M14 6c0 0 1-3 2-3s2 3 2 3" stroke="#fbbf24" strokeWidth="1.5" fill="none"/><rect x="9" y="18" width="3" height="3" rx="0.5" fill="#f97316" opacity="0.5"/><rect x="20" y="18" width="3" height="3" rx="0.5" fill="#f97316" opacity="0.5"/><path d="M10 28v2M16 28v2M22 28v2" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    nuclear: { id: "nuclear", icon: "☢️", name: "Nuclear Power Plant", cost: 1000000, power: 800, co2: 0, radiusM: 800, reliability: "Extremely high — expensive",
      techReqs: ["uranium_enrichment", "radiation_shielding", "chain_reaction_control", "reactor_core_design", "containment_building"], techLabel: "Enrichment + Shielding + Chain Reaction + Core Design + Containment",
      svg: <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="16" width="24" height="12" rx="2" fill="#1e293b" stroke="#6366f1" strokeWidth="1.5"/><path d="M10 16V6c0-1 1-2 2-2h0c1 0 2 1 2 2v10" fill="#334155" stroke="#6366f1" strokeWidth="1.5"/><path d="M18 16V6c0-1 1-2 2-2h0c1 0 2 1 2 2v10" fill="#334155" stroke="#6366f1" strokeWidth="1.5"/><circle cx="16" cy="22" r="3" fill="none" stroke="#a5b4fc" strokeWidth="1.5"/><circle cx="16" cy="22" r="1" fill="#a5b4fc"/></svg> },
  };

  // Convert radius in metres to grid tiles (Euclidean / Pythagoras)
  const radiusInTiles = (radiusM) => radiusM / METERS_PER_CELL;
  const distanceBetween = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const distanceInMeters = (x1, y1, x2, y2) => distanceBetween(x1, y1, x2, y2) * METERS_PER_CELL;

  const isGenUnlocked = useCallback((genId) => {
    const gen = GENERATORS[genId];
    if (!gen) return false;
    return gen.techReqs.every(t => unlockedTechs.has(t));
  }, [unlockedTechs]);

  // Track energy generators placed
  const energyCount = useMemo(() => {
    return Object.values(placed).filter(b => Object.keys(GENERATORS).includes(b.type)).length;
  }, [placed]);

  // City level: based on progress milestones (must be after energyCount, totalPop, garbageCount)
  const cityLevel = useMemo(() => {
    let level = 1;
    if (energyCount >= 5) level = 2;
    if (totalPop >= 200) level = 3;
    if (garbageCount >= 1) level = 4;
    if (placedRoads.length >= 3) level = 5;
    if (totalPop >= 500 && placedRoads.length >= 6) level = 6;
    if (totalPop >= 1000) level = 7;
    return level;
  }, [energyCount, totalPop, garbageCount, placedRoads]);

  // Curved roads: unlocked on hard mode OR city level 5+
  const curvedRoadsUnlocked = mathDifficulty === "hard" || cityLevel >= 5;

  // Calculate correct totals for the challenge
  const generatorTotals = useMemo(() => {
    let totalMW = 0, totalCost = 0;
    const breakdown = [];
    Object.values(placed).forEach(b => {
      const gen = GENERATORS[b.type];
      if (gen) {
        totalMW += gen.power;
        totalCost += gen.cost;
        breakdown.push({ name: gen.name, power: gen.power, cost: gen.cost });
      }
    });
    return { totalMW, totalCost, breakdown };
  }, [placed]);

  // When 5 generators placed → trigger calculation challenge (not instant completion)
  useEffect(() => {
    if (currentTask?.type === "energy" && energyCount >= currentTask.target && !taskComplete && !showCalcChallenge && !calcPassed) {
      setShowCalcChallenge(true);
      setCalcAnswerEnergy("");
      setCalcAnswerCost("");
      setCalcAnswerKW("");
      setCalcPhase(1);
      setCalcFeedback(null);
    }
  }, [energyCount, currentTask, taskComplete, showCalcChallenge, calcPassed]);

  // Task 3: Pollution - trigger challenge when garbage disposal is built
  const [showPollutionCalc, setShowPollutionCalc] = useState(false);
  const [pollCalcPassed, setPollCalcPassed] = useState(false);
  const [pollCalcPhase, setPollCalcPhase] = useState(1); // easy=1 only, medium=1→2, hard=1 only
  const [pollCalcAnswers, setPollCalcAnswers] = useState({ k: "", sick: "", hard: "" });
  const [pollCalcFeedback, setPollCalcFeedback] = useState(null);
  const [pollCalcAttempts, setPollCalcAttempts] = useState(0);
  // Easy mode: loci sketch confirmation (visual check)
  const [pollLociConfirmed, setPollLociConfirmed] = useState({ noise: false, ground: false, air: false });

  useEffect(() => {
    if (currentTask?.type === "pollution" && garbageCount >= currentTask.target && !taskComplete && !showPollutionCalc && !pollCalcPassed) {
      setShowPollutionCalc(true);
      setPollCalcAnswers({ k: "", sick: "", hard: "" });
      setPollCalcPhase(1);
      setPollCalcFeedback(null);
      setPollLociConfirmed({ noise: false, ground: false, air: false });
    }
  }, [garbageCount, currentTask, taskComplete, showPollutionCalc, pollCalcPassed]);

  // Medium mode constants
  const POLL_K = 40 / (10 * 10); // k = 40/100 = 0.4
  const POLL_SICK_21 = POLL_K * 21 * 21; // 0.4 × 441 = 176.4

  // Hard mode: F(X) = 0.5X(1-X), X in km, 0 < X < 1
  // Integrate: ∫0.5X(1-X)dX = ∫(0.5X - 0.5X²)dX = 0.25X² - X³/6
  // Evaluate at [0, 0.2]: 0.25(0.04) - (0.008)/6 = 0.01 - 0.00133 = 0.00867
  // × 100 people = 0.87
  const HARD_EVAL_POINT = 0.2; // km
  const HARD_INTEGRAL = 0.25 * Math.pow(HARD_EVAL_POINT, 2) - Math.pow(HARD_EVAL_POINT, 3) / 6; // ≈ 0.00867
  const HARD_ANSWER = Math.round(HARD_INTEGRAL * 100 * 100) / 100; // ≈ 0.87

  const checkPollutionCalc = () => {
    const applyPenalty = () => {
      const penalty = Math.floor(coins * 0.1);
      setCoins(prev => prev - penalty);
      setPollCalcAttempts(prev => prev + 1);
      return penalty;
    };

    if (mathDifficulty === "easy") {
      // Check all three loci are confirmed (visual sketch)
      if (pollLociConfirmed.noise && pollLociConfirmed.ground && pollLociConfirmed.air) {
        setPollCalcFeedback({ type: "success", msg: "✓ Correct! All pollution loci identified. Housing must be placed outside these zones." });
        setPollCalcPassed(true);
        setTaskComplete(true);
        setTimeout(() => { setShowPollutionCalc(false); setShowTaskPopup(true); addNotification(`🎉 Pollution mapped! +§${TASKS[3].reward.toLocaleString()}`); setCoins(c => c + TASKS[3].reward); }, 2000);
      } else {
        const penalty = applyPenalty();
        setPollCalcFeedback({ type: "error", msg: `❌ You haven't identified all three pollution zones. Tick all three loci. (-§${penalty.toLocaleString()})` });
      }
    } else if (mathDifficulty === "medium") {
      if (pollCalcPhase === 1) {
        // Find k: y = kx², 40 = k(10²), k = 40/100 = 0.4
        const ansK = parseFloat(pollCalcAnswers.k);
        if (!isNaN(ansK) && Math.abs(ansK - POLL_K) < 0.01) {
          setPollCalcFeedback({ type: "success", msg: `✓ Correct! k = ${POLL_K}` });
          setTimeout(() => { setPollCalcPhase(2); setPollCalcFeedback(null); }, 1500);
        } else {
          const penalty = applyPenalty();
          setPollCalcFeedback({ type: "error", msg: `❌ Incorrect. Substitute: 40 = k × 10². Solve for k. (-§${penalty.toLocaleString()})` });
        }
      } else {
        // Find sick at 21m: y = 0.4 × 21² = 0.4 × 441 = 176.4
        const ansSick = parseFloat(pollCalcAnswers.sick);
        if (!isNaN(ansSick) && Math.abs(ansSick - POLL_SICK_21) < 1) {
          setPollCalcFeedback({ type: "success", msg: `✓ Correct! y = ${POLL_K} × 21² = ${POLL_SICK_21}` });
          setPollCalcPassed(true);
          setTaskComplete(true);
          setTimeout(() => { setShowPollutionCalc(false); setShowTaskPopup(true); addNotification(`🎉 Pollution analysis complete! +§${TASKS[3].reward.toLocaleString()}`); setCoins(c => c + TASKS[3].reward); }, 2000);
        } else {
          const penalty = applyPenalty();
          setPollCalcFeedback({ type: "error", msg: `❌ Incorrect. Substitute x = 21 into y = ${POLL_K}x². (-§${penalty.toLocaleString()})` });
        }
      }
    } else {
      // Hard: integrate F(X) = 0.5X(1-X), evaluate [0, 0.2], × 100
      const ans = parseFloat(pollCalcAnswers.hard);
      if (!isNaN(ans) && Math.abs(ans - HARD_ANSWER) < 0.05) {
        setPollCalcFeedback({ type: "success", msg: `✓ Correct! ∫0.5X(1−X)dX = [0.25X² − X³/6]₀^0.2 = ${HARD_INTEGRAL.toFixed(4)} → × 100 = ${HARD_ANSWER}` });
        setPollCalcPassed(true);
        setTaskComplete(true);
        setTimeout(() => { setShowPollutionCalc(false); setShowTaskPopup(true); addNotification(`🎉 Pollution analysis complete! +§${TASKS[3].reward.toLocaleString()}`); setCoins(c => c + TASKS[3].reward); }, 2000);
      } else {
        const penalty = applyPenalty();
        setPollCalcFeedback({ type: "error", msg: `❌ Incorrect. Step 1: Expand 0.5X(1−X) = 0.5X − 0.5X². Step 2: Integrate → 0.25X² − X³/6. Step 3: Evaluate at [0, 0.2]. Step 4: × 100. (-§${penalty.toLocaleString()})` });
      }
    }
  };

  const checkCalcChallenge = () => {
    const correctEnergy = generatorTotals.totalMW;
    const correctCost = generatorTotals.totalCost;
    const correctKW = correctEnergy * 1000;

    if (calcPhase === 1) {
      let ansEnergy, ansCost, energyCorrect, costCorrect;

      if (mathDifficulty === "hard") {
        ansEnergy = parseStdForm(calcAnswerEnergy);
        ansCost = parseStdForm(calcAnswerCost);
        // Allow 5% tolerance for standard form rounding
        energyCorrect = !isNaN(ansEnergy) && Math.abs(ansEnergy - correctEnergy) / correctEnergy < 0.05;
        costCorrect = !isNaN(ansCost) && Math.abs(ansCost - correctCost) / correctCost < 0.05;
      } else {
        ansEnergy = parseInt(calcAnswerEnergy.replace(/[^0-9]/g, ""));
        ansCost = parseInt(calcAnswerCost.replace(/[^0-9]/g, ""));
        energyCorrect = ansEnergy === correctEnergy;
        costCorrect = ansCost === correctCost;
      }

      if (energyCorrect && costCorrect) {
        if (mathDifficulty === "medium") {
          setCalcFeedback({ type: "success", msg: `✓ Correct! Now convert ${correctEnergy} MW to kilowatts.` });
          setTimeout(() => { setCalcPhase(2); setCalcFeedback(null); }, 1500);
        } else {
          // Easy and Hard complete here
          setCalcPassed(true);
          setCalcFeedback({ type: "success", msg: mathDifficulty === "hard" ? `Perfect! ${toStdForm(correctEnergy)} MW, ${toStdForm(correctCost)} cost.` : `Perfect! Total energy: ${correctEnergy} MW, Total cost: §${correctCost.toLocaleString()}` });
          setTaskComplete(true);
          setTimeout(() => { setShowCalcChallenge(false); setShowTaskPopup(true); addNotification("🎉 Task complete! +500,000 coins"); setCoins(c => c + 500000); }, 2000);
        }
      } else {
        const newAttempts = calcAttempts + 1;
        setCalcAttempts(newAttempts);
        const penalty = Math.floor(coins * 0.1);
        setCoins(c => c - penalty);
        let msg = "❌ Incorrect. ";
        if (!energyCorrect && !costCorrect) msg += "Both answers are wrong.";
        else if (!energyCorrect) msg += mathDifficulty === "hard" ? "Total energy is wrong. Check your standard form." : "Total energy is wrong. Check your MW values.";
        else msg += mathDifficulty === "hard" ? "Total cost is wrong. Check your standard form." : "Total cost is wrong. Check your § prices.";
        msg += ` (-§${penalty.toLocaleString()} penalty, 10% of treasury)`;
        setCalcFeedback({ type: "error", msg });
        addNotification(`❌ Wrong answer — lost §${penalty.toLocaleString()}`);
      }
    } else if (calcPhase === 2) {
      // Medium mode: convert MW to KW
      const ansKW = parseInt(calcAnswerKW.replace(/[^0-9]/g, ""));
      if (ansKW === correctKW) {
        setCalcPassed(true);
        setCalcFeedback({ type: "success", msg: `Perfect! ${correctEnergy} MW = ${correctKW.toLocaleString()} kW` });
        setTaskComplete(true);
        setTimeout(() => { setShowCalcChallenge(false); setShowTaskPopup(true); addNotification("🎉 Task complete! +500,000 coins"); setCoins(c => c + 500000); }, 2000);
      } else {
        const penalty = Math.floor(coins * 0.1);
        setCoins(c => c - penalty);
        setCalcAttempts(a => a + 1);
        setCalcFeedback({ type: "error", msg: `❌ Incorrect. 1 MW = 1,000 kW. (-§${penalty.toLocaleString()})` });
        addNotification(`❌ Wrong answer — lost §${penalty.toLocaleString()}`);
      }
    }
  };

  // ═══ PIPE HANDLERS ═══
  const isWaterSource = (x, y) => waterSources.some(s => s.x === x && s.y === y);

  const handlePipeClick = (x, y) => {
    if (!pipeMode) return;
    const cell = cells[y]?.[x];
    if (!cell || cell.type === "water") return;

    if (!pipeDragStart) {
      // Must start from a water source
      if (!isWaterSource(x, y)) {
        addNotification("🚰 Pipes must start from a water source (cells next to water)");
        return;
      }
      setPipeDragStart({ x, y });
      addNotification(`Pipe start: (${x}, ${y}) — click destination to complete`);
    } else {
      // Finish pipe
      if (x === pipeDragStart.x && y === pipeDragStart.y) {
        setPipeDragStart(null);
        setPipeDragEnd(null);
        return;
      }
      const spec = PIPE_SPECS[pipeMode];
      const hMeters = distanceInMeters(pipeDragStart.x, pipeDragStart.y, x, y);
      const pipeCost = Math.round(hMeters * spec.costPerM);

      if (coins < pipeCost) {
        addNotification(`Not enough funds! Pipe costs §${pipeCost.toLocaleString()} (${Math.round(hMeters)}m × §${spec.costPerM}/m)`);
        return;
      }

      // Check if this pipe type has already been calculated once
      if (pipeCalcDone.has(pipeMode)) {
        // Auto-place without calculation
        setPlacedPipes(prev => [...prev, {
          type: pipeMode, x1: pipeDragStart.x, y1: pipeDragStart.y, x2: x, y2: y,
          lengthM: hMeters, radiusCm: spec.radiusCm, rMeters, volumeM3: volume, flowRate, timeSeconds: spec.timeSeconds, cost: pipeCost,
        }]);
        setCoins(c => c - pipeCost);
        setPipeDragStart(null);
        setPipeDragEnd(null);
        addNotification(`✓ ${spec.label}: ${Math.round(hMeters)}m, Q = ${flowRate.toFixed(4)} m³/s (-§${pipeCost.toLocaleString()})`);
        return;
      }

      // First time — set up the calculation challenge
      const rMeters = spec.radiusCm / 100; // convert cm to m
      const volume = Math.PI * rMeters * rMeters * hMeters; // πr²h in m³
      const flowRate = volume / spec.timeSeconds; // m³/s

      setPendingPipe({
        type: pipeMode,
        x1: pipeDragStart.x, y1: pipeDragStart.y,
        x2: x, y2: y,
        lengthM: hMeters,
        radiusCm: spec.radiusCm,
        rMeters,
        volumeM3: volume,
        flowRate,
        timeSeconds: spec.timeSeconds,
        cost: pipeCost,
      });
      setShowPipeCalc(true);
      setPipeCalcStep(mathDifficulty === "hard" ? 4 : 1); // Hard mode skips to related rates question
      setPipeCalcAnswer({ h: "", v: "", q: "", dhdt: "" });
      setPipeCalcFeedback(null);
      setPipeAttempts(0);
      setPipeDragStart(null);
      setPipeDragEnd(null);
    }
  };

  const checkPipeCalc = () => {
    if (!pendingPipe) return;
    const step = pipeCalcStep;
    const spec = PIPE_SPECS[pendingPipe.type];

    if (step === 1) {
      // Check distance h
      const ans = parseFloat(pipeCalcAnswer.h);
      const correct = pendingPipe.lengthM;
      // Allow 1m tolerance for rounding
      if (!isNaN(ans) && Math.abs(ans - correct) <= 1) {
        setPipeCalcFeedback({ type: "success", msg: `✓ Correct! h = ${correct.toFixed(1)}m` });
        setTimeout(() => { setPipeCalcStep(2); setPipeCalcFeedback(null); }, 1200);
      } else {
        const penalty = Math.floor(coins * 0.1);
        setCoins(c => c - penalty);
        setPipeAttempts(a => a + 1);
        setPipeCalcFeedback({ type: "error", msg: `❌ Incorrect. Use d = √((x₂−x₁)² + (y₂−y₁)²) × ${METERS_PER_CELL}m. (-§${penalty.toLocaleString()})` });
      }
    } else if (step === 2) {
      // Check volume V = πr²h
      const ans = parseFloat(pipeCalcAnswer.v);
      const correct = pendingPipe.volumeM3;
      // Allow 5% tolerance
      if (!isNaN(ans) && Math.abs(ans - correct) / correct <= 0.05) {
        setPipeCalcFeedback({ type: "success", msg: `✓ Correct! V = ${correct.toFixed(2)} m³` });
        setTimeout(() => { setPipeCalcStep(3); setPipeCalcFeedback(null); }, 1200);
      } else {
        const penalty = Math.floor(coins * 0.1);
        setCoins(c => c - penalty);
        setPipeAttempts(a => a + 1);
        setPipeCalcFeedback({ type: "error", msg: `❌ Incorrect. V = π × r² × h. Remember r = ${pendingPipe.radiusCm}cm = ${pendingPipe.rMeters}m. (-§${penalty.toLocaleString()})` });
      }
    } else if (step === 3) {
      // Check flow rate Q = V/T
      const ans = parseFloat(pipeCalcAnswer.q);
      const correct = pendingPipe.flowRate;
      if (!isNaN(ans) && Math.abs(ans - correct) / correct <= 0.05) {
        setPipeCalcFeedback({ type: "success", msg: `✓ Correct! Q = ${correct.toFixed(4)} m³/s` });
        // Place the pipe
        setTimeout(() => {
          setPlacedPipes(prev => [...prev, pendingPipe]);
          setCoins(c => c - pendingPipe.cost);
          setPipeCalcDone(prev => new Set([...prev, pendingPipe.type]));
          setShowPipeCalc(false);
          setPendingPipe(null);
          addNotification(`✓ ${spec.label} laid: ${Math.round(pendingPipe.lengthM)}m, Q = ${pendingPipe.flowRate.toFixed(4)} m³/s (-§${pendingPipe.cost.toLocaleString()})`);
        }, 1500);
      } else {
        const penalty = Math.floor(coins * 0.1);
        setCoins(c => c - penalty);
        setPipeAttempts(a => a + 1);
        setPipeCalcFeedback({ type: "error", msg: `❌ Incorrect. Q = V ÷ T. T = ${pendingPipe.timeSeconds} seconds. (-§${penalty.toLocaleString()})` });
      }
    } else if (step === 4) {
      // Hard mode: Related rates — dh/dt = dV/dt ÷ (πr²)
      // dV/dt = 600 cm³/s, r = 50 cm
      // dh/dt = 600 / (π × 2500) = 6/(25π) ≈ 0.0764 cm/s
      const correctDhdt = 600 / (Math.PI * 50 * 50); // ≈ 0.0764
      const ans = parseFloat(pipeCalcAnswer.dhdt);
      if (!isNaN(ans) && Math.abs(ans - correctDhdt) / correctDhdt <= 0.05) {
        setPipeCalcFeedback({ type: "success", msg: `✓ Correct! dh/dt = 600 ÷ (π × 50²) = 600 ÷ ${(Math.PI * 2500).toFixed(1)} = ${correctDhdt.toFixed(4)} cm/s` });
        setTimeout(() => {
          setPlacedPipes(prev => [...prev, pendingPipe]);
          setCoins(c => c - pendingPipe.cost);
          setPipeCalcDone(prev => new Set([...prev, pendingPipe.type]));
          setShowPipeCalc(false);
          setPendingPipe(null);
          addNotification(`✓ ${spec.label} laid: ${Math.round(pendingPipe.lengthM)}m (-§${pendingPipe.cost.toLocaleString()})`);
        }, 1500);
      } else {
        const penalty = Math.floor(coins * 0.1);
        setCoins(c => c - penalty);
        setPipeAttempts(a => a + 1);
        setPipeCalcFeedback({ type: "error", msg: `❌ Incorrect. V = πr²h → dV/dt = πr² × dh/dt → dh/dt = dV/dt ÷ (πr²). (-§${penalty.toLocaleString()})` });
      }
    }
  };

  const containerRef = useRef(null);

  // ═══ DERIVED ═══
  const popCount = useMemo(() => totalPop, [totalPop]);

  const powerCap = useMemo(() => {
    let total = 0;
    Object.values(placed).forEach(b => {
      if (b.type === "power") total += 500;
      if (GENERATORS[b.type]) total += GENERATORS[b.type].power;
    });
    return total;
  }, [placed]);
  const energyConsumption = useMemo(() => {
    let total = 0;
    Object.values(placed).forEach(b => {
      if (HOUSING_TYPES[b.type]) total += HOUSING_TYPES[b.type].energyCost;
      if (UTILITY_BUILDINGS[b.type]) total += UTILITY_BUILDINGS[b.type].energyCost;
      if (EDUCATION_BUILDINGS[b.type]) total += EDUCATION_BUILDINGS[b.type].energyCost;
    });
    return total;
  }, [placed]);
  const energyBalance = powerCap - energyConsumption;

  // Check if a cell is within radius of any placed generator (Euclidean, in metres)
  const isCellPowered = useCallback((cx, cy) => {
    return Object.entries(placed).some(([k, b]) => {
      if (!GENERATORS[b.type]) return false;
      const [gx, gy] = k.split(",").map(Number);
      return distanceInMeters(cx, cy, gx, gy) <= GENERATORS[b.type].radiusM;
    });
  }, [placed]);

  const waterCap = useMemo(() => {
    let total = Object.values(placed).filter(b => b.type === "water").length * 300;
    placedPipes.filter(p => p.type === "water").forEach(p => { total += Math.round(p.flowRate * 1000); });
    return total;
  }, [placed, placedPipes]);
  const roadCount = useMemo(() => Object.values(placed).filter(b => b.type === "road").length, [placed]);
  const researchPts = useMemo(() => {
    let r = 0;
    Object.values(placed).forEach(b => {
      if (b.type === "school") r += 15;
      if (b.type === "hospital") r += 5;
    });
    if (government === "education") r = Math.floor(r * 1.25);
    if (government === "technological") r = Math.floor(r * 1.15);
    return r;
  }, [placed, government]);
  const materialsProd = useMemo(() => {
    let m = 0;
    Object.values(placed).forEach(b => {
      if (b.type === "factory") m += 40;
    });
    if (civics === "merchant") m = Math.floor(m * 1.2);
    return m;
  }, [placed, civics]);

  useEffect(() => { setPopulation(popCount); }, [popCount]);
  useEffect(() => { setPower(powerCap); }, [powerCap]);
  useEffect(() => { setWaterSupply(waterCap); }, [waterCap]);
  useEffect(() => { setResearch(researchPts); }, [researchPts]);
  useEffect(() => { setMaterials(prev => 500 + materialsProd); }, [materialsProd]);

  // ═══ TERRAIN GENERATION ═══
  function generateTerrain(clim, terr) {
    const grid = [];
    const waterPct = TERRAIN_FEATURES[terr]?.waterPct || 0.1;
    for (let y = 0; y < GRID_H; y++) {
      const row = [];
      for (let x = 0; x < GRID_W; x++) {
        let type = "land";
        // Water generation based on terrain type
        if (terr === "island") {
          const cx = GRID_W / 2, cy = GRID_H / 2;
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          const maxR = Math.min(GRID_W, GRID_H) * 0.42;
          const noise = Math.sin(x * 0.5) * 1.5 + Math.cos(y * 0.7) * 1.2;
          if (dist + noise > maxR) type = "water";
        } else if (terr === "coastal") {
          const noise = Math.sin(x * 0.3 + y * 0.1) * 3 + Math.cos(x * 0.1) * 2;
          if (x + noise > GRID_W * 0.72) type = "water";
        } else if (terr === "town") {
          // Small river through town
          const riverX = GRID_W * 0.5 + Math.sin(y * 0.4) * 3;
          if (Math.abs(x - riverX) < 1.2) type = "water";
        } else {
          // Random water features
          const noise = Math.sin(x * 0.8 + y * 0.3) * Math.cos(y * 0.5 - x * 0.2);
          if (noise > (1 - waterPct * 3)) type = "water";
        }
        // Trees
        let hasTree = false;
        if (type === "land") {
          const treeChance = clim === "tropical" ? 0.3 : clim === "temperate" ? 0.15 : clim === "continental" ? 0.1 : clim === "polar" ? 0.03 : 0.05;
          const noise = Math.sin(x * 1.3 + y * 0.7) * Math.cos(y * 1.1 - x * 0.4);
          if (noise > (1 - treeChance * 4)) hasTree = true;
        }
        // Elevation hint
        const elevation = Math.sin(x * 0.15) * Math.cos(y * 0.12) * 0.5 + 0.5;
        row.push({ type, hasTree, elevation, x, y });
      }
      grid.push(row);
    }
    return grid;
  }

  // ═══ CELL SIZE ═══
  const CELL_SIZE = 24 * camera.zoom;

  // ═══ HANDLERS ═══
  const handleCellClick = (x, y) => {
    const cell = cells[y]?.[x];
    if (!cell || cell.type === "water") return;
    const key = `${x},${y}`;

    if (tool === "demolish") {
      if (placed[key]) {
        const b = BUILDINGS[placed[key].type];
        setPlaced(prev => { const n = { ...prev }; delete n[key]; return n; });
        setCoins(c => c + Math.floor((b?.cost || 0) * 0.3));
        addNotification(`Demolished ${b?.name || "building"} (+${Math.floor((b?.cost || 0) * 0.3)} coins)`);
      }
      return;
    }

    if (tool === "road") {
      if (placed[key]?.type === "road") return;
      if (coins < BUILDINGS.road.cost) { addNotification("Not enough coins!"); return; }
      setPlaced(prev => ({ ...prev, [key]: { type: "road" } }));
      setCoins(c => c - BUILDINGS.road.cost);
      return;
    }

    if (tool === "zone" && selectedZone) {
      setZones(prev => {
        const n = { ...prev };
        if (n[key] === selectedZone) { delete n[key]; } else { n[key] = selectedZone; }
        return n;
      });
      return;
    }

    if (tool === "build" && selectedBuilding) {
      if (placed[key]) { addNotification("Space occupied!"); return; }
      const b = BUILDINGS[selectedBuilding];
      if (!b) return;
      if (coins < b.cost) { addNotification("Not enough coins!"); return; }
      setPlaced(prev => ({ ...prev, [key]: { type: selectedBuilding } }));
      setCoins(c => c - b.cost);
      addNotification(`Built ${b.name} (-${b.cost} coins)`);
      return;
    }

    if (tool === "select" || tool === "info") {
      setSelectedCell(selectedCell?.x === x && selectedCell?.y === y ? null : { x, y });
    }

    // Generator placement from bottom energy menu
    if (selectedGenerator) {
      if (placed[key]) { addNotification("Space occupied!"); return; }
      const gen = GENERATORS[selectedGenerator];
      if (!gen) return;
      if (!isGenUnlocked(selectedGenerator)) { addNotification("🔒 Research required: " + gen.techLabel); return; }
      if (coins < gen.cost) { addNotification("Not enough funds! Need §" + gen.cost.toLocaleString()); return; }
      setPlaced(prev => ({ ...prev, [key]: { type: selectedGenerator } }));
      setCoins(c => c - gen.cost);
      addNotification(`Built ${gen.name} (-§${gen.cost.toLocaleString()}) +${gen.power} MW · Radius: ${gen.radiusM}m`);
    }

    // Pipe placement from bottom utilities menu
    if (pipeMode) {
      handlePipeClick(x, y);
    }

    // Housing placement from bottom housing menu
    if (selectedHousing) {
      if (placed[key]) { addNotification("Space occupied!"); return; }
      const h = HOUSING_TYPES[selectedHousing];
      if (!h) return;
      // Must be within a generator's energy radius (loci check)
      if (!isCellPowered(x, y)) {
        addNotification("⚡ No power! Housing must be within an energy generator's radius. Check your loci calculations.");
        return;
      }
      // Check energy balance
      if (energyBalance < h.energyCost) {
        addNotification(`⚡ Not enough energy! Need ${h.energyCost} kW but only ${energyBalance} kW available. Build more generators.`);
        return;
      }
      setPlaced(prev => ({ ...prev, [key]: { type: selectedHousing } }));
      addNotification(`Built ${h.name} (+${h.population} pop, -${h.energyCost} kW/turn) — FREE`);
    }

    // Utility building placement (garbage disposal etc.)
    if (selectedUtility) {
      if (placed[key]) { addNotification("Space occupied!"); return; }
      const ub = UTILITY_BUILDINGS[selectedUtility];
      if (!ub) return;
      if (coins < ub.cost) { addNotification(`Not enough funds! Need §${ub.cost.toLocaleString()}`); return; }
      if (energyBalance < ub.energyCost) { addNotification(`⚡ Not enough energy! Need ${ub.energyCost} kW.`); return; }
      setPlaced(prev => ({ ...prev, [key]: { type: selectedUtility } }));
      setCoins(c => c - ub.cost);
      const pollTypes = [];
      if (ub.pollution.noise) pollTypes.push(`noise ${ub.pollution.noise}m`);
      if (ub.pollution.ground) pollTypes.push(`ground ${ub.pollution.ground}m`);
      if (ub.pollution.air) pollTypes.push(`air ${ub.pollution.air}m`);
      addNotification(`Built ${ub.name} (-§${ub.cost.toLocaleString()}) ⚠ Pollution: ${pollTypes.join(", ")}`);
    }

    // Education building placement
    if (selectedEducation) {
      if (placed[key]) { addNotification("Space occupied!"); return; }
      const eb = EDUCATION_BUILDINGS[selectedEducation];
      if (!eb) return;
      if (eb.cost > 0 && coins < eb.cost) { addNotification(`Not enough funds! Need §${eb.cost.toLocaleString()}`); return; }
      if (energyBalance < eb.energyCost) { addNotification(`⚡ Not enough energy! Need ${eb.energyCost} kW.`); return; }
      if (!isCellPowered(x, y)) { addNotification("⚡ Must be within an energy generator's radius!"); return; }
      setPlaced(prev => ({ ...prev, [key]: { type: selectedEducation } }));
      if (eb.cost > 0) setCoins(c => c - eb.cost);
      addNotification(`Built ${eb.name}${eb.cost > 0 ? ` (-§${eb.cost.toLocaleString()})` : " — FREE"} · ⚡${eb.energyCost} kW`);
    }

    // Road placement
    if (roadMode && !showRoadCalc) {
      if (mathDifficulty === "easy") {
        // Easy: place road cells along specific lines
        if (easyRoadPhase === 1) {
          // Drawing y = 5
          if (y === 5) {
            const key2 = `road_${x},${y}`;
            setPlaced(prev => ({ ...prev, [key]: { type: "road" } }));
            addNotification(`Road placed at (${x}, ${y}) ✓ on y = 5`);
            // Check if enough cells placed along y=5
            const roadCellsOnY5 = Object.entries({ ...placed, [key]: { type: "road" } }).filter(([k, v]) => {
              if (v.type !== "road") return false;
              const [rx, ry] = k.split(",").map(Number);
              return ry === 5;
            }).length;
            if (roadCellsOnY5 >= 5) {
              setEasyRoadAnswer(p => ({ ...p, y5done: true }));
              setEasyRoadPhase(2);
              addNotification("✓ Line y = 5 complete! Now draw x = -2");
            }
          } else {
            addNotification(`❌ This cell is at y = ${y}, not y = 5. Place roads where y = 5.`);
          }
        } else if (easyRoadPhase === 2) {
          // Drawing x = -2 — but grid starts at 0, so we use a mapped coordinate
          // Since grid is 0-indexed, x=-2 doesn't exist. Let's use x=2 and display as x=-2 in game coords
          // Actually let's use the game coordinate system where grid center is origin
          // For simplicity, let's say the grid coords shown are (x, y) and we want x = 2
          // But the question says x=-2. Let's offset: game_x = grid_x - 20 (center of 40-wide grid)
          // So x=-2 in game coords = grid_x = 18
          const gameX = x - Math.floor(GRID_W / 2); // center-referenced
          if (gameX === -2) {
            setPlaced(prev => ({ ...prev, [key]: { type: "road" } }));
            addNotification(`Road placed at game coord (${gameX}, ${y}) ✓ on x = -2`);
            const targetGridX = Math.floor(GRID_W / 2) - 2; // = 18
            const roadCellsOnXn2 = Object.entries({ ...placed, [key]: { type: "road" } }).filter(([k, v]) => {
              if (v.type !== "road") return false;
              const [rx] = k.split(",").map(Number);
              return rx === targetGridX;
            }).length;
            if (roadCellsOnXn2 >= 5) {
              setEasyRoadAnswer(p => ({ ...p, xn2done: true }));
              setEasyRoadPhase(3);
              setRoadCalcDone(true);
              addNotification("✓ Line x = -2 complete! Roads unlocked!");
            }
          } else {
            addNotification(`❌ This cell is at x = ${gameX} (game coords), not x = -2. Place roads where x = -2.`);
          }
        }
      } else {
        // Medium/Hard: click two points to draw a road
        if (awaitingPerp) {
          // Placing perpendicular road
          if (!perpRoadStart) {
            setPerpRoadStart({ x, y });
            addNotification(`Perpendicular road start: (${x}, ${y}) — click end point`);
          } else {
            const pr = { x1: perpRoadStart.x, y1: perpRoadStart.y, x2: x, y2: y };
            // Check gradient is perpendicular
            const dx = pr.x2 - pr.x1;
            const dy = pr.y2 - pr.y1;
            if (dx === 0 && awaitingPerp.perpGradient === "vertical") {
              // Original was horizontal, perp is vertical — correct
              setPlacedRoads(prev => [...prev, { ...pr, gradient: "undefined", equation: `x = ${pr.x1}` }]);
              setAwaitingPerp(null);
              setPerpRoadStart(null);
              addNotification("✓ Perpendicular road placed!");
            } else if (dx !== 0) {
              const perpM = dy / dx;
              if (Math.abs(perpM - awaitingPerp.perpGradient) < 0.3) {
                const c = pr.y1 - perpM * pr.x1;
                setPlacedRoads(prev => [...prev, { ...pr, gradient: perpM, equation: `y = ${perpM.toFixed(1)}x + ${c.toFixed(1)}` }]);
                setAwaitingPerp(null);
                setPerpRoadStart(null);
                addNotification("✓ Perpendicular road placed!");
              } else {
                addNotification(`❌ Gradient ${(dy/dx).toFixed(2)} is not perpendicular. Need gradient ≈ ${awaitingPerp.perpGradient === "vertical" ? "undefined" : awaitingPerp.perpGradient.toFixed(2)}`);
                setPerpRoadStart(null);
              }
            }
          } 
        } else if (!roadStart) {
          setRoadStart({ x, y });
          addNotification(`Road start: (${x}, ${y}) — click end point`);
        } else {
          if (x === roadStart.x && y === roadStart.y) { setRoadStart(null); return; }
          const road = { x1: roadStart.x, y1: roadStart.y, x2: x, y2: y };
          const dx = road.x2 - road.x1;
          const dy = road.y2 - road.y1;
          const gradient = dx === 0 ? Infinity : dy / dx;
          const yIntercept = dx === 0 ? null : road.y1 - gradient * road.x1;
          road.gradient = gradient;
          road.yIntercept = yIntercept;
          road.equation = dx === 0 ? `x = ${road.x1}` : `y = ${gradient % 1 === 0 ? gradient : gradient.toFixed(2)}x ${yIntercept >= 0 ? "+" : "−"} ${Math.abs(yIntercept) % 1 === 0 ? Math.abs(yIntercept) : Math.abs(yIntercept).toFixed(2)}`;

          if (roadCalcDone) {
            // Already answered correctly once, auto-place
            setPlacedRoads(prev => [...prev, road]);
            setRoadStart(null);
            addNotification(`✓ Road placed: (${road.x1},${road.y1}) → (${road.x2},${road.y2})`);
          } else {
            // Show question
            setPendingRoad(road);
            const q = Math.floor(Math.random() * 4) + 1;
            setRoadQuestionType(q);
            setShowRoadCalc(true);
            setRoadCalcAnswer("");
            setRoadCalcFeedback(null);
            setRoadCalcAttempts(0);
            setRoadStart(null);
          }
        }
      }
    }

    // Curved road placement (hard mode)
    if (curvedRoadMode && !showCurvedCalc) {
      const cell = cells[y]?.[x];
      if (!cell || cell.type === "water") return;
      if (!curvedRoadStart) {
        setCurvedRoadStart({ x, y });
        addNotification(`Curve start: (${x}, ${y}) — click endpoint`);
      } else {
        if (x === curvedRoadStart.x && y === curvedRoadStart.y) { setCurvedRoadStart(null); return; }
        const mc1 = toMathCoords(curvedRoadStart.x, curvedRoadStart.y);
        const mc2 = toMathCoords(x, y);
        // Prevent x₁² = x₂² (can't solve for A)
        if (mc1.x * mc1.x === mc2.x * mc2.x) {
          addNotification("⚠ Points are symmetric — choose points with different |x| values");
          setCurvedRoadStart(null);
          return;
        }
        // Calculate A and B: y = Ax² + B
        // y₁ = Ax₁² + B, y₂ = Ax₂² + B
        // A = (y₁ - y₂) / (x₁² - x₂²)
        // B = y₁ - Ax₁²
        const A = (mc1.y - mc2.y) / (mc1.x * mc1.x - mc2.x * mc2.x);
        const B = mc1.y - A * mc1.x * mc1.x;
        const curvedRoad = {
          x1: curvedRoadStart.x, y1: curvedRoadStart.y, x2: x, y2: y,
          mc1, mc2, A, B,
        };
        setPendingCurved(curvedRoad);
        setCurvedAnswers({ a: "", b: "" });
        setCurvedCalcFeedback(null);
        setCurvedCalcAttempts(0);
        setShowCurvedCalc(true);
        setCurvedRoadStart(null);
      }
    }
  };

  // Road calculation checker (medium mode)
  const checkRoadCalc = () => {
    if (!pendingRoad) return;
    const { x1, y1, x2, y2, gradient, yIntercept } = pendingRoad;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const penalty = () => { const p = Math.floor(coins * 0.1); setCoins(c => c - p); setRoadCalcAttempts(a => a + 1); return p; };

    if (roadQuestionType === 1) {
      // Gradient: m = (y2-y1)/(x2-x1)
      const ans = parseFloat(roadCalcAnswer);
      const correct = dx === 0 ? Infinity : dy / dx;
      if (dx === 0 && (roadCalcAnswer.toLowerCase().includes("undef") || roadCalcAnswer.toLowerCase().includes("inf"))) {
        placeRoadSuccess();
      } else if (!isNaN(ans) && Math.abs(ans - correct) < 0.05) {
        placeRoadSuccess();
      } else {
        const p = penalty();
        setRoadCalcFeedback({ type: "error", msg: `❌ Incorrect. m = (y₂ − y₁) ÷ (x₂ − x₁) = (${y2} − ${y1}) ÷ (${x2} − ${x1}). (-§${p.toLocaleString()})` });
      }
    } else if (roadQuestionType === 2) {
      // Equation: y = mx + c
      const ans = roadCalcAnswer.replace(/\s/g, "").toLowerCase();
      const m = gradient;
      const c = yIntercept;
      // Accept various formats
      let correct = false;
      if (dx === 0 && ans.includes(`x=${x1}`)) correct = true;
      else if (dx !== 0) {
        const mStr = m % 1 === 0 ? String(m) : m.toFixed(2);
        const cStr = c % 1 === 0 ? String(Math.abs(c)) : Math.abs(c).toFixed(2);
        const expected = `y=${mStr}x${c >= 0 ? "+" : "-"}${cStr}`;
        if (ans === expected || ans === expected.replace("+", "")) correct = true;
        // Also check if they typed it slightly differently
        const ansM = parseFloat(ans.match(/y=([0-9.-]+)x/)?.[1]);
        const ansC = parseFloat(ans.match(/x([+-][0-9.]+)/)?.[1]);
        if (!isNaN(ansM) && !isNaN(ansC) && Math.abs(ansM - m) < 0.05 && Math.abs(ansC - c) < 0.5) correct = true;
      }
      if (correct) {
        placeRoadSuccess();
      } else {
        const p = penalty();
        setRoadCalcFeedback({ type: "error", msg: `❌ Incorrect. Find m first, then use y − y₁ = m(x − x₁) to get y = mx + c. (-§${p.toLocaleString()})` });
      }
    } else if (roadQuestionType === 3) {
      // Perpendicular: just confirm they know the perpendicular gradient
      const ans = parseFloat(roadCalcAnswer);
      let correctPerp;
      if (gradient === 0) correctPerp = "vertical";
      else if (gradient === Infinity) correctPerp = 0;
      else correctPerp = -1 / gradient;

      if (correctPerp === "vertical" && (roadCalcAnswer.toLowerCase().includes("undef") || roadCalcAnswer.toLowerCase().includes("inf"))) {
        // Place the original road, then ask them to draw perp
        placeRoadAndAwaitPerp(correctPerp);
      } else if (typeof correctPerp === "number" && !isNaN(ans) && Math.abs(ans - correctPerp) < 0.1) {
        placeRoadAndAwaitPerp(correctPerp);
      } else {
        const p = penalty();
        setRoadCalcFeedback({ type: "error", msg: `❌ Incorrect. Perpendicular gradient = −1 ÷ m. If m = ${gradient === Infinity ? "undefined" : gradient.toFixed(2)}, perpendicular m = ? (-§${p.toLocaleString()})` });
      }
    } else if (roadQuestionType === 4) {
      // ax + by + c = 0 form
      const ans = roadCalcAnswer.replace(/\s/g, "").toLowerCase();
      // Standard form: rearrange y = mx + c → mx - y + c = 0
      // Multiply through to get integer coefficients
      let a, b, cc;
      if (dx === 0) { a = 1; b = 0; cc = -x1; }
      else {
        // y = mx + c → mx - y + c = 0
        // To get whole numbers, multiply by denominator if fractional
        a = dy; b = -dx; cc = dx * y1 - dy * x1;
        // Simplify by GCD
        function gcd2(x, y) { return y === 0 ? Math.abs(x) : gcd2(y, x % y); }
        const g = [a, b, cc].reduce((acc, v) => gcd2(acc, Math.abs(v)));
        if (g > 0) { a /= g; b /= g; cc /= g; }
        if (a < 0) { a = -a; b = -b; cc = -cc; } // keep a positive
      }
      // Check answer
      const expected = `${a}x${b >= 0 ? "+" : ""}${b}y${cc >= 0 ? "+" : ""}${cc}=0`;
      const expectedAlt = `${a}x${b >= 0 ? "+" : ""}${b}y${cc >= 0 ? "+" : ""}${cc}`;
      if (ans === expected || ans === expectedAlt || ans === expected.replace(/\+/g, "") || ans + "=0" === expected) {
        placeRoadSuccess();
      } else {
        const p = penalty();
        setRoadCalcFeedback({ type: "error", msg: `❌ Incorrect. Rearrange y = mx + c to ax + by + c = 0. Expected: ${a}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}y ${cc >= 0 ? "+" : "−"} ${Math.abs(cc)} = 0. (-§${p.toLocaleString()})` });
      }
    }
  };

  const placeRoadSuccess = () => {
    setRoadCalcFeedback({ type: "success", msg: "✓ Correct!" });
    setPlacedRoads(prev => [...prev, pendingRoad]);
    setRoadCalcDone(true);
    setTimeout(() => { setShowRoadCalc(false); setPendingRoad(null); }, 1200);
  };

  const placeRoadAndAwaitPerp = (perpGradient) => {
    setRoadCalcFeedback({ type: "success", msg: `✓ Correct! Now draw a perpendicular road on the map.` });
    setPlacedRoads(prev => [...prev, pendingRoad]);
    setTimeout(() => {
      setShowRoadCalc(false);
      setPendingRoad(null);
      setAwaitingPerp({ parentRoad: pendingRoad, perpGradient });
      addNotification("🔀 Click two points to draw a perpendicular road");
    }, 1500);
  };

  const checkCurvedCalc = () => {
    if (!pendingCurved) return;
    const correctA = pendingCurved.A;
    const correctB = pendingCurved.B;
    const { mc1, mc2 } = pendingCurved;
    const applyPenalty = () => { const p = Math.floor(coins * 0.1); setCoins(c => c - p); setCurvedCalcAttempts(a => a + 1); return p; };

    if (curvedBonusPhase === 0) {
      // Phase 0: Find A and B
      const ansA = parseFloat(curvedAnswers.a);
      const ansB = parseFloat(curvedAnswers.b);
      const tolA = Math.max(0.05, Math.abs(correctA) * 0.05);
      const tolB = Math.max(0.5, Math.abs(correctB) * 0.05);
      if (!isNaN(ansA) && !isNaN(ansB) && Math.abs(ansA - correctA) < tolA && Math.abs(ansB - correctB) < tolB) {
        setCurvedCalcFeedback({ type: "success", msg: `✓ Correct! y = ${correctA.toFixed(3)}x² + ${correctB.toFixed(2)}. Bonus: linearisation...` });
        setPlacedCurvedRoads(prev => [...prev, pendingCurved]);
        setTimeout(() => { setCurvedBonusPhase(1); setCurvedCalcFeedback(null); setCurvedBonusAnswers({ m: "", c: "", domMin: "", domMax: "", ranMin: "", ranMax: "" }); }, 1500);
      } else {
        const p = applyPenalty();
        let hint = "❌ Incorrect. ";
        if (isNaN(ansA) || Math.abs(ansA - correctA) >= tolA) hint += "Check A: subtract equations to eliminate B. ";
        if (isNaN(ansB) || Math.abs(ansB - correctB) >= tolB) hint += "Check B: substitute A back. ";
        setCurvedCalcFeedback({ type: "error", msg: hint + `(-§${p.toLocaleString()})` });
      }
    } else if (curvedBonusPhase === 1) {
      // Phase 1: Linearisation
      // y - B = Ax² → log₁₀(y - B) = log₁₀(A) + 2log₁₀(x)
      // Y = mX + c where Y=log(y-B), X=log(x), m=2, c=log₁₀(|A|)
      const correctM = 2;
      const correctC = parseFloat(Math.log10(Math.abs(correctA)).toFixed(3));
      const ansM = parseFloat(curvedBonusAnswers.m);
      const ansC = parseFloat(curvedBonusAnswers.c);
      if (!isNaN(ansM) && Math.abs(ansM - correctM) < 0.01 && !isNaN(ansC) && Math.abs(ansC - correctC) < 0.05) {
        setCurvedCalcFeedback({ type: "success", msg: `✓ Correct! Y = 2X + ${correctC.toFixed(3)}. Now find the domain and range...` });
        setCoins(c => c + 50000);
        addNotification("🎯 Linearisation bonus +§50,000!");
        setTimeout(() => { setCurvedBonusPhase(2); setCurvedCalcFeedback(null); }, 1500);
      } else {
        const p = applyPenalty();
        setCurvedCalcFeedback({ type: "error", msg: `❌ Incorrect. Start: y − B = Ax². Take log₁₀ of both sides: log(y−B) = log(A) + 2log(x). Compare with Y = mX + c. (-§${p.toLocaleString()})` });
      }
    } else if (curvedBonusPhase === 2) {
      // Phase 2: Domain and range
      const minMX = Math.min(mc1.x, mc2.x);
      const maxMX = Math.max(mc1.x, mc2.x);
      const yAtMin = correctA * minMX * minMX + correctB;
      const yAtMax = correctA * maxMX * maxMX + correctB;
      const vertexInRange = minMX <= 0 && maxMX >= 0;
      const yValues = [yAtMin, yAtMax];
      if (vertexInRange) yValues.push(correctB); // vertex y = B at x = 0
      const correctRanMin = Math.round(Math.min(...yValues) * 10) / 10;
      const correctRanMax = Math.round(Math.max(...yValues) * 10) / 10;

      const ansDomMin = parseFloat(curvedBonusAnswers.domMin);
      const ansDomMax = parseFloat(curvedBonusAnswers.domMax);
      const ansRanMin = parseFloat(curvedBonusAnswers.ranMin);
      const ansRanMax = parseFloat(curvedBonusAnswers.ranMax);

      const domOk = !isNaN(ansDomMin) && !isNaN(ansDomMax) && Math.abs(ansDomMin - minMX) < 0.5 && Math.abs(ansDomMax - maxMX) < 0.5;
      const ranOk = !isNaN(ansRanMin) && !isNaN(ansRanMax) && Math.abs(ansRanMin - correctRanMin) < 0.5 && Math.abs(ansRanMax - correctRanMax) < 0.5;

      if (domOk && ranOk) {
        setCurvedCalcFeedback({ type: "success", msg: `✓ Correct! Domain: [${minMX}, ${maxMX}], Range: [${correctRanMin}, ${correctRanMax}]. +§100,000 bonus!` });
        setCoins(c => c + 100000);
        setTimeout(() => { setShowCurvedCalc(false); setPendingCurved(null); setCurvedBonusPhase(0); addNotification("🎉 Full curved road analysis complete!"); }, 2000);
      } else {
        const p = applyPenalty();
        let hint = "❌ ";
        if (!domOk) hint += "Domain = x-values between the endpoints. ";
        if (!ranOk) hint += `Range = min/max y-values on the curve${vertexInRange ? " (vertex at x=0 gives y=B)" : ""}. `;
        setCurvedCalcFeedback({ type: "error", msg: hint + `(-§${p.toLocaleString()})` });
      }
    }
  };

  // ═══ MUSIC DUCKING ═══
  // Duck music when any challenge popup is open
  const anyPopupOpen = showCalcChallenge || showDemoCalc || showPollutionCalc || showPipeCalc || showRoadCalc || showCurvedCalc || showJobRandom || showTaskPopup || showResearchCalc;
  useEffect(() => {
    if (!gameMusicRef.current) return;
    if (anyPopupOpen) gameMusicRef.current.duck();
    else gameMusicRef.current.unduck();
  }, [anyPopupOpen]);

  const addNotification = (msg) => {
    const id = Date.now();
    setNotifications(prev => [...prev.slice(-4), { id, msg }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
    // Auto SFX based on message content
    if (msg.includes("🎉") || msg.includes("Task complete")) sfx(playTaskComplete);
    else if (msg.includes("❌") || msg.includes("Wrong")) sfx(playErrorSound);
    else if (msg.includes("✓ Correct") || msg.includes("Saved")) sfx(playSuccessSound);
    else if (msg.includes("Built") || msg.includes("Road placed") || msg.includes("pipe")) sfx(playBuildSound);
    else if (msg.includes("+§") || msg.includes("bonus") || msg.includes("coins")) sfx(playCoinSound);
  };

  // Pan with drag
  const handleMouseDown = (e) => {
    if (tool === "select") {
      setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
      setIsDragging(false);
    }
  };
  const handleMouseMove = (e) => {
    if (dragStart) {
      setCamera(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
      setIsDragging(true);
    }
  };
  const handleMouseUp = () => { setDragStart(null); };

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.4, Math.min(2.5, prev.zoom + (e.deltaY > 0 ? -0.1 : 0.1)))
    }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); }
  }, [handleWheel]);

  // ═══ RENDER ═══
  return (
    <div style={{ ...S.app, background: theme.sky }}>
      {/* ═══ TOP HUD ═══ */}
      <div style={S.topHud}>
        <div style={S.hudLeft}>
          <span style={S.cityLabel}>🏙️ {cityName} <span style={{ fontSize: "10px", color: "#f59e0b", marginLeft: "6px" }}>Lv.{cityLevel}</span></span>
          <span style={S.climateLabel}>{theme.name} · {TERRAIN_FEATURES[terrain]?.label} · {calcMode ? "🧮 Calc ON" : "✏️ Calc OFF"} · {mathDifficulty === "easy" ? "🟢 Easy" : mathDifficulty === "hard" ? "🔴 Hard" : "🟡 Medium"}</span>
        </div>
        <div style={S.hudStats}>
          {/* Energy */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Energy</div>
              <div style={{...S.resourceVal, color: energyBalance > 0 ? "#facc15" : energyBalance === 0 ? "#fb923c" : "#ef4444"}}>{powerCap > 0 ? `${energyBalance}` : "0"}</div>
              <div style={{ fontSize: "7px", color: "#64748b", fontFamily: "monospace" }}>{powerCap}−{energyConsumption} kW</div>
            </div>
          </div>
          {/* Population */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Population</div>
              <div style={{...S.resourceVal, color: "#60a5fa"}}>{totalPop.toLocaleString()}</div>
              <div style={{ fontSize: "7px", color: "#64748b", fontFamily: "monospace" }}>👤{demographics.adults} 👶{demographics.children} 👴{demographics.elderly}</div>
            </div>
          </div>
          {/* Satisfaction */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={happiness >= 60 ? "#4ade80" : happiness >= 30 ? "#fb923c" : "#ef4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d={happiness >= 60 ? "M8 14s1.5 2 4 2 4-2 4-2" : happiness >= 30 ? "M8 15h8" : "M16 16s-1.5-2-4-2-4 2-4 2"}/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Satisfaction</div>
              <div style={S.satisfactionBar}>
                <div style={{...S.satisfactionFill, width: `${happiness}%`, background: happiness >= 60 ? "#4ade80" : happiness >= 30 ? "#fb923c" : "#ef4444" }}/>
              </div>
              <div style={{...S.resourceVal, color: happiness >= 60 ? "#4ade80" : happiness >= 30 ? "#fb923c" : "#ef4444", fontSize: "10px"}}>{happiness}%</div>
            </div>
          </div>
          {/* Research */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M15.5 15.5L10.5 10.5"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M7 3v2"/><path d="M3 7h2"/><path d="M7.5 7.5L6 6"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Research</div>
              <div style={{...S.resourceVal, color: "#c084fc"}}>{research} RP</div>
            </div>
          </div>
          {/* Materials */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v4l4 4-4 4v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Materials</div>
              <div style={{...S.resourceVal, color: "#fb923c"}}>{materials.toLocaleString()}</div>
            </div>
          </div>
          {/* Water */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Water</div>
              <div style={{...S.resourceVal, color: "#22d3ee"}}>{waterCap.toLocaleString()}</div>
            </div>
          </div>
          {/* Money */}
          <div style={S.resourceBox}>
            <div style={S.resourceIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/><path d="M15.5 9.5c0-1.1-1.6-2-3.5-2s-3.5.9-3.5 2 1.6 2 3.5 2 3.5.9 3.5 2-1.6 2-3.5 2-3.5-.9-3.5-2"/></svg>
            </div>
            <div style={S.resourceInfo}>
              <div style={S.resourceLabel}>Treasury</div>
              <div style={{...S.resourceVal, color: coins < 500000 ? "#ef4444" : "#fbbf24"}}>§{coins >= 1000000 ? (coins / 1000000).toFixed(1) + "M" : coins >= 1000 ? (coins / 1000).toFixed(0) + "K" : coins}</div>
            </div>
          </div>
        </div>
        <div style={S.hudRight}>
          <button onClick={onToggleMute} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #1a2a4a", background: muted ? "#ef444420" : "#1a2a4a", color: muted ? "#fca5a5" : "#94a3b8", fontSize: "13px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s" }}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button onClick={saveGame} style={{ padding: "6px 12px", borderRadius: "8px", border: saveFlash ? "1px solid #4ade80" : "1px solid #1a2a4a", background: saveFlash ? "#4ade8020" : "#1a2a4a", color: saveFlash ? "#4ade80" : "#94a3b8", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px", transition: "all 0.3s" }}>
            💾 {saveFlash ? "Saved!" : "Save"}
          </button>
          <div style={S.speedControls}>
            {[{s:1,l:"▶"},{s:2,l:"▶▶"},{s:3,l:"▶▶▶"}].map(({s,l}) => <button key={s} onClick={() => setSpeed(s)} style={{ ...S.speedBtn, background: speed === s ? "#f59e0b" : "#1a2a4a", color: speed === s ? "#000" : "#fff" }}>{l}</button>)}
          </div>
        </div>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div style={S.mainArea}>
        {/* Left toolbar */}
        <div style={S.toolbar}>
          {TOOL_CATEGORIES.map(t => (
            <button key={t.id} onClick={() => { setTool(t.id); setSelectedBuilding(null); setSelectedZone(null); setSelectedCell(null); setPipeMode(null); setPipeDragStart(null); setSelectedGenerator(null); setSelectedHousing(null); setSelectedUtility(null); setSelectedEducation(null); setRoadMode(false); setRoadStart(null); setCurvedRoadMode(false); setCurvedRoadStart(null); }} style={{ ...S.toolBtn, background: tool === t.id ? "#f59e0b22" : "transparent", borderColor: tool === t.id ? "#f59e0b" : "transparent" }} title={t.name}>
              <span style={{ fontSize: "18px" }}>{t.icon}</span>
              <span style={{ ...S.toolLabel, color: tool === t.id ? "#f59e0b" : "#64748b" }}>{t.name}</span>
            </button>
          ))}
        </div>

        {/* Grid viewport */}
        <div ref={containerRef} style={S.viewport} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div style={{ position: "absolute", left: camera.x, top: camera.y, transition: isDragging ? "none" : "transform 0.1s" }}>
            {cells.map((row, y) => (
              <div key={y} style={{ display: "flex" }}>
                {row.map((cell, x) => {
                  const key = `${x},${y}`;
                  const building = placed[key];
                  const zone = zones[key];
                  const isHover = hoverCell?.x === x && hoverCell?.y === y;
                  const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                  const bDef = building ? BUILDINGS[building.type] : null;

                  let bg;
                  if (cell.type === "water") {
                    bg = cell.elevation > 0.6 ? theme.water : theme.waterDeep;
                  } else {
                    const base = (x + y) % 3 === 0 ? theme.groundAlt : theme.ground;
                    bg = building?.type === "road" ? "#555" : base;
                  }

                  // Radius highlight check (Euclidean distance in metres)
                  const inPlacementRadius = selectedGenerator && hoverCell && cell.type !== "water" &&
                    distanceInMeters(x, y, hoverCell.x, hoverCell.y) <= (GENERATORS[selectedGenerator]?.radiusM || 0) &&
                    !(x === hoverCell.x && y === hoverCell.y);
                  // Check if cell is powered (within radius of any placed generator)
                  let isPowered = false;
                  let nearestGenDist = Infinity;
                  Object.entries(placed).forEach(([k, b]) => {
                    if (GENERATORS[b.type]) {
                      const [gx, gy] = k.split(",").map(Number);
                      const dMeters = distanceInMeters(x, y, gx, gy);
                      if (dMeters <= GENERATORS[b.type].radiusM) isPowered = true;
                      if (dMeters < nearestGenDist) nearestGenDist = dMeters;
                    }
                  });

                  return (
                    <div key={x} onClick={() => !isDragging && handleCellClick(x, y)} onMouseEnter={() => setHoverCell({ x, y })} onMouseLeave={() => setHoverCell(null)}
                      style={{
                        width: CELL_SIZE, height: CELL_SIZE, background: bg,
                        borderRight: `1px solid ${cell.type === "water" ? theme.waterDeep : theme.groundAlt}20`,
                        borderBottom: `1px solid ${cell.type === "water" ? theme.waterDeep : theme.groundAlt}20`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: tool === "select" ? "grab" : "pointer", position: "relative",
                        outline: isSelected ? "2px solid #fff" : isHover && cell.type !== "water" ? `2px solid ${tool === "demolish" ? "#ef4444" : "#f59e0b"}88` : "none",
                        outlineOffset: "-2px", transition: "outline 0.1s",
                        boxShadow: zone ? `inset 0 0 0 2px ${ZONE_TYPES.find(z => z.id === zone)?.border || "#fff"}40` : "none",
                      }}>
                      {/* Water source marker */}
                      {pipeMode && isWaterSource(x, y) && !building && <div style={{ position: "absolute", inset: 0, border: "2px solid #22d3ee", borderRadius: "2px", pointerEvents: "none", opacity: 0.6 }}><div style={{ position: "absolute", top: "1px", left: "1px", fontSize: Math.max(6, CELL_SIZE * 0.3), lineHeight: 1 }}>🚰</div></div>}
                      {/* Pipe start marker */}
                      {pipeDragStart && pipeDragStart.x === x && pipeDragStart.y === y && <div style={{ position: "absolute", inset: 0, border: "3px solid #22d3ee", borderRadius: "2px", background: "#22d3ee30", pointerEvents: "none" }} />}
                      {/* Zone tint */}
                      {zone && !building && <div style={{ position: "absolute", inset: 0, background: ZONE_TYPES.find(z => z.id === zone)?.color, pointerEvents: "none" }} />}
                      {/* Radius preview when placing generator */}
                      {inPlacementRadius && <div style={{ position: "absolute", inset: 0, background: "#facc1520", border: "1px solid #facc1540", pointerEvents: "none", borderRadius: "2px" }} />}
                      {/* Powered indicator (subtle) */}
                      {isPowered && !building && !inPlacementRadius && cell.type !== "water" && <div style={{ position: "absolute", bottom: "1px", right: "1px", width: "4px", height: "4px", borderRadius: "50%", background: "#facc15", opacity: 0.4, pointerEvents: "none" }} />}
                      {/* Tree */}
                      {cell.hasTree && !building && <span style={{ fontSize: Math.max(8, CELL_SIZE * 0.5), opacity: 0.7, pointerEvents: "none", filter: `hue-rotate(${climate === "polar" ? "180deg" : climate === "dry" ? "40deg" : "0deg"})` }}>🌲</span>}
                      {/* Water detail */}
                      {cell.type === "water" && cell.elevation > 0.55 && <span style={{ fontSize: Math.max(6, CELL_SIZE * 0.3), opacity: 0.3, pointerEvents: "none" }}>~</span>}
                      {/* Building */}
                      {bDef && building.type !== "road" && <span style={{ fontSize: Math.max(10, CELL_SIZE * 0.6), pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>{bDef.icon}</span>}
                      {/* Generator rendering */}
                      {building && GENERATORS[building.type] && <div style={{ pointerEvents: "none", transform: `scale(${Math.max(0.5, CELL_SIZE / 28)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>{GENERATORS[building.type].svg}</div>}
                      {/* Housing rendering */}
                      {building && HOUSING_TYPES[building.type] && <div style={{ pointerEvents: "none", transform: `scale(${Math.max(0.5, CELL_SIZE / 28)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>{HOUSING_TYPES[building.type].svg}</div>}
                      {/* Utility building rendering */}
                      {building && UTILITY_BUILDINGS[building.type] && <div style={{ pointerEvents: "none", transform: `scale(${Math.max(0.5, CELL_SIZE / 28)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>{UTILITY_BUILDINGS[building.type].svg}</div>}
                      {/* Education building rendering */}
                      {building && EDUCATION_BUILDINGS[building.type] && <div style={{ pointerEvents: "none", transform: `scale(${Math.max(0.5, CELL_SIZE / 28)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>{EDUCATION_BUILDINGS[building.type].svg}</div>}
                      {/* Pollution tint overlay */}
                      {(() => { const pol = getCellPollution(x, y); return (pol.noise || pol.ground || pol.air) ? <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: pol.ground ? "rgba(120,80,0,0.15)" : pol.air ? "rgba(120,0,0,0.1)" : "rgba(200,150,0,0.08)", border: pol.ground ? "1px solid rgba(120,80,0,0.2)" : "none" }} /> : null; })()}
                      {/* Road */}
                      {building?.type === "road" && <div style={{ width: "80%", height: "80%", background: "#666", borderRadius: "2px" }} />}
                      {/* Coordinate (on hover) */}
                      {isHover && camera.zoom >= 0.8 && <div style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", background: "#000d", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontSize: "7px", fontFamily: "monospace", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10, lineHeight: 1.3, textAlign: "center" }}>
                        <div>({x},{y}) · {x * METERS_PER_CELL}m, {y * METERS_PER_CELL}m</div>
                        {selectedGenerator && hoverCell?.x === x && hoverCell?.y === y && <div style={{ color: "#facc15" }}>Range: {GENERATORS[selectedGenerator]?.radiusM}m</div>}
                        {isPowered && <div style={{ color: "#4ade80" }}>⚡ Powered</div>}
                        {!isPowered && nearestGenDist < Infinity && <div style={{ color: "#f87171" }}>{Math.round(nearestGenDist)}m to nearest</div>}
                      </div>}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Pipe overlay */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: GRID_W * CELL_SIZE, height: GRID_H * CELL_SIZE, pointerEvents: "none", zIndex: 5 }}>
              {placedPipes.map((p, i) => (
                <g key={`pipe-${i}`}>
                  <line x1={(p.x1 + 0.5) * CELL_SIZE} y1={(p.y1 + 0.5) * CELL_SIZE} x2={(p.x2 + 0.5) * CELL_SIZE} y2={(p.y2 + 0.5) * CELL_SIZE} stroke={PIPE_SPECS[p.type]?.color || "#22d3ee"} strokeWidth={Math.max(3, CELL_SIZE * 0.15)} strokeLinecap="round" opacity={0.8}/>
                  <circle cx={(p.x1 + 0.5) * CELL_SIZE} cy={(p.y1 + 0.5) * CELL_SIZE} r={Math.max(3, CELL_SIZE * 0.12)} fill={PIPE_SPECS[p.type]?.color || "#22d3ee"}/>
                  <circle cx={(p.x2 + 0.5) * CELL_SIZE} cy={(p.y2 + 0.5) * CELL_SIZE} r={Math.max(3, CELL_SIZE * 0.12)} fill={PIPE_SPECS[p.type]?.color || "#22d3ee"}/>
                  <text x={((p.x1 + p.x2) / 2 + 0.5) * CELL_SIZE} y={((p.y1 + p.y2) / 2 + 0.5) * CELL_SIZE - 6} textAnchor="middle" fill="#fff" fontSize={Math.max(7, CELL_SIZE * 0.3)} fontFamily="monospace" fontWeight="700">{Math.round(p.lengthM)}m</text>
                </g>
              ))}
              {pipeDragStart && hoverCell && !(pipeDragStart.x === hoverCell.x && pipeDragStart.y === hoverCell.y) && (
                <g>
                  <line x1={(pipeDragStart.x + 0.5) * CELL_SIZE} y1={(pipeDragStart.y + 0.5) * CELL_SIZE} x2={(hoverCell.x + 0.5) * CELL_SIZE} y2={(hoverCell.y + 0.5) * CELL_SIZE} stroke={PIPE_SPECS[pipeMode]?.color || "#22d3ee"} strokeWidth={Math.max(2, CELL_SIZE * 0.1)} strokeLinecap="round" strokeDasharray="6 4" opacity={0.6}/>
                  <text x={((pipeDragStart.x + hoverCell.x) / 2 + 0.5) * CELL_SIZE} y={((pipeDragStart.y + hoverCell.y) / 2 + 0.5) * CELL_SIZE - 8} textAnchor="middle" fill="#fff" fontSize={Math.max(8, CELL_SIZE * 0.35)} fontFamily="monospace" fontWeight="800">{Math.round(distanceInMeters(pipeDragStart.x, pipeDragStart.y, hoverCell.x, hoverCell.y))}m</text>
                </g>
              )}
              {/* Placed roads */}
              {placedRoads.map((r, i) => (
                <g key={`road-${i}`}>
                  <line x1={(r.x1 + 0.5) * CELL_SIZE} y1={(r.y1 + 0.5) * CELL_SIZE} x2={(r.x2 + 0.5) * CELL_SIZE} y2={(r.y2 + 0.5) * CELL_SIZE} stroke="#6b7280" strokeWidth={Math.max(4, CELL_SIZE * 0.2)} strokeLinecap="round" opacity={0.7}/>
                  <line x1={(r.x1 + 0.5) * CELL_SIZE} y1={(r.y1 + 0.5) * CELL_SIZE} x2={(r.x2 + 0.5) * CELL_SIZE} y2={(r.y2 + 0.5) * CELL_SIZE} stroke="#facc15" strokeWidth={Math.max(1, CELL_SIZE * 0.04)} strokeLinecap="round" strokeDasharray="4 3" opacity={0.5}/>
                </g>
              ))}
              {/* Road drag preview */}
              {roadMode && roadStart && hoverCell && !(roadStart.x === hoverCell.x && roadStart.y === hoverCell.y) && (
                <g>
                  <line x1={(roadStart.x + 0.5) * CELL_SIZE} y1={(roadStart.y + 0.5) * CELL_SIZE} x2={(hoverCell.x + 0.5) * CELL_SIZE} y2={(hoverCell.y + 0.5) * CELL_SIZE} stroke="#9ca3af" strokeWidth={Math.max(3, CELL_SIZE * 0.15)} strokeLinecap="round" strokeDasharray="6 4" opacity={0.5}/>
                  <text x={((roadStart.x + hoverCell.x) / 2 + 0.5) * CELL_SIZE} y={((roadStart.y + hoverCell.y) / 2 + 0.5) * CELL_SIZE - 8} textAnchor="middle" fill="#fff" fontSize={Math.max(7, CELL_SIZE * 0.3)} fontFamily="monospace" fontWeight="700">
                    m={(hoverCell.x - roadStart.x) === 0 ? "∞" : ((hoverCell.y - roadStart.y) / (hoverCell.x - roadStart.x)).toFixed(2)}
                  </text>
                </g>
              )}
              {/* Placed curved roads */}
              {placedCurvedRoads.map((cr, i) => {
                const { mc1, mc2, A, B } = cr;
                const minX = Math.min(mc1.x, mc2.x);
                const maxX = Math.max(mc1.x, mc2.x);
                const steps = Math.max(20, (maxX - minX) * 4);
                const points = [];
                for (let s = 0; s <= steps; s++) {
                  const mx = minX + (maxX - minX) * (s / steps);
                  const my = A * mx * mx + B;
                  const gx = mx + ORIGIN.x;
                  const gy = ORIGIN.y - my;
                  points.push(`${(gx + 0.5) * CELL_SIZE},${(gy + 0.5) * CELL_SIZE}`);
                }
                return (
                  <g key={`curve-${i}`}>
                    <polyline points={points.join(" ")} fill="none" stroke="#a78bfa" strokeWidth={Math.max(3, CELL_SIZE * 0.15)} strokeLinecap="round" opacity={0.7}/>
                    <polyline points={points.join(" ")} fill="none" stroke="#c084fc" strokeWidth={Math.max(1, CELL_SIZE * 0.04)} strokeLinecap="round" strokeDasharray="4 3" opacity={0.5}/>
                    <circle cx={(cr.x1 + 0.5) * CELL_SIZE} cy={(cr.y1 + 0.5) * CELL_SIZE} r={Math.max(3, CELL_SIZE * 0.12)} fill="#c084fc"/>
                    <circle cx={(cr.x2 + 0.5) * CELL_SIZE} cy={(cr.y2 + 0.5) * CELL_SIZE} r={Math.max(3, CELL_SIZE * 0.12)} fill="#c084fc"/>
                  </g>
                );
              })}
              {/* Curved road drag preview */}
              {curvedRoadMode && curvedRoadStart && hoverCell && !(curvedRoadStart.x === hoverCell.x && curvedRoadStart.y === hoverCell.y) && (() => {
                const mc1 = toMathCoords(curvedRoadStart.x, curvedRoadStart.y);
                const mc2 = toMathCoords(hoverCell.x, hoverCell.y);
                if (mc1.x * mc1.x === mc2.x * mc2.x) return null;
                const pA = (mc1.y - mc2.y) / (mc1.x * mc1.x - mc2.x * mc2.x);
                const pB = mc1.y - pA * mc1.x * mc1.x;
                const minX = Math.min(mc1.x, mc2.x);
                const maxX = Math.max(mc1.x, mc2.x);
                const steps = Math.max(16, (maxX - minX) * 3);
                const pts = [];
                for (let s = 0; s <= steps; s++) {
                  const mx = minX + (maxX - minX) * (s / steps);
                  const my = pA * mx * mx + pB;
                  pts.push(`${(mx + ORIGIN.x + 0.5) * CELL_SIZE},${(ORIGIN.y - my + 0.5) * CELL_SIZE}`);
                }
                return (
                  <g>
                    <polyline points={pts.join(" ")} fill="none" stroke="#c084fc" strokeWidth={Math.max(2, CELL_SIZE * 0.1)} strokeLinecap="round" strokeDasharray="5 4" opacity={0.5}/>
                    <text x={((curvedRoadStart.x + hoverCell.x) / 2 + 0.5) * CELL_SIZE} y={((curvedRoadStart.y + hoverCell.y) / 2 + 0.5) * CELL_SIZE - 10} textAnchor="middle" fill="#c084fc" fontSize={Math.max(7, CELL_SIZE * 0.3)} fontFamily="monospace" fontWeight="700">
                      y = {pA.toFixed(2)}x² + {pB.toFixed(1)}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>

        {/* Right panel */}
        <div style={S.rightPanel}>
          {/* Build submenu */}
          {tool === "build" && <div style={S.subPanel}>
            <div style={S.subTitle}>🏗️ Buildings</div>
            {BUILD_ITEMS.map(section => (
              <div key={section.section}>
                <div style={S.sectionLabel}>{section.section}</div>
                <div style={S.buildGrid}>
                  {section.items.map(id => {
                    const b = BUILDINGS[id];
                    const sel = selectedBuilding === id;
                    return (
                      <button key={id} onClick={() => setSelectedBuilding(sel ? null : id)} style={{ ...S.buildItem, borderColor: sel ? "#f59e0b" : "#2a3a5e", background: sel ? "#f59e0b18" : "#0d1520" }}>
                        <span style={{ fontSize: "18px" }}>{b.icon}</span>
                        <span style={S.buildName}>{b.name}</span>
                        <span style={S.buildCost}>🪙 {b.cost}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>}

          {/* Zone submenu */}
          {tool === "zone" && <div style={S.subPanel}>
            <div style={S.subTitle}>🗺️ Zones</div>
            {ZONE_TYPES.map(z => (
              <button key={z.id} onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)} style={{ ...S.zoneBtn, borderColor: selectedZone === z.id ? z.border : "#2a3a5e", background: selectedZone === z.id ? z.color : "#0d1520" }}>
                <span>{z.icon}</span>
                <span style={S.zoneName}>{z.name}</span>
              </button>
            ))}
            <div style={S.zoneHint}>Click cells to paint zones. Click again to remove.</div>
          </div>}

          {/* Road submenu */}
          {tool === "road" && <div style={S.subPanel}>
            <div style={S.subTitle}>🛤️ Roads</div>
            <div style={S.roadInfo}>
              <div style={S.roadCost}>🪙 {BUILDINGS.road.cost} per tile</div>
              <div style={S.roadHint}>Click cells to place road segments. Roads are required for buildings to function.</div>
            </div>
          </div>}

          {/* Demolish submenu */}
          {tool === "demolish" && <div style={S.subPanel}>
            <div style={S.subTitle}>🗑️ Demolish</div>
            <div style={S.roadHint}>Click buildings to demolish. You'll receive 30% of the original cost back.</div>
          </div>}

          {/* Cell info */}
          {selectedCell && <div style={S.subPanel}>
            <div style={S.subTitle}>ℹ️ Cell Info</div>
            <div style={S.infoGrid}>
              <div style={S.infoRow}><span style={S.infoLabel}>Grid Position</span><span style={S.infoVal}>({selectedCell.x}, {selectedCell.y})</span></div>
              <div style={S.infoRow}><span style={S.infoLabel}>Position (m)</span><span style={S.infoVal}>{selectedCell.x * METERS_PER_CELL}m, {selectedCell.y * METERS_PER_CELL}m</span></div>
              <div style={S.infoRow}><span style={S.infoLabel}>Terrain</span><span style={S.infoVal}>{cells[selectedCell.y]?.[selectedCell.x]?.type || "?"}</span></div>
              {placed[`${selectedCell.x},${selectedCell.y}`] && <div style={S.infoRow}><span style={S.infoLabel}>Building</span><span style={S.infoVal}>{BUILDINGS[placed[`${selectedCell.x},${selectedCell.y}`].type]?.name || GENERATORS[placed[`${selectedCell.x},${selectedCell.y}`].type]?.name}</span></div>}
              {placed[`${selectedCell.x},${selectedCell.y}`] && GENERATORS[placed[`${selectedCell.x},${selectedCell.y}`].type] && <div style={S.infoRow}><span style={S.infoLabel}>Radius</span><span style={S.infoVal}>{GENERATORS[placed[`${selectedCell.x},${selectedCell.y}`].type].radiusM}m</span></div>}
              {placed[`${selectedCell.x},${selectedCell.y}`] && GENERATORS[placed[`${selectedCell.x},${selectedCell.y}`].type] && <div style={S.infoRow}><span style={S.infoLabel}>Power Output</span><span style={S.infoVal}>{GENERATORS[placed[`${selectedCell.x},${selectedCell.y}`].type].power} MW</span></div>}
              {zones[`${selectedCell.x},${selectedCell.y}`] && <div style={S.infoRow}><span style={S.infoLabel}>Zone</span><span style={S.infoVal}>{zones[`${selectedCell.x},${selectedCell.y}`]}</span></div>}
              <div style={S.infoRow}><span style={S.infoLabel}>Elevation</span><span style={S.infoVal}>{(cells[selectedCell.y]?.[selectedCell.x]?.elevation * 100 || 0).toFixed(0)}m</span></div>
              <div style={S.infoRow}><span style={S.infoLabel}>Powered</span><span style={{...S.infoVal, color: (()=>{let p=false;Object.entries(placed).forEach(([k,b])=>{if(GENERATORS[b.type]){const[gx,gy]=k.split(",").map(Number);if(distanceInMeters(selectedCell.x,selectedCell.y,gx,gy)<=GENERATORS[b.type].radiusM)p=true;}});return p;})()?"#4ade80":"#ef4444"}}>{(()=>{let p=false;Object.entries(placed).forEach(([k,b])=>{if(GENERATORS[b.type]){const[gx,gy]=k.split(",").map(Number);if(distanceInMeters(selectedCell.x,selectedCell.y,gx,gy)<=GENERATORS[b.type].radiusM)p=true;}});return p;})()?"Yes ⚡":"No"}</span></div>
              {(()=>{ const pol = getCellPollution(selectedCell.x, selectedCell.y); return (pol.noise || pol.ground || pol.air) ? <div style={{ marginTop: "4px" }}>
                <div style={S.infoRow}><span style={S.infoLabel}>Pollution</span><span style={{...S.infoVal, color: "#fb923c"}}>{[pol.noise && "🔊", pol.ground && "🟤", pol.air && "💨"].filter(Boolean).join(" ")}</span></div>
                {pol.sources.map((s, i) => <div key={i} style={{ fontSize: "8px", color: "#94a3b8", paddingLeft: "4px" }}>{s}</div>)}
              </div> : <div style={S.infoRow}><span style={S.infoLabel}>Pollution</span><span style={{...S.infoVal, color: "#4ade80"}}>Clean ✓</span></div>; })()}
              <div style={{ marginTop: "6px", padding: "6px 8px", borderRadius: "6px", background: "#1a2a4a", fontSize: "8px", color: "#64748b", fontFamily: "monospace", lineHeight: 1.4 }}>
                💡 Distance formula:<br/>d = √((x₂−x₁)² + (y₂−y₁)²) × {METERS_PER_CELL}m
              </div>
            </div>
          </div>}

          {/* Minimap */}
          {showMinimap && <div style={S.minimapWrap}>
            <div style={S.minimapTitle}>Minimap</div>
            <div style={S.minimap}>
              {cells.map((row, y) => (
                <div key={y} style={{ display: "flex" }}>
                  {row.map((cell, x) => {
                    const key = `${x},${y}`;
                    const b = placed[key];
                    let c = cell.type === "water" ? theme.water : theme.ground;
                    if (b?.type === "road") c = "#666";
                    else if (b) c = BUILDINGS[b.type]?.color || "#fff";
                    return <div key={x} style={{ width: 3, height: 3, background: c }} />;
                  })}
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>

      {/* Research Challenge Popup */}
      {showResearchCalc && researchCalcQ && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "460px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "40px", marginBottom: "4px" }}>🔬</div>
              <div style={{ ...S.popupBadge, background: "#c084fc20", borderColor: "#c084fc40", color: "#c084fc" }}>RESEARCH CHALLENGE</div>
              <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>Difficulty: Level {researchCalcQ.difficulty}/10 · {universityCount} {universityCount === 1 ? "university" : "universities"} = +{universityCount * 20} RP</div>
            </div>

            {activeResearch && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0a0f1a", borderRadius: "8px", border: "1px solid #c084fc30", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "9px", color: "#64748b" }}>Researching</div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#c084fc" }}>{TECH_TREE[activeResearch]?.icon} {TECH_TREE[activeResearch]?.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{researchProgress}/{TECH_TREE[activeResearch]?.cost} RP</div>
                <div style={{ width: "80px", height: "4px", background: "#1a2a4a", borderRadius: "2px", marginTop: "3px" }}>
                  <div style={{ width: `${Math.min(100, (researchProgress / TECH_TREE[activeResearch]?.cost) * 100)}%`, height: "100%", background: "#c084fc", borderRadius: "2px" }} />
                </div>
              </div>
            </div>}

            <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "16px", marginBottom: "16px", border: "1px solid #1a2a4a", textAlign: "center", position: "relative" }}>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.6 }}>{researchCalcQ.question}</div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <input value={researchCalcAnswer} onChange={e => setResearchCalcAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && checkResearchAnswer()} placeholder="Your answer" style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} autoFocus />
            </div>

            {researchCalcFeedback && (<div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, position: "relative", background: researchCalcFeedback.type === "success" ? "#4ade8015" : "#ef444415", border: `1px solid ${researchCalcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`, color: researchCalcFeedback.type === "success" ? "#4ade80" : "#fca5a5" }}>{researchCalcFeedback.msg}</div>)}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={checkResearchAnswer} style={{ ...S.popupBtn, flex: 1, textAlign: "center", background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>✓ Submit</button>
              <button onClick={() => setShowResearchCalc(false)} style={{ padding: "10px 16px", borderRadius: "10px", background: "#1a2a4a", border: "1px solid #2a3a5e", color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: "12px", fontFamily: "inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Tech Tree Modal */}
      {showTechTree && (
        <div style={S.popupOverlay} onClick={() => setShowTechTree(false)}>
          <div style={{ background: "#0d1520", border: "1px solid #1a2a4a", borderRadius: "16px", padding: "24px", maxWidth: "700px", width: "95%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#fff" }}>🔬 Tech Tree</h2>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>Research points: <strong style={{ color: "#c084fc", fontSize: "14px" }}>{research}</strong> · {unlockedTechs.size}/{Object.keys(TECH_TREE).length} researched</p>
              </div>
              <button onClick={() => setShowTechTree(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "24px", cursor: "pointer" }}>×</button>
            </div>

            {/* Generator unlock status */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px", padding: "10px", background: "#0a0f1a", borderRadius: "10px", border: "1px solid #1a2a4a" }}>
              {Object.values(GENERATORS).map(gen => {
                const unlocked = isGenUnlocked(gen.id);
                const progress = gen.techReqs.length === 0 ? 1 : gen.techReqs.filter(t => hasTech(t)).length / gen.techReqs.length;
                return (
                  <div key={gen.id} style={{ flex: "1 1 90px", padding: "6px", borderRadius: "6px", textAlign: "center", background: unlocked ? "#4ade8010" : "#1a2a4a30", border: `1px solid ${unlocked ? "#4ade8040" : "#1a2a4a"}` }}>
                    <div style={{ fontSize: "16px" }}>{gen.icon}</div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: unlocked ? "#4ade80" : "#94a3b8" }}>{gen.name}</div>
                    {!unlocked && <div style={{ width: "100%", height: "3px", borderRadius: "2px", background: "#1a2a4a", marginTop: "3px" }}><div style={{ width: `${progress * 100}%`, height: "100%", background: "#c084fc", borderRadius: "2px", transition: "width 0.3s" }} /></div>}
                    {unlocked && <div style={{ fontSize: "8px", color: "#4ade80" }}>✓ Unlocked</div>}
                  </div>
                );
              })}
            </div>

            {/* Branches */}
            {Object.entries(TECH_BRANCHES).map(([branchId, branch]) => {
              const techs = Object.values(TECH_TREE).filter(t => t.branch === branchId);
              if (techs.length === 0) return null;
              const ownedCount = techs.filter(t => hasTech(t.id)).length;
              return (
                <div key={branchId} style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px" }}>{branch.icon}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: branch.color }}>{branch.label}</span>
                    <span style={{ fontSize: "9px", color: "#64748b" }}>{ownedCount}/{techs.length}</span>
                  </div>
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                    {techs.map(tech => {
                      const owned = hasTech(tech.id);
                      const canBuy = canUnlockTech(tech.id);
                      const affordable = research >= tech.cost;
                      const missingReqs = tech.requires.filter(r => !hasTech(r));
                      return (
                        <div key={tech.id} style={{
                          padding: "8px 10px", borderRadius: "8px", minWidth: "130px", flex: "1 1 130px", maxWidth: "200px",
                          border: owned ? "1.5px solid #4ade80" : canBuy ? "1.5px solid #c084fc" : "1.5px solid #1a2a4a",
                          background: owned ? "#4ade8008" : canBuy ? "#c084fc08" : "#080f1e",
                          opacity: owned || canBuy ? 1 : 0.45,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                            <span style={{ fontSize: "14px" }}>{tech.icon}</span>
                            <span style={{ fontSize: "9px", fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{tech.cost}RP</span>
                          </div>
                          <div style={{ fontSize: "10px", fontWeight: 700, color: owned ? "#4ade80" : "#e2e8f0", marginBottom: "2px" }}>{tech.name}</div>
                          <div style={{ fontSize: "8px", color: "#64748b", marginBottom: "4px", lineHeight: 1.3 }}>{tech.desc}</div>
                          {tech.unlocks.length > 0 && <div style={{ fontSize: "7px", color: "#475569", marginBottom: "4px" }}>Enables: {tech.unlocks.join(", ")}</div>}
                          {!owned && missingReqs.length > 0 && <div style={{ fontSize: "7px", color: "#ef4444", marginBottom: "4px" }}>Needs: {missingReqs.map(r => TECH_TREE[r]?.name).join(", ")}</div>}
                          {owned ? (
                            <div style={{ fontSize: "9px", color: "#4ade80", fontWeight: 700 }}>✓ Done</div>
                          ) : activeResearch === tech.id ? (
                            <div style={{ fontSize: "9px", color: "#c084fc", fontWeight: 700 }}>🔬 Researching... {researchProgress}/{tech.cost}</div>
                          ) : (
                            <button disabled={!canBuy || (activeResearch && activeResearch !== tech.id)} onClick={() => { if (research >= tech.cost) { unlockTech(tech.id); setTotalResearched(p => p + 1); } else { startResearchChallenge(tech.id); setShowTechTree(false); } }} style={{
                              width: "100%", padding: "4px", borderRadius: "5px", fontSize: "9px", fontWeight: 700, cursor: canBuy && (!activeResearch || activeResearch === tech.id) ? "pointer" : "not-allowed",
                              border: "none", fontFamily: "inherit",
                              background: canBuy && research >= tech.cost ? "#4ade80" : canBuy ? "#c084fc" : "#1a2a4a",
                              color: canBuy ? "#fff" : "#64748b",
                              opacity: canBuy && (!activeResearch || activeResearch === tech.id) ? 1 : 0.5,
                            }}>
                              {!canBuy ? "🔒 Locked" : activeResearch ? "⏳ Busy" : research >= tech.cost ? `Unlock (${tech.cost} RP)` : `Research (${tech.cost} RP)`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Demographics Calculation Challenge */}
      {showDemoCalc && !demoCalcPassed && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "520px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>👥</div>
              <div style={{ ...S.popupBadge, background: "#60a5fa20", borderColor: "#60a5fa40", color: "#60a5fa" }}>DEMOGRAPHICS CHALLENGE</div>
              <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: "6px", marginTop: "6px", fontSize: "10px", fontWeight: 700, background: mathDifficulty === "easy" ? "#22c55e20" : mathDifficulty === "hard" ? "#ef444420" : "#f59e0b20", color: mathDifficulty === "easy" ? "#4ade80" : mathDifficulty === "hard" ? "#fca5a5" : "#fbbf24" }}>
                {mathDifficulty === "easy" ? "🟢 Easy" : mathDifficulty === "hard" ? "🔴 Hard" : "🟡 Medium"}{demoPhase > 1 && ` — Step ${demoPhase}`}
              </div>
            </div>

            {demoPhase === 1 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                Based on the population ratios of your homes, how many <strong style={{ color: "#60a5fa" }}>adults</strong>, <strong style={{ color: "#4ade80" }}>children</strong>, and <strong style={{ color: "#fb923c" }}>elderly</strong> are among the 200 people who move in?
              </p>

              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Your Housing</div>
                {housingCount.houses > 0 && <div style={{ padding: "8px 10px", borderRadius: "6px", background: "#1a2a4a40", marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: "10px", color: "#64748b" }}>🏠 Houses</div><div style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", fontFamily: "monospace" }}>{housingCount.houses} × {HOUSING_TYPES.house.population} = {housingCount.houses * HOUSING_TYPES.house.population} people</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: "9px", color: "#facc15" }}>Ratio 5 : 4 : 1</div><div style={{ fontSize: "8px", color: "#94a3b8" }}>adults : children : elderly</div></div>
                  </div>
                </div>}
                {housingCount.condos > 0 && <div style={{ padding: "8px 10px", borderRadius: "6px", background: "#1a2a4a40", marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: "10px", color: "#64748b" }}>🏢 Condos</div><div style={{ fontSize: "13px", fontWeight: 700, color: "#818cf8", fontFamily: "monospace" }}>{housingCount.condos} × {HOUSING_TYPES.condo.population} = {housingCount.condos * HOUSING_TYPES.condo.population} people</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: "9px", color: "#facc15" }}>Ratio 8 : 1 : 1</div><div style={{ fontSize: "8px", color: "#94a3b8" }}>adults : children : elderly</div></div>
                  </div>
                </div>}
                <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#f59e0b10", border: "1px solid #f59e0b30", fontSize: "9px", color: "#f59e0b", fontFamily: "monospace", lineHeight: 1.5 }}>💡 Split each type using its ratio. e.g. House: 10 people, ratio 5:4:1 → 5 adults, 4 children, 1 elderly</div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", position: "relative" }}>
                {[{k:"adults",l:"👤 Adults",c:"#60a5fa"},{k:"children",l:"👶 Children",c:"#4ade80"},{k:"elderly",l:"👴 Elderly",c:"#fb923c"}].map(f =>
                  <div key={f.k} style={{ flex: 1 }}><label style={{ fontSize: "10px", fontWeight: 700, color: f.c, display: "block", marginBottom: "4px" }}>{f.l}</label><input value={demoCalcAnswers[f.k]} onChange={e => setDemoCalcAnswers(p => ({ ...p, [f.k]: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkDemoCalc()} placeholder="?" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} /></div>
                )}
              </div>
            </>}

            {demoPhase === 2 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                <strong style={{ color: "#ef4444" }}>10 adults</strong>, <strong style={{ color: "#ef4444" }}>2 children</strong>, and <strong style={{ color: "#ef4444" }}>2 elderly</strong> do not move in as planned. What are the <strong style={{ color: "#facc15" }}>new ratios</strong>? Give your answer in <strong style={{ color: "#facc15" }}>simplest whole numbers</strong>.
              </p>
              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>ORIGINAL (from step 1)</div>
                <div style={{ display: "flex", gap: "12px", fontSize: "13px", fontFamily: "monospace", fontWeight: 700, marginBottom: "10px" }}>
                  <span style={{ color: "#60a5fa" }}>Adults: {newResidentDemo.adults}</span><span style={{ color: "#4ade80" }}>Children: {newResidentDemo.children}</span><span style={{ color: "#fb923c" }}>Elderly: {newResidentDemo.elderly}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#fca5a5", fontWeight: 600 }}>Subtract: −10 adults, −2 children, −2 elderly</div>
                <div style={{ marginTop: "8px", padding: "6px 8px", borderRadius: "6px", background: "#f59e0b10", border: "1px solid #f59e0b30", fontSize: "9px", color: "#f59e0b", fontFamily: "monospace" }}>💡 Subtract, then find the HCF to simplify the ratio</div>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px", fontWeight: 600 }}>New ratio (simplest form): Adults : Children : Elderly</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", position: "relative", alignItems: "center" }}>
                {[{k:"adults",c:"#60a5fa"},{k:"children",c:"#4ade80"},{k:"elderly",c:"#fb923c"}].map((f, i) =>
                  <React.Fragment key={f.k}>{i > 0 && <span style={{ color: "#64748b", fontSize: "18px", fontWeight: 700 }}>:</span>}<div style={{ flex: 1 }}><input value={demoMediumAnswers[f.k]} onChange={e => setDemoMediumAnswers(p => ({ ...p, [f.k]: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkDemoCalc()} placeholder="?" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} /></div></React.Fragment>
                )}
              </div>
            </>}

            {demoPhase === 3 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                You have <strong style={{ color: "#facc15" }}>{housingCount.total} housing units</strong> and <strong style={{ color: "#c084fc" }}>3 community groups</strong> (families, couples, singles). Each group must be assigned to a different housing unit. How many <strong style={{ color: "#facc15" }}>unique arrangements</strong> are possible?
              </p>
              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>PERMUTATIONS</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "monospace", lineHeight: 1.6 }}>n = {housingCount.total} housing units, r = 3 groups<br/>P(n, r) = n! ÷ (n − r)!</div>
                <div style={{ marginTop: "8px", padding: "6px 8px", borderRadius: "6px", background: "#c084fc10", border: "1px solid #c084fc30", fontSize: "9px", color: "#c084fc", fontFamily: "monospace" }}>💡 First group: {housingCount.total} choices. Second: {housingCount.total - 1}. Third: {housingCount.total - 2}.</div>
              </div>
              <div><label style={{ fontSize: "11px", fontWeight: 700, color: "#c084fc", display: "block", marginBottom: "4px" }}>Total unique arrangements</label><input value={demoHardAnswer} onChange={e => setDemoHardAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && checkDemoCalc()} placeholder="?" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none", marginBottom: "16px" }} /></div>
            </>}

            {demoCalcFeedback && (<div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, position: "relative", background: demoCalcFeedback.type === "success" ? "#4ade8015" : "#ef444415", border: `1px solid ${demoCalcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`, color: demoCalcFeedback.type === "success" ? "#4ade80" : "#fca5a5" }}>{demoCalcFeedback.msg}</div>)}
            {demoCalcAttempts > 0 && <div style={{ fontSize: "10px", color: "#ef4444", textAlign: "center", marginBottom: "8px", position: "relative" }}>Attempts: {demoCalcAttempts}</div>}
            <button onClick={checkDemoCalc} style={{ ...S.popupBtn, width: "100%", textAlign: "center", background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>{demoPhase === 1 ? "✓ Submit Demographics" : demoPhase === 2 ? "✓ Submit Ratio" : "✓ Submit Answer"}</button>
            <div style={{ textAlign: "center", marginTop: "8px", fontSize: "9px", color: "#475569", position: "relative" }}>⚠ Each wrong answer costs 10% of your treasury</div>
          </div>
        </div>
      )}

      {/* Road Calculation Challenge (Medium/Hard) */}
      {showRoadCalc && pendingRoad && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "500px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>🛣️</div>
              <div style={{ ...S.popupBadge, background: "#9ca3af20", borderColor: "#9ca3af40", color: "#9ca3af" }}>ROAD CHALLENGE</div>
            </div>

            <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "12px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Your Road</div>
              <div style={{ display: "flex", gap: "16px", fontSize: "13px", fontFamily: "monospace", fontWeight: 700 }}>
                <span style={{ color: "#60a5fa" }}>Start: ({pendingRoad.x1}, {pendingRoad.y1})</span>
                <span style={{ color: "#4ade80" }}>End: ({pendingRoad.x2}, {pendingRoad.y2})</span>
              </div>
            </div>

            {roadQuestionType === 1 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                Using the two coordinate points on your road, what is the <strong style={{ color: "#facc15" }}>gradient</strong> of this road?
              </p>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "12px" }}>💡 m = (y₂ − y₁) ÷ (x₂ − x₁)</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#facc15" }}>m =</span>
                <input value={roadCalcAnswer} onChange={e => setRoadCalcAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && checkRoadCalc()} placeholder="e.g. 0.5" style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
            </>}

            {roadQuestionType === 2 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                Using the two coordinate points on your road, what is the <strong style={{ color: "#facc15" }}>equation</strong> of this road?
              </p>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "12px", lineHeight: 1.5 }}>💡 Find m first, then use y − y₁ = m(x − x₁)<br/>Write in the form y = mx + c</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <input value={roadCalcAnswer} onChange={e => setRoadCalcAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && checkRoadCalc()} placeholder="e.g. y=2x+3" style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
            </>}

            {roadQuestionType === 3 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                You need to make a road <strong style={{ color: "#c084fc" }}>perpendicular</strong> to this road. What is the <strong style={{ color: "#facc15" }}>gradient</strong> of the perpendicular road?
              </p>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "12px" }}>💡 Perpendicular gradient = −1 ÷ original gradient</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#c084fc" }}>m⊥ =</span>
                <input value={roadCalcAnswer} onChange={e => setRoadCalcAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && checkRoadCalc()} placeholder="e.g. -2" style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
              <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "8px" }}>After answering, you'll draw the perpendicular road on the map.</div>
            </>}

            {roadQuestionType === 4 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                What is the equation of this road in the form <strong style={{ color: "#facc15" }}>ax + by + c = 0</strong>?
              </p>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "12px", lineHeight: 1.5 }}>💡 Start with y = mx + c, then rearrange so everything is on one side</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <input value={roadCalcAnswer} onChange={e => setRoadCalcAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && checkRoadCalc()} placeholder="e.g. 2x-y+3=0" style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
            </>}

            {roadCalcFeedback && (<div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, position: "relative", background: roadCalcFeedback.type === "success" ? "#4ade8015" : "#ef444415", border: `1px solid ${roadCalcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`, color: roadCalcFeedback.type === "success" ? "#4ade80" : "#fca5a5" }}>{roadCalcFeedback.msg}</div>)}
            {roadCalcAttempts > 0 && <div style={{ fontSize: "10px", color: "#ef4444", textAlign: "center", marginBottom: "8px", position: "relative" }}>Attempts: {roadCalcAttempts}</div>}

            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              <button onClick={checkRoadCalc} style={{ ...S.popupBtn, flex: 1, textAlign: "center", background: "linear-gradient(135deg, #6b7280, #4b5563)" }}>✓ Submit</button>
              <button onClick={() => { setShowRoadCalc(false); setPendingRoad(null); setRoadStart(null); }} style={{ padding: "10px 16px", borderRadius: "10px", background: "#1a2a4a", border: "1px solid #2a3a5e", color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: "12px", fontFamily: "inherit" }}>Cancel</button>
            </div>
            <div style={{ textAlign: "center", marginTop: "8px", fontSize: "9px", color: "#475569", position: "relative" }}>⚠ Each wrong answer costs 10% of your treasury</div>
          </div>
        </div>
      )}

      {/* Curved Road Calculation Challenge (Hard) */}
      {showCurvedCalc && pendingCurved && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "520px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>🟣</div>
              <div style={{ ...S.popupBadge, background: "#c084fc20", borderColor: "#c084fc40", color: "#c084fc" }}>
                {curvedBonusPhase === 0 ? "CURVED ROAD — QUADRATIC" : curvedBonusPhase === 1 ? "BONUS — LINEARISATION" : "BONUS — DOMAIN & RANGE"}
              </div>
              <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: "6px", marginTop: "6px", fontSize: "10px", fontWeight: 700, background: "#ef444420", color: "#fca5a5" }}>🔴 Hard{curvedBonusPhase > 0 && ` — Bonus ${curvedBonusPhase}/2`}</div>
            </div>

            {/* Phase progress */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", position: "relative" }}>
              {[{n:0,l:"Find A & B"},{n:1,l:"Linearise (logs)"},{n:2,l:"Domain & Range"}].map(s => (
                <div key={s.n} style={{ flex: 1, padding: "5px", borderRadius: "6px", textAlign: "center", fontSize: "9px", fontWeight: 700,
                  background: curvedBonusPhase === s.n ? "#c084fc20" : curvedBonusPhase > s.n ? "#4ade8020" : "#1a2a4a",
                  border: `1px solid ${curvedBonusPhase === s.n ? "#c084fc" : curvedBonusPhase > s.n ? "#4ade80" : "#2a3a5e"}`,
                  color: curvedBonusPhase === s.n ? "#c084fc" : curvedBonusPhase > s.n ? "#4ade80" : "#475569",
                }}>{curvedBonusPhase > s.n ? "✓ " : ""}{s.l}</div>
              ))}
            </div>

            {/* Phase 0: Find A and B */}
            {curvedBonusPhase === 0 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                Your curved road passes through two points. Find the equation in the form <strong style={{ color: "#c084fc" }}>y = Ax² + B</strong>.
              </p>
              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #c084fc30", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Points on the curve</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#1a2a4a40", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>Point 1</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#c084fc", fontFamily: "monospace" }}>({pendingCurved.mc1.x}, {pendingCurved.mc1.y})</div>
                  </div>
                  <div style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#1a2a4a40", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#64748b" }}>Point 2</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#c084fc", fontFamily: "monospace" }}>({pendingCurved.mc2.x}, {pendingCurved.mc2.y})</div>
                  </div>
                </div>
                <div style={{ marginTop: "10px", padding: "8px", borderRadius: "6px", background: "#c084fc08", border: "1px solid #c084fc20", fontSize: "9px", color: "#a78bfa", fontFamily: "monospace", lineHeight: 1.6 }}>
                  💡 Simultaneous equations:<br/>
                  {pendingCurved.mc1.y} = A({pendingCurved.mc1.x})² + B &nbsp;... ①<br/>
                  {pendingCurved.mc2.y} = A({pendingCurved.mc2.x})² + B &nbsp;... ②<br/>
                  Subtract to eliminate B, find A, then B
                </div>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#c084fc", textAlign: "center", fontFamily: "monospace", marginBottom: "16px", position: "relative" }}>y = <span style={{ color: "#facc15" }}>A</span>x² + <span style={{ color: "#22d3ee" }}>B</span></div>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", position: "relative" }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: "11px", fontWeight: 700, color: "#facc15", display: "block", marginBottom: "4px" }}>A =</label><input value={curvedAnswers.a} onChange={e => setCurvedAnswers(p => ({ ...p, a: e.target.value }))} onKeyDown={e => e.key === "Enter" && curvedAnswers.b && checkCurvedCalc()} placeholder="?" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: "11px", fontWeight: 700, color: "#22d3ee", display: "block", marginBottom: "4px" }}>B =</label><input value={curvedAnswers.b} onChange={e => setCurvedAnswers(p => ({ ...p, b: e.target.value }))} onKeyDown={e => e.key === "Enter" && curvedAnswers.a && checkCurvedCalc()} placeholder="?" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} /></div>
              </div>
            </>}

            {/* Phase 1: Linearisation using logs */}
            {curvedBonusPhase === 1 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "12px", position: "relative" }}>
                Your road equation is <strong style={{ color: "#c084fc" }}>y = {pendingCurved.A.toFixed(3)}x² + {pendingCurved.B.toFixed(2)}</strong>.
                Linearise the relationship <strong style={{ color: "#facc15" }}>y − B = Ax²</strong> using logarithms to express it in the form <strong style={{ color: "#4ade80" }}>Y = mX + c</strong>.
              </p>
              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #c084fc30", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Linearisation</div>
                <div style={{ fontSize: "12px", color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.8 }}>
                  y − B = Ax²<br/>
                  <span style={{ color: "#64748b" }}>Take log₁₀ of both sides:</span><br/>
                  log(y − B) = log(A) + 2·log(x)<br/>
                  <span style={{ color: "#64748b" }}>Let Y = log(y − B), X = log(x):</span><br/>
                  <strong style={{ color: "#4ade80" }}>Y = mX + c</strong>
                </div>
                <div style={{ marginTop: "10px", padding: "6px 8px", borderRadius: "6px", background: "#4ade8010", border: "1px solid #4ade8030", fontSize: "9px", color: "#4ade80", fontFamily: "monospace" }}>
                  💡 The power of x² becomes the gradient m. The log of A becomes the y-intercept c.
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", position: "relative" }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: "11px", fontWeight: 700, color: "#facc15", display: "block", marginBottom: "4px" }}>m (gradient) =</label><input value={curvedBonusAnswers.m} onChange={e => setCurvedBonusAnswers(p => ({ ...p, m: e.target.value }))} onKeyDown={e => e.key === "Enter" && curvedBonusAnswers.c && checkCurvedCalc()} placeholder="?" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: "11px", fontWeight: 700, color: "#22d3ee", display: "block", marginBottom: "4px" }}>c (y-intercept) =</label><input value={curvedBonusAnswers.c} onChange={e => setCurvedBonusAnswers(p => ({ ...p, c: e.target.value }))} onKeyDown={e => e.key === "Enter" && curvedBonusAnswers.m && checkCurvedCalc()} placeholder={`log₁₀(${Math.abs(pendingCurved.A).toFixed(3)})`} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} /></div>
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", textAlign: "center", marginBottom: "12px" }}>🎯 Bonus question — +§50,000 reward</div>
            </>}

            {/* Phase 2: Domain and range */}
            {curvedBonusPhase === 2 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "12px", position: "relative" }}>
                Your curved road <strong style={{ color: "#c084fc" }}>y = {pendingCurved.A.toFixed(3)}x² + {pendingCurved.B.toFixed(2)}</strong> runs between the two endpoints. What are the <strong style={{ color: "#facc15" }}>domain</strong> and <strong style={{ color: "#22d3ee" }}>range</strong>?
              </p>
              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "16px", border: "1px solid #c084fc30", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Endpoints</div>
                <div style={{ display: "flex", gap: "12px", fontSize: "13px", fontFamily: "monospace", fontWeight: 700 }}>
                  <span style={{ color: "#c084fc" }}>({pendingCurved.mc1.x}, {pendingCurved.mc1.y})</span>
                  <span style={{ color: "#64748b" }}>→</span>
                  <span style={{ color: "#c084fc" }}>({pendingCurved.mc2.x}, {pendingCurved.mc2.y})</span>
                </div>
                <div style={{ marginTop: "10px", padding: "6px 8px", borderRadius: "6px", background: "#f59e0b10", border: "1px solid #f59e0b30", fontSize: "9px", color: "#f59e0b", fontFamily: "monospace", lineHeight: 1.6 }}>
                  💡 Domain = set of valid x-values (between endpoints)<br/>
                  Range = set of y-values the curve takes{Math.min(pendingCurved.mc1.x, pendingCurved.mc2.x) <= 0 && Math.max(pendingCurved.mc1.x, pendingCurved.mc2.x) >= 0 ? " (check vertex at x=0!)" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", position: "relative" }}>
                <div style={{ flex: 1, background: "#0a0f1a", borderRadius: "8px", padding: "10px", border: "1px solid #facc1530" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#facc15", marginBottom: "8px" }}>Domain (x-values)</div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input value={curvedBonusAnswers.domMin} onChange={e => setCurvedBonusAnswers(p => ({ ...p, domMin: e.target.value }))} placeholder="min" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "14px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>≤ x ≤</span>
                    <input value={curvedBonusAnswers.domMax} onChange={e => setCurvedBonusAnswers(p => ({ ...p, domMax: e.target.value }))} placeholder="max" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "14px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                  </div>
                </div>
                <div style={{ flex: 1, background: "#0a0f1a", borderRadius: "8px", padding: "10px", border: "1px solid #22d3ee30" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#22d3ee", marginBottom: "8px" }}>Range (y-values)</div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input value={curvedBonusAnswers.ranMin} onChange={e => setCurvedBonusAnswers(p => ({ ...p, ranMin: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkCurvedCalc()} placeholder="min" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "14px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>≤ y ≤</span>
                    <input value={curvedBonusAnswers.ranMax} onChange={e => setCurvedBonusAnswers(p => ({ ...p, ranMax: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkCurvedCalc()} placeholder="max" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "14px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                  </div>
                </div>
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", textAlign: "center", marginBottom: "12px" }}>🎯 Bonus question — +§100,000 reward</div>
            </>}

            {curvedCalcFeedback && (<div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, position: "relative", background: curvedCalcFeedback.type === "success" ? "#4ade8015" : "#ef444415", border: `1px solid ${curvedCalcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`, color: curvedCalcFeedback.type === "success" ? "#4ade80" : "#fca5a5" }}>{curvedCalcFeedback.msg}</div>)}
            {curvedCalcAttempts > 0 && <div style={{ fontSize: "10px", color: "#ef4444", textAlign: "center", marginBottom: "8px", position: "relative" }}>Attempts: {curvedCalcAttempts}</div>}

            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              <button onClick={checkCurvedCalc} style={{ ...S.popupBtn, flex: 1, textAlign: "center", background: "linear-gradient(135deg, #a78bfa, #7c3aed)" }}>
                {curvedBonusPhase === 0 ? "✓ Submit Equation" : curvedBonusPhase === 1 ? "✓ Submit Linearisation" : "✓ Submit Domain & Range"}
              </button>
              {curvedBonusPhase > 0 && <button onClick={() => { setShowCurvedCalc(false); setPendingCurved(null); setCurvedBonusPhase(0); }} style={{ padding: "10px 16px", borderRadius: "10px", background: "#1a2a4a", border: "1px solid #2a3a5e", color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: "12px", fontFamily: "inherit" }}>Skip Bonus</button>}
              {curvedBonusPhase === 0 && <button onClick={() => { setShowCurvedCalc(false); setPendingCurved(null); setCurvedRoadStart(null); setCurvedBonusPhase(0); }} style={{ padding: "10px 16px", borderRadius: "10px", background: "#1a2a4a", border: "1px solid #2a3a5e", color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: "12px", fontFamily: "inherit" }}>Cancel</button>}
            </div>
            <div style={{ textAlign: "center", marginTop: "8px", fontSize: "9px", color: "#475569", position: "relative" }}>⚠ Each wrong answer costs 10% of your treasury</div>
          </div>
        </div>
      )}

      {/* Pollution Calculation Challenge */}
      {showPollutionCalc && !pollCalcPassed && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "540px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>☣️</div>
              <div style={{ ...S.popupBadge, background: "#f59e0b20", borderColor: "#f59e0b40", color: "#fb923c" }}>POLLUTION ANALYSIS</div>
              <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: "6px", marginTop: "6px", fontSize: "10px", fontWeight: 700, background: mathDifficulty === "easy" ? "#22c55e20" : mathDifficulty === "hard" ? "#ef444420" : "#f59e0b20", color: mathDifficulty === "easy" ? "#4ade80" : mathDifficulty === "hard" ? "#fca5a5" : "#fbbf24" }}>
                {mathDifficulty === "easy" ? "🟢 Easy — Loci Identification" : mathDifficulty === "hard" ? "🔴 Hard — Probability Function" : "🟡 Medium — Quadratic Model"}{pollCalcPhase > 1 && ` — Step ${pollCalcPhase}`}
              </div>
            </div>

            {/* Pollution data */}
            <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "12px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Garbage Disposal Pollution Radii</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "100px", padding: "8px", borderRadius: "6px", background: "#1a2a4a40", textAlign: "center" }}>
                  <div style={{ fontSize: "18px" }}>🔊</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#fb923c" }}>Noise</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", fontFamily: "monospace" }}>0.2 km</div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>200m radius</div>
                </div>
                <div style={{ flex: 1, minWidth: "100px", padding: "8px", borderRadius: "6px", background: "#1a2a4a40", textAlign: "center" }}>
                  <div style={{ fontSize: "18px" }}>🟤</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#a16207" }}>Ground</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", fontFamily: "monospace" }}>1.0 km</div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>1000m radius</div>
                </div>
                <div style={{ flex: 1, minWidth: "100px", padding: "8px", borderRadius: "6px", background: "#1a2a4a40", textAlign: "center" }}>
                  <div style={{ fontSize: "18px" }}>💨</div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444" }}>Air</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", fontFamily: "monospace" }}>0.9 km</div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>900m radius</div>
                </div>
              </div>
              <div style={{ marginTop: "8px", fontSize: "9px", color: "#94a3b8" }}>
                🚰 Water & Sewage pipes also generate noise pollution: 0.3 km (300m) from each endpoint
              </div>
            </div>

            {/* EASY: Loci sketch identification */}
            {mathDifficulty === "easy" && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                Identify the <strong style={{ color: "#facc15" }}>three pollution loci</strong> around your garbage disposal. Each type creates a circular exclusion zone where <strong style={{ color: "#ef4444" }}>housing should not be built</strong>.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", position: "relative" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>Tick each locus you can identify on the map:</div>
                {[
                  { key: "noise", icon: "🔊", label: "Noise locus", desc: "Circle with radius 200m (2 grid cells) from the garbage disposal", color: "#fb923c" },
                  { key: "ground", icon: "🟤", label: "Ground contamination locus", desc: "Circle with radius 1000m (10 grid cells) — the largest zone", color: "#a16207" },
                  { key: "air", icon: "💨", label: "Air pollution locus", desc: "Circle with radius 900m (9 grid cells) from the garbage disposal", color: "#ef4444" },
                ].map(l => (
                  <button key={l.key} onClick={() => setPollLociConfirmed(p => ({ ...p, [l.key]: !p[l.key] }))} style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "8px", width: "100%",
                    border: pollLociConfirmed[l.key] ? `2px solid ${l.color}` : "2px solid #2a3a5e",
                    background: pollLociConfirmed[l.key] ? `${l.color}15` : "#080f1e",
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                  }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: pollLociConfirmed[l.key] ? l.color : "#2a3a5e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "12px", flexShrink: 0 }}>
                      {pollLociConfirmed[l.key] ? "✓" : ""}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: pollLociConfirmed[l.key] ? l.color : "#94a3b8" }}>{l.icon} {l.label}</div>
                      <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{l.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: "6px", padding: "8px", marginBottom: "16px", fontSize: "9px", color: "#f59e0b", fontFamily: "monospace", lineHeight: 1.5 }}>
                💡 A locus is a set of points that satisfy a condition.<br/>
                Each pollution type creates a circular locus: all points within distance r from the source.<br/>
                Housing must be placed OUTSIDE the largest locus (ground: 1000m) to be safe.
              </div>
            </>}

            {/* MEDIUM Phase 1: Find k */}
            {mathDifficulty === "medium" && pollCalcPhase === 1 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                The number of people that get sick in a pollution zone (<strong style={{ color: "#ef4444" }}>y</strong>) follows the model:
              </p>
              <div style={{ textAlign: "center", padding: "14px", background: "#0a0f1a", borderRadius: "10px", border: "1px solid #1a2a4a", marginBottom: "16px", position: "relative" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#facc15", fontFamily: "monospace" }}>y = kx²</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>where x = distance in metres inside the pollution locus boundary</div>
              </div>
              <div style={{ background: "#1a2a4a40", borderRadius: "8px", padding: "10px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.6 }}>
                  <strong style={{ color: "#22d3ee" }}>Given:</strong> 40 people got sick when they were <strong style={{ color: "#facc15" }}>10 metres</strong> inside the pollution locus.
                </div>
                <div style={{ fontSize: "12px", color: "#fb923c", fontWeight: 700, marginTop: "6px" }}>Find the value of k.</div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#facc15", display: "block", marginBottom: "4px" }}>k =</label>
                <input value={pollCalcAnswers.k} onChange={e => setPollCalcAnswers(p => ({ ...p, k: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPollutionCalc()} placeholder="?" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "16px" }}>💡 Substitute y = 40 and x = 10 into y = kx², then solve for k</div>
            </>}

            {/* MEDIUM Phase 2: Predict sick at 21m */}
            {mathDifficulty === "medium" && pollCalcPhase === 2 && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
                Using <strong style={{ color: "#facc15" }}>k = {POLL_K}</strong>, how many people would get sick if they were <strong style={{ color: "#ef4444" }}>21 metres</strong> inside the pollution locus?
              </p>
              <div style={{ textAlign: "center", padding: "14px", background: "#0a0f1a", borderRadius: "10px", border: "1px solid #1a2a4a", marginBottom: "16px", position: "relative" }}>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#facc15", fontFamily: "monospace" }}>y = {POLL_K}x²</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>x = 21 metres, y = ?</div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", display: "block", marginBottom: "4px" }}>Number of sick people =</label>
                <input value={pollCalcAnswers.sick} onChange={e => setPollCalcAnswers(p => ({ ...p, sick: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPollutionCalc()} placeholder="?" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "16px" }}>💡 Substitute x = 21 into y = {POLL_K} × x². Accept 1 d.p.</div>
            </>}

            {/* HARD: Integration of probability function */}
            {mathDifficulty === "hard" && <>
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "12px", position: "relative" }}>
                The probability density of someone being sick in a pollution locus is represented by:
              </p>
              <div style={{ textAlign: "center", padding: "14px", background: "#0a0f1a", borderRadius: "10px", border: "1px solid #ef444440", marginBottom: "6px", position: "relative" }}>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#fca5a5", fontFamily: "monospace" }}>F(X) = 0.5X(1 − X)</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", fontFamily: "monospace" }}>0 &lt; X &lt; 1</div>
                <div style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>F(X) = 0 otherwise</div>
                <div style={{ fontSize: "11px", color: "#fb923c", marginTop: "8px" }}>X represents the distance (km) inside the pollution locus boundary</div>
              </div>
              <div style={{ background: "#1a2a4a40", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.8 }}>
                  If there are <strong style={{ color: "#22d3ee" }}>100 people</strong> in the pollution locus, how many are estimated to be sick <strong style={{ color: "#facc15" }}>0.2 km</strong> from the locus boundary?
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "10px", lineHeight: 1.8 }}>
                  <strong style={{ color: "#c084fc" }}>Steps:</strong><br/>
                  1. Expand F(X) = 0.5X(1 − X)<br/>
                  2. Integrate to get the cumulative function<br/>
                  3. Evaluate with boundaries [0, 0.2]<br/>
                  4. Multiply by 100 to get the expected number
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#c084fc", display: "block", marginBottom: "4px" }}>Expected number of sick people =</label>
                <input value={pollCalcAnswers.hard} onChange={e => setPollCalcAnswers(p => ({ ...p, hard: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPollutionCalc()} placeholder="e.g. 0.87" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "20px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
              <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "16px", lineHeight: 1.6 }}>
                💡 0.5X(1−X) = 0.5X − 0.5X²<br/>
                ∫(0.5X − 0.5X²)dX = 0.25X² − X³/6<br/>
                Evaluate at [0, 0.2], then × 100
              </div>
            </>}

            {pollCalcFeedback && (<div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, position: "relative", background: pollCalcFeedback.type === "success" ? "#4ade8015" : "#ef444415", border: `1px solid ${pollCalcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`, color: pollCalcFeedback.type === "success" ? "#4ade80" : "#fca5a5" }}>{pollCalcFeedback.msg}</div>)}
            {pollCalcAttempts > 0 && <div style={{ fontSize: "10px", color: "#ef4444", textAlign: "center", marginBottom: "8px", position: "relative" }}>Attempts: {pollCalcAttempts}</div>}

            <button onClick={checkPollutionCalc} style={{ ...S.popupBtn, width: "100%", textAlign: "center", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              {mathDifficulty === "easy" ? "✓ Confirm Loci" : pollCalcPhase === 1 && mathDifficulty === "medium" ? "✓ Submit k" : "✓ Submit Answer"}
            </button>
            {mathDifficulty === "medium" && pollCalcPhase === 1 && <div style={{ textAlign: "center", marginTop: "6px", fontSize: "9px", color: "#f59e0b", position: "relative" }}>Step 1 of 2</div>}
            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "9px", color: "#475569", position: "relative" }}>⚠ Each wrong answer costs 10% of your treasury</div>
          </div>
        </div>
      )}

      {/* Job Sector Randomizer */}
      {showJobRandom && !jobResultLocked && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "480px" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "12px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>💼</div>
              <div style={{ ...S.popupBadge, background: "#eab30820", borderColor: "#eab30840", color: "#eab308" }}>
                {jobResult ? "JOB SECTOR RESULT" : "JOB SECTOR LOTTERY"}
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "6px", textAlign: "center", position: "relative" }}>
              {jobResult
                ? `Your city's economy is dominated by the ${jobResult.dominant} sector!`
                : "What type of economy will your city develop? The ball decides your fate!"}
            </p>

            {civics === "technologist" && !jobResult && (
              <div style={{ textAlign: "center", fontSize: "10px", color: "#c084fc", marginBottom: "12px", fontWeight: 600, position: "relative" }}>
                ⚡ Technologist bonus: Tertiary sector has 50% probability
              </div>
            )}

            {/* The bar */}
            <div style={{ position: "relative", marginBottom: "20px" }}>
              {/* Section labels above */}
              <div style={{ display: "flex", marginBottom: "4px", position: "relative" }}>
                {jobBarSections.map(s => (
                  <div key={s.id} style={{ flex: s.end - s.start, textAlign: "center", fontSize: "9px", fontWeight: 700, color: s.color }}>
                    {s.label} ({Math.round((s.end - s.start) * 100)}%)
                  </div>
                ))}
              </div>

              {/* Bar */}
              <div style={{ display: "flex", height: "60px", borderRadius: "12px", overflow: "hidden", border: "2px solid #2a3a5e", position: "relative" }}>
                {jobBarSections.map(s => (
                  <div key={s.id} style={{
                    flex: s.end - s.start,
                    background: `linear-gradient(180deg, ${s.color}cc 0%, ${s.color}88 100%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRight: s.id !== "tertiary" ? "2px solid #1a2a4a" : "none",
                    transition: "opacity 0.3s",
                    opacity: jobResult ? (jobResult.dominant === s.id ? 1 : 0.3) : 1,
                  }}>
                    <span style={{ fontSize: "16px", fontWeight: 900, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                      {s.id === "primary" ? "🏭" : s.id === "secondary" ? "🔧" : "💻"}
                    </span>
                  </div>
                ))}

                {/* Ball */}
                <div style={{
                  position: "absolute", top: "50%", left: `${jobBallPos * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "radial-gradient(circle at 40% 35%, #fff 0%, #e2e8f0 40%, #94a3b8 100%)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.2)",
                  border: "2px solid #fff",
                  transition: jobTimerRunning ? "left 0.05s linear" : "left 0.3s ease-out",
                  zIndex: 2,
                }} />
              </div>

              {/* Timer bar */}
              {!jobResult && (
                <div style={{ marginTop: "8px", height: "6px", background: "#1a2a4a", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: jobTimeLeft > 2 ? "#22c55e" : jobTimeLeft > 1 ? "#eab308" : "#ef4444", borderRadius: "3px", width: `${(jobTimeLeft / 5) * 100}%`, transition: "width 0.1s linear" }} />
                </div>
              )}
              {!jobResult && <div style={{ textAlign: "center", marginTop: "4px", fontSize: "20px", fontWeight: 900, color: jobTimeLeft > 2 ? "#22c55e" : jobTimeLeft > 1 ? "#eab308" : "#ef4444", fontFamily: "monospace", position: "relative" }}>
                {jobTimerRunning ? jobTimeLeft.toFixed(1) + "s" : "Ready"}
              </div>}
            </div>

            {/* Result display */}
            {jobResult && (
              <div style={{ background: "#0a0f1a", borderRadius: "12px", padding: "16px", border: "1px solid #1a2a4a", marginBottom: "16px", position: "relative" }}>
                <div style={{ textAlign: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: jobBarSections.find(s => s.id === jobResult.dominant)?.color }}>
                    {jobResult.dominant === "primary" ? "🏭 Primary" : jobResult.dominant === "secondary" ? "🔧 Secondary" : "💻 Tertiary"} sector dominates at 60%
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {["primary", "secondary", "tertiary"].map(s => {
                    const section = jobBarSections.find(b => b.id === s);
                    const pct = jobResult.split[s];
                    const count = Math.round(demographics.adults * pct / 100);
                    return (
                      <div key={s} style={{ flex: 1, padding: "10px", borderRadius: "8px", background: `${section.color}15`, border: `1px solid ${section.color}40`, textAlign: "center" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: section.color }}>{s === "primary" ? "🏭 Primary" : s === "secondary" ? "🔧 Secondary" : "💻 Tertiary"}</div>
                        <div style={{ fontSize: "24px", fontWeight: 900, color: section.color, fontFamily: "monospace" }}>{pct}%</div>
                        <div style={{ fontSize: "9px", color: "#94a3b8" }}>{count} workers</div>
                        <div style={{ fontSize: "8px", color: "#64748b", marginTop: "2px" }}>{s === "primary" ? "Farming, Mining" : s === "secondary" ? "Manufacturing" : "Services, Tech"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Probability explanation */}
            {!jobResult && !jobTimerRunning && (
              <div style={{ background: "#1a2a4a40", borderRadius: "8px", padding: "8px 10px", marginBottom: "12px", fontSize: "9px", color: "#c084fc", fontFamily: "monospace", lineHeight: 1.5, position: "relative" }}>
                💡 Probability: Each section's width = its probability.<br/>
                {civics === "technologist"
                  ? "Technologist civic: P(Tertiary) = 0.50, P(Primary) = P(Secondary) = 0.25"
                  : "Equal distribution: P(Primary) = P(Secondary) = P(Tertiary) = 0.33"}
                <br/>The ball moves randomly — where it stops is weighted by section size.
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              {!jobTimerRunning && !jobResult && (
                <button onClick={() => { setJobTimerRunning(true); setJobTimeLeft(5); setJobBallPos(0.5); }} style={{ ...S.popupBtn, flex: 1, textAlign: "center", background: "linear-gradient(135deg, #eab308, #ca8a04)" }}>
                  🎲 Spin!
                </button>
              )}
              {jobResult && (
                <button onClick={() => { setJobResultLocked(true); setShowJobRandom(false); addNotification(`💼 Economy set: ${jobResult.dominant} sector dominant (${jobResult.split.primary}/${jobResult.split.secondary}/${jobResult.split.tertiary})`); }} style={{ ...S.popupBtn, flex: 1, textAlign: "center" }}>
                  Accept & Continue →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pipe Calculation Challenge */}
      {showPipeCalc && pendingPipe && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "520px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>{PIPE_SPECS[pendingPipe.type]?.icon}</div>
              <div style={{ ...S.popupBadge, background: "#22d3ee20", borderColor: "#22d3ee40", color: "#22d3ee" }}>PIPE CALCULATION</div>
              <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: "6px", marginTop: "6px", fontSize: "10px", fontWeight: 700, background: mathDifficulty === "easy" ? "#22c55e20" : mathDifficulty === "hard" ? "#ef444420" : "#f59e0b20", color: mathDifficulty === "easy" ? "#4ade80" : mathDifficulty === "hard" ? "#fca5a5" : "#fbbf24" }}>
                {mathDifficulty === "easy" ? "🟢 Easy" : mathDifficulty === "hard" ? "🔴 Hard — Related Rates" : "🟡 Medium"}
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
              {mathDifficulty === "hard"
                ? <>Solve this <strong style={{ color: "#ef4444" }}>related rates</strong> problem to lay your {PIPE_SPECS[pendingPipe.type]?.label.toLowerCase()}.</>
                : <>Calculate the water flow through your {PIPE_SPECS[pendingPipe.type]?.label.toLowerCase()}.</>}
            </p>

            {/* Given values - only shown for easy/medium */}
            {mathDifficulty !== "hard" && <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "12px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Given values</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px" }}>
                <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#1a2a4a40" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Start point</div>
                  <div style={{ fontWeight: 700, color: "#22d3ee", fontFamily: "monospace" }}>({pendingPipe.x1}, {pendingPipe.y1})</div>
                </div>
                <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#1a2a4a40" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>End point</div>
                  <div style={{ fontWeight: 700, color: "#22d3ee", fontFamily: "monospace" }}>({pendingPipe.x2}, {pendingPipe.y2})</div>
                </div>
                <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#1a2a4a40" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Pipe radius (r)</div>
                  <div style={{ fontWeight: 700, color: "#facc15", fontFamily: "monospace" }}>{pendingPipe.radiusCm} cm = {pendingPipe.rMeters} m</div>
                </div>
                <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#1a2a4a40" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Time (T)</div>
                  <div style={{ fontWeight: 700, color: "#fb923c", fontFamily: "monospace" }}>{pendingPipe.timeSeconds} seconds</div>
                </div>
                <div style={{ padding: "6px 8px", borderRadius: "6px", background: "#1a2a4a40", gridColumn: "span 2" }}>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>Grid scale</div>
                  <div style={{ fontWeight: 700, color: "#94a3b8", fontFamily: "monospace" }}>1 cell = {METERS_PER_CELL}m</div>
                </div>
              </div>
            </div>}

            {/* Step progress */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", position: "relative" }}>
              {(mathDifficulty === "hard" ? [{n:4,l:"Related Rates"}] : [{n:1,l:"Distance (h)"},{n:2,l:"Volume (V)"},{n:3,l:"Flow Rate (Q)"}]).map(s => (
                <div key={s.n} style={{ flex: 1, padding: "6px", borderRadius: "6px", textAlign: "center", fontSize: "10px", fontWeight: 700,
                  background: pipeCalcStep === s.n ? "#22d3ee20" : pipeCalcStep > s.n ? "#4ade8020" : "#1a2a4a",
                  border: `1px solid ${pipeCalcStep === s.n ? "#22d3ee" : pipeCalcStep > s.n ? "#4ade80" : "#2a3a5e"}`,
                  color: pipeCalcStep === s.n ? "#22d3ee" : pipeCalcStep > s.n ? "#4ade80" : "#475569",
                }}>{pipeCalcStep > s.n ? "✓ " : ""}{s.l}</div>
              ))}
            </div>

            {/* Current step input */}
            <div style={{ marginBottom: "16px", position: "relative" }}>
              {pipeCalcStep === 1 && <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#22d3ee", marginBottom: "4px" }}>Step 1: Calculate the pipe length (h) in metres</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "8px", fontFamily: "monospace" }}>h = √((x₂−x₁)² + (y₂−y₁)²) × {METERS_PER_CELL}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#22d3ee" }}>h =</span>
                  <input value={pipeCalcAnswer.h} onChange={e => setPipeCalcAnswer(p => ({ ...p, h: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPipeCalc()} placeholder="metres" style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>m</span>
                </div>
              </div>}
              {pipeCalcStep === 2 && <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#facc15", marginBottom: "4px" }}>Step 2: Calculate the volume (V) of the cylindrical pipe</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px", fontFamily: "monospace" }}>V = π × r² × h</div>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px" }}>r = {pendingPipe.rMeters}m, h = {pendingPipe.lengthM.toFixed(1)}m</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#facc15" }}>V =</span>
                  <input value={pipeCalcAnswer.v} onChange={e => setPipeCalcAnswer(p => ({ ...p, v: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPipeCalc()} placeholder="m³" style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>m³</span>
                </div>
              </div>}
              {pipeCalcStep === 3 && <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#4ade80", marginBottom: "4px" }}>Step 3: Calculate the flow rate (Q)</div>
                <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px", fontFamily: "monospace" }}>Q = V ÷ T</div>
                <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "8px" }}>V = {pendingPipe.volumeM3.toFixed(2)} m³, T = {pendingPipe.timeSeconds}s</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>Q =</span>
                  <input value={pipeCalcAnswer.q} onChange={e => setPipeCalcAnswer(p => ({ ...p, q: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPipeCalc()} placeholder="m³/s" style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>m³/s</span>
                </div>
              </div>}
              {pipeCalcStep === 4 && <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#ef4444", marginBottom: "8px" }}>🔴 Hard: Related Rates</div>
                <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "14px", marginBottom: "14px", border: "1px solid #ef444440" }}>
                  <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, margin: 0 }}>
                    Water flows at a rate of <strong style={{ color: "#22d3ee" }}>600 cm³/s</strong> through a cylindrical tank.
                  </p>
                  <p style={{ fontSize: "13px", color: "#fb923c", fontWeight: 700, lineHeight: 1.6, margin: "8px 0 0" }}>
                    How fast is the height of the water level changing when the radius of the cylinder is <strong style={{ color: "#facc15" }}>50 cm</strong>?
                  </p>
                </div>
                <div style={{ background: "#1a2a4a40", borderRadius: "8px", padding: "10px", marginBottom: "14px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Given</div>
                  <div style={{ display: "flex", gap: "12px", fontSize: "12px", fontFamily: "monospace" }}>
                    <span style={{ color: "#22d3ee" }}>dV/dt = 600 cm³/s</span>
                    <span style={{ color: "#facc15" }}>r = 50 cm</span>
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginTop: "10px", marginBottom: "6px" }}>Find</div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#fb923c" }}>dh/dt = ? cm/s</div>
                </div>
                <div style={{ fontSize: "9px", color: "#64748b", fontFamily: "monospace", marginBottom: "14px", lineHeight: 1.6, background: "#c084fc10", border: "1px solid #c084fc30", borderRadius: "6px", padding: "8px" }}>
                  💡 V = πr²h<br/>
                  Differentiate with respect to time:<br/>
                  dV/dt = πr² × dh/dt<br/>
                  Rearrange to find dh/dt
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444" }}>dh/dt =</span>
                  <input value={pipeCalcAnswer.dhdt} onChange={e => setPipeCalcAnswer(p => ({ ...p, dhdt: e.target.value }))} onKeyDown={e => e.key === "Enter" && checkPipeCalc()} placeholder="e.g. 0.0764" style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "16px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>cm/s</span>
                </div>
              </div>}
            </div>
            {pipeCalcFeedback && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, position: "relative",
                background: pipeCalcFeedback.type === "success" ? "#4ade8015" : "#ef444415",
                border: `1px solid ${pipeCalcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`,
                color: pipeCalcFeedback.type === "success" ? "#4ade80" : "#fca5a5",
              }}>{pipeCalcFeedback.msg}</div>
            )}

            {pipeAttempts > 0 && <div style={{ fontSize: "10px", color: "#ef4444", textAlign: "center", marginBottom: "8px", position: "relative" }}>Attempts: {pipeAttempts}</div>}

            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              <button onClick={checkPipeCalc} style={{ ...S.popupBtn, flex: 1, textAlign: "center", background: pipeCalcStep === 4 ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #22d3ee, #0891b2)" }}>{pipeCalcStep === 4 ? "✓ Submit Answer" : `✓ Submit Step ${pipeCalcStep}`}</button>
              <button onClick={() => { setShowPipeCalc(false); setPendingPipe(null); setPipeDragStart(null); }} style={{ padding: "10px 16px", borderRadius: "10px", background: "#1a2a4a", border: "1px solid #2a3a5e", color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: "12px", fontFamily: "inherit" }}>Cancel</button>
            </div>

            {!calcMode && <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", color: "#f59e0b", position: "relative" }}>✏️ Calculator is OFF — show your working!</div>}
            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "9px", color: "#475569", position: "relative" }}>⚠ Each wrong answer costs 10% of your treasury</div>
          </div>
        </div>
      )}

      {/* Calculation Challenge */}
      {showCalcChallenge && !calcPassed && (
        <div style={S.popupOverlay}>
          <div style={{ ...S.popup, maxWidth: "500px", textAlign: "left" }}>
            <div style={S.popupGlow} />
            <div style={{ textAlign: "center", marginBottom: "16px", position: "relative" }}>
              <div style={{ fontSize: "48px", marginBottom: "4px" }}>🧮</div>
              <div style={{ ...S.popupBadge, background: "#3b82f620", borderColor: "#3b82f640", color: "#60a5fa" }}>CALCULATION CHALLENGE</div>
            </div>

            <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, marginBottom: "16px", position: "relative" }}>
              {calcPhase === 1 ? <>You've placed {energyCount} energy generators. Now calculate the <strong style={{ color: "#facc15" }}>total energy output</strong> and <strong style={{ color: "#4ade80" }}>total cost</strong> of all your generators.{mathDifficulty === "hard" && <span style={{ color: "#ef4444" }}> Express your answers in standard form.</span>}{mathDifficulty === "medium" && <span style={{ color: "#f59e0b" }}> You'll then need to convert to kW.</span>}</> : <>Now convert <strong style={{ color: "#22d3ee" }}>{generatorTotals.totalMW} MW</strong> into <strong style={{ color: "#facc15" }}>kilowatts (kW)</strong>.</>}
            </p>

            {/* Difficulty badge */}
            <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: "6px", marginBottom: "12px", fontSize: "10px", fontWeight: 700, position: "relative", background: mathDifficulty === "easy" ? "#22c55e20" : mathDifficulty === "hard" ? "#ef444420" : "#f59e0b20", color: mathDifficulty === "easy" ? "#4ade80" : mathDifficulty === "hard" ? "#fca5a5" : "#fbbf24", border: `1px solid ${mathDifficulty === "easy" ? "#22c55e40" : mathDifficulty === "hard" ? "#ef444440" : "#f59e0b40"}` }}>
              {mathDifficulty === "easy" ? "🟢 Easy" : mathDifficulty === "hard" ? "🔴 Hard — Standard Form" : "🟡 Medium — with kW conversion"}
            </div>

            {calcPhase === 1 && <>
            {/* Generator breakdown */}
            <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "12px", marginBottom: "16px", border: "1px solid #1a2a4a", position: "relative" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Your generators</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {generatorTotals.breakdown.map((g, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px", borderRadius: "6px", background: "#1a2a4a40", fontSize: "12px" }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{g.name}</span>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <span style={{ color: "#22d3ee", fontFamily: "monospace", fontWeight: 700 }}>{mathDifficulty === "hard" ? toStdForm(g.power) : g.power} MW</span>
                      <span style={{ color: "#fbbf24", fontFamily: "monospace", fontWeight: 700 }}>§{mathDifficulty === "hard" ? toStdForm(g.cost) : g.cost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {mathDifficulty === "hard" && <div style={{ marginTop: "8px", padding: "6px 8px", borderRadius: "6px", background: "#ef444415", border: "1px solid #ef444430", fontSize: "9px", color: "#fca5a5" }}>🔴 Values shown in standard form. Answer in standard form (e.g. 9.6 × 10^2)</div>}
              {!calcMode && <div style={{ marginTop: "8px", padding: "6px 8px", borderRadius: "6px", background: "#f59e0b15", border: "1px solid #f59e0b30", fontSize: "9px", color: "#f59e0b" }}>✏️ Calculator is OFF — work it out yourself!</div>}
            </div>

            {/* Input fields - Phase 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", position: "relative" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#22d3ee", display: "block", marginBottom: "4px" }}>⚡ Total Energy Output (MW){mathDifficulty === "hard" && " — in standard form"}</label>
                <input type="text" value={calcAnswerEnergy} onChange={e => setCalcAnswerEnergy(e.target.value)} onKeyDown={e => e.key === "Enter" && calcAnswerCost && checkCalcChallenge()} placeholder={mathDifficulty === "hard" ? "e.g. 9.6 × 10^2" : "e.g. 960"} style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", display: "block", marginBottom: "4px" }}>💰 Total Cost (§){mathDifficulty === "hard" && " — in standard form"}</label>
                <input type="text" value={calcAnswerCost} onChange={e => setCalcAnswerCost(e.target.value)} onKeyDown={e => e.key === "Enter" && calcAnswerEnergy && checkCalcChallenge()} placeholder={mathDifficulty === "hard" ? "e.g. 2.35 × 10^6" : "e.g. 2350000"} style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
            </div>
            </>}

            {/* Phase 2 - KW conversion (medium only) */}
            {calcPhase === 2 && <div style={{ marginBottom: "16px", position: "relative" }}>
              <div style={{ background: "#0a0f1a", borderRadius: "10px", padding: "12px", marginBottom: "16px", border: "1px solid #1a2a4a" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Conversion</div>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "monospace" }}>1 MW = 1,000 kW</div>
                <div style={{ fontSize: "14px", color: "#22d3ee", fontFamily: "monospace", fontWeight: 700, marginTop: "6px" }}>Your total: {generatorTotals.totalMW} MW = ? kW</div>
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#facc15", display: "block", marginBottom: "4px" }}>⚡ Total Energy in Kilowatts (kW)</label>
                <input type="text" value={calcAnswerKW} onChange={e => setCalcAnswerKW(e.target.value)} onKeyDown={e => e.key === "Enter" && checkCalcChallenge()} placeholder="e.g. 960000" style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "2px solid #1a2a4a", background: "#080f1e", color: "#fff", fontSize: "18px", fontWeight: 700, fontFamily: "monospace", textAlign: "center", outline: "none" }} />
              </div>
            </div>}

            {/* Feedback */}
            {calcFeedback && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, lineHeight: 1.4, position: "relative", background: calcFeedback.type === "success" ? "#4ade8015" : "#ef444415", border: `1px solid ${calcFeedback.type === "success" ? "#4ade8040" : "#ef444440"}`, color: calcFeedback.type === "success" ? "#4ade80" : "#fca5a5" }}>
                {calcFeedback.msg}
              </div>
            )}

            {calcAttempts > 0 && !calcPassed && (
              <div style={{ fontSize: "10px", color: "#ef4444", textAlign: "center", marginBottom: "8px", position: "relative" }}>Attempts: {calcAttempts}</div>
            )}

            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              <button onClick={checkCalcChallenge} disabled={calcPhase === 1 ? (!calcAnswerEnergy || !calcAnswerCost) : !calcAnswerKW} style={{ ...S.popupBtn, flex: 1, textAlign: "center", opacity: (calcPhase === 1 ? (calcAnswerEnergy && calcAnswerCost) : calcAnswerKW) ? 1 : 0.4, cursor: (calcPhase === 1 ? (calcAnswerEnergy && calcAnswerCost) : calcAnswerKW) ? "pointer" : "not-allowed" }}>
                {calcPhase === 2 ? "✓ Submit kW Answer" : "✓ Submit Answer"}
              </button>
            </div>

            {mathDifficulty === "medium" && calcPhase === 1 && <div style={{ textAlign: "center", marginTop: "8px", fontSize: "9px", color: "#f59e0b", position: "relative" }}>Step 1 of 2 — kW conversion follows</div>}
            <div style={{ textAlign: "center", marginTop: "6px", fontSize: "9px", color: "#475569", position: "relative" }}>⚠ Each wrong answer costs 10% of your treasury</div>
          </div>
        </div>
      )}

      {/* Task Popup */}
      {showTaskPopup && currentTask && (
        <div style={S.popupOverlay}>
          <div style={S.popup}>
            <div style={S.popupGlow} />
            <div style={S.popupIcon}>{taskComplete ? "🎉" : "📋"}</div>
            <div style={S.popupBadge}>{taskComplete ? "TASK COMPLETE" : "NEW TASK"}</div>
            <h2 style={S.popupTitle}>{taskComplete ? "Well done!" : currentTask.title}</h2>
            <p style={S.popupDesc}>{taskComplete ? (
              taskId === 1 ? `You built ${energyCount} energy generators producing ${powerCap} MW!` :
              taskId === 2 ? `You housed ${popFromHousing} new residents! Population: ${totalPop}` :
              taskId === 3 ? `Garbage disposal built! Your city can now manage waste.` :
              "Task completed!"
            ) : currentTask.desc}</p>
            {!taskComplete && (
              <div style={S.popupProgress}>
                <div style={S.popupProgressBar}>
                  <div style={{ ...S.popupProgressFill, width: `${Math.min(100, ((taskId === 1 ? energyCount : taskId === 2 ? popFromHousing : garbageCount) / currentTask.target) * 100)}%` }} />
                </div>
                <span style={S.popupProgressText}>{taskId === 1 ? energyCount : taskId === 2 ? popFromHousing : garbageCount} / {currentTask.target}</span>
              </div>
            )}
            {taskComplete && <div style={S.popupReward}>+§{currentTask.reward?.toLocaleString()}</div>}
            <button style={S.popupBtn} onClick={() => {
              setShowTaskPopup(false);
              if (taskComplete) {
                // Advance to next task
                if (TASKS[taskId + 1]) {
                  setTaskId(taskId + 1);
                  setTaskComplete(false);
                  setTimeout(() => setShowTaskPopup(true), 1000);
                }
              } else {
                if (taskId === 1) setBottomCategory("energy");
                if (taskId === 2) setBottomCategory("housing");
                if (taskId === 3) setBottomCategory("utilities");
              }
            }}>
              {taskComplete ? (TASKS[taskId + 1] ? "Next Task →" : "Continue Building →") : `Let's Go! ${currentTask.icon}`}
            </button>
          </div>
        </div>
      )}

      {/* Task tracker */}
      {!showTaskPopup && currentTask && !taskComplete && (
        <div style={S.taskTracker} onClick={() => setShowTaskPopup(true)}>
          <span style={S.taskTrackerIcon}>{currentTask.icon}</span>
          <div>
            <div style={S.taskTrackerTitle}>{currentTask.title}</div>
            <div style={S.taskTrackerProgress}>{taskId === 1 ? `${energyCount}/${currentTask.target} generators` : taskId === 2 ? `${popFromHousing}/${currentTask.target} residents` : `${garbageCount}/${currentTask.target} disposal`}</div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={S.notifArea}>
        {notifications.map(n => (
          <div key={n.id} style={S.notif}>{n.msg}</div>
        ))}
      </div>

      {/* Building category dock */}
      <div style={S.bottomDock}>
        <div style={S.dockInner}>
          {[
            { id: "energy", label: "Energy", svg: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M8 6h16v4H8z" fill="#334155" rx="1"/><path d="M10 10v14" stroke="#94a3b8" strokeWidth="2"/><path d="M22 10v14" stroke="#94a3b8" strokeWidth="2"/><path d="M10 16h12" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round"/><path d="M10 20h12" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round"/><circle cx="10" cy="28" r="2" fill="#475569"/><circle cx="22" cy="28" r="2" fill="#475569"/></svg> },
            { id: "housing", label: "Housing", svg: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M4 16L16 5l12 11" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14v13h18V14" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="2"/><rect x="13" y="20" width="6" height="7" rx="1" fill="#3b82f6"/><rect x="10" y="16" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.6"/><rect x="18" y="16" width="4" height="4" rx="0.5" fill="#93c5fd" opacity="0.6"/></svg> },
            { id: "utilities", label: "Utilities", svg: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M16 4C16 4 8 14 8 20a8 8 0 0 0 16 0C24 14 16 4 16 4z" fill="#0e7490" stroke="#22d3ee" strokeWidth="2"/><path d="M13 20c0 1.7 1.3 3 3 3s3-1.3 3-3" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round"/></svg> },
            { id: "transport", label: "Transport", svg: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect x="4" y="10" width="24" height="16" rx="2" fill="#374151" stroke="#9ca3af" strokeWidth="1.5"/><line x1="16" y1="12" x2="16" y2="24" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 2"/><line x1="4" y1="14" x2="28" y2="14" stroke="#6b7280" strokeWidth="0.5"/><line x1="4" y1="22" x2="28" y2="22" stroke="#6b7280" strokeWidth="0.5"/><rect x="7" y="4" width="4" height="6" rx="1" fill="#22c55e"/><rect x="7" y="6" width="4" height="2" fill="#16a34a"/><rect x="21" y="4" width="4" height="6" rx="1" fill="#ef4444"/><rect x="21" y="6" width="4" height="2" fill="#dc2626"/><circle cx="9" cy="28" r="2" fill="#4b5563"/><circle cx="23" cy="28" r="2" fill="#4b5563"/></svg> },
            { id: "education", label: "Education", svg: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><rect x="6" y="12" width="20" height="14" rx="2" fill="#3b1f7a" stroke="#c084fc" strokeWidth="2"/><path d="M4 12l12-6 12 6" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="14" y="18" width="4" height="8" rx="1" fill="#8b5cf6"/><rect x="9" y="15" width="3" height="3" rx="0.5" fill="#a78bfa" opacity="0.5"/><rect x="20" y="15" width="3" height="3" rx="0.5" fill="#a78bfa" opacity="0.5"/><rect x="14" y="4" width="4" height="4" rx="1" fill="#c084fc"/></svg> },
            { id: "maintenance", label: "Maintenance", svg: <svg width="28" height="28" viewBox="0 0 32 32" fill="none"><path d="M18.4 5.6a6 6 0 0 0-8.2 8.2L5 19l3 3 1.5-1.5 1.5 1.5 1.5-1.5 1.5 1.5L19 16.2a6 6 0 0 0 8.2-8.2l-3.6 3.6-2.8-0.7-0.7-2.8z" fill="#44403c" stroke="#fb923c" strokeWidth="2" strokeLinejoin="round"/></svg> },
          ].map(cat => {
            const active = bottomCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => { setBottomCategory(active ? null : cat.id); setSelectedGenerator(null); setPipeMode(null); setPipeDragStart(null); setSelectedHousing(null); setSelectedUtility(null); setSelectedEducation(null); setRoadMode(false); setRoadStart(null); setCurvedRoadMode(false); setCurvedRoadStart(null); }} style={{
                ...S.dockBtn,
                background: active ? "#1a2a4a" : "transparent",
                borderColor: active ? "#f59e0b" : "transparent",
                transform: active ? "translateY(-4px)" : "translateY(0)",
              }}>
                <div style={{ ...S.dockIcon, background: active ? "#f59e0b18" : "#ffffff08", borderColor: active ? "#f59e0b44" : "#ffffff10" }}>
                  {cat.svg}
                </div>
                <span style={{ ...S.dockLabel, color: active ? "#f59e0b" : "#64748b" }}>{cat.label}</span>
              </button>
            );
          })}
        </div>
        {/* Expanded panel (empty for now) */}
        {bottomCategory && (
          <div style={S.dockPanel}>
            <div style={S.dockPanelHeader}>
              <span style={S.dockPanelTitle}>
                {bottomCategory === "energy" && "⚡ Energy Generators"}
                {bottomCategory === "housing" && "🏠 Housing & Residential"}
                {bottomCategory === "utilities" && "💧 Utilities & Water"}
                {bottomCategory === "transport" && "🚗 Transport & Roads"}
                {bottomCategory === "education" && "🏫 Education & Research"}
                {bottomCategory === "maintenance" && "🔧 Maintenance & Services"}
              </span>
              {bottomCategory === "energy" && <span style={{ fontSize: "10px", color: "#facc15", fontWeight: 700 }}>{energyCount} built · {powerCap} MW</span>}
              <button style={S.dockPanelClose} onClick={() => { setBottomCategory(null); setSelectedGenerator(null); }}>×</button>
            </div>
            <div style={S.dockPanelBody}>
              {bottomCategory === "energy" ? (
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", gap: "6px", overflowX: "auto", padding: "4px 0" }}>
                    {Object.values(GENERATORS).map(gen => {
                      const sel = selectedGenerator === gen.id;
                      const unlocked = isGenUnlocked(gen.id);
                      const canAfford = coins >= gen.cost;
                      const usable = unlocked && canAfford;
                      return (
                        <button key={gen.id} onClick={() => unlocked ? setSelectedGenerator(sel ? null : gen.id) : setShowTechTree(true)} style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                          padding: "8px 10px", borderRadius: "10px", minWidth: "100px", flexShrink: 0,
                          border: sel ? "2px solid #facc15" : unlocked ? "2px solid #1a2a4a" : "2px solid #ef444444",
                          background: sel ? "#facc1515" : !unlocked ? "#1a0a0a" : "#080f1e",
                          cursor: "pointer", opacity: unlocked ? 1 : 0.6, transition: "all 0.15s", position: "relative",
                        }}>
                          {!unlocked && <div style={{ position: "absolute", top: "4px", right: "4px", fontSize: "10px" }}>🔒</div>}
                          <div style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", filter: unlocked ? "none" : "grayscale(0.8)" }}>{gen.svg}</div>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: sel ? "#facc15" : unlocked ? "#e2e8f0" : "#666", textAlign: "center", lineHeight: 1.2 }}>{gen.name}</span>
                          <span style={{ fontSize: "9px", color: "#22d3ee", fontFamily: "monospace", fontWeight: 700 }}>{gen.power} MW</span>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <span style={{ fontSize: "8px", color: usable ? "#fbbf24" : !unlocked ? "#ef4444" : "#ef4444", fontFamily: "monospace" }}>§{gen.cost >= 1000000 ? (gen.cost / 1000000).toFixed(1) + "M" : (gen.cost / 1000) + "K"}</span>
                            <span style={{ fontSize: "8px", color: "#94a3b8" }}>{gen.radiusM}m</span>
                          </div>
                          {gen.co2 === 0 ? <span style={{ fontSize: "7px", color: "#4ade80" }}>🌿 Clean</span> : <span style={{ fontSize: "7px", color: "#f87171" }}>CO₂:{gen.co2}</span>}
                          {!unlocked && <span style={{ fontSize: "7px", color: "#ef4444", marginTop: "1px" }}>🔬 Research needed</span>}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setShowTechTree(true)} style={{ marginTop: "8px", width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #c084fc40", background: "#c084fc15", color: "#c084fc", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>🔬 Open Tech Tree ({unlockedTechs.size}/{Object.keys(TECH_TREE).length} researched)</button>
                </div>
              ) : bottomCategory === "utilities" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Click a pipe type, then click a 🚰 water source on the map, then click the destination. You'll need to calculate the flow rate!</div>
                  {Object.entries(PIPE_SPECS).map(([id, spec]) => {
                    const sel = pipeMode === id;
                    return (
                      <button key={id} onClick={() => { setPipeMode(sel ? null : id); setPipeDragStart(null); setPipeDragEnd(null); setSelectedGenerator(null); }} style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", width: "100%",
                        border: sel ? `2px solid ${spec.color}` : "2px solid #1a2a4a",
                        background: sel ? `${spec.color}15` : "#080f1e",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}>
                        <span style={{ fontSize: "24px" }}>{spec.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: sel ? spec.color : "#e2e8f0" }}>{spec.label}</div>
                          <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>
                            r = {spec.radiusCm} cm · §{spec.costPerM}/m · T = {spec.timeSeconds}s
                          </div>
                        </div>
                        {sel && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: spec.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: "10px" }}>✓</div>}
                      </button>
                    );
                  })}
                  {placedPipes.length > 0 && <div style={{ borderTop: "1px solid #1a2a4a", paddingTop: "6px", marginTop: "4px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Placed pipes ({placedPipes.length})</div>
                    {placedPipes.map((p, i) => <div key={i} style={{ fontSize: "9px", color: "#94a3b8", padding: "2px 0" }}>
                      {PIPE_SPECS[p.type]?.icon} ({p.x1},{p.y1})→({p.x2},{p.y2}) · {Math.round(p.lengthM)}m · Q={p.flowRate.toFixed(4)} m³/s
                    </div>)}
                  </div>}
                  {/* Waste Management */}
                  <div style={{ borderTop: "1px solid #1a2a4a", paddingTop: "8px", marginTop: "4px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>♻️ Waste Management</div>
                    {Object.values(UTILITY_BUILDINGS).map(ub => {
                      const sel = selectedUtility === ub.id;
                      const canAfford = coins >= ub.cost;
                      return (
                        <button key={ub.id} onClick={() => { setSelectedUtility(sel ? null : ub.id); setPipeMode(null); setSelectedGenerator(null); setSelectedHousing(null); }} style={{
                          display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", width: "100%",
                          border: sel ? "2px solid #71717a" : "2px solid #1a2a4a",
                          background: sel ? "#71717a15" : "#080f1e",
                          cursor: canAfford ? "pointer" : "not-allowed", textAlign: "left", transition: "all 0.15s",
                          opacity: canAfford ? 1 : 0.5, marginBottom: "6px",
                        }}>
                          <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>{ub.svg}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: sel ? "#e2e8f0" : "#94a3b8" }}>{ub.name}</div>
                            <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{ub.desc}</div>
                            <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "8px", color: "#fbbf24", fontFamily: "monospace" }}>§{(ub.cost/1000).toFixed(0)}K</span>
                              <span style={{ fontSize: "8px", color: "#facc15", fontFamily: "monospace" }}>⚡{ub.energyCost} kW</span>
                              {ub.pollution.noise > 0 && <span style={{ fontSize: "8px", color: "#fb923c" }}>🔊 {ub.pollution.noise}m</span>}
                              {ub.pollution.ground > 0 && <span style={{ fontSize: "8px", color: "#a16207" }}>🟤 {(ub.pollution.ground/1000).toFixed(1)}km</span>}
                              {ub.pollution.air > 0 && <span style={{ fontSize: "8px", color: "#ef4444" }}>💨 {(ub.pollution.air/1000).toFixed(1)}km</span>}
                            </div>
                          </div>
                          {sel && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#71717a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "10px" }}>✓</div>}
                        </button>
                      );
                    })}
                  </div>
                  {/* Pollution legend */}
                  <div style={{ background: "#1a2a4a40", borderRadius: "6px", padding: "8px", marginTop: "4px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>POLLUTION TYPES</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "9px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(200,150,0,0.3)", display: "inline-block" }}/><span style={{ color: "#fb923c" }}>🔊 Noise — affects happiness within radius</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(120,80,0,0.3)", display: "inline-block" }}/><span style={{ color: "#a16207" }}>🟤 Ground — contaminates land within radius</span></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "rgba(120,0,0,0.2)", display: "inline-block" }}/><span style={{ color: "#ef4444" }}>💨 Air — reduces air quality within radius</span></div>
                    </div>
                  </div>
                  <div style={{ background: "#1a2a4a40", borderRadius: "6px", padding: "6px 8px", marginTop: "4px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#64748b", marginBottom: "2px" }}>FORMULAS</div>
                    <div style={{ fontSize: "9px", color: "#c084fc", fontFamily: "monospace", lineHeight: 1.6 }}>
                      h = √((x₂−x₁)² + (y₂−y₁)²) × {METERS_PER_CELL}<br/>
                      V = π × r² × h<br/>
                      Q = V ÷ T
                    </div>
                  </div>
                </div>
              ) : bottomCategory === "housing" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Housing is <strong style={{ color: "#4ade80" }}>free to build</strong> but costs energy per turn. Must be placed within an energy generator's radius.</div>
                  {Object.values(HOUSING_TYPES).map(h => {
                    const sel = selectedHousing === h.id;
                    const canPower = energyBalance >= h.energyCost;
                    return (
                      <button key={h.id} onClick={() => { setSelectedHousing(sel ? null : h.id); setPipeMode(null); setSelectedGenerator(null); }} style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", width: "100%",
                        border: sel ? "2px solid #60a5fa" : "2px solid #1a2a4a",
                        background: sel ? "#60a5fa15" : "#080f1e",
                        cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                        opacity: canPower ? 1 : 0.5,
                      }}>
                        <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>{h.svg}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: sel ? "#60a5fa" : "#e2e8f0" }}>{h.name}</div>
                          <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{h.desc}</div>
                          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                            <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 700 }}>FREE</span>
                            <span style={{ fontSize: "9px", color: "#facc15", fontFamily: "monospace" }}>⚡ {h.energyCost} kW/turn</span>
                            <span style={{ fontSize: "9px", color: "#60a5fa", fontFamily: "monospace" }}>👥 +{h.population}</span>
                          </div>
                        </div>
                        {sel && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "10px" }}>✓</div>}
                      </button>
                    );
                  })}
                  <div style={{ background: "#1a2a4a40", borderRadius: "6px", padding: "8px", marginTop: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
                      <span style={{ color: "#64748b", fontWeight: 700 }}>Energy budget</span>
                      <span style={{ color: energyBalance > 0 ? "#4ade80" : "#ef4444", fontWeight: 700, fontFamily: "monospace" }}>{energyBalance} kW available</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                      <span style={{ color: "#64748b" }}>Production: {powerCap} kW</span>
                      <span style={{ color: "#64748b" }}>Consumption: {energyConsumption} kW</span>
                    </div>
                  </div>
                  <div style={{ background: "#1a2a4a40", borderRadius: "6px", padding: "8px", marginTop: "6px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Demographics</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontFamily: "monospace" }}>
                      <span style={{ color: "#60a5fa" }}>👤 {demographics.adults}</span>
                      <span style={{ color: "#4ade80" }}>👶 {demographics.children}</span>
                      <span style={{ color: "#fb923c" }}>👴 {demographics.elderly}</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 700 }}>= {totalPop}</span>
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "8px", color: "#94a3b8" }}>
                      🏠 Houses: ratio 5:4:1 · 🏢 Condos: ratio 8:1:1
                    </div>
                  </div>
                  <div style={{ fontSize: "9px", color: "#c084fc", fontStyle: "italic", marginTop: "6px" }}>💡 Use the distance formula to check if a location is within a generator's radius before placing housing.</div>
                </div>
              ) : bottomCategory === "transport" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  {!roadsUnlocked ? (
                    <div style={{ textAlign: "center", padding: "16px" }}>
                      <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔒</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>Connect water pipes to unlock roads</div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>Place at least one water pipe first</div>
                    </div>
                  ) : <>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>
                      {mathDifficulty === "easy" ? "Draw the specified lines on the grid to build roads." : "Click two points to draw a road. Answer the question to place it."}
                    </div>
                    <button onClick={() => { const newMode = !roadMode; setRoadMode(newMode); setRoadStart(null); setCurvedRoadMode(false); setCurvedRoadStart(null); setPipeMode(null); setSelectedGenerator(null); setSelectedHousing(null); setSelectedUtility(null); setSelectedEducation(null); }} style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", width: "100%",
                      border: roadMode ? "2px solid #9ca3af" : "2px solid #1a2a4a",
                      background: roadMode ? "#9ca3af15" : "#080f1e",
                      cursor: "pointer", textAlign: "left",
                    }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="10" width="24" height="16" rx="2" fill="#374151" stroke="#9ca3af" strokeWidth="1.5"/><line x1="16" y1="12" x2="16" y2="24" stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 2"/></svg>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: roadMode ? "#e2e8f0" : "#94a3b8" }}>Standard Road</div>
                        <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>Free to build · Connects your city</div>
                      </div>
                      {roadMode && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "10px" }}>✓</div>}
                    </button>

                    {/* Curved Road - locked unless hard mode or level 5 */}
                    <button disabled={!curvedRoadsUnlocked} onClick={() => { if (!curvedRoadsUnlocked) return; setCurvedRoadMode(!curvedRoadMode); setCurvedRoadStart(null); setRoadMode(false); setRoadStart(null); setPipeMode(null); setSelectedGenerator(null); setSelectedHousing(null); setSelectedUtility(null); setSelectedEducation(null); }} style={{
                      display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", width: "100%",
                      border: curvedRoadMode ? "2px solid #a78bfa" : "2px solid #1a2a4a",
                      background: curvedRoadMode ? "#a78bfa15" : "#080f1e",
                      cursor: curvedRoadsUnlocked ? "pointer" : "default",
                      textAlign: "left", opacity: curvedRoadsUnlocked ? 1 : 0.35,
                    }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="4" y="8" width="24" height="18" rx="2" fill="#1f2937" stroke={curvedRoadsUnlocked ? "#a78bfa" : "#4b5563"} strokeWidth="1.5"/>
                        <path d="M6 22 Q10 10 16 16 Q22 22 26 12" stroke={curvedRoadsUnlocked ? "#c084fc" : "#6b7280"} strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <circle cx="6" cy="22" r="1.5" fill={curvedRoadsUnlocked ? "#c084fc" : "#6b7280"}/>
                        <circle cx="26" cy="12" r="1.5" fill={curvedRoadsUnlocked ? "#c084fc" : "#6b7280"}/>
                      </svg>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: curvedRoadMode ? "#c084fc" : curvedRoadsUnlocked ? "#a78bfa" : "#4b5563" }}>Curved Road</div>
                        <div style={{ fontSize: "9px", color: curvedRoadsUnlocked ? "#64748b" : "#374151", marginTop: "2px" }}>
                          {curvedRoadMode ? "Click two points to draw a parabolic curve" : curvedRoadsUnlocked ? "Quadratic curves — find y = Ax² + B" : "Requires Hard mode or City Level 5"}
                        </div>
                        {!curvedRoadsUnlocked && <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                          {mathDifficulty !== "hard" && <span style={{ fontSize: "8px", color: "#4b5563", padding: "1px 6px", border: "1px solid #2a3a5e", borderRadius: "10px" }}>🔴 Hard mode</span>}
                          {cityLevel < 5 && <span style={{ fontSize: "8px", color: "#4b5563", padding: "1px 6px", border: "1px solid #2a3a5e", borderRadius: "10px" }}>⭐ Level 5</span>}
                        </div>}
                      </div>
                      {curvedRoadMode && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#a78bfa", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "10px" }}>✓</div>}
                      {!curvedRoadsUnlocked && !curvedRoadMode && <div style={{ fontSize: "14px" }}>🔒</div>}
                    </button>

                    {mathDifficulty === "easy" && roadMode && (
                      <div style={{ background: "#22c55e10", border: "1px solid #22c55e30", borderRadius: "8px", padding: "10px" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#4ade80", marginBottom: "6px" }}>📐 Lines to draw:</div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <div style={{ flex: 1, padding: "6px", borderRadius: "6px", background: easyRoadPhase > 1 ? "#4ade8020" : "#1a2a4a", textAlign: "center" }}>
                            <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "monospace", color: easyRoadPhase > 1 ? "#4ade80" : "#facc15" }}>{easyRoadPhase > 1 ? "✓" : ""} y = 5</div>
                            <div style={{ fontSize: "8px", color: "#64748b" }}>Horizontal line</div>
                          </div>
                          <div style={{ flex: 1, padding: "6px", borderRadius: "6px", background: easyRoadPhase > 2 ? "#4ade8020" : "#1a2a4a", textAlign: "center" }}>
                            <div style={{ fontSize: "14px", fontWeight: 800, fontFamily: "monospace", color: easyRoadPhase > 2 ? "#4ade80" : easyRoadPhase === 2 ? "#facc15" : "#64748b" }}>{easyRoadPhase > 2 ? "✓" : ""} x = −2</div>
                            <div style={{ fontSize: "8px", color: "#64748b" }}>Vertical line</div>
                          </div>
                        </div>
                        <div style={{ fontSize: "8px", color: "#64748b", marginTop: "6px" }}>Click cells along the line to place road segments. Need 5+ cells per line.</div>
                        <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "4px", fontFamily: "monospace" }}>Grid origin at centre: game x = grid_x − {Math.floor(GRID_W / 2)}</div>
                      </div>
                    )}

                    {placedRoads.length > 0 && <div style={{ borderTop: "1px solid #1a2a4a", paddingTop: "6px" }}>
                      <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Roads placed ({placedRoads.length})</div>
                      {placedRoads.slice(-5).map((r, i) => <div key={i} style={{ fontSize: "9px", color: "#94a3b8", padding: "2px 0" }}>
                        🛣️ ({r.x1},{r.y1})→({r.x2},{r.y2}) · m={r.gradient === Infinity ? "∞" : typeof r.gradient === "number" ? r.gradient.toFixed(2) : r.gradient}
                      </div>)}
                    </div>}

                    {awaitingPerp && <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: "8px", padding: "8px", marginTop: "4px" }}>
                      <div style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 700 }}>🔀 Draw perpendicular road now</div>
                      <div style={{ fontSize: "9px", color: "#64748b" }}>Click two points with gradient = {awaitingPerp.perpGradient === "vertical" ? "undefined (vertical)" : awaitingPerp.perpGradient.toFixed(2)}</div>
                    </div>}
                  </>}
                </div>
              ) : bottomCategory === "education" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>Build schools to educate citizens. Universities convert graduates into research points through maths challenges.</div>
                  {Object.values(EDUCATION_BUILDINGS).map(eb => {
                    const sel = selectedEducation === eb.id;
                    const canAfford = eb.cost === 0 || coins >= eb.cost;
                    return (
                      <button key={eb.id} onClick={() => { setSelectedEducation(sel ? null : eb.id); setPipeMode(null); setSelectedGenerator(null); setSelectedHousing(null); setSelectedUtility(null); setRoadMode(false); setCurvedRoadMode(false); }} style={{
                        display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "10px", width: "100%",
                        border: sel ? "2px solid #c084fc" : "2px solid #1a2a4a",
                        background: sel ? "#c084fc15" : "#080f1e",
                        cursor: canAfford ? "pointer" : "not-allowed", textAlign: "left", opacity: canAfford ? 1 : 0.5,
                      }}>
                        <div style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>{eb.svg}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: sel ? "#c084fc" : "#e2e8f0" }}>{eb.name}</div>
                          <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{eb.desc}</div>
                          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                            <span style={{ fontSize: "9px", color: eb.cost === 0 ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>{eb.cost === 0 ? "FREE" : `§${(eb.cost/1000)}K`}</span>
                            <span style={{ fontSize: "9px", color: "#facc15", fontFamily: "monospace" }}>⚡{eb.energyCost} kW</span>
                            {eb.graduates && <span style={{ fontSize: "9px", color: "#60a5fa" }}>🎓 {eb.graduates}/cycle</span>}
                            {eb.rpPerCycle && <span style={{ fontSize: "9px", color: "#c084fc" }}>🔬 {eb.rpPerCycle} RP/challenge</span>}
                          </div>
                        </div>
                        {sel && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "10px" }}>✓</div>}
                      </button>
                    );
                  })}
                  {/* Stats */}
                  <div style={{ background: "#1a2a4a40", borderRadius: "6px", padding: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
                      <span style={{ color: "#64748b" }}>🏫 Schools: {schoolCount}</span>
                      <span style={{ color: "#64748b" }}>🎓 Graduates: {graduatesPerCycle}/cycle</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                      <span style={{ color: "#64748b" }}>🏛️ Universities: {universityCount}</span>
                      <span style={{ color: "#c084fc", fontWeight: 700 }}>🔬 RP: {research}</span>
                    </div>
                  </div>
                  {/* Active research */}
                  {activeResearch && (
                    <div style={{ background: "#c084fc10", border: "1px solid #c084fc30", borderRadius: "8px", padding: "10px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#c084fc", marginBottom: "4px" }}>🔬 Active Research: {TECH_TREE[activeResearch]?.name}</div>
                      <div style={{ width: "100%", height: "6px", background: "#1a2a4a", borderRadius: "3px", marginBottom: "6px" }}>
                        <div style={{ width: `${Math.min(100, (researchProgress / TECH_TREE[activeResearch]?.cost) * 100)}%`, height: "100%", background: "#c084fc", borderRadius: "3px", transition: "width 0.3s" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", color: "#94a3b8", fontFamily: "monospace" }}>{researchProgress}/{TECH_TREE[activeResearch]?.cost} RP</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {universityCount > 0 && <button onClick={() => { const q = generateResearchQuestion(); setResearchCalcQ(q); setResearchCalcAnswer(""); setResearchCalcFeedback(null); setShowResearchCalc(true); }} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "#c084fc", color: "#fff", fontSize: "9px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Earn RP</button>}
                          <button onClick={() => { setActiveResearch(null); setResearchProgress(0); }} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ef444440", background: "none", color: "#fca5a5", fontSize: "9px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                        </div>
                      </div>
                      <div style={{ fontSize: "8px", color: "#64748b", marginTop: "4px" }}>Difficulty: Level {Math.min(10, Math.floor(totalResearched / 3) + 1)}/10 · {universityCount} university = +{universityCount * 20} RP per correct answer</div>
                    </div>
                  )}
                  {!activeResearch && <div style={{ fontSize: "9px", color: "#475569", fontStyle: "italic", textAlign: "center", padding: "6px" }}>Select a tech in the Tech Tree to begin research</div>}
                </div>
              ) : (
                <span style={S.dockPanelEmpty}>Coming soon — buildings will appear here</span>
              )}
            </div>
            {bottomCategory === "energy" && selectedGenerator && (
              <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #1a2a4a", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Click on the map to place <strong style={{ color: "#facc15" }}>{GENERATORS[selectedGenerator]?.name}</strong> · Radius: <strong style={{ color: "#22d3ee" }}>{GENERATORS[selectedGenerator]?.radiusM}m</strong></span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>{GENERATORS[selectedGenerator]?.reliability}</span>
              </div>
            )}
            {bottomCategory === "utilities" && pipeMode && (
              <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #1a2a4a", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{pipeDragStart ? <span>Start: <strong style={{ color: "#22d3ee" }}>({pipeDragStart.x}, {pipeDragStart.y})</strong> — click destination</span> : <span>Click a <strong style={{ color: "#22d3ee" }}>🚰 water source</strong> to begin</span>}</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>r = {PIPE_SPECS[pipeMode].radiusCm}cm · §{PIPE_SPECS[pipeMode].costPerM}/m</span>
              </div>
            )}
            {bottomCategory === "housing" && selectedHousing && (
              <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #1a2a4a", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Place <strong style={{ color: "#60a5fa" }}>{HOUSING_TYPES[selectedHousing]?.name}</strong> within a ⚡ generator radius</span>
                <span style={{ fontSize: "10px", color: energyBalance >= HOUSING_TYPES[selectedHousing]?.energyCost ? "#4ade80" : "#ef4444" }}>{energyBalance} kW available</span>
              </div>
            )}
            {bottomCategory === "utilities" && selectedUtility && (
              <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #1a2a4a", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Place <strong style={{ color: "#71717a" }}>{UTILITY_BUILDINGS[selectedUtility]?.name}</strong> — ⚠️ generates pollution</span>
                <span style={{ fontSize: "10px", color: "#fbbf24" }}>§{UTILITY_BUILDINGS[selectedUtility]?.cost.toLocaleString()} · ⚡{UTILITY_BUILDINGS[selectedUtility]?.energyCost} kW</span>
              </div>
            )}
            {bottomCategory === "education" && selectedEducation && (
              <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #1a2a4a", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Place <strong style={{ color: "#c084fc" }}>{EDUCATION_BUILDINGS[selectedEducation]?.name}</strong> within a ⚡ generator radius</span>
                <span style={{ fontSize: "10px", color: EDUCATION_BUILDINGS[selectedEducation]?.cost === 0 ? "#4ade80" : "#fbbf24" }}>{EDUCATION_BUILDINGS[selectedEducation]?.cost === 0 ? "FREE" : `§${EDUCATION_BUILDINGS[selectedEducation]?.cost.toLocaleString()}`} · ⚡{EDUCATION_BUILDINGS[selectedEducation]?.energyCost} kW</span>
              </div>
            )}
            {bottomCategory === "transport" && roadMode && (
              <div style={{ padding: "8px 16px 12px", borderTop: "1px solid #1a2a4a", fontSize: "11px", color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{awaitingPerp ? <span>Draw <strong style={{ color: "#c084fc" }}>perpendicular road</strong> — click two points</span> : roadStart ? <span>Start: <strong style={{ color: "#9ca3af" }}>({roadStart.x}, {roadStart.y})</strong> — click end point</span> : mathDifficulty === "easy" ? <span>Click cells along <strong style={{ color: "#facc15" }}>{easyRoadPhase === 1 ? "y = 5" : "x = −2"}</strong></span> : <span>Click to set <strong style={{ color: "#9ca3af" }}>road start point</strong></span>}</span>
                <span style={{ fontSize: "10px", color: "#4ade80" }}>FREE</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={S.statusBar}>
        <span style={S.bottomLabel}>{selectedEducation ? `🏫 Placing ${EDUCATION_BUILDINGS[selectedEducation]?.name} (⚡${EDUCATION_BUILDINGS[selectedEducation]?.energyCost} kW)` : curvedRoadMode ? `🟣 Curved Road${curvedRoadStart ? ` — from (${curvedRoadStart.x},${curvedRoadStart.y})` : " — click start point"}` : roadMode ? `🛣️ Road mode${awaitingPerp ? " — draw perpendicular" : roadStart ? ` — from (${roadStart.x},${roadStart.y})` : mathDifficulty === "easy" ? ` — draw ${easyRoadPhase === 1 ? "y = 5" : "x = -2"}` : " — click start point"}` : selectedUtility ? `♻️ Placing ${UTILITY_BUILDINGS[selectedUtility]?.name} (§${UTILITY_BUILDINGS[selectedUtility]?.cost.toLocaleString()}) — ⚠ generates pollution` : selectedHousing ? `🏠 Placing ${HOUSING_TYPES[selectedHousing]?.name} (⚡${HOUSING_TYPES[selectedHousing]?.energyCost} kW) — must be within generator radius` : pipeMode ? `🔧 ${PIPE_SPECS[pipeMode].label} mode${pipeDragStart ? ` — from (${pipeDragStart.x},${pipeDragStart.y})` : " — click water source"}` : tool === "build" && selectedBuilding ? `Place: ${BUILDINGS[selectedBuilding].name} (🪙${BUILDINGS[selectedBuilding].cost})` : tool === "zone" && selectedZone ? `Paint: ${selectedZone} zone` : tool === "road" ? "Click to place road" : tool === "demolish" ? "Click to demolish" : "Select tool from left panel"}</span>
        <span style={S.coordDisplay}>{hoverCell ? `(${hoverCell.x}, ${hoverCell.y}) · ${hoverCell.x * METERS_PER_CELL}m, ${hoverCell.y * METERS_PER_CELL}m` : ""}</span>
        <span style={S.zoomDisplay}>{METERS_PER_CELL}m/cell · Zoom: {(camera.zoom * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

const S = {
  app: { width: "100%", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', -apple-system, sans-serif", overflow: "hidden", color: "#e2e8f0" },
  topHud: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 16px", background: "#0a0f1aee", borderBottom: "1px solid #1a2a4a", zIndex: 20, flexWrap: "wrap", gap: "8px" },
  hudLeft: { display: "flex", alignItems: "center", gap: "12px" },
  cityLabel: { fontSize: "15px", fontWeight: 800, color: "#fff" },
  climateLabel: { fontSize: "10px", color: "#64748b", fontWeight: 600 },
  hudStats: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" },
  resourceBox: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "8px", background: "#ffffff08", border: "1px solid #ffffff10" },
  resourceIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", background: "#ffffff0a", flexShrink: 0 },
  resourceInfo: { display: "flex", flexDirection: "column", gap: "0px", minWidth: 0 },
  resourceLabel: { fontSize: "8px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1 },
  resourceVal: { fontSize: "13px", fontWeight: 800, fontFamily: "monospace", lineHeight: 1.2 },
  satisfactionBar: { width: "48px", height: "4px", background: "#1a2a40", borderRadius: "2px", overflow: "hidden" },
  satisfactionFill: { height: "100%", borderRadius: "2px", transition: "width 0.5s, background 0.5s" },
  hudStat: { display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" },
  hudStatVal: { fontWeight: 700, fontFamily: "monospace", fontSize: "13px", color: "#e2e8f0" },
  hudRight: { display: "flex", alignItems: "center", gap: "8px" },
  speedControls: { display: "flex", gap: "2px" },
  speedBtn: { padding: "2px 8px", borderRadius: "4px", border: "1px solid #2a3a5e", cursor: "pointer", fontSize: "8px", fontFamily: "inherit" },
  mainArea: { display: "flex", flex: 1, overflow: "hidden" },
  toolbar: { width: "56px", background: "#0a0f1aee", borderRight: "1px solid #1a2a4a", display: "flex", flexDirection: "column", padding: "6px 4px", gap: "2px", zIndex: 10 },
  toolBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1px", padding: "6px 4px", borderRadius: "6px", border: "2px solid", cursor: "pointer", background: "none", transition: "all 0.15s" },
  toolLabel: { fontSize: "7px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" },
  viewport: { flex: 1, overflow: "hidden", position: "relative", cursor: "grab" },
  rightPanel: { width: "200px", background: "#0a0f1aee", borderLeft: "1px solid #1a2a4a", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0", zIndex: 10 },
  subPanel: { padding: "10px", borderBottom: "1px solid #1a2a4a" },
  subTitle: { fontSize: "12px", fontWeight: 800, color: "#f59e0b", marginBottom: "8px" },
  sectionLabel: { fontSize: "9px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", margin: "6px 0 4px", padding: "0 2px" },
  buildGrid: { display: "flex", flexDirection: "column", gap: "3px" },
  buildItem: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", border: "1px solid", cursor: "pointer", background: "none", textAlign: "left", transition: "all 0.15s" },
  buildName: { fontSize: "11px", fontWeight: 600, color: "#e2e8f0", flex: 1 },
  buildCost: { fontSize: "9px", color: "#fbbf24", fontWeight: 700, fontFamily: "monospace" },
  zoneBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", border: "2px solid", cursor: "pointer", background: "none", width: "100%", marginBottom: "4px", transition: "all 0.15s" },
  zoneName: { fontSize: "12px", fontWeight: 600, color: "#e2e8f0" },
  zoneHint: { fontSize: "9px", color: "#64748b", marginTop: "6px" },
  roadInfo: { display: "flex", flexDirection: "column", gap: "6px" },
  roadCost: { fontSize: "13px", fontWeight: 700, color: "#fbbf24" },
  roadHint: { fontSize: "10px", color: "#94a3b8", lineHeight: 1.4 },
  infoGrid: { display: "flex", flexDirection: "column", gap: "4px" },
  infoRow: { display: "flex", justifyContent: "space-between", fontSize: "11px" },
  infoLabel: { color: "#64748b", fontWeight: 600 },
  infoVal: { color: "#e2e8f0", fontWeight: 700, fontFamily: "monospace" },
  minimapWrap: { padding: "10px", borderTop: "1px solid #1a2a4a", marginTop: "auto" },
  minimapTitle: { fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" },
  minimap: { border: "1px solid #2a3a5e", borderRadius: "4px", overflow: "hidden", lineHeight: 0 },
  notifArea: { position: "fixed", bottom: "40px", left: "72px", zIndex: 30, display: "flex", flexDirection: "column", gap: "4px" },
  notif: { padding: "6px 14px", borderRadius: "6px", background: "#0a0f1aee", border: "1px solid #2a3a5e", color: "#fbbf24", fontSize: "11px", fontWeight: 600, animation: "fadeIn 0.2s" },
  bottomDock: { background: "#0a0f1aee", borderTop: "1px solid #1a2a4a", zIndex: 20, position: "relative" },
  dockInner: { display: "flex", justifyContent: "center", gap: "4px", padding: "6px 16px" },
  dockBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "6px 14px", borderRadius: "10px", border: "2px solid", cursor: "pointer", background: "none", transition: "all 0.2s", minWidth: "64px" },
  dockIcon: { width: "44px", height: "44px", borderRadius: "10px", border: "1px solid", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  dockLabel: { fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.2s" },
  dockPanel: { position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", width: "400px", maxWidth: "90vw", background: "#0d1520", border: "1px solid #1a2a4a", borderRadius: "12px 12px 0 0", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)", overflow: "hidden" },
  dockPanelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #1a2a4a" },
  dockPanelTitle: { fontSize: "13px", fontWeight: 800, color: "#f59e0b" },
  dockPanelClose: { background: "none", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer", padding: "0 4px" },
  dockPanelBody: { padding: "20px 16px", minHeight: "80px", display: "flex", alignItems: "center", justifyContent: "center" },
  dockPanelEmpty: { fontSize: "12px", color: "#475569", fontStyle: "italic" },
  statusBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 16px", background: "#080c16", borderTop: "1px solid #0f1a2a", zIndex: 20 },
  popupOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" },
  popup: { background: "#0d1520", border: "1px solid #1a2a4a", borderRadius: "20px", padding: "32px 40px", maxWidth: "420px", width: "90%", textAlign: "center", position: "relative", overflow: "hidden" },
  popupGlow: { position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", background: "radial-gradient(circle at center, #f59e0b10 0%, transparent 60%)", pointerEvents: "none" },
  popupIcon: { fontSize: "56px", marginBottom: "8px", position: "relative" },
  popupBadge: { display: "inline-block", padding: "3px 14px", borderRadius: "6px", background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b", fontSize: "10px", fontWeight: 800, letterSpacing: "2px", marginBottom: "12px", position: "relative" },
  popupTitle: { fontSize: "24px", fontWeight: 900, color: "#fff", margin: "0 0 8px", position: "relative" },
  popupDesc: { fontSize: "13px", color: "#94a3b8", lineHeight: 1.6, margin: "0 0 20px", position: "relative" },
  popupProgress: { display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "20px", position: "relative" },
  popupProgressBar: { width: "160px", height: "8px", background: "#1a2a4a", borderRadius: "4px", overflow: "hidden" },
  popupProgressFill: { height: "100%", background: "linear-gradient(90deg, #f59e0b, #facc15)", borderRadius: "4px", transition: "width 0.5s" },
  popupProgressText: { fontSize: "13px", fontWeight: 800, color: "#facc15", fontFamily: "monospace" },
  popupReward: { fontSize: "18px", fontWeight: 800, color: "#4ade80", marginBottom: "16px", position: "relative" },
  popupBtn: { padding: "14px 40px", borderRadius: "12px", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "15px", fontFamily: "inherit", position: "relative", boxShadow: "0 4px 20px rgba(245,158,11,0.3)", transition: "transform 0.15s" },
  taskTracker: { position: "fixed", top: "56px", right: "216px", zIndex: 25, display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "10px", background: "#0d1520ee", border: "1px solid #f59e0b40", cursor: "pointer", transition: "transform 0.15s" },
  taskTrackerIcon: { fontSize: "18px" },
  taskTrackerTitle: { fontSize: "11px", fontWeight: 700, color: "#f59e0b" },
  taskTrackerProgress: { fontSize: "10px", color: "#94a3b8", fontFamily: "monospace" },
  bottomLabel: { fontSize: "10px", color: "#94a3b8", fontWeight: 600 },
  coordDisplay: { fontSize: "11px", color: "#f59e0b", fontFamily: "monospace", fontWeight: 700 },
  zoomDisplay: { fontSize: "10px", color: "#64748b" },
};
