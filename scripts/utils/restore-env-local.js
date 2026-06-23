#!/usr/bin/env node

/**
 * Restore .env.local with missing variables
 * This script merges existing .env.local with required variables from .envrc
 * WITHOUT overwriting existing values
 */

const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
const envrcPath = path.join(process.cwd(), '.envrc');

// Required variables from .envrc defaults
const requiredVars = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SITE_NAME: 'OrangeCat',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  NEXT_PUBLIC_BITCOIN_ADDRESS: 'bc1qtkxw47wqlld9t0w7sujycl4mrmc90phypjygf6',
  NEXT_PUBLIC_LIGHTNING_ADDRESS: 'orangecat@getalby.com',
};

// Optional variables that were in the backup
const optionalVars = {
  NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
  NX_DAEMON: 'false',
};

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) {
    return env;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE or KEY="VALUE"
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }

  return env;
}

function writeEnvFile(env, filePath) {
  const lines = [];

  // Add header
  lines.push('# OrangeCat Development Environment');
  lines.push('# ====================================');
  lines.push('#');
  lines.push('# This file contains environment variables for local development');
  lines.push('# DO NOT commit this file to git');
  lines.push('#');
  lines.push('');

  // Add existing variables (preserve order and comments where possible)
  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const existingLines = existingContent.split('\n');

    for (const line of existingLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=/);
        if (match) {
          const key = match[1].trim();
          // Keep existing value
          if (env[key]) {
            lines.push(`${key}=${env[key]}`);
            delete env[key]; // Mark as written
          }
        } else {
          lines.push(line); // Keep non-variable lines
        }
      } else if (trimmed.startsWith('#') && !trimmed.includes('Created by')) {
        lines.push(line); // Keep comments (except auto-generated headers)
      }
    }
  }

  // Add missing required variables
  lines.push('');
  lines.push('# ==================== REQUIRED ====================');
  for (const [key, defaultValue] of Object.entries(requiredVars)) {
    if (env[key] && !lines.some(l => l.startsWith(`${key}=`))) {
      lines.push(`${key}=${env[key]}`);
    } else if (!env[key] && !lines.some(l => l.startsWith(`${key}=`))) {
      lines.push(`${key}=${defaultValue}`);
    }
  }

  // Add optional variables
  lines.push('');
  lines.push('# ==================== OPTIONAL ====================');
  for (const [key, defaultValue] of Object.entries(optionalVars)) {
    if (env[key] && !lines.some(l => l.startsWith(`${key}=`))) {
      lines.push(`${key}=${env[key]}`);
    } else if (!env[key] && !lines.some(l => l.startsWith(`${key}=`))) {
      lines.push(`${key}=${defaultValue}`);
    }
  }

  // Add any remaining variables
  lines.push('');
  lines.push('# ==================== ADDITIONAL ====================');
  for (const [key, value] of Object.entries(env)) {
    if (!lines.some(l => l.startsWith(`${key}=`))) {
      lines.push(`${key}=${value}`);
    }
  }

  // Add token placeholders if not present
  lines.push('');
  lines.push('# ==================== AUTH TOKENS ====================');
  lines.push('# Use the auth scripts to set these securely:');
  lines.push('# node scripts/auth/github-login.js');
  lines.push('');
  if (!env.GITHUB_TOKEN && !lines.some(l => l.includes('GITHUB_TOKEN'))) {
    lines.push('# GITHUB_TOKEN=your_github_token_here');
  }

  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

function main() {
  console.log('🔄 Restoring .env.local with missing variables...');

  // Create backup
  if (fs.existsSync(envLocalPath)) {
    const backupPath = `${envLocalPath}.backup.${Date.now()}`;
    fs.copyFileSync(envLocalPath, backupPath);
    console.log(`💾 Backup created: ${path.basename(backupPath)}`);
  }

  // Parse existing .env.local
  const existingEnv = parseEnvFile(envLocalPath);
  console.log(`📋 Found ${Object.keys(existingEnv).length} existing variables`);

  // Merge with required and optional variables (existing values take precedence)
  const mergedEnv = { ...requiredVars, ...optionalVars, ...existingEnv };

  // Write merged file
  writeEnvFile(mergedEnv, envLocalPath);

  console.log('✅ .env.local restored with all required variables');
  console.log('🔄 Run: direnv reload');
}

if (require.main === module) {
  main();
}

module.exports = { parseEnvFile, writeEnvFile };
