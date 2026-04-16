# ECG Admin Panel — Next.js 14

Web-based admin panel for the ECG-Based Wearable Wellness Platform.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **SWR** (ready for data fetching — currently using mock data)
- **Lucide React** (icons)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Login

- **Email:** admin@ecgplatform.com
- **Password:** admin123

## Project Structure

```
/src
  /app
    layout.tsx                    # Root layout (DM Sans font, global styles)
    page.tsx                      # Redirects to /login or /dashboard
    /login/page.tsx               # Login page
    /forgot-password/page.tsx     # Forgot password page
    /(admin)                      # Route group for authenticated pages
      layout.tsx                  # Sidebar + TopBar layout
      /dashboard/page.tsx         # Dashboard with metrics & charts
      /users/page.tsx             # User list with DataTable
      /users/[id]/page.tsx        # User detail with session history
      /sessions/page.tsx          # Session list
      /sessions/[id]/page.tsx     # Session detail with ECG waveform
      /devices/page.tsx           # Device list with register modal
      /devices/[id]/page.tsx      # Device detail
      /licenses/page.tsx          # License management
      /profile/page.tsx           # Admin profile settings
  /components
    /ui                           # Reusable UI components
    /layout                       # Sidebar, TopBar
  /lib
    api.ts                        # Fetch wrapper with JWT interceptor
    auth.tsx                      # AuthContext with RBAC
    mock-data.ts                  # All mock data (47 users, 32 devices, 64 sessions)
    utils.ts                      # Date formatters, CSV download helper
  /types
    index.ts                      # TypeScript interfaces
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api` |

## Features

- Role-based access control (super_admin, client_admin)
- JWT authentication with refresh token flow
- Sortable, searchable, paginated data tables
- Animated ECG waveform canvas renderer
- Heart rate and temperature trend charts
- User, device, and license management
- CSV data export
- Responsive dark theme matching the original design

## Notes

- This is a **wellness-grade** platform — not for medical diagnosis.
- All data is currently served from mock-data.ts. Replace imports with API calls when the backend is ready.
- The `api.ts` fetch wrapper includes JWT token attachment and automatic 401 refresh logic.
