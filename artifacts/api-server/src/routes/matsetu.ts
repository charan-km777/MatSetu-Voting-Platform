import { Router, type IRouter } from "express";
import {
  CreateElectionBody,
  GetElectionParams,
  GetElectionsResponse,
  GetElectionResponse,
  GetVotersResponse,
  GetDashboardSummaryResponse,
  GetLedgerStatusResponse,
  GetActivityResponse,
  RegisterVoterBody,
  RegisterVoterResponse,
  VerifyVoterBody,
  VerifyVoterParams,
  VerifyVoterResponse,
} from "@workspace/api-zod";
import {
  getPublicVoter,
  matsetuStore,
} from "../matsetu-store";

const router: IRouter = Router();
const DUPLICATE_THRESHOLD = 0.45;

const distance = (left: number[], right: number[]) =>
  Math.sqrt(
    left.reduce((sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2, 0),
  );

router.use(async (_req, res, next) => {
  try {
    await matsetuStore.ready();
    next();
  } catch {
    res.status(503).json({ error: "Persistent data store is unavailable." });
  }
});

const addActivity = async (
  type: "registration" | "verification" | "ledger" | "election",
  label: string,
  detail: string,
  status: "success" | "pending" | "warning",
) => {
  await matsetuStore.addActivity({
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    label,
    detail,
    timestamp: new Date().toISOString(),
    status,
  });
};

router.get("/dashboard/summary", async (_req, res) => {
  const counts = await matsetuStore.getDashboardCounts();
  const summary = GetDashboardSummaryResponse.parse({
    activeVoters: counts.activeVoters,
    activeElections: counts.activeElections,
    verifiedTransactions: 842,
    duplicateAttempts: counts.duplicateAttempts,
    systemStatus: "operational",
  });
  res.json(summary);
});

router.get("/elections", async (_req, res) => {
  res.json(GetElectionsResponse.parse(await matsetuStore.listElections()));
});

router.post("/elections", async (req, res) => {
  const input = CreateElectionBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Provide a title and a valid election window." });
    return;
  }

  const election = await matsetuStore.createElection({
    title: input.data.title,
    startAt: input.data.startAt.toISOString(),
    endAt: input.data.endAt.toISOString(),
  });
  await addActivity(
    "election",
    "Election draft created",
    `${election.title} is ready for candidate configuration`,
    "pending",
  );
  res.status(201).json(GetElectionResponse.parse(election));
});

router.get("/elections/:id", async (req, res) => {
  const params = GetElectionParams.safeParse(req.params);
  const election = params.success
    ? await matsetuStore.getElection(params.data.id)
    : undefined;
  if (!election) {
    res.status(404).json({ error: "Election not found." });
    return;
  }
  res.json(GetElectionResponse.parse(election));
});

router.get("/voters", async (_req, res) => {
  const voters = await matsetuStore.listVoters();
  res.json(GetVotersResponse.parse(voters.map(getPublicVoter)));
});

router.post("/voters/register", async (req, res) => {
  const input = RegisterVoterBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "A 128-dimensional descriptor is required." });
    return;
  }

  const voters = await matsetuStore.listVoters();
  const closestMatch = voters
    .map((voter) => ({ voter, score: distance(input.data.descriptor, voter.descriptor) }))
    .sort((left, right) => left.score - right.score)[0];

  if (closestMatch && closestMatch.score < DUPLICATE_THRESHOLD) {
    await addActivity(
      "verification",
      "Duplicate attempt blocked",
      `Similarity score ${closestMatch.score.toFixed(3)} matched an existing descriptor`,
      "warning",
    );
    res.status(409).json({
      error: `Duplicate identity blocked. Closest descriptor distance: ${closestMatch.score.toFixed(3)}.`,
    });
    return;
  }

  const voter = await matsetuStore.createVoter(input.data);
  await addActivity(
    "registration",
    "Voter registration captured",
    `${voter.identifier} has a descriptor ready for verification`,
    "pending",
  );
  res.status(201).json(RegisterVoterResponse.parse(getPublicVoter(voter)));
});

router.post("/voters/:id/verify", async (req, res) => {
  const params = VerifyVoterParams.safeParse(req.params);
  const input = VerifyVoterBody.safeParse(req.body);
  const voter = params.success
    ? await matsetuStore.getVoter(params.data.id)
    : undefined;
  if (!voter) {
    res.status(404).json({ error: "Voter not found." });
    return;
  }
  if (!input.success) {
    res.status(400).json({ error: "A 128-dimensional descriptor is required." });
    return;
  }

  const score = distance(input.data.descriptor, voter.descriptor);
  const verified = score < DUPLICATE_THRESHOLD;
  if (verified) {
    await matsetuStore.markVoterVerified(voter.id, new Date().toISOString());
  }
  await addActivity(
    "verification",
    verified ? "Voter verified" : "Verification threshold missed",
    `${voter.identifier} ${verified ? "passed" : "did not pass"} the d < ${DUPLICATE_THRESHOLD} match threshold`,
    verified ? "success" : "warning",
  );
  res.json(
    VerifyVoterResponse.parse({
      verified,
      distance: Number(score.toFixed(4)),
      threshold: DUPLICATE_THRESHOLD,
      message: verified
        ? "Identity verified for ballot authorization."
        : "Face did not meet the verification threshold.",
    }),
  );
});

router.get("/ledger/status", (_req, res) => {
  res.json(
    GetLedgerStatusResponse.parse({
      network: "Hardhat local",
      blockNumber: 1842,
      latencyMs: 42,
      contractStatus: "deployed",
      rpcUrl: "http://hardhat:8545",
    }),
  );
});

router.get("/activity", async (_req, res) => {
  res.json(GetActivityResponse.parse(await matsetuStore.listActivities()));
});

export default router;