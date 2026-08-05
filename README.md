# Hasnain Travels & Tours - Ticketing & Reservations Portal

A web portal for creating, editing, managing, and printing flight ticket vouchers.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Features
- Create, preview, and print customized ticket vouchers
- Local storage persistent history & batch management
- Import ticket data directly from CSV flight manifests
- Generate high-quality PDF downloads and multi-voucher print layouts

## Security & Secret Rotation Warning

> [!WARNING]
> **Secret Rotation Notice:** If any API key, Google Apps Script Web App URL, or private credential was previously committed to this repository or hardcoded in earlier commits, those values still exist in the Git commit history.
>
> **Action Required:** Please rotate any previously hardcoded API keys or Web App URLs immediately and configure them exclusively using environment variables (`.env`).

