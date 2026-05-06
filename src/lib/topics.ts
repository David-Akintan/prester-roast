// Daily-topic rotation for the free-roast feature.
// Plan: one free roast per wallet per UTC day, scoped to that day's topic.
// Topic is deterministic from UTC date so the server and client always agree
// without a backing store.

const TOPICS: readonly string[] = [
  "your worst startup idea",
  "your sketchiest excuse",
  "the side quest you abandoned",
  "your most chaotic group chat take",
  "the hill you'd die on",
  "your weirdest food combo",
  "the lie your CV is currently telling",
  "your most cursed late-night purchase",
  "the prediction you got catastrophically wrong",
  "your most over-confident hot take",
  "the meeting that should've been an email",
  "your worst job interview answer",
  "the post you almost posted",
  "your spiciest opinion about JavaScript",
  "the project you keep saying you'll ship",
  "your most fake-deep tweet",
  "the trend you fell for",
  "your most embarrassing fan moment",
  "the productivity system you abandoned",
  "your weirdest LinkedIn message",
  "the opinion that lost you a friend",
  "your most ridiculous purchase justification",
  "the conspiracy theory you secretly believe",
  "your worst New Year's resolution",
  "the skill you fake having",
  "your most chaotic Tinder bio",
  "the email subject line you regret",
  "your wildest dating-app DM",
  "the pitch deck you'd ban from existing",
  "your most useless certification",
  "the AI hype you fell for",
];

export interface DailyTopic {
  topic: string;
  utcDay: number;
  isoDate: string;
}

// Compute current UTC day index (days since unix epoch).
export function utcDayIndex(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 86_400_000);
}

export function dailyTopic(date: Date = new Date()): DailyTopic {
  const utcDay = utcDayIndex(date);
  const topic = TOPICS[utcDay % TOPICS.length];
  return {
    topic,
    utcDay,
    isoDate: date.toISOString().slice(0, 10),
  };
}
