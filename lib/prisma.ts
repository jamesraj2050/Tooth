import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we're in Edge Runtime - Prisma doesn't work there
const isEdgeRuntime =
  // Edge runtime exposes a global EdgeRuntime marker on globalThis
  typeof (globalThis as any).EdgeRuntime !== 'undefined' ||
  // Or if there's no Node.js process available
  typeof process === 'undefined' ||
  !process.versions?.node

// #region agent log
if (typeof process !== 'undefined' && process.versions?.node) {
  fetch('http://127.0.0.1:7242/ingest/19016d58-0868-4e7e-8a4b-3e1c265c5f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:9',message:'Prisma module loading',data:{hasEnv:!!process.env.DATABASE_URL,nodeEnv:process.env.NODE_ENV,isEdgeRuntime},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
}
// #endregion

// Lazy initialization function - only creates PrismaClient when actually called (not at import time)
function getPrismaClient(): PrismaClient {
  if (isEdgeRuntime) {
    throw new Error('Prisma Client cannot be used in Edge Runtime. Use Prisma Accelerate or Driver Adapters.')
  }
  
  // #region agent log
  if (typeof process !== 'undefined' && process.versions?.node) {
    fetch('http://127.0.0.1:7242/ingest/19016d58-0868-4e7e-8a4b-3e1c265c5f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:18',message:'Creating PrismaClient',data:{hasExisting:!!globalForPrisma.prisma,isEdgeRuntime},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'F'})}).catch(()=>{});
  }
  // #endregion
  
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    })
  }
  
  return globalForPrisma.prisma
}

// Export a proxy that lazily initializes PrismaClient
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

// Helper for Row Level Security: set the current app user id in Postgres
// Call this once per request (after you know the logged-in user id)
export async function setCurrentUserIdForRLS(userId?: string | null) {
  if (!userId) return
  // Use a simple parameterized call to avoid SQL injection
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_user_id', $1, true)`,
    userId,
  )
}

// Test database connection on startup (only in Node.js runtime, not Edge Runtime)
if (process.env.NODE_ENV === 'development' && !isEdgeRuntime) {
  // #region agent log
  if (typeof process !== 'undefined' && process.versions?.node) {
    fetch('http://127.0.0.1:7242/ingest/19016d58-0868-4e7e-8a4b-3e1c265c5f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:42',message:'Attempting database connection',data:{hasDbUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion
  getPrismaClient().$connect()
    .then(() => {
      // #region agent log
      if (typeof process !== 'undefined' && process.versions?.node) {
        fetch('http://127.0.0.1:7242/ingest/19016d58-0868-4e7e-8a4b-3e1c265c5f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:46',message:'Database connection success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      }
      // #endregion
      console.log('✅ Database connected successfully')
    })
    .catch((error) => {
      // #region agent log
      if (typeof process !== 'undefined' && process.versions?.node) {
        fetch('http://127.0.0.1:7242/ingest/19016d58-0868-4e7e-8a4b-3e1c265c5f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:51',message:'Database connection failed',data:{error:error.message,errorName:error.name,hasDbUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      }
      // #endregion
      console.error('❌ Database connection failed:', error.message)
      console.error('Please check your DATABASE_URL in .env file')
    })
}

