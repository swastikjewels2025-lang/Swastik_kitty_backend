# Swastik Jewellers Kitty Backend API

The **Swastik Kitty Backend API** is the core transactional service powering the Swastik Jewellers gold savings ecosystem. Built with Node.js, Express, and MongoDB Atlas (Replica Sets), it provides mission-critical APIs for customer authentication, live chit slot locking, payment webhooks, doorstep cash collections, KYC statutory compliance, and digital receipt synthesis.

---

## 📚 Master Documentation

All architectural specifications, PRDs, API contracts, database schemas, and operational rules are centrally maintained in the root documentation directory:

👉 **[Master Documentation Index](../../docs/README.md)**
* **[Product Requirements Document (PRD)](../../docs/01_PRODUCT_REQUIREMENTS_DOCUMENT.md)**
* **[System Architecture & Integration](../../docs/02_SYSTEM_ARCHITECTURE_AND_INTEGRATION.md)**
* **[Data Flow & API Contracts](../../docs/03_DATA_FLOW_AND_API_CONTRACTS.md)**
* **[Folder Structure & File Manifest](../../docs/04_FOLDER_STRUCTURE_AND_FILE_MANIFEST.md)**
* **[Developer & AI Agent Rules](../../docs/05_DEVELOPER_AND_AI_AGENT_RULES.md)**

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The server runs on **`http://localhost:5001/`** with prefix `/api/v1`.

### 3. Run Automated Tests
```bash
npm test
```
Runs Jest automated milestone test suites.

---

## ⚙️ Environment Configuration

Ensure `.env` contains:
```env
PORT=5001
MONGODB_URI=<mongodb_atlas_replica_set_uri>
JWT_SECRET=<jwt_secret_key>
CLOUDINARY_CLOUD_NAME=<cloudinary_cloud_name>
CLOUDINARY_API_KEY=<cloudinary_api_key>
CLOUDINARY_API_SECRET=<cloudinary_api_secret>
```
