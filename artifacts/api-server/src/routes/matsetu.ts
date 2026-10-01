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
  createId,
  getPublicVoter,
  type Election,
  type MatSetuRepository,
  type Voter,
} from "../matsetu-store";

const DUPLICATE_THRESHOLD = 0.45;

const distance = (left: number[], right: number[]) =>
  Math.sqrt(
    left.reduce(
      (sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2,
      0,
    ),
  );

export const createMatSetuRouter = (repository: MatSetuRepository): IRouter => {
  const router: IRouter = Router();

  router.get("/dashboard/summary", async (_req, res) => {
    const counts = await repository.getDashboardCounts();
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
    res.json(GetElectionsResponse.parse(await repository.listElections()));
  });

  router.post("/elections", async (req, res) => {
    const input = CreateElectionBody.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "Provide a title and a valid election window." });
      return;
    }

    const election: Election = {
      id: createId("election"),
      title: input.data.title,
      status: "draft",
      candidateCount: 0,
      voterCount: 0,
      startAt: new Date(input.data.startAt).toISOString(),
      endAt: new Date(input.data.endAt).toISOString(),
      contractAddress: "pending deployment",
    };
    const savedElection = await repository.createElection(election);
    await repository.createActivity({
      id: createId("activity"),
      type: "election",
      label: "Election draft created",
      detail: `${savedElection.title} is ready for candidate configuration`,
      timestamp: new Date().toISOString(),
      status: "pending",
    });
    res.status(201).json(GetElectionResponse.parse(savedElection));
  });

  router.get("/elections/:id", async (req, res) => {
    const params = GetElectionParams.safeParse(req.params);
    const election = params.success
      ? await repository.findElectionById(params.data.id)
      : undefined;
    if (!election) {
      res.status(404).json({ error: "Election not found." });
      return;
    }
    res.json(GetElectionResponse.parse(election));
  });

  router.get("/voters", async (_req, res) => {
    const voters = await repository.listVoters();
    res.json(GetVotersResponse.parse(voters.map(getPublicVoter)));
  });

  router.post("/voters/register", async (req, res) => {
    const input = RegisterVoterBody.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "A 128-dimensional descriptor is required." });
      return;
    }

    const closestMatch = await repository.findClosest(input.data.descriptor);
    if (closestMatch && closestMatch.score < DUPLICATE_THRESHOLD) {
      await repository.createActivity({
        id: createId("activity"),
        type: "verification",
        label: "Duplicate attempt blocked",
        detail: `Similarity score ${closestMatch.score.toFixed(3)} matched an existing descriptor`,
        timestamp: new Date().toISOString(),
        status: "warning",
      });
      res.status(409).json({
        error: `Duplicate identity blocked. Closest descriptor distance: ${closestMatch.score.toFixed(3)}.`,
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const voter: Voter = {
      id: createId("voter"),
      displayName: input.data.displayName,
      identifier: input.data.identifier,
      status: "pending",
      registeredAt: timestamp,
      lastVerifiedAt: timestamp,
      descriptor: input.data.descriptor,
    };
    const savedVoter = await repository.createVoter(voter);
    await repository.createActivity({
      id: createId("activity"),
      type: "registration",
      label: "Voter registration captured",
      detail: `${savedVoter.identifier} has a descriptor ready for verification`,
      timestamp,
      status: "pending",
    });
    res.status(201).json(RegisterVoterResponse.parse(getPublicVoter(savedVoter)));
  });

  router.post("/voters/:id/verify", async (req, res) => {
    const params = VerifyVoterParams.safeParse(req.params);
    const input = VerifyVoterBody.safeParse(req.body);
    const voterId = params.success ? params.data.id : "";
    const voter = params.success
      ? await repository.findVoterById(voterId)
      : undefined;
    if (!voter) {
      res.status(404).json({ error: "Voter not found." });
      return;
    }
    if (!input.success) {
      res.status(400).json({ error: "A 128-dimensional descriptor is required." });
      return;
    }

    const metadata = await repository.getVerificationMetadata(voterId);
    if (!metadata) {
      res.status(500).json({ error: "Biometric verification metadata is unavailable." });
      return;
    }
    const score = distance(input.data.descriptor, metadata.descriptor);
    const verified = score < DUPLICATE_THRESHOLD;
    const timestamp = new Date().toISOString();
    if (verified) {
      await repository.updateVerification(voterId, {
        status: "verified",
        lastVerifiedAt: timestamp,
      });
    }
    await repository.createActivity({
      id: createId("activity"),
      type: "verification",
      label: verified ? "Voter verified" : "Verification threshold missed",
      detail: `${voter.identifier} ${verified ? "passed" : "did not pass"} the d < ${DUPLICATE_THRESHOLD} match threshold`,
      timestamp,
      status: verified ? "success" : "warning",
    });
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

  router.get("/ledger/status", async (_req, res) => {
    res.json(GetLedgerStatusResponse.parse(await repository.getStatus()));
  });

  router.get("/activity", async (_req, res) => {
    res.json(GetActivityResponse.parse(await repository.listActivities()));
  });

  return router;
};