import dotenv from 'dotenv'
dotenv.config({ path: '../.env' })
import express from 'express'
import cors from 'cors' // resovle conflic port 
import path from 'path'
import fs from 'fs'
import { authRouter } from './routes/auth.routes'
import { documentRouter } from './routes/document.routes'
import { errorMiddleware } from './middleware/error.middleware'
import { hocuspocusServer } from './collab/hocuspocus'
import { authMiddleware } from './middleware/auth.middleware'
import { upload, uploadFile } from './controllers/upload.controller'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const WS_PORT = Number(process.env.HOCUSPOCUS_PORT) || 1234

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

// Serve static uploads
app.use('/uploads', express.static(uploadsDir))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/documents', documentRouter)
app.post('/api/upload', authMiddleware, upload.single('file'), uploadFile)

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

