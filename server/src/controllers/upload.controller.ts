import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'

const UPLOADS_DIR = path.join(__dirname, '../../uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // Tạo tên file unique bằng random hex + giữ extension gốc.
    const ext = path.extname(file.originalname)
    const name = crypto.randomBytes(16).toString('hex') + ext
    cb(null, name)
  },
})

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true)
  } else {
    cb(new Error('Chỉ hỗ trợ file ảnh (jpg, png, gif, webp, svg, bmp)'))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

export async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file nào được tải lên' })
    }
    const url = `/uploads/${req.file.filename}`
    res.json({ url })
  } catch (err) {
    next(err)
  }
}
