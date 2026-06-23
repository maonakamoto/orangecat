# OrangeCat Project Structure

This document provides a detailed explanation of the OrangeCat project's file structure, including the purpose and contents of each file and directory.

## Root Directory

### Configuration Files

- `.env.example` - Example environment variables file. Contains template variables that need to be set in `.env.local` for local development.
- `.eslintrc.json` - ESLint configuration file. Defines code style rules and linting settings.
- `.gitignore` - Specifies which files and directories Git should ignore.
- `.prettierrc.json` - Prettier configuration file. Defines code formatting rules.
- `jest.config.js` - Jest testing framework configuration.
- `next.config.js` - Next.js framework configuration, including security headers and image domains.
- `package.json` - NPM package configuration, including dependencies and scripts.
- `package-lock.json` - NPM dependency lock file, ensuring consistent installations.
- `postcss.config.js` - PostCSS configuration for processing CSS.
- `tailwind.config.js` - Tailwind CSS framework configuration.
- `tsconfig.json` - TypeScript configuration, including compiler options and paths.

### Documentation Files

- `CHANGELOG.md` - Records all notable changes to the project.
- `CODE_OF_CONDUCT.md` - Defines community standards and behavior expectations.
- `CONTRIBUTING.md` - Guidelines for contributing to the project.
- `LICENSE` - MIT License file.
- `README.md` - Main project documentation.
- `SECURITY.md` - Security policy and vulnerability reporting guidelines.
- `STRUCTURE.md` - This file, documenting the project structure.

### Source Code

- `src/` - Main source code directory.

## Source Code Structure (`src/`)

### App Directory (`src/app/`)

The app directory follows Next.js 13+ App Router conventions.

- `app/globals.css` - Global CSS styles and Tailwind CSS imports.
- `app/layout.tsx` - Root layout component, including metadata and global providers.
- `app/error.tsx` - Global error page component.
- `app/loading.tsx` - Global loading page component.
- `app/not-found.tsx` - 404 page component.
- `app/dashboard/` - Directory for the dashboard feature.
  - `page.tsx` - Main dashboard page component.
  - `layout.tsx` - Dashboard layout component.
- `app/create/` - Directory for the donation page creation feature.
- `app/donate/` - Directory for the donation feature.

### Components Directory (`src/components/`)

Reusable React components used throughout the application.

#### Layout Components

- `components/layout/Header.tsx` - Main navigation header component.
- `components/layout/Footer.tsx` - Footer component.

#### Dashboard Components

- `components/dashboard/DashboardLayout.tsx` - Layout wrapper for dashboard pages.
- `components/dashboard/DashboardContent.tsx` - Main content component for dashboard.
- `components/dashboard/StatsCard.tsx` - Component for displaying statistics.

#### Authentication Components

- `components/auth/AuthForm.tsx` - Form component for authentication.
- `components/auth/AuthButton.tsx` - Button component for auth actions.

#### UI Components

- `components/ui/Card.tsx` - Reusable card component.
- `components/ui/Button.tsx` - Button component with variants.
- `components/ui/Loading.tsx` - Loading spinner component.

### Contexts Directory (`src/contexts/`)

React context providers for global state management.

- `contexts/AuthContext.tsx` - Authentication state management.
- `contexts/ThemeContext.tsx` - Theme management.

### Types Directory (`src/types/`)

TypeScript type definitions.

- `types/dashboard.ts` - Dashboard-related type definitions.
- `types/auth.ts` - Authentication-related type definitions.
- `types/env.d.ts` - TypeScript declarations for environment variables.

### Lib Directory (`src/lib/`)

Utility functions and shared logic.

- `lib/supabase/` - Supabase client configuration and utilities.
  - `client.ts` - Supabase client initialization.
  - `auth.ts` - Authentication utilities.
- `lib/utils.ts` - General utility functions.

## Development Tools and Dependencies

- `node_modules/` - Directory containing installed NPM packages (not tracked in Git).
- `.git/` - Git version control directory (not tracked in Git).

## Directory Structure Summary

```
orangecat/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc.json
├── jest.config.js
├── next.config.js
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── STRUCTURE.md
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   ├── not-found.tsx
│   │   ├── dashboard/
│   │   ├── create/
│   │   └── donate/
│   ├── components/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── auth/
│   │   └── ui/
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── types/
│   │   ├── dashboard.ts
│   │   ├── auth.ts
│   │   └── env.d.ts
│   └── lib/
│       ├── supabase/
│       └── utils.ts
├── node_modules/
└── .git/
```

This structure follows modern Next.js best practices, with clear separation of concerns and modular organization of code. Each directory and file has a specific purpose and follows established conventions for React and Next.js applications.
