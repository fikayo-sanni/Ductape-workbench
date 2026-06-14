# Ductape Workbench

A Postman-like API testing and development workbench for the Ductape platform. Test endpoints, manage workspaces and projects, and generate SDK code in multiple languages.

## Features

- **Authentication**: Secure login with Ductape account
  - Email/password authentication
  - OAuth support (Google, GitHub, LinkedIn)
  - Session management with JWT tokens
- **Workspace Management**: Organize your API testing into workspaces
- **Project Organization**: Group related endpoints into projects
- **Request Testing**:
  - Support for all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
  - Query parameters management
  - Request headers configuration
  - JSON request body editing
- **Response Viewing**:
  - View response status, time, and size
  - Pretty-printed JSON response bodies
  - Response headers inspection
- **Code Generation**: Generate ready-to-use code with Ductape SDK in:
  - TypeScript
  - Python
  - Go
  - Java
- **Postman-like UI**: Familiar interface with sidebar navigation and split-panel layout
- **Search**: Quickly find requests across projects

## Getting Started

### Prerequisites

- Node.js >= 20
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and set:
# VITE_API_BASE_URL=your-api-url
# VITE_LOGIN_ENC_KEY=your-encryption-key

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Authentication

When you first open the workbench, you'll see a login modal:

1. **Login with Email/Password**:
   - Enter your Ductape account credentials
   - Click "Login"

2. **Login with OAuth**:
   - Click on Google, GitHub, or LinkedIn button
   - Complete the OAuth flow
   - You'll be redirected back to the workbench

3. **Create Account**:
   - Click "Create an account" link
   - You'll be redirected to the Ductape signup page

The workbench background will be blurred until you successfully authenticate. Once logged in:
- Your name appears in the top-right corner
- Click the logout icon to sign out
- Your session is persisted across browser refreshes

### Creating a Workspace

1. Use the workspace selector in the sidebar
2. Select from existing workspaces or create a new one

### Creating a Project

1. Click the "+" icon next to "PROJECTS" in the sidebar
2. Projects are automatically created within the current workspace

### Creating a Request

1. Expand a project in the sidebar
2. Click the "+" icon next to the project name
3. Configure your request:
   - Set HTTP method
   - Enter URL
   - Add query parameters (Params tab)
   - Add headers (Headers tab)
   - Add request body (Body tab)

### Sending Requests

1. Configure your request
2. Click the "Send" button
3. View the response in the right panel

### Generating Code

1. Send a request to test it
2. Navigate to the "Code" tab in the response panel
3. Select your preferred language (TypeScript, Python, Go, or Java)
4. Click "Copy Code" to copy the generated code

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: TailwindCSS with custom Ductape theme
- **UI Components**: Radix UI
- **State Management**: Zustand
- **Router**: React Router v6
- **HTTP Client**: Axios
- **SDK**: @ductape/sdk

## Project Structure

```
ductape-workbench/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── WorkbenchLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── RequestPanel.tsx
│   │   ├── ResponsePanel.tsx
│   │   ├── CodeGenerator.tsx
│   │   └── LoginModal.tsx
│   ├── config/
│   │   └── axiosinstance.ts # Axios HTTP client
│   ├── services/
│   │   └── authServices.ts  # Authentication API
│   ├── store/
│   │   └── useAuth.tsx      # Auth Zustand store
│   ├── stores/
│   │   └── workbench-store.ts  # Workbench state
│   ├── lib/
│   │   ├── utils.ts         # Utility functions
│   │   └── dummy-data.ts    # Sample data
│   ├── types/
│   │   ├── index.ts         # General types
│   │   ├── auth.ts          # Auth types
│   │   └── workspace.ts     # Workspace types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Design

The UI follows the same design system as the main Ductape frontend app:
- **Font**: System UI stack (no custom web fonts)
- **Primary Color**: rgb(8, 70, 166)
- **Color Palette**: Matching grey scales and accent colors
- **Layout**: Postman-inspired three-column layout with collapsible sidebar

## Development

### Adding New Features

- **State Management**: Add new state and actions in `src/stores/workbench-store.ts`
- **Types**: Define TypeScript types in `src/types/index.ts`
- **Components**: Create new components in `src/components/`
- **Styling**: Use Tailwind classes with custom color variables

### Code Generation

The code generator supports multiple languages and generates code that uses the Ductape SDK. To add a new language:

1. Add the language to the `SdkLanguage` type in `src/types/index.ts`
2. Create a new generator function in `src/components/CodeGenerator.tsx`
3. Add the language option to the language selector

## Contributing

When contributing to this project, please:
1. Follow the existing code style
2. Use TypeScript for type safety
3. Keep components focused and reusable
4. Update types as needed
5. Test your changes thoroughly

## License

This project is part of the Ductape platform.
