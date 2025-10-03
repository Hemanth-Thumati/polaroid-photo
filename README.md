# Polaroid Photo Ordering Platform

A full-stack application that lets customers upload photos, configure print orders, and submit payments (stub) while the admin receives WhatsApp and Gmail notifications. The backend handles validation, ZIP bundling, storage, and notifications with Prisma/SQLite persistence.

## Tech Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, React Hook Form + Zod
- **Backend:** Node.js + Express + TypeScript, Prisma ORM (SQLite), Multer, Archiver
- **Notifications:** Twilio WhatsApp API or Meta WhatsApp Cloud API, Nodemailer (Gmail OAuth2 or App Password)
- **Storage:** Local `/uploads` in development with optional S3-compatible support for large ZIPs

## Getting Started

### 1. Clone & Install

```bash
npm install
```

This installs workspace dependencies for both the frontend and backend.

### 2. Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Key settings:

- `PORT`: Backend server port (defaults to `3001`)
- `ADMIN_API_KEY`: API key for admin endpoints
- `PRICE_*`: Pricing per print size in paise/cents
- Gmail credentials (`GMAIL_*`) for Nodemailer
- WhatsApp credentials for either Twilio or Meta Cloud API
- Optional S3 credentials (`USE_S3=true`) for hosting large ZIPs

### 3. Database

Prisma uses a local SQLite database by default (`backend/prisma/dev.db`). Generate the client and apply migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Development Servers

Run frontend (Vite) and backend (Express) concurrently:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001 (proxied from Vite during development)

### 5. Production Build

```bash
npm run build
npm run start
```

This compiles the backend TypeScript and builds the frontend assets. Serve the backend from `dist` and point your static hosting to `frontend/dist`.

## Testing

Backend unit tests cover validation helpers, ZIP creation, email and WhatsApp payload builders:

```bash
npm test
```

## API Overview

### `POST /api/orders`

- Multipart form-data with `metadata` JSON blob + `files[]`
- Validates customer info, file count/size/type
- Persists order & file metadata to SQLite
- Saves originals under `/uploads/{orderId}/originals`
- Generates ZIP; attaches or hosts via link if >20 MB (optional S3)
- Sends WhatsApp summary and Gmail email (attachments or link)
- Response: `{ orderId, total, zipStrategy, zipUrl, notifications }`

### `GET /api/orders/:orderId`

- Requires `x-api-key` header (`ADMIN_API_KEY`)
- Returns order metadata, file list, ZIP information

### `GET /api/health`

- Verifies DB connectivity and upload directory write permissions
- Response: `{ ok: true }` on success

## Frontend Features

- Single-page order form with live validation and Tailwind styling
- Drag-and-drop photo uploads with previews and removal controls
- Pricing summary with auto-calculated totals based on size and quantity
- Upload progress bar and submit gating until validation passes
- Success screen showing order ID, total, and download link if applicable

## Deployment Notes

- Ensure the backend can write to the `/uploads` directory (or configure S3)
- Configure Gmail OAuth2 or app password credentials
- Provision WhatsApp provider credentials and phone numbers
- Protect the admin API key and consider serving behind HTTPS

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start backend + frontend in watch mode |
| `npm run build` | Build backend (tsc) and frontend (Vite) |
| `npm run start` | Run compiled backend server |
| `npm run prisma:migrate` | Apply Prisma migrations |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run test` | Run backend unit tests |
| `npm run lint` | Run frontend ESLint |

## Security Checklist

- Keep `.env` secrets secure and never commit them
- Rotate Gmail/Twilio credentials regularly
- Serve production over HTTPS with proper CORS origin restrictions
- Monitor `/uploads` storage and prune completed orders if necessary

## Future Enhancements

- Integrate payment gateway before submission completion
- Add admin dashboard for order management and retrying notifications
- Expand storage providers beyond S3 (Azure/GCP)
