import dotenv from 'dotenv'
dotenv.config()

import { createApp } from './app'
import { startHoldCleanupWorker } from './workers/holdCleanup'

const PORT = process.env.PORT || 3001
const app = createApp()

// Start background cron worker
startHoldCleanupWorker()

app.listen(PORT, () => {
  console.log(`🚀 Quadis Hotels API Server running strictly on TypeScript at http://localhost:${PORT}`)
  console.log(`📡 Health Check endpoint: http://localhost:${PORT}/api/health`)
})
