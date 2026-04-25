# SHAHID.AI ⚖️🛡️
## Turning Digital Evidence into Actionable Justice  
### شاہد — *The Witness*
**HACKDATA V1 | AI & Data Science Hackathon**  
**GDGoC × GitHub | COMSATS University Islamabad, Wah Campus**  
**Team Name: Oscura**  
**Team Lead: Manahil Mirza**
---

## Problem Statement

Digital evidence is often captured…

…but rarely trusted.

Victims struggle to preserve evidence properly.  
Metadata is lost.  
Evidence can be altered.  
Legal processes are inaccessible.  
Investigators lack intelligence support.

**SHAHID.AI addresses the justice gap by transforming ordinary digital evidence into trusted, structured, actionable justice intelligence.**

---

# What is SHAHID.AI?

SHAHID.AI is an AI-powered **crime evidence intelligence platform** that moves evidence through a complete pipeline:

**Capture → Integrity → Intelligence → Legal Readiness**

From a phone camera to a court-ready evidence package.

---

# Core Features

## Evidence Integrity
- SHA-256 Evidence Sealing
- GPS + Timestamp Metadata
- Tamper-Evident Chain of Custody
- Public Evidence Hash Verification
- Integrity Audit Tracking

## AI Intelligence
- AI Witness Statement Generation (Urdu + English)
- Risk Assessment & Recommended Actions
- Face Intelligence (repeat suspect correlation)
- Crime Prediction ML
- Threat Correlation Index

## Legal Intelligence
- Grounded Legal RAG (PPC + CrPC + Evidence Law)
- Similarity Scored Citation Retrieval
- Explainable “Why These Laws?” Matching
- FIR Draft Generation
- Court Submission Packet Generation

## Threat Intelligence Command Center
- Emerging hotspot warnings
- Crime surge prediction
- Fusion threat signals
- Case readiness scoring
- Intelligence watchlists

## Additional Modules
- CCTV Intelligence Portal
- Voice Evidence Recording
- Emergency Panic Button
- Guided Demo Mode for Judges

---

# System Design Architecture

## High-Level Architecture

```text
Citizen / Officer Inputs
(Photos • Video • Voice • CCTV • Uploads)
                │
                ▼
────────────────────────────────────────
Layer 1 — Evidence Capture Layer
- Media acquisition
- GPS + timestamp extraction
- Incident metadata capture
────────────────────────────────────────
                │
                ▼
Layer 2 — Integrity & Security Layer
- SHA-256 evidence hashing
- Tamper-evident custody chain
- Evidence verification
- Encryption-ready storage model
────────────────────────────────────────
                │
                ▼
Layer 3 — AI Intelligence Layer
- Gemini witness generation
- Face intelligence correlation
- Crime prediction ML
- Threat anomaly detection
────────────────────────────────────────
                │
                ▼
Layer 4 — Legal Intelligence Layer
- BM25 + TF-IDF Legal RAG
- PPC / CrPC / QSO retrieval
- Explainable law matching
- FIR draft generation
────────────────────────────────────────
                │
                ▼
Layer 5 — Decision & Output Layer
- Court submission packet
- Threat command board
- Case readiness scoring
- Verification & investigation support
────────────────────────────────────────
```

## Data Flow Pipeline

```text
Capture Evidence
→ Hash + Seal
→ Chain of Custody
→ AI Analysis
→ Legal Retrieval
→ Threat Correlation
→ FIR Draft
→ Court Submission Packet
```

## Core Components

### Frontend Intelligence Layer
- React SPA modular architecture  
- Route-based modules for evidence, prediction, legal intelligence and demo mode  
- Local browser storage for portable evidence records  

### Intelligence Engines
- Witness Intelligence Engine  
- Legal Retrieval Engine  
- Threat Fusion Engine  
- Crime Prediction Engine  
- Case Readiness Engine  

### Security Architecture
- SHA-256 hashing for integrity  
- Linked custody event hashes  
- Browser Crypto APIs  
- Public hash verification workflow  
- Role-based security model (demo architecture)

## Architectural Highlights
- Browser-native zero-cost architecture  
- Hybrid symbolic + ML intelligence design  
- Offline-capable legal retrieval and prediction  
- Explainable AI outputs (not black-box only)  
- Designed as modular justice-tech platform

## System Design Philosophy
SHAHID.AI follows:

**Capture → Trust → Analyze → Correlate → Act**

The system is designed to transform raw digital evidence into trusted, explainable, investigation-ready intelligence.


# 5-Layer AI Fusion Architecture

SHAHID.AI combines five intelligence layers:

1. Input Layer  
Evidence capture, uploads, CCTV, voice

2. Integrity Layer  
Hashing, verification, custody chain

3. AI Intelligence Layer  
Witness AI, legal retrieval, face intelligence

4. Threat Fusion Layer  
Prediction ML, anomalies, threat correlation

5. Legal Output Layer  
FIR drafting, court packet, case readiness

---

# AI Integrations Used

This project integrates multiple AI systems:

- Gemini for structured witness intelligence  
- Hybrid BM25 + TF-IDF Legal RAG  
- Face descriptor intelligence using Face-API  
- Browser-based crime prediction ML  
- Threat Correlation Index scoring  
- Case readiness intelligence engine

**No hallucinated legal citations. Grounded retrieval only.**

---

# Innovation Highlights

### Grounded Legal Intelligence
Evidence-linked legal retrieval over Pakistani law.

### Court-Ready Evidence Pipeline
Not just reporting — legal package generation.

### Threat Fusion Intelligence
Combines anomaly, hotspot and suspect signals.

### Zero-Cost Intelligence Stack
Built using free/open-source technologies.

---

# Tech Stack

| Layer | Stack |
|------|------|
| Frontend | React.js + Tailwind |
| AI Witness | Google Gemini |
| Legal Retrieval | Hybrid Local RAG |
| Face Intelligence | face-api.js |
| ML Prediction | Browser-based ML |
| Security | Web Crypto APIs |
| Deployment | Vercel |

---

# Demo Flow (5 Minutes)

1. Capture & Seal Evidence  
2. Generate AI Witness Statement  
3. Retrieve Grounded Laws  
4. Generate Court Submission Packet  
5. Show Threat Command Center  
6. Demonstrate Prediction Engine  
7. Show Face Intelligence Correlation  
8. Case Package Ready

**Street Evidence → Court-Ready Intelligence in under 60 seconds**

---

# Run Locally

```bash
git clone https://github.com/manahill-prac/HackDataV1_Hackathon_SHAHID-AI.git
cd HackDataV1_Hackathon_SHAHID-AI
npm install
npm start
```

If using AI witness generation:

Create:

```env
.env
REACT_APP_GEMINI_API_KEY=your_key_here
```

---

# Project Modules

```text
src/
 ├── pages/
 │   ├── CaptureEvidence
 │   ├── EvidenceDetail
 │   ├── Analytics
 │   ├── PredictionEngine
 │   ├── FaceIntelligence
 │   └── DemoMode
 ├── utils/
 │   ├── ragEngine
 │   ├── firDraftEngine
 │   ├── threatFusion
 │   └── legalPdfGenerator
```

---

# Impact

Designed for:

- Citizens  
- Investigators  
- Lawyers  
- Courts  
- Public Safety Agencies

Potential applications:

- Evidence preservation  
- Investigation support  
- Legal aid workflows  
- Digital justice infrastructure

---

# Live Demo
🔗 [Shahid-AI](https://hack-data-v1-hackathon-shahid-ai.vercel.app/dashboard)

---

# Team Oscura
Built for **HACKDATA V1**  

---

## Closing Statement

**Preserving Truth. Delivering Justice. Powered by AI.**

SHAHID.AI ⚖️
