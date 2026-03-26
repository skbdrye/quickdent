# QUICKDENT - Dental Appointment System

A modern dental appointment booking and management system built with React, TypeScript, Vite, and Supabase.

## Features

- **User Dashboard** - Book and manage appointments
- **Admin Dashboard** - Manage patients and appointments
- **Real-time Updates** - Powered by Supabase
- **Responsive Design** - Works on desktop and mobile
- **Authentication** - Secure user and admin login

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Backend**: Supabase
- **State Management**: Zustand
- **Routing**: React Router v7

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/skbdrye/quickdent.git
cd quickdent
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env.local` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run development server:
```bash
pnpm run dev
```

The app will be available at `http://localhost:8080`

## Available Scripts

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build:prod

# Preview production build
pnpm run preview

# Lint code
pnpm run lint

# Install dependencies
pnpm run pInstall
```

## Environment Variables

### Required

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Note:** Environment variables must start with `VITE_` to be accessible in the browser with Vite.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click Deploy

Vercel will automatically build and deploy your app on every push to main.

## Project Structure

```
src/
├── components/     # React components
│   ├── admin/     # Admin dashboard components
│   ├── auth/      # Authentication components
│   ├── landing/   # Landing page sections
│   ├── layout/    # Layout components
│   ├── ui/        # Reusable UI components
│   └── user/      # User dashboard components
├── lib/           # Utility functions and configs
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── App.tsx        # Main app component
└── main.tsx       # Entry point
```

## Security Note

⚠️ **Important**: The current authentication system stores passwords in plain text. For production use, implement:
- Supabase Auth for secure authentication
- Server-side password hashing
- HTTPS only
- Input validation and sanitization

## License

MIT

## Support

For issues or questions, please create an issue on GitHub.
