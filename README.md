# VPN Admin Dashboard

A modern, responsive admin dashboard for managing VPN load balancer infrastructure, built with React and Vite.

## Overview

VPN Admin Dashboard is a comprehensive management interface for monitoring and controlling VPN services, load balancing, and network intelligence. It provides real-time insights into VPN sessions, server health, protocol performance, and detailed analytics.

## Features

- 📊 **Real-time Dashboard** - Monitor VPN sessions and server status
- 🌍 **Country Intelligence** - Geographic analytics and insights
- 🏢 **ISP Intelligence** - ISP performance tracking
- 🔒 **Policy Management** - Configure and override security policies
- 📈 **Analytics & Reports** - Comprehensive reporting and data visualization
- 🖥️ **Server Management** - Monitor and manage VPN servers
- 🔧 **Application Configuration** - Fine-tune application settings
- ⚙️ **System Settings** - Configure system-wide parameters
- 📋 **Event Logs** - Track system events and activities
- 🎯 **Protocol Health** - Monitor protocol performance metrics
- 📱 **Responsive Design** - Works seamlessly on desktop and tablet devices

## Tech Stack

- **Frontend Framework**: React 18.3.1
- **Build Tool**: Vite 6.0.5
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM 6.28.0
- **Charts & Visualization**: Recharts 2.13.3
- **Icons**: Lucide React 0.468.0
- **CSS Processing**: PostCSS 8.4.49, Autoprefixer 10.4.20

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <frontend-repo-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://192.168.20.55:8000/api
   VITE_API_KEY=your_api_key_here
   ```

   - `VITE_API_URL`: Backend API endpoint
   - `VITE_API_KEY`: API key for authentication

## Development

### Start development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

### Build for production
```bash
npm run build
```

Generates optimized production build in the `dist` directory.

### Preview production build
```bash
npm run preview
```

Preview the production build locally.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx    # Main dashboard layout wrapper
│   │   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   │   └── Topbar.jsx              # Top navigation bar
│   │   └── ui/
│   │       ├── Modal.jsx               # Reusable modal component
│   │       └── StatCard.jsx            # Statistics card component
│   ├── pages/
│   │   ├── HomeOverview.jsx            # Dashboard overview
│   │   ├── LiveSessions.jsx            # Active VPN sessions
│   │   ├── ServerManagement.jsx        # Server management page
│   │   ├── VpnAnalytics.jsx            # VPN analytics and metrics
│   │   ├── CountryIntelligence.jsx     # Geographic analytics
│   │   ├── IspIntelligence.jsx         # ISP performance data
│   │   ├── ProtocolHealth.jsx          # Protocol monitoring
│   │   ├── LogsEvents.jsx              # System logs and events
│   │   ├── ReportsAnalytics.jsx        # Reports and analytics
│   │   ├── PoliciesOverrides.jsx       # Policy management
│   │   ├── AppManagement.jsx           # Application management
│   │   ├── AppConfigure.jsx            # Application configuration
│   │   ├── SystemSettings.jsx          # System settings
│   │   ├── LoginPage.jsx               # User authentication
│   │   └── PlaceholderPage.jsx         # Placeholder page
│   ├── services/
│   │   └── api.js                      # API integration and HTTP client
│   ├── hooks/
│   │   └── useAuth.jsx                 # Authentication hook
│   ├── data/
│   │   └── mockData.js                 # Mock data for development
│   ├── App.jsx                         # Root application component
│   ├── main.jsx                        # Application entry point
│   └── index.css                       # Global styles
├── index.html                          # HTML entry point
├── package.json                        # Project dependencies
├── vite.config.js                      # Vite configuration
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS configuration
└── README.md                           # This file
```

## Configuration

### Tailwind CSS

The project uses Tailwind CSS with custom extensions:

- **Custom Colors**: Sidebar, brand, and surface color schemes
- **Custom Fonts**: DM Sans (default), JetBrains Mono (monospace)
- **Custom Shadows**: Card and sidebar-specific shadow definitions

Configuration file: `tailwind.config.js`

### Vite

- React plugin for JSX support
- Fast development server and production build

Configuration file: `vite.config.js`

## API Integration

The frontend communicates with the backend API through the `api.js` service module. 

**Backend Repository**: [vpn-load-balancer-backend](https://github.com/sajid70300/vpn-load-balancer-backend.git)

### Base Configuration

- Base URL: Configured via `VITE_API_URL` environment variable
- Authentication: API key via `VITE_API_KEY` environment variable

### API Service

Located at `src/services/api.js`, handles:
- HTTP requests to backend endpoints
- Authentication and headers
- Error handling and response parsing

## Available Routes

The dashboard includes the following main routes:

- `/` - Home/Overview page
- `/live-sessions` - Live VPN sessions
- `/server-management` - Server management
- `/vpn-analytics` - VPN analytics
- `/country-intelligence` - Country-based intelligence
- `/isp-intelligence` - ISP performance data
- `/protocol-health` - Protocol health monitoring
- `/logs-events` - System logs and events
- `/reports-analytics` - Reports and analytics
- `/policies-overrides` - Policy management
- `/app-management` - Application management
- `/app-configure` - Application configuration
- `/system-settings` - System settings
- `/login` - Login/Authentication

## Authentication

The application uses a custom authentication hook (`useAuth.jsx`) for managing user sessions and authentication state.

## Development Tips

- **Hot Module Replacement (HMR)**: Vite provides instant feedback during development
- **Mock Data**: Use `data/mockData.js` for development without a backend
- **Environment Variables**: Always use `VITE_*` prefix for client-side environment variables
- **Custom Hooks**: Create reusable logic in the `hooks/` directory
- **UI Components**: Add reusable UI components in `components/ui/`

## Build and Deployment

### Production Build

```bash
npm run build
```

This creates an optimized build in the `dist/` directory, ready for deployment.

### Deployment Options

- **Static Hosting**: Deploy the `dist/` folder to any static hosting service (Vercel, Netlify, AWS S3, etc.)
- **Docker**: Create a Docker image with Nginx to serve the static files
- **Server**: Use any web server (Nginx, Apache) to serve the static files with SPA routing configuration

## Troubleshooting

### Port Already in Use
If port 5173 is already in use, Vite will automatically use the next available port.

### API Connection Issues
- Verify `VITE_API_URL` is correct and the backend is running
- Check `VITE_API_KEY` is valid
- Ensure CORS is properly configured on the backend

### Build Errors
- Clear `node_modules` and reinstall: `npm install`
- Clear Vite cache and rebuild: `npm run build`

## Support

For issues related to:
- **Frontend**: Open an issue in this repository
- **Backend**: Visit [vpn-load-balancer-backend](https://github.com/sajid70300/vpn-load-balancer-backend.git)

## Related Projects

- [VPN Load Balancer Backend](https://github.com/sajid70300/vpn-load-balancer-backend.git)
