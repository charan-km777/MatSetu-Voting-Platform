export type ElectionStatus = "draft" | "scheduled" | "live" | "closed";
export type VoterStatus = "verified" | "pending" | "flagged";
export type ActivityStatus = "success" | "pending" | "warning";

export interface Election {
  id: string;
  title: string;
  status: ElectionStatus;
  candidateCount: number;
  voterCount: number;
  startAt: string;
  endAt: string;
  contractAddress: string;
}

export interface Voter {
  id: string;
  displayName: string;
  identifier: string;
  status: VoterStatus;
  registeredAt: string;
  lastVerifiedAt: string;
  descriptor: number[];
}

export interface Activity {
  id: string;
  type: "registration" | "verification" | "ledger" | "election";
  label: string;
  detail: string;
  timestamp: string;
  status: ActivityStatus;
}

const now = Date.now();
const descriptor = (seed: number) =>
  Array.from({ length: 128 }, (_, index) =>
    Number(Math.sin(seed + index * 0.17).toFixed(6)),
  );

export const elections: Election[] = [
  {
    id: "election-student-council",
    title: "2026 Student Council Election",
    status: "live",
    candidateCount: 6,
    voterCount: 1248,
    startAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
    endAt: new Date(now + 1000 * 60 * 60 * 20).toISOString(),
    contractAddress: "0x71C8...9a42",
  },
  {
    id: "election-cse-rep",
    title: "CSE Department Representative",
    status: "scheduled",
    candidateCount: 4,
    voterCount: 386,
    startAt: new Date(now + 1000 * 60 * 60 * 48).toISOString(),
    endAt: new Date(now + 1000 * 60 * 60 * 72).toISOString(),
    contractAddress: "0x2F10...6b0E",
  },
];

export const voters: Voter[] = [
  {
    id: "voter-001",
    displayName: "Amogh Nagur",
    identifier: "1SJ23CS009",
    status: "verified",
    registeredAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
    lastVerifiedAt: new Date(now - 1000 * 60 * 18).toISOString(),
    descriptor: descriptor(1),
  },
  {
    id: "voter-002",
    displayName: "Chandu P",
    identifier: "1SJ23CS038",
    status: "verified",
    registeredAt: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
    lastVerifiedAt: new Date(now - 1000 * 60 * 56).toISOString(),
    descriptor: descriptor(2),
  },
  {
    id: "voter-003",
    displayName: "Charan KM",
    identifier: "1SJ23CS039",
    status: "pending",
    registeredAt: new Date(now - 1000 * 60 * 8).toISOString(),
    lastVerifiedAt: new Date(now - 1000 * 60 * 8).toISOString(),
    descriptor: descriptor(3),
  },
];

export const activities: Activity[] = [
  {
    id: "activity-001",
    type: "ledger",
    label: "Contract heartbeat confirmed",
    detail: "Student Council contract responded in 42 ms",
    timestamp: new Date(now - 1000 * 60 * 3).toISOString(),
    status: "success",
  },
  {
    id: "activity-002",
    type: "verification",
    label: "Voter verified",
    detail: "1SJ23CS038 passed the d < 0.45 match threshold",
    timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
    status: "success",
  },
  {
    id: "activity-003",
    type: "registration",
    label: "Registration awaiting review",
    detail: "1SJ23CS039 has a captured descriptor ready for verification",
    timestamp: new Date(now - 1000 * 60 * 34).toISOString(),
    status: "pending",
  },
  {
    id: "activity-004",
    type: "verification",
    label: "Duplicate attempt blocked",
    detail: "Similarity score 0.31 matched an existing descriptor",
    timestamp: new Date(now - 1000 * 60 * 52).toISOString(),
    status: "warning",
  },
];

export const getPublicVoter = (voter: Voter) => {
  const { descriptor: _descriptor, ...publicVoter } = voter;
  return publicVoter;
};