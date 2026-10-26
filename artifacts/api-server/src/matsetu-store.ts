import { randomUUID } from "node:crypto";
import {
  MongoClient,
  type Collection,
  type Db,
  type OptionalUnlessRequiredId,
} from "mongodb";

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
  network: string | null;
  chainId: number | null;
  isDemo: boolean;
}

export interface ElectionContractConfiguration {
  contractAddress: string;
  network: string;
  chainId: number;
  candidateCount: number;
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

export interface LedgerStatus {
  network: string;
  blockNumber: number;
  latencyMs: number;
  contractStatus: "deployed" | "pending" | "offline";
  rpcUrl: string;
}

export interface BiometricMatch {
  voter: Voter;
  score: number;
}

export interface BiometricVerificationMetadata {
  descriptor: number[];
  lastVerifiedAt: string;
}

export interface VoterRepository {
  listVoters(): Promise<Voter[]>;
  findVoterById(id: string): Promise<Voter | undefined>;
  createVoter(voter: Voter): Promise<Voter>;
  updateVerification(
    id: string,
    verification: Pick<Voter, "status" | "lastVerifiedAt">,
  ): Promise<Voter | undefined>;
}

export interface BiometricVerificationRepository {
  findClosest(descriptor: number[]): Promise<BiometricMatch | undefined>;
  getVerificationMetadata(
    voterId: string,
  ): Promise<BiometricVerificationMetadata | undefined>;
}

export interface ElectionRepository {
  listElections(): Promise<Election[]>;
  findElectionById(id: string): Promise<Election | undefined>;
  createElection(election: Election): Promise<Election>;
  assignElectionContract(
    id: string,
    configuration: ElectionContractConfiguration,
  ): Promise<Election | undefined>;
}

export interface LedgerStatusRepository {
  getStatus(): Promise<LedgerStatus>;
}

export interface ActivityRepository {
  listActivities(): Promise<Activity[]>;
  createActivity(activity: Activity): Promise<Activity>;
}

export interface MatSetuRepository
  extends VoterRepository,
    BiometricVerificationRepository,
    ElectionRepository,
    LedgerStatusRepository,
    ActivityRepository {
  getDashboardCounts(): Promise<{
    activeVoters: number;
    activeElections: number;
    duplicateAttempts: number;
  }>;
  close(): Promise<void>;
}

const descriptor = (seed: number) =>
  Array.from({ length: 128 }, (_, index) =>
    Number(Math.sin(seed + index * 0.17).toFixed(6)),
  );

function createSeedData() {
  const now = Date.now();
  const elections: Election[] = [
    {
      id: "election-student-council",
      title: "2026 Student Council Election (demo)",
      status: "draft",
      candidateCount: 6,
      voterCount: 1248,
      startAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
      endAt: new Date(now + 1000 * 60 * 60 * 20).toISOString(),
      contractAddress: "",
      network: null,
      chainId: null,
      isDemo: true,
    },
    {
      id: "election-cse-rep",
      title: "CSE Department Representative (demo)",
      status: "draft",
      candidateCount: 4,
      voterCount: 386,
      startAt: new Date(now + 1000 * 60 * 60 * 48).toISOString(),
      endAt: new Date(now + 1000 * 60 * 60 * 72).toISOString(),
      contractAddress: "",
      network: null,
      chainId: null,
      isDemo: true,
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

const ledgerStatus: LedgerStatus = {
  network: "Hardhat local",
  blockNumber: 1842,
  latencyMs: 42,
  contractStatus: "deployed",
  rpcUrl: process.env["HARDHAT_RPC_URL"] ?? "http://hardhat:8545",
};

const clone = <T>(value: T): T => structuredClone(value);

function normalizeElection(election: Election): Election {
  const network = election.network ?? null;
  const chainId = election.chainId ?? null;
  const hasDeployment =
    /^0x[a-fA-F0-9]{40}$/.test(election.contractAddress) &&
    typeof network === "string" &&
    network.trim().length > 0 &&
    typeof chainId === "number" &&
    Number.isInteger(chainId) &&
    chainId > 0;
  const isDemo =
    typeof election.isDemo === "boolean" ? election.isDemo : !hasDeployment;

  return {
    ...election,
    network,
    chainId,
    isDemo,
    status: isDemo && election.status !== "closed" ? "draft" : election.status,
  };
}

class InMemoryMatSetuRepository implements MatSetuRepository {
  private readonly data = createSeedData();

  async listVoters(): Promise<Voter[]> {
    return this.data.voters.map(clone);
  }

  async findVoterById(id: string): Promise<Voter | undefined> {
    const voter = this.data.voters.find((candidate) => candidate.id === id);
    return voter ? clone(voter) : undefined;
  }

  async createVoter(voter: Voter): Promise<Voter> {
    this.data.voters.unshift(clone(voter));
    return clone(voter);
  }

  async updateVerification(
    id: string,
    verification: Pick<Voter, "status" | "lastVerifiedAt">,
  ): Promise<Voter | undefined> {
    const voter = this.data.voters.find((candidate) => candidate.id === id);
    if (!voter) {
      return undefined;
    }
    Object.assign(voter, verification);
    return clone(voter);
  }

  async findClosest(descriptorToMatch: number[]): Promise<BiometricMatch | undefined> {
    const voters = await this.listVoters();
    return closestMatch(voters, descriptorToMatch);
  }

  async getVerificationMetadata(
    voterId: string,
  ): Promise<BiometricVerificationMetadata | undefined> {
    const voter = await this.findVoterById(voterId);
    return voter
      ? {
          descriptor: [...voter.descriptor],
          lastVerifiedAt: voter.lastVerifiedAt,
        }
      : undefined;
  }

  async listElections(): Promise<Election[]> {
    return this.data.elections.map(clone);
  }

  async findElectionById(id: string): Promise<Election | undefined> {
    const election = this.data.elections.find((candidate) => candidate.id === id);
    return election ? clone(election) : undefined;
  }

  async createElection(election: Election): Promise<Election> {
    this.data.elections.unshift(clone(election));
    return clone(election);
  }

  async assignElectionContract(
    id: string,
    configuration: ElectionContractConfiguration,
  ): Promise<Election | undefined> {
    const election = this.data.elections.find((candidate) => candidate.id === id);
    if (!election) return undefined;
    Object.assign(election, configuration, { isDemo: false });
    return clone(election);
  }

  async getStatus(): Promise<LedgerStatus> {
    return clone(ledgerStatus);
  }

  async listActivities(): Promise<Activity[]> {
    return this.data.activities.map(clone);
  }

  async createActivity(activity: Activity): Promise<Activity> {
    this.data.activities.unshift(clone(activity));
    return clone(activity);
  }

  async getDashboardCounts() {
    return {
      activeVoters: this.data.voters.filter((voter) => voter.status !== "flagged")
        .length,
      activeElections: this.data.elections.filter((election) =>
        !election.isDemo && ["live", "scheduled"].includes(election.status),
      ).length,
      duplicateAttempts: this.data.activities.filter(
        (activity) => activity.status === "warning",
      ).length,
    };
  }

  async close(): Promise<void> {}
}

type MongoVoter = Voter & { _id?: string };
type MongoElection = Election & { _id?: string };
type MongoActivity = Activity & { _id?: string };

class MongoMatSetuRepository implements MatSetuRepository {
  private constructor(
    private readonly client: MongoClient,
    private readonly database: Db,
    private readonly voters: Collection<MongoVoter>,
    private readonly elections: Collection<MongoElection>,
    private readonly activities: Collection<MongoActivity>,
  ) {}

  static async connect(uri: string): Promise<MongoMatSetuRepository> {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    const databaseName = process.env["MONGODB_DB_NAME"];
    let lastError: unknown;

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        await client.connect();
        const database = databaseName ? client.db(databaseName) : client.db();
        const repository = new MongoMatSetuRepository(
          client,
          database,
          database.collection<MongoVoter>("voters"),
          database.collection<MongoElection>("elections"),
          database.collection<MongoActivity>("activities"),
        );
        await repository.initialize();
        return repository;
      } catch (error) {
        lastError = error;
        if (attempt < 10) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    await client.close().catch(() => undefined);
    throw new Error(
      `MongoDB is configured but the connection or initialization failed: ${formatError(lastError)}`,
      { cause: lastError },
    );
  }

  private async initialize(): Promise<void> {
    await Promise.all([
      this.voters.createIndex({ id: 1 }, { unique: true }),
      this.voters.createIndex({ identifier: 1 }, { unique: true }),
      this.elections.createIndex({ id: 1 }, { unique: true }),
      this.activities.createIndex({ id: 1 }, { unique: true }),
      this.activities.createIndex({ timestamp: -1 }),
    ]);

    const seeds = createSeedData();
    await Promise.all([
      seedCollection(this.voters, seeds.voters),
      seedCollection(this.elections, seeds.elections),
      seedCollection(this.activities, seeds.activities),
    ]);
    await this.database.command({ ping: 1 });
  }

  async listVoters(): Promise<Voter[]> {
    return this.voters
      .find({}, { projection: { _id: 0 } })
      .sort({ registeredAt: -1 })
      .toArray();
  }

  async findVoterById(id: string): Promise<Voter | undefined> {
    return (
      (await this.voters.findOne({ id }, { projection: { _id: 0 } })) ??
      undefined
    );
  }

  async createVoter(voter: Voter): Promise<Voter> {
    await this.voters.insertOne(clone(voter));
    return clone(voter);
  }

  async updateVerification(
    id: string,
    verification: Pick<Voter, "status" | "lastVerifiedAt">,
  ): Promise<Voter | undefined> {
    const updated = await this.voters.findOneAndUpdate(
      { id },
      { $set: verification },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return updated ?? undefined;
  }

  async findClosest(descriptorToMatch: number[]): Promise<BiometricMatch | undefined> {
    return closestMatch(await this.listVoters(), descriptorToMatch);
  }

  async getVerificationMetadata(
    voterId: string,
  ): Promise<BiometricVerificationMetadata | undefined> {
    const voter = await this.voters.findOne(
      { id: voterId },
      {
        projection: {
          _id: 0,
          descriptor: 1,
          lastVerifiedAt: 1,
        },
      },
    );
    return voter
      ? {
          descriptor: [...voter.descriptor],
          lastVerifiedAt: voter.lastVerifiedAt,
        }
      : undefined;
  }

  async listElections(): Promise<Election[]> {
    const elections = await this.elections
      .find({}, { projection: { _id: 0 } })
      .sort({ startAt: 1 })
      .toArray();
    return elections.map(normalizeElection);
  }

  async findElectionById(id: string): Promise<Election | undefined> {
    const election =
      (await this.elections.findOne({ id }, { projection: { _id: 0 } })) ??
      undefined;
    return election ? normalizeElection(election) : undefined;
  }

  async createElection(election: Election): Promise<Election> {
    await this.elections.insertOne(clone(election));
    return clone(election);
  }

  async assignElectionContract(
    id: string,
    configuration: ElectionContractConfiguration,
  ): Promise<Election | undefined> {
    const updated = await this.elections.findOneAndUpdate(
      { id },
      { $set: { ...configuration, isDemo: false } },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    return updated ? normalizeElection(updated) : undefined;
  }

  async getStatus(): Promise<LedgerStatus> {
    return clone(ledgerStatus);
  }

  async listActivities(): Promise<Activity[]> {
    return this.activities
      .find({}, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
  }

  async createActivity(activity: Activity): Promise<Activity> {
    await this.activities.insertOne(clone(activity));
    return clone(activity);
  }

  async getDashboardCounts() {
    const [activeVoters, activeElections, duplicateAttempts] =
      await Promise.all([
        this.voters.countDocuments({ status: { $ne: "flagged" } }),
        this.elections.countDocuments({
          status: { $in: ["live", "scheduled"] },
          isDemo: { $ne: true },
          contractAddress: /^0x[a-fA-F0-9]{40}$/,
          network: { $type: "string", $ne: "" },
          chainId: { $gt: 0 },
          candidateCount: { $gt: 0 },
        }),
        this.activities.countDocuments({ status: "warning" }),
      ]);
    return { activeVoters, activeElections, duplicateAttempts };
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

const closestMatch = (
  voters: Voter[],
  descriptorToMatch: number[],
): BiometricMatch | undefined =>
  voters
    .map((voter) => ({
      voter,
      score: distance(descriptorToMatch, voter.descriptor),
    }))
    .sort((left, right) => left.score - right.score)[0];

const distance = (left: number[], right: number[]) =>
  Math.sqrt(
    left.reduce(
      (sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2,
      0,
    ),
  );

async function seedCollection<T extends { id: string }>(
  collection: Collection<T>,
  seeds: T[],
): Promise<void> {
  if ((await collection.countDocuments()) === 0) {
    await collection.insertMany(
      seeds.map(clone) as OptionalUnlessRequiredId<T>[],
    );
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function createInMemoryMatSetuRepository(): MatSetuRepository {
  return new InMemoryMatSetuRepository();
}

export async function createMatSetuRepository(
  mongoUri = process.env["MONGODB_URI"],
): Promise<MatSetuRepository> {
  if (!mongoUri) {
    return createInMemoryMatSetuRepository();
  }
  return MongoMatSetuRepository.connect(mongoUri);
}

export const getPublicVoter = (voter: Voter) => {
  const { descriptor: _descriptor, ...publicVoter } = voter;
  return publicVoter;
};