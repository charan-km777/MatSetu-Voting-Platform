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
  activities,
  elections,
  getPublicVoter,
  type Election,
  type Voter,
  voters,
} from "../matsetu-store";

const router: IRouter = Router();
const DUPLICATE_THRESHOLD = 0.45;

const distance = (left: number[], right: number[]) =>
  Math.sqrt(
    left.reduce((sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2, 0),
  );

router.get("/dashboard/summary", (_req, res) => {
  const summary = GetDashboardSummaryResponse.parse({
    activeVoters: voters.filter((voter) => voter.status !== "flagged").length,
    activeElections: elections.filter((election) =>
      ["live", "scheduled"].includes(election.status),
    ).length,
    verifiedTransactions: 842,
    duplicateAttempts: 1,
    systemStatus: "operational",
  });
  res.json(summary);
});

router.get("/elections", (_req, res) => {
  res.json(GetElectionsResponse.parse(elections));
});

router.post("/elections", (req, res) => {
  const input = CreateElectionBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Provide a title and a valid election window." });
    return;
  }

  const election: Election = {
    id: `election-${Date.now()}`,
    title: input.data.title,
    status: "draft",
    candidateCount: 0,
    voterCount: 0,
    startAt: new Date(input.data.startAt).toISOString(),
    endAt: new Date(input.data.endAt).toISOString(),
    contractAddress: "pending deployment",
  };
  elections.unshift(election);
  res.status(201).json(GetElectionResponse.parse(election));
});

router.get("/elections/:id", (req, res) => {
  const params = GetElectionParams.safeParse(req.params);
  const election = params.success
    ? elections.find((candidate) => candidate.id === params.data.id)
    : undefined;
  if (!election) {
    res.status(404).json({ error: "Election not found." });
    return;
  }
  res.json(GetElectionResponse.parse(election));
});

router.get("/voters", (_req, res) => {
  res.json(GetVotersResponse.parse(voters.map(getPublicVoter)));
});

router.post("/voters/register", (req, res) => {
  const input = RegisterVoterBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "A 128-dimensional descriptor is required." });
    return;
  }

  const closestMatch = voters
    .map((voter) => ({ voter, score: distance(input.data.descriptor, voter.descriptor) }))
    .sort((left, right) => left.score - right.score)[0];

  if (closestMatch && closestMatch.score < DUPLICATE_THRESHOLD) {
    res.status(409).json({
      error: `Duplicate identity blocked. Closest descriptor distance: ${closestMatch.score.toFixed(3)}.`,
    });
    return;
  }

  const now = new Date().toISOString();
  const voter: Voter = {
    id: `voter-${Date.now()}`,
    displayName: input.data.displayName,
    identifier: input.data.identifier,
    status: "pending",
    registeredAt: now,
    lastVerifiedAt: now,
    descriptor: input.data.descriptor,
  };
  voters.unshift(voter);
  res.status(201).json(RegisterVoterResponse.parse(getPublicVoter(voter)));
});

router.post("/voters/:id/verify", (req, res) => {
  const params = VerifyVoterParams.safeParse(req.params);
  const input = VerifyVoterBody.safeParse(req.body);
  const voter = params.success
    ? voters.find((candidate) => candidate.id === params.data.id)
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
    voter.status = "verified";
    voter.lastVerifiedAt = new Date().toISOString();
  }
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

router.get("/activity", (_req, res) => {
  res.json(GetActivityResponse.parse(activities));
});

export default router;