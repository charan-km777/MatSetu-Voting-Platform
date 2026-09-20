import { ethers } from "hardhat";

async function main() {
  const election = await ethers.deployContract("Election", [
    process.env.ELECTION_TITLE ?? "MatSetu Student Council Election",
  ]);
  await election.waitForDeployment();
  console.log(`Election deployed to ${await election.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});