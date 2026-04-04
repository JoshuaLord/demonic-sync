# Demonic Sync

A collaborative route planning tool for Old School RuneScape's Leagues 6: Demonic Pacts.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)

## About

Demonic Sync is a real-time collaborative planning tool designed for OSRS Leagues 6 (Demonic Pacts League). Plan your route with friends, track progress across multiple players, and optimize your task completion strategy—all in sync.

This is a community project built for fun and shared freely with the OSRS community.

## Features

### 🎯 Route Planning
- **Drag-and-drop task management** - Add tasks from the official library to your route
- **1,589+ official League tasks** - Complete searchable database with filters
- **Automatic milestone tracking** - Relic tiers and Area unlocks calculated automatically
- **Running totals** - See cumulative points and task counts as you build your route

### 👥 Collaborative Planning
- **Real-time sync** - Changes appear instantly for all viewers
- **Multiple player tracking** - Support for up to 6 players with individual checkboxes
- **Live presence** - See other users viewing the route with live cursors
- **Share links** - Separate admin and view-only access links

### 🎨 User Experience
- **Light/Dark theme** - Switch between themes with one click
- **Milestone selection** - Choose your relics and regions with an intuitive popover UI
- **Guided tour** - First-time onboarding to highlight key features
- **Split-pane layout** - Collapsible task library keeps your workspace clean

### ⚡ Technical Highlights
- Built with **Next.js 16** (App Router) and **React 19**
- Real-time updates powered by **Supabase Realtime**
- Drag-and-drop with **@dnd-kit**
- Styled with **Tailwind CSS 4**
- Interactive tour with **driver.js**
- Comprehensive test coverage (Playwright E2E + Vitest unit tests)

## Getting Started

This is a Next.js project using Supabase for real-time database and storage.

### Prerequisites

- Node.js 20+
- Docker (for local Supabase)
- npm or yarn

### Development

```bash
# Start local Supabase (requires Docker)
supabase start

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Contributing

This is a community project! Contributions, issues, and feature requests are welcome.

- **Repository:** [github.com/AurorasDad/demonic-sync](https://github.com/AurorasDad/demonic-sync)
- **Report bugs:** [Create an issue](https://github.com/AurorasDad/demonic-sync/issues)
- **Suggest features:** [Open a discussion](https://github.com/AurorasDad/demonic-sync/discussions)

## Data Attribution

Task data is sourced from the [Old School RuneScape Wiki](https://oldschool.runescape.wiki/), licensed under [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/).

Game content and materials are trademarks and copyrights of **Jagex Ltd**. This project is not affiliated with or endorsed by Jagex Ltd.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

Old School RuneScape is a trademark of Jagex Ltd. This is an unofficial community tool created for entertainment and convenience purposes only.
