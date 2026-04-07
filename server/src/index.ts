import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })
import express from 'express'
import cors from 'cors' // resovle conflic port 
import { authRouter } from './routes/auth.routes'
import { documentRouter } from './routes/document.routes'
import { errorMiddleware } from './middleware/error.middleware'
import { hocuspocusServer } from './collab/hocuspocus'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const WS_PORT = Number(process.env.HOCUSPOCUS_PORT) || 1234

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

// Routes
app.use('/api/auth', authRouter)
app.use('/api/documents', documentRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Error handler
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`)
})

// Start Hocuspocus WebSocket server
hocuspocusServer.listen(WS_PORT, undefined, () => {
  console.log(`Hocuspocus WS server running on port ${WS_PORT}`)
})
