export type Seed = { en: string; level: string; topic: string };

const RAW: readonly (readonly [string, string, string])[] = [
  // B2
  ["procrastinate","B2","work"],["delegate","B2","work"],["brainstorm","B2","work"],["milestone","B2","work"],["workflow","B2","work"],["burnout","B2","work"],["networking","B2","work"],["freelance","B2","work"],["overtime","B2","work"],["workload","B2","work"],
  ["errand","B2","daily life"],["chore","B2","daily life"],["appliance","B2","daily life"],["subscription","B2","daily life"],["refund","B2","daily life"],["warranty","B2","daily life"],["budget","B2","daily life"],["leftover","B2","daily life"],
  ["symptom","B2","health"],["prescription","B2","health"],["checkup","B2","health"],["nutrition","B2","health"],["insomnia","B2","health"],["posture","B2","health"],["wellbeing","B2","health"],
  ["itinerary","B2","travel"],["layover","B2","travel"],["customs","B2","travel"],["souvenir","B2","travel"],["landmark","B2","travel"],["accommodation","B2","travel"],
  ["overwhelmed","B2","emotions"],["grateful","B2","emotions"],["frustrated","B2","emotions"],["nostalgic","B2","emotions"],["confident","B2","emotions"],["hesitant","B2","emotions"],
  // C1
  ["stakeholder","C1","business"],["leverage","C1","business"],["scalable","C1","business"],["outsource","C1","business"],["benchmark","C1","business"],["revenue","C1","business"],["acquisition","C1","business"],["logistics","C1","business"],
  ["algorithm","C1","technology"],["encryption","C1","technology"],["bandwidth","C1","technology"],["interface","C1","technology"],["automation","C1","technology"],["prototype","C1","technology"],["latency","C1","technology"],
  ["hypothesis","C1","education"],["methodology","C1","education"],["citation","C1","education"],["plagiarism","C1","education"],["thesis","C1","education"],["assessment","C1","education"],
  ["inequality","C1","society"],["demographic","C1","society"],["urbanization","C1","society"],["migration","C1","society"],["welfare","C1","society"],["sustainability","C1","society"],
  ["resilience","C1","emotions"],["empathy","C1","emotions"],["vulnerability","C1","emotions"],["contentment","C1","emotions"],
  // C2
  ["ubiquitous","C2","academic life"],["ephemeral","C2","academic life"],["dichotomy","C2","academic life"],["pragmatic","C2","academic life"],["esoteric","C2","academic life"],["juxtaposition","C2","arts and culture"],["connotation","C2","arts and culture"],["rhetoric","C2","arts and culture"],
  ["epistemology","C2","academic life"],["hegemony","C2","politics"],["catalyst","C2","science"],["discourse","C2","academic life"],["ideology","C2","politics"],["scrutiny","C2","politics"],["advocate","C2","politics"],["ambivalence","C2","emotions"],
];

export const WORDLIST: Seed[] = RAW.map(([en, level, topic]) => ({ en, level, topic }));
