import { MongoClient, type Collection, type Db } from "mongodb";

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

export interface CreateElectionRecord {
  title: string;
  startAt: string;
  endAt: string;
}

export interface RegisterVoterRecord {
  displayName: string;
  identifier: string;
  descriptor: number[];
}

export interface MatsetuStore {
  readonly mode: "memory" | "mongodb";
  ready(): Promise<void>;
  listElections(): Promise<Election[]>;
  getElection(id: string): Promise<Election | undefined>;
  createElection(input: CreateElectionRecord): Promise<Election>;
  listVoters(): Promise<Voter[]>;
  getVoter(id: string): Promise<Voter | undefined>;
  createVoter(input: RegisterVoterRecord): Promise<Voter>;
  markVoterVerified(id: string, timestamp: string): Promise<Voter | undefined>;
  listActivities(): Promise<Activity[]>;
  addActivity(activity: Activity): Promise<void>;
  getDashboardCounts(): Promise<{
    activeVoters: number;
    activeElections: number;
    duplicateAttempts: number;
  }>;
}

const makeDescriptor = (seed: number) =>
  Array.from({ length: 128 }, (_, index) =>
    Number(Math.sin(seed + index * 0.17).toFixed(6)),
  );

function createSeedData() {
  const now = Date.now();
  const elections: Election[] = [
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

  const voters: Voter[] = [
    {
      id: "voter-001",
      displayName: "Amogh Nagur",
      identifier: "1SJ23CS009",
      status: "verified",
      registeredAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
      lastVerifiedAt: new Date(now - 1000 * 60 * 18).toISOString(),
      descriptor: makeDescriptor(1),
    },
    {
      id: "voter-002",
      displayName: "Chandu P",
      identifier: "1SJ23CS038",
      status: "verified",
      registeredAt: new Date(now - 1000 * 60 * 60 * 29).toISOString(),
      lastVerifiedAt: new Date(now - 1000 * 60 * 56).toISOString(),
      descriptor: makeDescriptor(2),
    },
    {
      id: "voter-003",
      displayName: "Charan KM",
      identifier: "1SJ23CS039",
      status: "pending",
      registeredAt: new Date(now - 1000 * 60 * 8).toISOString(),
      lastVerifiedAt: new Date(now - 1000 * 60 * 8).toISOString(),
      descriptor: makeDescriptor(3),
    },
  ];

  const activities: Activity[] = [
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

  return { elections, voters, activities };
}

class MemoryMatsetuStore implements MatsetuStore {
  readonly mode = "memory" as const;
  private readonly data = createSeedData();

  async ready() {}

  async listElections() {
    return this.data.elections.map((election) => ({ ...election }));
  }

  async getElection(id: string) {
    const election = this.data.elections.find((candidate) => candidate.id === id);
    return election ? { ...election } : undefined;
  }

  async createElection(input: CreateElectionRecord) {
    const election: Election = {
      id: `election-${Date.now()}`,
      title: input.title,
      status: "draft",
      candidateCount: 0,
      voterCount: 0,
      startAt: new Date(input.startAt).toISOString(),
      endAt: new Date(input.endAt).toISOString(),
      contractAddress: "pending deployment",
    };
    this.data.elections.unshift(election);
    return { ...election };
  }

  async listVoters() {
    return this.data.voters.map((voter) => ({ ...voter, descriptor: [...voter.descriptor] }));
  }

  async getVoter(id: string) {
    const voter = this.data.voters.find((candidate) => candidate.id === id);
    return voter ? { ...voter, descriptor: [...voter.descriptor] } : undefined;
  }

  async createVoter(input: RegisterVoterRecord) {
    const now = new Date().toISOString();
    const voter: Voter = {
      id: `voter-${Date.now()}`,
      displayName: input.displayName,
      identifier: input.identifier,
      status: "pending",
      registeredAt: now,
      lastVerifiedAt: now,
      descriptor: [...input.descriptor],
    };
    this.data.voters.unshift(voter);
    return { ...voter, descriptor: [...voter.descriptor] };
  }

  async markVoterVerified(id: string, timestamp: string) {
    const voter = this.data.voters.find((candidate) => candidate.id === id);
    if (!voter) return undefined;
    voter.status = "verified";
    voter.lastVerifiedAt = timestamp;
    return { ...voter, descriptor: [...voter.descriptor] };
  }

  async listActivities() {
    return this.data.activities.map((activity) => ({ ...activity }));
  }

  async addActivity(activity: Activity) {
    this.data.activities.unshift({ ...activity });
  }

  async getDashboardCounts() {
    return {
      activeVoters: this.data.voters.filter((voter) => voter.status !== "flagged").length,
      activeElections: this.data.elections.filter((election) =>
        ["live", "scheduled"].includes(election.status),
      ).length,
      duplicateAttempts: this.data.activities.filter(
        (activity) => activity.status === "warning",
      ).length,
    };
  }
}

class MongoMatsetuStore implements MatsetuStore {
  readonly mode = "mongodb" as const;
  private readonly client: MongoClient;
  private db!: Db;
  private elections!: Collection<Election>;
  private voters!: Collection<Voter>;
  private activities!: Collection<Activity>;
  private readonly uri: string;
  private readonly databaseName: string;

  constructor(uri: string) {
    this.uri = uri;
    this.databaseName = process.env.MONGODB_DB_NAME || "matsetu";
    this.client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
    });
  }

  async ready() {
    if (this.db) return;

    let lastError: unknown;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        await this.client.connect();
        this.db = this.client.db(this.databaseName);
        this.elections = this.db.collection<Election>("elections");
        this.voters = this.db.collection<Voter>("voters");
        this.activities = this.db.collection<Activity>("activities");
        await this.ensureIndexes();
        await this.seedOnce();
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }

    throw new Error(
      `MongoDB initialization failed for ${this.uri.replace(/\/\/.*@/, "//***@")}: ${String(lastError)}`,
    );
  }

  private async ensureIndexes() {
    await Promise.all([
      this.elections.createIndex({ id: 1 }, { unique: true }),
      this.voters.createIndex({ id: 1 }, { unique: true }),
      this.voters.createIndex({ identifier: 1 }, { unique: true }),
      this.activities.createIndex({ timestamp: -1 }),
    ]);
  }

  private async seedOnce() {
    const metadata = this.db.collection<{ _id: string }>("metadata");
    const marker = await metadata.findOne({ _id: "phase1-seeded" });
    if (marker) return;

    const seed = createSeedData();
    await Promise.all([
      this.elections.insertMany(seed.elections),
      this.voters.insertMany(seed.voters),
      this.activities.insertMany(seed.activities),
    ]);
    await metadata.insertOne({ _id: "phase1-seeded" });
  }

  async listElections() {
    return this.elections.find({}, { projection: { _id: 0 } }).sort({ startAt: 1 }).toArray();
  }

  async getElection(id: string) {
    const election = await this.elections.findOne({ id }, { projection: { _id: 0 } });
    return election ?? undefined;
  }

  async createElection(input: CreateElectionRecord) {
    const election: Election = {
      id: `election-${Date.now()}`,
      title: input.title,
      status: "draft",
      candidateCount: 0,
      voterCount: 0,
      startAt: new Date(input.startAt).toISOString(),
      endAt: new Date(input.endAt).toISOString(),
      contractAddress: "pending deployment",
    };
    await this.elections.insertOne(election);
    return election;
  }

  async listVoters() {
    return this.voters.find({}, { projection: { _id: 0 } }).sort({ registeredAt: -1 }).toArray();
  }

  async getVoter(id: string) {
    const voter = await this.voters.findOne({ id }, { projection: { _id: 0 } });
    return voter ?? undefined;
  }

  async createVoter(input: RegisterVoterRecord) {
    const now = new Date().toISOString();
    const voter: Voter = {
      id: `voter-${Date.now()}`,
      displayName: input.displayName,
      identifier: input.identifier,
      status: "pending",
      registeredAt: now,
      lastVerifiedAt: now,
      descriptor: [...input.descriptor],
    };
    await this.voters.insertOne(voter);
    return voter;
  }

  async markVoterVerified(id: string, timestamp: string) {
    const result = await this.voters.findOneAndUpdate(
      { id },
      { $set: { status: "verified", lastVerifiedAt: timestamp } },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return result ?? undefined;
  }

  async listActivities() {
    return this.activities.find({}, { projection: { _id: 0 } }).sort({ timestamp: -1 }).limit(50).toArray();
  }

  async addActivity(activity: Activity) {
    await this.activities.insertOne(activity);
  }

  async getDashboardCounts() {
    const [activeVoters, activeElections, duplicateAttempts] = await Promise.all([
      this.voters.countDocuments({ status: { $ne: "flagged" } }),
      this.elections.countDocuments({ status: { $in: ["live", "scheduled"] } }),
      this.activities.countDocuments({ status: "warning" }),
    ]);
    return { activeVoters, activeElections, duplicateAttempts };
  }
}

export function createMatsetuStore(uri = process.env.MONGODB_URI): MatsetuStore {
  return uri ? new MongoMatsetuStore(uri) : new MemoryMatsetuStore();
}

export const matsetuStore = createMatsetuStore();

export const getPublicVoter = (voter: Voter) => {
  const { descriptor: _descriptor, ...publicVoter } = voter;
  return publicVoter;
};