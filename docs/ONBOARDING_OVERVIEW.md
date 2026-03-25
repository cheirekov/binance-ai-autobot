# Binance AI Autobot - Onboarding Overview

## Project Overview
The Binance AI Autobot is a professional-grade, dockerized automated trading system for Binance exchange with adaptive AI capabilities and sophisticated risk management. The project implements a dual-track execution model with baseline (deterministic live execution) and adaptive (shadow policy recommendations) modes.

## Core Architecture

### Technical Stack
- **Backend**: NestJS API with TypeScript (`apps/api`)
- **Frontend**: Vite + React UI (`apps/ui`) with HTTP Basic Auth on port 4173
- **Shared Types**: Monorepo structure with shared schemas (`packages/shared`)
- **Exchange Integration**: CCXT library with Binance adapter
- **Containerization**: Docker Compose for deployment

### Key Components
1. **Bot Engine**: Core trading logic with grid trading strategies
2. **Risk Management**: Configurable risk slider with hard guardrails
3. **AI Decision Interface**: Structured contract for AI/ML recommendations without bypassing safety controls
4. **Portfolio Management**: Real-time wallet tracking and position management
5. **Market Data**: Binance integration for real-time prices and order books
6. **Telemetry & Logging**: Comprehensive runtime monitoring with feedback bundles

## Project Philosophy

### Safety-First Approach
- "Engine is final authority" principle - AI provides signals but never bypasses risk controls
- No hallucination policy - all regulatory claims must be verifiable
- Hard stop-loss guards and position sizing limits
- Separate testnet/mainnet API keys with restrictive permissions

### Professional Project Management
- **Delivery Board System**: Gate-based progression (Audit-safe → Calibratable learning → AI action at scale)
- **Single Active Ticket**: WIP=1 principle to prevent context switching
- **Feedback Bundles**: Automated collection of runtime evidence (`autobot-feedback-*.tgz`)
- **Triage Protocol**: P0-P4 incident classification with structured documentation

## Current Status (March 2026)

### Active Development
- **Active Ticket**: T-032 (Exit manager v2) - Focus on reducing profit giveback and improving downside control
- **Recent Bundle**: `autobot-feedback-20260324-095550.tgz` (stale evidence, validation required)
- **Runtime**: 835+ hours uptime on Binance Spot testnet
- **Execution Mode**: Market orders with limit order lifecycle improvements

### Key Features Implemented
- ✅ Dockerized deployment with single-command startup
- ✅ Onboarding wizard for initial configuration
- ✅ Basic grid trading with configurable risk levels
- ✅ Real-time dashboard with portfolio monitoring
- ✅ Automated feedback bundle collection
- ✅ CCXT-based Binance integration (testnet & mainnet)
- ✅ Persistent state management (`./data/config.json`, `state.json`)

### Planned Features (Roadmap)
- AI/ML adaptive learning lane (shadow mode)
- Advanced indicators and market data analysis
- Tax modeling and reporting
- Futures and margin trading
- Enhanced UI/UX with advanced controls

## Getting Started

### Quick Deployment
```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start with Docker Compose
docker compose up --build

# 3. Access UI at http://localhost:4173
```

### Development Setup
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### Key Directories
- `apps/api/` - NestJS backend with trading logic
- `apps/ui/` - React frontend dashboard
- `packages/shared/` - TypeScript schemas and shared types
- `docs/` - Comprehensive documentation
- `data/` - Runtime data (config, state, logs - gitignored)
- `scripts/` - Automation scripts for feedback collection and deployment

## Risk Management & Safety

### Configurable Risk Slider
The system includes a risk slider that adjusts:
- Position sizing percentages
- Maximum consecutive entries
- Stop-loss thresholds
- Grid spacing and ladder counts

### Hard Safety Guards
1. **Max Consecutive Entries**: Prevents over-concentration on single symbols
2. **Grid Guard Pauses**: Temporarily halts buy legs during adverse conditions
3. **Insufficient Quote Protection**: Prevents overspending beyond available balance
4. **Bear Trend Detection**: Automatic defensive unwinding during sustained downtrends

### Security Measures
- Secrets stored in `./data/config.json` (gitignored)
- API key header authentication with redacted logging
- Docker binding to localhost by default
- Separate testnet environment for safe experimentation

## Operational Procedures

### Running the Bot
1. Complete onboarding wizard to configure Binance API keys
2. Set risk preferences via Settings page
3. Monitor via Dashboard with real-time statistics
4. Collect feedback bundles for debugging: `./scripts/collect-feedback.sh`

### Incident Management
- Use triage note template for documenting issues
- Follow PM/BA playbook for decision-making
- Maintain session brief for batch contract tracking
- Reference retrospective documents for continuous improvement

### Validation & Testing
- CI testing: `docker compose -f docker-compose.ci.yml run --rm ci`
- Runtime validation: 1-3 hour test runs with evidence collection
- Bundle ingestion: `./scripts/ingest-feedback.sh <bundle-file>`

## Learning Resources

### Key Documentation
- `AI_CONTEXT.md` - Project vision and technical context
- `ARCHITECTURE.md` - System design and component relationships
- `CONFIG.md` - Configuration options and schema
- `SECURITY.md` - Security considerations and best practices
- `DELIVERY_BOARD.md` - Project management framework
- `TEAM_OPERATING_RULES.md` - Operational protocols

### Reference Materials
- `REFERENCES_ANALYSIS.md` - Third-party code analysis
- `ROADMAP.md` - Feature development timeline
- `RETROSPECTIVE_*.md` - Post-mortem analyses and lessons learned
- `TRIAGE_NOTE_*.md` - Incident documentation and solutions

## Support & Community

### Getting Help
- Review comprehensive documentation in `docs/` directory
- Examine recent triage notes for known issues and solutions
- Use feedback bundles (`autobot-feedback-*.tgz`) for debugging
- Follow team operating rules for collaborative development

### Contributing
- Adhere to single active ticket (WIP=1) principle
- Maintain changelog entries for all changes
- Update session brief for batch context
- Collect runtime evidence before making significant changes

## Next Steps
1. **New Developers**: Read `AI_CONTEXT.md` and `ARCHITECTURE.md` for technical overview
2. **Operators**: Review `CONFIG.md` and `SECURITY.md` for deployment guidance
3. **Project Managers**: Study `DELIVERY_BOARD.md` and `PM_BA_PLAYBOOK.md` for process understanding
4. **All Team Members**: Familiarize with `TEAM_OPERATING_RULES.md` for collaborative workflow

---

*Last Updated: 2026-03-24*
*Project State: Active development on Ticket T-032 (Exit manager v2)*
