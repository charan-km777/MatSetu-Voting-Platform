// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Election {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    address public immutable administrator;
    string public title;
    bool public votingOpen;
    uint256 public candidateCount;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);

    modifier onlyAdministrator() {
        require(msg.sender == administrator, "administrator only");
        _;
    }

    constructor(string memory electionTitle) {
        administrator = msg.sender;
        title = electionTitle;
    }

    function addCandidate(string calldata name) external onlyAdministrator {
        require(!votingOpen, "voting already open");
        require(bytes(name).length > 0, "candidate name required");
        candidateCount += 1;
        candidates[candidateCount] = Candidate(candidateCount, name, 0);
        emit CandidateAdded(candidateCount, name);
    }

    function setVotingOpen(bool open) external onlyAdministrator {
        if (open) {
            require(candidateCount > 0, "candidates required");
        }
        votingOpen = open;
    }

    function castVote(uint256 candidateId) external {
        require(votingOpen, "voting is closed");
        require(!hasVoted[msg.sender], "voter already cast a ballot");
        require(candidateId > 0 && candidateId <= candidateCount, "candidate not found");
        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;
        emit VoteCast(msg.sender, candidateId);
    }
}