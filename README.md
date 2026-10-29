#  MatSetu Voting Platform

A secure blockchain-based voting platform that enables transparent, tamper-proof, and decentralized elections using smart contracts and Web3 technologies.

 Features

-  Secure voter authentication
-  Blockchain-powered vote recording
-  Transparent and immutable ballot storage
-  Candidate management
-  Real-time election status
-  MetaMask wallet integration
-  Smart contract-based vote verification
-  Responsive modern user interface
-  Decentralized election process

---

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express.js

### Blockchain
- Solidity
- Hardhat
- Ethers.js
- MetaMask

### Database
- PostgreSQL

---

## 📂 Project Structure

```text
MatSetu-Voting-Platform/
│
├── artifacts/
│   ├── api-server/
│   └── matsetu/
│
├── blockchain/
│   ├── contracts/
│   ├── scripts/
│   └── test/
│
├── scripts/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## ⚙️ Prerequisites

Before running the project, install:

- Node.js (v18+ recommended)
- pnpm
- Git
- MetaMask Browser Extension

Verify installation:

```bash
node -v
pnpm -v
git --version
```

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/charan-km777/MatSetu-Voting-Platform.git
```

Navigate into the project:

```bash
cd MatSetu-Voting-Platform
```

Install dependencies:

```bash
pnpm install
```

---

## 🔗 Running Blockchain Network

Start Hardhat node:

```bash
cd blockchain

npx hardhat node
```

Keep this terminal running.

Deploy smart contracts:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

---

## ▶️ Running the Application

Open a new terminal:

```bash
pnpm dev
```

or

```bash
cd artifacts/matsetu
pnpm dev
```

Application will run at:

```text
http://localhost:5173
```

---

## 👛 MetaMask Setup

Add Local Hardhat Network:

```text
Network Name: Hardhat Localhost
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

Import one of the Hardhat test accounts into MetaMask and connect to the application.

---

## 🧪 Running Tests

```bash
cd blockchain

npx hardhat test
```

---

## 🔒 Security Features

- Smart contract vote validation
- Immutable blockchain records
- Wallet-based authentication
- Prevention of duplicate voting
- Election integrity verification

---

## 📸 Screenshots

Add screenshots of:

- Home Page 
- Candidate Dashboard
- Voting Screen
- Election Results
- MetaMask Connection



---

## 📈 Future Enhancements

- Multi-election support
- Aadhaar / Digital ID verification
- Mobile application
- QR-based voter verification
- Advanced analytics dashboard
- DAO Governance integration

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit changes

```bash
git commit -m "Add feature"
```

4. Push branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Charan K M**

---

GitHub: https://github.com/charan-km777

---

⭐ If you like this project, please consider giving it a star on GitHub.
