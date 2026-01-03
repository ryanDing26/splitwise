# Splitwise Frontend

A modern React frontend for the Splitwise bill-splitting application.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icons
- **date-fns** - Date utilities

## Features

- 📱 Phone-based OTP authentication
- 📝 Create and manage bills
- 👥 Add participants and split expenses
- 💰 Track payments and settlements
- 📊 Dashboard with expense overview
- 🎨 Modern, responsive UI

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on port 5000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components (Button, Input, etc.)
│   ├── Layout.tsx   # App layout with header
│   └── BillCard.tsx # Bill display component
├── contexts/        # React contexts
│   └── AuthContext.tsx
├── pages/           # Route pages
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── BillsPage.tsx
│   ├── BillDetailPage.tsx
│   ├── CreateBillPage.tsx
│   ├── PaymentsPage.tsx
│   └── ProfilePage.tsx
├── services/        # API services
│   └── api.ts
├── types/           # TypeScript types
│   └── index.ts
├── utils/           # Helper functions
│   └── index.ts
├── App.tsx          # Main app with routing
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## API Integration

The frontend communicates with the backend API via the `/api/v1` prefix. Vite proxies all `/api` requests to `http://localhost:5000` during development.

### Authentication Flow

1. User enters phone number
2. OTP is sent via SMS (or logged in development)
3. User enters OTP to verify
4. JWT tokens are stored in localStorage
5. Access token is automatically refreshed when expired

## Environment Variables

Create a `.env` file if needed:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## Development

```bash
# Run development server
npm run dev

# Type checking
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Styling

The app uses Tailwind CSS with custom design tokens:

- **Primary Color**: Green (#10b981) - represents money/finance
- **Surface Colors**: Neutral grays for backgrounds
- **Font Families**: 
  - DM Sans (body text)
  - Space Grotesk (headings)

Custom component classes are defined in `src/index.css`:
- `.btn`, `.btn-primary`, `.btn-secondary` - Buttons
- `.input` - Input fields
- `.card`, `.card-hover` - Card containers
- `.badge-*` - Status badges

## Responsive Design

The UI is fully responsive:
- Mobile-first approach
- Collapsible navigation on mobile
- Adaptive grid layouts
- Touch-friendly interactions
