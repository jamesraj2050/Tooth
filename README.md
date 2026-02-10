# Dental Website
# Centro Dental - Appointment Booking 
Website

A premium, Apple-inspired dentist appointment booking website for Centro Dental in Geraldton, WA. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Apple-Inspired Design** - Clean, minimalist UI with smooth animations
- 📅 **Appointment Booking** - Multi-step booking flow with calendar and time slot selection
- 👤 **User Authentication** - Secure login and registration system
- 📊 **Dashboard** - Patient and admin dashboards for managing appointments
- 📱 **Responsive Design** - Works seamlessly on all devices
- ⚡ **Modern Stack** - Built with Next.js 14, TypeScript, Prisma, and PostgreSQL

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL via Prisma)
- **Authentication**: NextAuth.js v5
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works great!)
- Git

### Installation

1. **Clone the repository**
   ```bash
   cd "Dentist Website"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   a. Create a Supabase account at [supabase.com](https://supabase.com)
   
   b. Create a new project
   
   c. Go to **Project Settings** > **Database**
   
   d. Copy the **Connection string** (use the "Connection pooling" option for better performance)
   
   e. The connection string format should be:
      ```
      postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
      ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add:
   - `DATABASE_URL` - Your Supabase connection string (from step 3)
   - `AUTH_SECRET` - Generate a random secret: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your app URL (e.g., `http://localhost:3000`)

5. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations (creates tables)
   npx prisma migrate dev --name init
   
   # Seed initial availability data
   npm run db:seed
   ```

6. **Create an admin user (optional)**
   - Register through the website at `/register`
   - Then manually update the user role to ADMIN in Supabase dashboard:
     ```sql
     UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
     ```

7. **Run the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Supabase Setup Guide

### Quick Setup Steps:

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com) and sign up/login
   - Click "New Project"
   - Choose a name, database password, and region
   - Wait for the project to be created (~2 minutes)

2. **Get Connection String**
   - In your Supabase project, go to **Settings** > **Database**
   - Scroll to **Connection string**
   - Select **Connection pooling** tab
   - Copy the connection string (it includes `?pgbouncer=true`)
   - Replace `[YOUR-PASSWORD]` with your database password

3. **Run Migrations**
   - Add the connection string to your `.env` file
   - Run `npx prisma migrate dev` to create tables
   - Run `npm run db:seed` to add default availability hours

### Supabase Benefits:
- ✅ Free tier with generous limits
- ✅ Automatic backups
- ✅ Built-in connection pooling
- ✅ Real-time capabilities (if needed later)
- ✅ Easy to scale
- ✅ Built-in authentication (optional, we're using NextAuth)

## Project Structure

```
dentist-website/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── (public)/          # Public pages
│   └── api/               # API routes
├── components/             # React components
│   ├── ui/                # UI components
│   ├── calendar/          # Calendar components
│   ├── booking/           # Booking components
│   └── layout/            # Layout components
├── lib/                   # Utility functions
├── prisma/                # Prisma schema
└── public/                # Static assets
```

## Key Features

### For Patients
- Browse services and book appointments
- View upcoming and past appointments
- Manage profile information
- Easy-to-use booking interface

### For Admins
- View all appointments
- Manage appointment status
- View patient information
- Analytics dashboard

## Database Schema

The application uses Prisma with the following main models:
- **User** - Patients and admins
- **Appointment** - Booking records
- **Availability** - Office hours configuration

## Customization

### Colors
Edit `tailwind.config.ts` to customize the color palette.

### Services
Update the `SERVICES` array in `app/(public)/book/page.tsx` to add or modify services.

### Availability
Configure office hours by adding records to the `Availability` table in the database.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS
- DigitalOcean

Make sure to:
- Set up your PostgreSQL database
- Configure environment variables
- Run database migrations

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue on the repository.

# redeploy
