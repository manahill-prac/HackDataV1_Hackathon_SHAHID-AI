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

```mermaid
flowchart TD

U[Users<br/>Citizens | Investigators | Lawyers | Courts]

subgraph L1["Layer 1 — Evidence Capture"]
A1[Photo / Video Upload]
A2[CCTV Evidence]
A3[Voice Evidence]
A4[Metadata Capture<br/>GPS + Timestamp]
end

subgraph L2["Layer 2 — Integrity & Security"]
B1[SHA-256 Evidence Hashing]
B2[Chain of Custody Log]
B3[Evidence Verification]
B4[Integrity Audit Trail]
end

subgraph L3["Layer 3 — AI Intelligence"]
C1[AI Witness Generation]
C2[Face Intelligence]
C3[Crime Prediction ML]
C4[Threat Correlation Index]
end

subgraph L4["Layer 4 — Legal Intelligence"]
D1[Legal RAG Engine]
D2[PPC / CrPC / QSO Retrieval]
D3[FIR Draft Generation]
D4[Court Submission Packet]
end

subgraph L5["Layer 5 — Decision Support"]
E1[Threat Command Center]
E2[Case Readiness Scoring]
E3[Investigation Support]
E4[Public Verification]
end

subgraph Storage["Data & Support Layer"]
S1[(Evidence Store)]
S2[(Hash Ledger)]
S3[(Legal Corpus)]
S4[(Prediction Engine)]
end

U --> A1
U --> A2
U --> A3

A1 --> A4
A2 --> A4
A3 --> A4

A4 --> B1
B1 --> B2
B2 --> B3
B3 --> B4

B4 --> C1
B4 --> C2
B4 --> C3
C1 --> C4
C2 --> C4
C3 --> C4

C4 --> D1
D1 --> D2
D2 --> D3
D3 --> D4

D4 --> E1
E1 --> E2
E2 --> E3
E3 --> E4

S1 --- B2
S2 --- B1
S3 --- D1
S4 --- C3
```




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
