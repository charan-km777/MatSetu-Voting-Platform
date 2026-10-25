import assert from "node:assert/strict";
import { ethers } from "hardhat";

describe("Election", () => {
  async function deployOpenElection() {
    const [administrator, firstVoter, secondVoter] = await ethers.getSigners();
    const election = await ethers.deployContract("Election", ["MatSetu browser journey"]);
    await election.waitForDeployment();
    await election.connect(administrator).addCandidate("Candidate 1");
    await election.connect(administrator).addCandidate("Candidate 2");
    await election.connect(administrator).setVotingOpen(true);
    return { election, firstVoter, secondVoter };
  }

  it("records a ballot and rejects a second vote from the same wallet", async () => {
    const { election, firstVoter } = await deployOpenElection();

    await election.connect(firstVoter).castVote(1);

    assert.equal(await election.hasVoted(firstVoter.address), true);
    assert.equal((await election.candidates(1)).voteCount, 1n);

    await assert.rejects(
      election.connect(firstVoter).castVote(2),
      /voter already cast a ballot/,
    );
    assert.equal((await election.candidates(2)).voteCount, 0n);
  });

  it("allows a different wallet one independent ballot", async () => {
    const { election, firstVoter, secondVoter } = await deployOpenElection();

    await election.connect(firstVoter).castVote(1);
    await election.connect(secondVoter).castVote(2);

    assert.equal(await election.hasVoted(firstVoter.address), true);
    assert.equal(await election.hasVoted(secondVoter.address), true);
    assert.equal((await election.candidates(1)).voteCount, 1n);
    assert.equal((await election.candidates(2)).voteCount, 1n);
  });
});
