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
