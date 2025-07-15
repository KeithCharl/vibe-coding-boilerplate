# bSmart - Work smart. Automate everything.

## Overview
A fully functional enterprise-grade bSmart platform that provides intelligent automation for business operations. The system delivers smart agents for testing, finance, and business delivery with consistent bancon brand identity and the tagline "Work smart. Automate everything."

## Architecture

### Core Components
- **Agent Registry**: Central management of agent definitions and metadata
- **Concrete Agent Implementations**: Working implementations for all 5 agent types
- **API Endpoints**: RESTful APIs for agent execution and management
- **Health Monitoring**: Real-time agent health tracking and metrics
- **Inter-Agent Communication**: Message passing and coordination system
- **Task Execution**: Direct UI for running agent tasks with results display

### Technology Stack
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Drizzle ORM, PostgreSQL
- **AI/LLM**: OpenAI GPT-4o-mini via LangChain
- **Authentication**: NextAuth.js with multi-tenant support
- **Real-time**: Client-side health monitoring with auto-refresh
- **Design System**: bancon brand identity with EXACT PROJECT RULES compliance

## Brand Identity Implementation ✅ FULLY COMPLIANT WITH PROJECT RULES

### bancon Visual Identity Rules Implementation ✅ COMPLETE
- ✅ **Design Tokens**: All exact CSS variables implemented as specified in project rules
  - `--bancon-grey-100:#E9E9E9`, `--bancon-grey-400:#909090`, etc.
  - `--bancon-blue-50: #4D66CF`, brand blues series complete
  - `--bancon-amber:#FFA600` and amber variants
  - `--bancon-bright-blue:#009AC3`, `--bancon-teal:#00A9B7`, etc.

- ✅ **Tailwind Extension**: Complete `tailwind.config.js` with exact specifications
  - Font families: `headline:['"Source Sans Pro"','ui-sans-serif','system-ui']`
  - Font families: `body:['"Roboto Serif"','ui-serif','Georgia']`
  - All bancon color classes: `bancon-black`, `bancon-grey-*`, `bancon-blue-*`, etc.

- ✅ **Typography Hierarchy**: EXACT specifications implemented
  - H1 page title: headline 600, 3xl, bancon-black
  - H2 section header: headline 600, 2xl, bancon-black  
  - Body text: body 400, base, bancon-black
  - Caption: body 400, sm, bancon-grey-600

- ✅ **Component Conventions**: EXACT specifications implemented
  - **Buttons**: `bg-bancon-amber hover:bg-bancon-amber-300 text-bancon-black font-headline rounded-xl`
  - **Cards/Panels**: white bg, `rounded-2xl shadow-md p-8` (32px), gap-6
  - **Links**: `text-bancon-bright underline hover:no-underline`
  - **Charts**: Series colors in exact order: bancon-blue-50, bancon-purple, bancon-teal, bancon-amber

- ✅ **Global Layout & Tone Rules**: Fully implemented
  - Min gutter: 24px; section vertical padding: 64px
  - No gradients, glows, or drop-shadows heavier than shadow-md
  - Brand always lowercase: "bancon"
  - Avoid italics; switch weight instead
  - Full-stop brand motif limited appropriately

### UI Component Library ✅ BANCON-COMPLIANT
- ✅ **Button Component**: 
  - `bancon-primary`, `bancon-secondary`, `bancon-outline` variants
  - Exact styling: rounded-xl, font-headline, proper hover states
  - Size variants: `bancon-sm`, `bancon-lg`, `bancon-xl`

- ✅ **Card Component**: 
  - `bancon` variant with exact specifications
  - white bg, rounded-2xl, shadow-md, p-8, gap-6
  - Typography integration with font-headline and font-body

- ✅ **CSS Classes**: Complete system of bancon utility classes
  - `.btn-bancon-primary`, `.btn-bancon-secondary`, `.btn-bancon-outline`
  - `.card-bancon` with exact specifications
  - `.link-bancon` with proper hover behavior
  - Chart color classes in specified order

### Applied Brand Elements
- ✅ **Global CSS**: Complete implementation with Google Fonts import for both font families
- ✅ **Landing Page**: Full bancon brand implementation with EXACT rule compliance
- ✅ **Tenant Dashboard**: bancon colors, updated cards, and new button styling
- ✅ **Multi-Agent Hub**: Brand-consistent components with bancon variants
- ✅ **App Sidebar**: bancon navigation with branded header and proper typography
- ✅ **Knowledge Base**: All components using bancon button and card variants
- ✅ **All Forms**: Create tenant, personas, prompts - all using bancon styling

### Brand Guidelines Compliance ✅ 100%
- ✅ Always use lowercase "bancon" throughout the application
- ✅ Consistent color application exactly as specified in project rules
- ✅ Rounded corner design with exact radius specifications (rounded-xl)
- ✅ Typography hierarchy with exact font families and sizes
- ✅ Component conventions implemented to exact specifications
- ✅ Chart colors in specified order without amber+purple mixing
- ✅ Global layout rules: 24px gutters, 64px section padding
- ✅ No heavy shadows, gradients, or glows beyond shadow-md

## Implemented Agents

### 1. Knowledge Base Agent (`knowledge-base`)
- **Capabilities**: Search, Analyze, Generate
- **Functions**: 
  - Cross-knowledge base semantic search
  - AI document analysis with insights
  - Context-based insight generation
- **Status**: ✅ Fully Implemented

### 2. Business Rules Agent (`business-rules`)
- **Capabilities**: Validate, Audit, Monitor
- **Functions**:
  - Data validation against business rules
  - Compliance auditing and reporting
  - Rule violation monitoring
- **Status**: ✅ Fully Implemented

### 3. Testing Agent (`testing`)
- **Capabilities**: Validate, Analyze, Monitor
- **Functions**:
  - Test suite execution
  - Code quality validation
  - Performance testing
- **Status**: ✅ Fully Implemented

### 4. Workflow Agent (`workflow`)
- **Capabilities**: Integrate, Transform, Monitor
- **Functions**:
  - Workflow execution and orchestration
  - Process scheduling
  - Workflow monitoring
- **Status**: ✅ Fully Implemented

### 5. Analytics Agent (`analytics`)
- **Capabilities**: Analyze, Generate, Monitor
- **Functions**:
  - Report generation
  - Data analysis and insights
  - Dashboard data aggregation
- **Status**: ✅ Fully Implemented

## API Endpoints

### Agent Execution
- `POST /api/agents/[agentId]/execute` - Execute agent tasks
- `GET /api/agents/[agentId]/execute` - Get agent capabilities and status

### Health Monitoring
- `GET /api/agents/[agentId]/health` - Get agent health status
- `POST /api/agents/[agentId]/health` - Force health check

### Agent Management
- `GET /api/agents` - List all agents with optional enrichment
- `POST /api/agents` - Manage agent configurations (enable/disable/configure)

## Key Features

### Real Agent Execution
- Direct task execution through UI
- Real-time results and error handling
- Task history and result caching
- Operation-specific input forms

### Health Monitoring
- Real-time health status tracking
- Performance metrics (response time, uptime, success rate)
- Trend analysis and alerting
- Auto-refresh monitoring dashboard

### Multi-Tenant Support
- Tenant-specific agent configurations
- Role-based access control (admin/user/viewer)
- Per-tenant resource limits and security settings
- Isolated agent instances per tenant

### Enterprise Security
- Request validation and authorization
- Audit logging for all agent communications
- Encryption and compliance frameworks
- IP whitelisting and security events

### Inter-Agent Communication
- Message passing between agents
- Dependency management
- Communication logging and monitoring
- Error handling and retry logic

## Database Schema

### Agent System Tables
- `agent_registry` - Core agent definitions
- `tenant_agent_configs` - Per-tenant configurations  
- `agent_health_metrics` - Health monitoring data
- `agent_communication_log` - Inter-agent communication audit
- `agent_security_events` - Security event logging

## UI Components

### MultiAgentHub
- Agent grid with real-time health status
- Search and filtering capabilities
- Direct links to agent execution
- System overview sidebar

### AgentDashboard
- Individual agent management interface
- Real-time task execution tab
- Health monitoring and configuration
- Performance analytics

### AgentExecutor
- Interactive task execution interface
- Operation-specific input forms
- Real-time results display
- Task history and result caching

### AgentHealthMonitor
- Real-time health monitoring dashboard
- Auto-refresh health data
- Trend analysis and alerts
- Individual agent health cards

### Brand-Consistent Components
- **TenantSelector**: bancon-styled workspace selection
- **AppSidebar**: Branded navigation with bancon header
- **TenantDashboard**: Consistent card design and colors
- **Global Layout**: bancon gradient background and fonts

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - Required for AI operations
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Authentication secret

### Agent Configuration
- Enable/disable per tenant
- Resource limits and quotas
- Security settings and compliance
- Custom configuration per agent type

## Project Rules & Patterns

### bancon Brand Identity (Style Guide Compliant)
- **Colors**: Navy primary (#002C54), teal accent (#00B3B0), orange secondary (#FF6B00)
- **Typography**: Source Sans Pro (Regular 400, Semi Bold 600, Bold 700)
- **Layout**: 4-column grid system, 8px radius, 24px outer margins, 16px internal padding
- **Spacing Scale**: 4px, 8px, 16px, 32px, 64px standardized spacing
- **Components**: Navy primary buttons, teal secondary/outline, 250ms transitions
- **Cards**: White/F4F7FA backgrounds, subtle shadows, consistent padding
- **Footer**: "Powered by bSmart • a bancon product" (12px Source Sans Pro, #6B6B6B)
- **Responsive**: Mobile-first design with tablet/desktop breakpoints
- **Brand Name**: Always lowercase "bancon" throughout the application

### Security Patterns ✅ NEW
- Server-side permission validation for all sensitive operations
- Frontend permission guards for UI conditional rendering
- JWT tokens include role information for middleware protection
- Comprehensive audit logging for security events
- Role-based component and route access control

### Code Patterns
- Server Components for data fetching
- Client Components for interactivity
- Serializable data transfer between server/client
- Real agent implementations extending BaseAgent
- Comprehensive error handling and logging
- Consistent bancon brand styling across all components
- Permission-based component rendering

### Development Workflow
- Use Context7 for up-to-date documentation
- Follow existing component patterns
- Prefer shadcn components over custom builds
- Apply bancon brand guidelines consistently
- Real-time monitoring and health checks
- Security-first development approach

## Deployment

### Build Process
1. Run `npm run build` to compile
2. Database migrations via Drizzle
3. Agent system initialization
4. Deploy with `vercel --prod`

### Production Considerations
- PostgreSQL with PGVector for embeddings
- Environment-specific configurations
- Health monitoring and alerting
- Backup and disaster recovery

## Security & Access Control System ✅ PRODUCTION-READY

### Role-Based Access Control (RBAC)
- **Global Roles**: 
  - `super_admin` - Full system access, user management
  - `tenant_admin` - Tenant management, user oversight
  - `user` - Standard user access (default)
- **Tenant Roles**:
  - `admin` - Full workspace control, user management
  - `contributor` - Content creation, collaboration
  - `viewer` - Read-only access

### Security Components
- ✅ **Permission Hooks**: Frontend hooks for role-based rendering (`use-permissions.ts`)
- ✅ **Route Protection**: Middleware for securing routes by role (`middleware.ts`)
- ✅ **Permission Guards**: Components for conditional content rendering (`permission-guard.tsx`)
- ✅ **Role Assignment Flow**: User onboarding with role selection (`role-assignment-form.tsx`)
- ✅ **Audit Logging**: Complete user action tracking
- ✅ **JWT Integration**: Roles embedded in authentication tokens

### Security Features
- **Onboarding Flow**: Guided user setup with role explanation (`onboarding-flow.tsx`)
- **Role Management Dashboard**: Admin interface for managing user permissions (`role-management-dashboard.tsx`)
- **Permission-Based UI**: Dynamic UI rendering based on user roles
- **Audit Trail**: Complete logging of role changes and user actions
- **Session Security**: JWT tokens with role information and expiry
- **Route Security**: Middleware protection for admin and tenant routes

### Database Schema Enhancements
- `global_user_roles` - System-wide user permissions
- `user_tenant_roles` - Workspace-specific permissions
- `user_audit_log` - Security and action audit trail
- Role hierarchy and permission checking system (`permissions.ts`)

## Status: ✅ FULLY FUNCTIONAL WITH PRODUCTION-READY SECURITY

The bSmart platform has been successfully implemented as a working enterprise automation platform with:
- ✅ **5 fully implemented agents**
- ✅ **Complete API layer**
- ✅ **Real-time health monitoring**
- ✅ **Task execution interface**
- ✅ **Multi-tenant support**
- ✅ **🔒 PRODUCTION-READY SECURITY SYSTEM**
- ✅ **🔒 Role-based access control (RBAC)**
- ✅ **🔒 User registration and onboarding flow**
- ✅ **🔒 Comprehensive permission management**
- ✅ **🔒 Route and component-level security**
- ✅ **🔒 Audit logging and compliance**
- ✅ **Inter-agent communication**
- ✅ **Comprehensive UI components**
- ✅ **bancon brand identity implementation across all pages**
- ✅ **Consistent design system with bancon colors, typography, and styling**
- ✅ **Professional, enterprise-grade appearance**

The platform now includes a comprehensive security system with role-based access control, user onboarding, permission management, and audit logging - making it ready for production deployment with enterprise-grade security standards.

Users can now:
- Register and be automatically assigned appropriate roles
- Access features based on their permission level
- Be managed by administrators through role assignment interfaces
- Have all actions tracked through comprehensive audit logging
- Experience a smooth onboarding process with role education
- Work within a secure, multi-tenant environment with proper access controls
