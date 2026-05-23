# Document Vault

A zero-knowledge encrypted document vault built with Next.js, TypeScript, and Tailwind CSS. Files are encrypted in the browser using AES-256-GCM before upload — the server never sees plaintext.

---

## Features

- **Zero-knowledge encryption** — files are encrypted/decrypted entirely in the browser using AES-256-GCM with PBKDF2 key derivation (Web Crypto API)
- **User authentication** — register and login with JWT-based auth; passwords hashed with bcrypt
- **Encrypted file storage** — encrypted files stored in MongoDB GridFS
- **File management dashboard** — upload, list, download (with client-side decryption), and delete files
- **User-scoped access** — users can only access their own files

---

## User Flow

1. **Register** — create an account at `/register`
2. **Login** — sign in at `/login`
3. **Upload** — select a file and enter an encryption password; file is encrypted in the browser and uploaded
4. **List** — dashboard displays all your uploaded files with filename, size, and upload date
5. **Download** — enter decryption password; file is retrieved and decrypted in the browser
6. **Delete** — permanently remove a file from storage

---

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Framework    | Next.js 16 (App Router)                     |
| Language     | TypeScript                                  |
| Styling      | Tailwind CSS 4                              |
| Database     | MongoDB (native driver) + GridFS            |
| Encryption   | AES-256-GCM, PBKDF2-SHA256, Web Crypto API |
| Auth         | JWT (jsonwebtoken) + bcryptjs               |

---

## Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org/)
- **MongoDB** (local or Atlas) — [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Git** — [Download](https://git-scm.com/)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/aryasadawrate19/document-vault.git
cd document-vault
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/document-vault
JWT_SECRET=your-secure-random-secret
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/page.tsx              # Login page
│   ├── register/page.tsx           # Registration page
│   ├── forgot-password/page.tsx    # Forgot password page
│   ├── dashboard/page.tsx          # Main dashboard (upload, list, download, delete)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      # POST /api/auth/login
│       │   └── register/route.ts   # POST /api/auth/register
│       └── files/
│           ├── upload/route.ts     # POST /api/files/upload
│           ├── list/route.ts       # GET  /api/files/list
│           ├── retrieve/route.ts   # POST /api/files/retrieve
│           └── delete/route.ts     # POST /api/files/delete
├── lib/
│   ├── auth.ts                     # JWT + bcrypt helpers
│   ├── db.ts                       # Database re-exports
│   ├── mongodb.ts                  # MongoDB client + GridFS bucket
│   └── encryption.ts               # AES-256-GCM client-side encryption
└── models/
    ├── User.ts                     # User collection (email, passwordHash)
    └── File.ts                     # File metadata collection (ownerId, gridfsId, iv, salt)
```

---

## API Reference

### Authentication

| Endpoint               | Method | Description                     |
| ---------------------- | ------ | ------------------------------- |
| `/api/auth/register`   | POST   | Register a new user, returns JWT |
| `/api/auth/login`      | POST   | Login, returns JWT               |

### File Operations (JWT required)

| Endpoint              | Method | Description                              |
| --------------------- | ------ | ---------------------------------------- |
| `/api/files/upload`   | POST   | Upload encrypted file to GridFS          |
| `/api/files/list`     | GET    | List all files for the authenticated user |
| `/api/files/retrieve` | POST   | Retrieve encrypted file by fileId        |
| `/api/files/delete`   | POST   | Delete file by fileId                    |

---

## Security

- **Zero-knowledge** — the server stores only encrypted blobs; decryption happens exclusively in the browser
- **AES-256-GCM** — authenticated encryption with 12-byte random IV and 16-byte random salt per file
- **PBKDF2** — 150,000 iterations of SHA-256 for key derivation
- **bcrypt** — password hashing with 12 salt rounds
- **JWT** — stateless authentication with 7-day token expiry
- **User isolation** — all file operations verify ownership via JWT

---

## Available Scripts

| Command         | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the development server          |
| `npm run build` | Create an optimized production build  |
| `npm run start` | Start the production server           |
| `npm run lint`  | Run ESLint                            |

---

## Environment Variables

| Variable      | Description                          |
| ------------- | ------------------------------------ |
| `MONGODB_URI` | MongoDB connection string            |
| `JWT_SECRET`  | Secret key for signing JWT tokens    |
