# Document Vault

A modern document management application built with [Next.js](https://nextjs.org), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).

---

## Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** (v18 or later) — [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** / **pnpm** / **bun**
- **Git** — [Download here](https://git-scm.com/)

---

## Getting Started

Follow these steps to clone, set up, and run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/aryasadawrate19/document-vault.git
```

### 2. Navigate into the Project Directory

```bash
cd document-vault
```

### 3. Install Dependencies

```bash
npm install
```

> **Alternatively**, you can use your preferred package manager:
>
> ```bash
> yarn install
> # or
> pnpm install
> # or
> bun install
> ```

### 4. Run the Development Server

```bash
npm run dev
```

> **Alternatively:**
>
> ```bash
> yarn dev
> # or
> pnpm dev
> # or
> bun dev
> ```

### 5. Open in Browser

Once the server starts, open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The page auto-updates as you edit source files in the `app/` directory.

---

## Project Structure

```
document-vault/
├── app/
│   ├── favicon.ico       # App favicon
│   ├── globals.css        # Global styles (Tailwind CSS)
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page component
├── public/                # Static assets
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── next.config.ts         # Next.js configuration
├── postcss.config.mjs     # PostCSS configuration
├── eslint.config.mjs      # ESLint configuration
└── README.md
```

---

## Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Starts the development server        |
| `npm run build`   | Creates an optimized production build |
| `npm run start`   | Starts the production server         |
| `npm run lint`    | Runs ESLint to check for code issues |

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Font:** [Geist](https://vercel.com/font) (via `next/font`)

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) — an interactive Next.js tutorial.
- [Next.js GitHub Repository](https://github.com/vercel/next.js)

---

## Deployment

The easiest way to deploy this app is via the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
