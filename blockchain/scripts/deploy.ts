import { ethers } from "hardhat";

async function main() {
  const title = process.env.ELECTION_TITLE;
  const candidates = (process.env.ELECTION_CANDIDATES ?? "")
    .split(",")
    .map((candidate) => candidate.trim())
    .filter(Boolean);

  if (!title?.trim()) {
    throw new Error("Set ELECTION_TITLE to the exact election title before deploying.");
  }
  if (candidates.length === 0) {
    throw new Error("Set ELECTION_CANDIDATES to a comma-separated candidate list before deploying.");
  }

  const election = await ethers.deployContract("Election", [title.trim()]);
  await election.waitForDeployment();
  for (const candidate of candidates) {
    await (await election.addCandidate(candidate)).wait();
  }
  await (await election.setVotingOpen(true)).wait();

  const network = await ethers.provider.getNetwork();
  console.log(
    JSON.stringify(
      {
        title: title.trim(),
        contractAddress: await election.getAddress(),
        network: network.name,
        chainId: Number(network.chainId),
        candidateCount: candidates.length,
        candidates,
        votingOpen: await election.votingOpen(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});