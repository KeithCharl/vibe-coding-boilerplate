# Vibe Coding Boilerplate

A ready-to-use web application starter kit for non-technical creators. Build your application without writing code!

## What's Included

This boilerplate comes with everything you need to start your web application:

- **Database**: Store and manage your application data
- **User Authentication**: Let users sign in with Google
- **File Storage**: Upload and store images and files
- **AI Integration**: Built-in AI capabilities using OpenAI and LangChain

## Getting Started (For Non-Coders)

### Step 1: Set Up Your Project

1. Download this project to your computer
2. Open a terminal/command prompt in the project folder
3. Install the required tools:
   - Install [Node.js](https://nodejs.org/) (LTS version)
   - Run `npm install` in the terminal

### Step 2: Set Up Your Environment Variables

1. Rename `example.env` to `.env`
2. You'll fill in these variables by following the steps below

### Step 3: Database Setup

1. Go to [Vercel](https://vercel.com/) and create an account or sign in
2. Go to "Storage" in the left sidebar
3. Click "Create" and select "Postgres"
4. Follow the setup wizard and create your database
5. Once created, click on your new database and find the "Connection String"
6. Copy the connection string and paste it as your `POSTGRES_URL` in the `.env` file

### Step 4: Authentication Setup

1. Go to [Google Cloud Platform](https://cloud.google.com/)
2. Create a new project
3. Set up the OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" and click "Create"
   - Fill in the required information
   - Add "/api/auth/callback/google" to the authorized redirect URIs
4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" and select "OAuth client ID"
   - Select "Web application" as the application type
   - Add your development URL (typically `http://localhost:3000`) to authorized JavaScript origins
   - Add `http://localhost:3000/api/auth/callback/google` to redirect URIs
   - Click "Create"
5. Copy the Client ID and Client Secret to your `.env` file as:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
6. Also add a `NEXTAUTH_SECRET` (you can generate one by running `openssl rand -base64 32` in your terminal or just use a complex password)

### Step 5: File Storage Setup

1. Go back to [Vercel](https://vercel.com/)
2. Go to "Storage" in the left sidebar
3. Click "Create" and select "Blob"
4. Follow the setup wizard to create your blob storage
5. Once created, find the "Read & Write Token" under the "Tokens" tab
6. Copy this token and paste it as `BLOB_READ_WRITE_TOKEN` in your `.env` file

### Step 6: AI Setup (Optional)

1. Go to [OpenAI](https://platform.openai.com/signup) and create an account
2. Go to API keys and create a new secret key
3. Copy this key and paste it as `OPENAI_API_KEY` in your `.env` file

### Step 7: Run Your Application

1. In your terminal, run: `npm run dev`
2. Open your browser and go to `http://localhost:3000`
3. You should see your application running!

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
