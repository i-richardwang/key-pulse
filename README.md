# KeyPulse

A modern, full-stack API key validation and management platform. Validate, monitor, and manage your API keys across multiple providers with ease.

## Features

- **Multi-Provider Support** - Validate keys for OpenAI, Anthropic, and custom API providers
- **Batch Operations** - Add, validate, and manage hundreds of keys at once
- **Real-Time Validation** - Live progress updates via Server-Sent Events (SSE)
- **Secure Storage** - AES-256-GCM encryption for all stored API keys
- **Proxy Support** - HTTP and SOCKS5 proxy configuration per provider
- **Scheduled Validation** - Cron-based automated key validation
- **Bifrost Integration** - Sync with [Bifrost](https://github.com/didi/bifrost) API gateway
- **Export Functionality** - Export keys in JSON, CSV, or TXT formats
- **Dark Mode** - Full dark/light theme support

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL
- **State Management**: TanStack Query (React Query)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/key-pulse.git
cd key-pulse
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/keypulse

# Encryption secret (required, 32+ characters)
ENCRYPTION_SECRET=your-strong-random-secret-at-least-32-chars

# Authentication password (optional, leave empty to disable)
AUTH_PASSWORD=
```

4. **Initialize the database**

```bash
pnpm db:push
```

5. **Start the development server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access KeyPulse.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ENCRYPTION_SECRET` | Yes | Secret for AES-256-GCM encryption (32+ chars) |
| `AUTH_PASSWORD` | No | Password for UI access (empty = no auth) |
| `BIFROST_API_URL` | No | Bifrost API endpoint for sync |
| `BIFROST_DATABASE_URL` | No | Bifrost database for direct sync |

### Database Commands

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema directly (development)
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

## Usage

### Managing API Keys

1. **Add Keys** - Click "Add Keys" to add single or batch keys
2. **Select Provider** - Choose the API provider for validation
3. **Validate** - Click "Validate" to check key status in real-time
4. **Export** - Export results in your preferred format

### Key Status Types

| Status | Description |
|--------|-------------|
| `valid` | Key is active and working |
| `invalid` | Key is invalid or revoked |
| `rate_limited` | Key hit rate limits during validation |
| `timeout` | Validation request timed out |
| `error` | Unexpected error during validation |
| `pending` | Not yet validated |

### Provider Configuration

Configure providers in **Settings > Providers**:

- **Name** - Display name for the provider
- **Type** - `openai` or `anthropic`
- **Base URL** - API endpoint (e.g., `https://api.openai.com/v1`)
- **Model** - Model to use for validation
- **Timeout** - Request timeout in milliseconds
- **Max Retries** - Number of retry attempts

### Scheduled Validation

Set up automated validation in **Settings > Schedules**:

- Create cron-based schedules
- Validate all keys or specific providers
- View execution history and logs
- Manually trigger on demand

Run the scheduler process:

```bash
pnpm scheduler
```

### Bifrost Integration

KeyPulse can sync providers and keys with Bifrost:

1. Configure `BIFROST_API_URL` or `BIFROST_DATABASE_URL`
2. Go to **Settings > Bifrost**
3. Select providers to sync
4. Preview changes before pushing
5. Push configuration to Bifrost

## API Reference

### Keys

```
GET    /api/keys          # List keys (paginated)
POST   /api/keys          # Add keys (single or batch)
PUT    /api/keys          # Update key
DELETE /api/keys          # Delete keys
GET    /api/keys/export   # Export keys
```

### Providers

```
GET    /api/providers     # List providers
POST   /api/providers     # Create provider
PUT    /api/providers     # Update provider
DELETE /api/providers     # Delete provider
```

### Validation

```
POST   /api/validate      # Validate keys (SSE stream)
```

### Proxies

```
GET    /api/proxies       # List proxies
POST   /api/proxies       # Create proxy
PUT    /api/proxies       # Update proxy
DELETE /api/proxies       # Delete proxy
```

### Schedules

```
GET    /api/schedules           # List schedules
POST   /api/schedules           # Create schedule
PUT    /api/schedules/[id]      # Update schedule
DELETE /api/schedules/[id]      # Delete schedule
POST   /api/schedules/[id]/run  # Trigger schedule
GET    /api/schedules/logs      # Get execution logs
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  keypulse:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/keypulse
      - ENCRYPTION_SECRET=${ENCRYPTION_SECRET}
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=keypulse
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Vercel

1. Connect your repository to Vercel
2. Set environment variables in project settings
3. Deploy

> Note: Scheduled validation requires a separate process. Use Vercel Cron or external scheduler.

### Manual Deployment

```bash
# Build
pnpm build

# Start production server
pnpm start

# Start scheduler (separate process)
pnpm scheduler
```

## Project Structure

```
key-pulse/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── login/             # Login page
│   ├── settings/          # Settings page
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # Shadcn UI components
│   ├── key-pulse/         # Feature components
│   ├── settings/          # Settings panels
│   └── layout/            # Layout components
├── db/
│   └── schema.ts          # Drizzle schema
├── lib/                   # Utilities & business logic
│   ├── api-validator.ts   # Validation engine
│   ├── crypto.ts          # Encryption utilities
│   ├── scheduler.ts       # Cron scheduler
│   └── ...
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── scripts/               # CLI scripts
```

## Security

- **Encryption**: All API keys are encrypted using AES-256-GCM before storage
- **Key Masking**: Keys are displayed as `sk-xxxx...xxxx` in the UI
- **Authentication**: Optional password protection for the UI
- **No Logging**: API keys are never logged in plaintext

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Shadcn/UI](https://ui.shadcn.com/) for the beautiful component library
- [Drizzle ORM](https://orm.drizzle.team/) for the type-safe database layer
- [TanStack Query](https://tanstack.com/query) for server state management
