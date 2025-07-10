# Vibe Coding Boilerplate

A ready-to-use web application starter kit for non-technical creators. Build your application without writing code!

## What's Included

This boilerplate comes with everything you need to start your web application:

- **Database**: Store and manage your application data
- **User Authentication**: Let users sign in with Google
- **File Storage**: Upload and store images and files
- **AI Integration**: Built-in AI capabilities using OpenAI and LangChain

## Getting Started (For Non-Coders)

### Step 0: Prerequisites

1. Install [Node.js](https://nodejs.org/) (LTS version)
2. Install [Cursor](https://www.cursor.com/)

### Step 1: Set Up Your Project

1. Download this project to your computer
2. Open a terminal/command prompt in the project folder
3. Run `npm install` in the terminal
4. Run `npm run dev` to start the development server

### Step 2: Set Up Your Environment Variables

1. Rename `example.env` to `.env`
2. You'll fill in these variables by following the steps below

### Step 3: Database Setup

1. Go to [Vercel](https://vercel.com/) and create an account or sign in
2. Go to "Storage" in the left sidebar
3. Click "Create" and select "Neon Serverless Postgres"
4. Follow the setup wizard and create your database
5. Under quick start, look for the .env.local environment variables.
6. Click on Show Secret.
7. Copy the POSTGRES_URL variable and value.
8. Paste the POSTGRES_URL variable and value into your .env file as the value for the POSTGRES_URL variable.

### Step 4: File Storage Setup

1. Go back to [Vercel](https://vercel.com/)
2. Go to "Storage" in the left sidebar
3. Click "Create" and select "Blob"
4. Follow the setup wizard to create your blob storage
5. Under quick start, look for the .env.local environment variables.
6. Click on Show Secret.
7. Copy the BLOB_READ_WRITE_TOKEN variable and value.
8. Paste the BLOB_READ_WRITE_TOKEN variable and value into your .env file as the value for the BLOB_READ_WRITE_TOKEN variable.

### Step 5: Authentication Setup

1. Go to [Google Cloud Platform](https://cloud.google.com/)
2. Click on "Console" in the top right corner
3. Create a new project (click on projects dropdown and select "Create project")
4. Give your project a name and click "Create"
5. Select the project that you created
6. On the left sidebar, click on "APIs & Services"
7. Set up the OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Click on "Get Started"
   - Enter your app name and select your support email
   - Click "Next"
   - Select "External" and click "Next"
   - Fill in the contact information and click "Next"
   - Agree to terms and conditions and click "Continue"
   - Then click "Create"
   - Add "/api/auth/callback/google" to the authorized redirect URIs
8. Create OAuth Client:

   - Click on "Create OAuth Client"
   - Application type, select "Web application"
   - Give your application a name
   - Authorised JavaScript origins: http://localhost:3000
   - Authorised redirect URIs: http://localhost:3000/api/auth/callback/google
   - Click "Create"
   - Click OK to close the popup

9. Click on Audience

   - Click on "Publish App".
   - Click Confirm

10. Get Client ID and Client Secret

- Click on Clients
- Click on the OAuth client that you created in the previous step
- Copy the Client ID and Client Secret over to .env

11. Also add a `NEXTAUTH_SECRET` (you can generate one by running `openssl rand -base64 32` in your terminal or just use a complex password)

### Step 6: AI Setup (Optional)

1. Go to [OpenAI](https://platform.openai.com/signup) and create an account
2. Go to API keys and create a new secret key
3. Copy this key and paste it as `OPENAI_API_KEY` in your `.env` file

### Step 7: Run Your Application

1. In your terminal, run: `npm run dev`
2. Open your browser and go to `http://localhost:3000`
3. You should see your application running!

### Step 8: Configure Your Project Rules (Recommended)

This project comes with an example Cursor rules file called `project-rules.mdc`.

It is **highly recommended** to use an LLM (like ChatGPT) to generate a project-rules file specific to your project. This will assist the Cursor Agent to have a better understanding of your project's features, architecture, components, and requirements.

To do this:

1. Use the following prompt with ChatGPT or another LLM:

```
You are a technical documentation assistant.

Project description:
[INSERT NATURAL LANGUAGE PROJECT DESCRIPTION HERE]

Your task is to generate a structured system overview document (similar to a Cursor "Rules" file) for a given software project. This document should clearly explain the purpose, structure, core logic, and architecture of the system. It must be informative for both stakeholders and developers, without including setup instructions.

Please use the following format:

---

# [Project Name] System Overview

## What is [Project Name]?

Briefly explain what the project is, who it's for, and the problem it solves.

## How [Project Name] Works

### Core Concept

Summarize the high-level idea behind the platform's approach or innovation. Avoid unnecessary jargon.

## Core Components

Break the system into key components or modules. For each component, provide:
- **Name**
- **Purpose**
- **Inputs**
- **Outputs**
- **How it works**
- **Example (optional)**

## Technical Architecture

### Frontend

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: React hooks and forms using `react-hook-form`
- **Authentication**: NextAuth.js with Google Auth Provider

### Backend

- **API**: Next.js Route Handlers
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**:
  - OpenAI SDK for GPT models
  - Langchain for LLM orchestration
- **File Storage**: Vercel Blob Storage

## Data Flow

Describe how data flows through the system, step-by-step — from initial user input through processing, storage, and output.

## Key Features

List the core features that differentiate or empower the platform. Use bullet points for clarity.

## User Workflow

Describe how a typical user interacts with the platform in sequential steps (e.g., setup, usage, output).

---

**IMPORTANT INSTRUCTION (for Cursor Agent):**

If you detect that a user has made changes to the database schema, you must always remind them to run:

npm run db:generate
npm run db:migrate

If possible, attempt to execute these commands automatically. This ensures that Drizzle ORM remains in sync with the updated schema.
```

2. Provide details about your specific project to the LLM
3. Replace the contents of the `project-rules.mdc` file with the generated rules

This step will significantly improve your experience when working with Cursor's AI assistant throughout your project development.

## Making Changes to the Database

If you need to modify the database structure:

1. Run `npm run db:generate`
2. Run `npm run db:migrate`

## Deploying Your Application

When you're ready to make your application available online:

1. Create an account on [Vercel](https://vercel.com/) if you haven't already
2. Install the Vercel CLI: `npm install -g vercel`
3. Run `vercel` in your project directory and follow the prompts
4. Set up the same environment variables on Vercel that you have in your `.env` file

## Need Help?

If you encounter any issues or need assistance, please reach out to the Vibe Coding community or check our documentation.
