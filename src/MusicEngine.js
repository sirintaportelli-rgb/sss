// Lazy Tone.js loader — only imports when first needed
let Tone = null;

async function getTone() {
  if (!Tone) Tone = await import("tone");
  return Tone;
}

function makeReverb(roomSize, wet) {
  const rev = new Tone.Freeverb(roomSize || 0.7, 3000).toDestination();
  rev.wet.value = wet || 0.3;
  return rev;
}

// ═══ MENU MUSIC: "Ready Player" — Playful & Game-like ═══
export async function createMenuMusic() {
  const T = await getTone(); await T.start();
  const reverb = makeReverb(0.6, 0.3);
  const chorus = new T.Chorus(1.5, 2.5, 0.5).connect(reverb); chorus.wet.value = 0.2;
  const lead = new T.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.6 }, volume: -12 }).connect(chorus);
  const chords = new T.PolySynth(T.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.02, decay: 0.8, sustain: 0.3, release: 1 }, volume: -16 }).connect(reverb);
  const bass = new T.MonoSynth({ oscillator: { type: "sine" }, envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.5 }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.3, baseFrequency: 150, octaves: 2 }, volume: -14 }).connect(reverb);
  const kick = new T.MembraneSynth({ volume: -18 }).connect(reverb);
  const hat = new T.MetalSynth({ volume: -30, envelope: { attack: 0.001, decay: 0.06, release: 0.01 } }).connect(reverb);
  const perc = new T.NoiseSynth({ volume: -26, noise: { type: "pink" }, envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 } }).connect(reverb);

  const melody = ["C5","D5","E5","G5","E5","D5","C5",null,"A4","C5","D5","E5","G5","A5","G5","E5","F5","E5","D5","C5","D5","E5","C5",null,"G4","A4","B4","D5","C5",null,"C5",null];
  const chordProg = [["C4","E4","G4"],["C4","E4","G4"],["F3","A3","C4"],["F3","A3","C4"],["G3","B3","D4"],["G3","B3","D4"],["A3","C4","E4"],["G3","B3","D4"]];
  const bassLine = ["C3","C3","F2","F2","G2","G2","A2","G2"];
  let melIdx = 0, chordIdx = 0, beat = 0;

  const melodyLoop = new T.Loop((time) => { const n = melody[melIdx % melody.length]; if (n) lead.triggerAttackRelease(n, "8n", time, 0.5 + Math.random() * 0.2); melIdx++; }, "8n");
  const chordLoop = new T.Loop((time) => { chords.triggerAttackRelease(chordProg[chordIdx % chordProg.length], "2n", time, 0.35); bass.triggerAttackRelease(bassLine[chordIdx % bassLine.length], "4n", time); chordIdx++; }, "2n");
  const drumLoop = new T.Loop((time) => { beat = (beat + 1) % 8; if (beat === 0 || beat === 4) kick.triggerAttackRelease("C1", "8n", time); if (beat === 2 || beat === 6) perc.triggerAttackRelease("16n", time); hat.triggerAttackRelease("C6", "32n", time, 0.07 + Math.random() * 0.06); }, "8n");

  return {
    start: () => { T.getTransport().bpm.value = 110; melodyLoop.start(0); chordLoop.start(0); drumLoop.start(0); T.getTransport().start(); },
    stop: () => { try { melodyLoop.stop(); chordLoop.stop(); drumLoop.stop(); T.getTransport().stop(); chords.releaseAll(); } catch(e){} },
    dispose: () => { try { melodyLoop.dispose(); chordLoop.dispose(); drumLoop.dispose(); lead.dispose(); chords.dispose(); bass.dispose(); kick.dispose(); hat.dispose(); perc.dispose(); reverb.dispose(); chorus.dispose(); } catch(e){} }
  };
}

// ═══ GAMEPLAY MUSIC: Ambient + SFX Hybrid ═══
export async function createGameplayMusic() {
  const T = await getTone(); await T.start();
  const reverb = makeReverb(0.85, 0.5);
  const delay = new T.FeedbackDelay("8n.", 0.25).connect(reverb); delay.wet.value = 0.15;
  const pad = new T.PolySynth(T.Synth, { oscillator: { type: "sine" }, envelope: { attack: 3, decay: 2, sustain: 0.7, release: 4 }, volume: -20 }).connect(reverb);
  const sparkle = new T.PolySynth(T.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 1.5 }, volume: -18 }).connect(delay);

  const ambientChords = [["C3","G3","E4"],["A2","E3","C4"],["F2","C3","A3"],["G2","D3","B3"]];
  const sparkleNotes = ["C5","E5","G5","B5","D6","C6","A5","G5"];
  let idx = 0, sIdx = 0, ducked = false;

  const padLoop = new T.Loop((time) => { pad.triggerAttackRelease(ambientChords[idx % ambientChords.length], "1m", time); idx++; }, "1m");
  const sparkleLoop = new T.Loop((time) => { if (!ducked && Math.random() > 0.5) { sparkle.triggerAttackRelease(sparkleNotes[sIdx % sparkleNotes.length], "16n", time, 0.2 + Math.random() * 0.3); sIdx++; } }, "4n");

  return {
    start: () => { T.getTransport().bpm.value = 65; T.getTransport().swing = 0; padLoop.start(0); sparkleLoop.start("2n"); T.getTransport().start(); },
    stop: () => { try { padLoop.stop(); sparkleLoop.stop(); T.getTransport().stop(); pad.releaseAll(); sparkle.releaseAll(); } catch(e){} },
    dispose: () => { try { padLoop.dispose(); sparkleLoop.dispose(); pad.dispose(); sparkle.dispose(); reverb.dispose(); delay.dispose(); } catch(e){} },
    duck: () => { ducked = true; try { pad.volume.rampTo(-26, 1); } catch(e){} },
    unduck: () => { ducked = false; try { pad.volume.rampTo(-20, 1.5); } catch(e){} },
    isDucked: () => ducked,
  };
}

// ═══ SOUND EFFECTS ═══
let sfxRev = null;
async function getSfxRev() { const T = await getTone(); if (!sfxRev) sfxRev = makeReverb(0.4, 0.2); return sfxRev; }

export async function playCoinSound() {
  try { const T = await getTone(); await T.start(); const r = await getSfxRev();
  const s = new T.Synth({ oscillator:{type:"sine"}, envelope:{attack:0.01,decay:0.15,sustain:0,release:0.1}, volume:-8 }).connect(r);
  s.triggerAttackRelease("E6","16n"); setTimeout(()=>s.triggerAttackRelease("G6","16n"),80); setTimeout(()=>s.dispose(),500); } catch(e){}
}
export async function playBuildSound() {
  try { const T = await getTone(); await T.start(); const r = await getSfxRev();
  const s = new T.NoiseSynth({ noise:{type:"brown"}, envelope:{attack:0.01,decay:0.15,sustain:0,release:0.08}, volume:-14 }).connect(r);
  s.triggerAttackRelease("8n"); setTimeout(()=>s.dispose(),400); } catch(e){}
}
export async function playErrorSound() {
  try { const T = await getTone(); await T.start();
  const s = new T.Synth({ oscillator:{type:"square"}, envelope:{attack:0.01,decay:0.2,sustain:0,release:0.1}, volume:-16 }).toDestination();
  s.triggerAttackRelease("C3","16n"); setTimeout(()=>s.triggerAttackRelease("A2","16n"),120); setTimeout(()=>s.dispose(),500); } catch(e){}
}
export async function playSuccessSound() {
  try { const T = await getTone(); await T.start(); const r = await getSfxRev();
  const s = new T.PolySynth(T.Synth,{ oscillator:{type:"triangle"}, envelope:{attack:0.02,decay:0.5,sustain:0.3,release:1}, volume:-10 }).connect(r);
  s.triggerAttackRelease(["C5","E5","G5"],"8n"); setTimeout(()=>s.triggerAttackRelease(["E5","G5","C6"],"4n"),200); setTimeout(()=>s.dispose(),1500); } catch(e){}
}
export async function playTaskComplete() {
  try { const T = await getTone(); await T.start(); const r = await getSfxRev();
  const s = new T.PolySynth(T.Synth,{ oscillator:{type:"triangle"}, envelope:{attack:0.02,decay:0.8,sustain:0.3,release:1.5}, volume:-8 }).connect(r);
  s.triggerAttackRelease(["C5","E5"],"8n"); setTimeout(()=>s.triggerAttackRelease(["E5","G5"],"8n"),200); setTimeout(()=>s.triggerAttackRelease(["G5","C6","E6"],"4n"),400); setTimeout(()=>s.dispose(),2000); } catch(e){}
}
export async function playClickSound() {
  try { const T = await getTone(); await T.start();
  const s = new T.Synth({ oscillator:{type:"sine"}, envelope:{attack:0.005,decay:0.05,sustain:0,release:0.02}, volume:-16 }).toDestination();
  s.triggerAttackRelease("A5","32n"); setTimeout(()=>s.dispose(),200); } catch(e){}
}
