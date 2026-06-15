import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { MultipartFile } from '@fastify/multipart'
import sharp from 'sharp'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_DIMENSION = 1200 // px

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  )
}

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function uploadImage(file: MultipartFile, folder = 'products'): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.')
  }

  const ext = mimeType === 'image/webp' ? 'webp' : (file.filename.split('.').pop()?.toLowerCase() ?? 'jpg')
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const chunks: Buffer[] = []
  for await (const chunk of file.file) {
    chunks.push(chunk)
    const total = chunks.reduce((s, c) => s + c.length, 0)
    if (total > MAX_SIZE) throw new Error('Arquivo muito grande. Máximo 5MB.')
  }
  const rawBuffer = Buffer.concat(chunks)

  // Comprime e redimensiona com Sharp (exceto GIFs)
  let buffer = rawBuffer
  let mimeType = file.mimetype
  if (file.mimetype !== 'image/gif') {
    buffer = await sharp(rawBuffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    mimeType = 'image/webp'
  }

  if (isR2Configured()) {
    const client = getR2Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    }))
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${filename}`
  }

  // Fallback: armazenamento local (desenvolvimento)
  const uploadsDir = join(process.cwd(), 'uploads', folder)
  mkdirSync(uploadsDir, { recursive: true })
  const localPath = join(uploadsDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
  const { writeFileSync } = await import('fs')
  writeFileSync(localPath, buffer)

  const relativePath = localPath.replace(join(process.cwd(), 'uploads'), '/uploads')
  const host = process.env.HOST ?? 'localhost'
  const port = process.env.PORT ?? '3333'
  return `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}${relativePath}`
}

/** Faz upload de um buffer já pronto (ex.: imagem gerada pelo cardapio-service). */
export async function uploadBuffer(buffer: Buffer, folder: string, ext = 'png', mimeType = 'image/png'): Promise<string> {
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  if (isR2Configured()) {
    const client = getR2Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000',
    }))
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${filename}`
  }

  const uploadsDir = join(process.cwd(), 'uploads', folder)
  mkdirSync(uploadsDir, { recursive: true })
  const localPath = join(process.cwd(), 'uploads', filename)
  writeFileSync(localPath, buffer)

  const host = process.env.HOST ?? 'localhost'
  const port = process.env.PORT ?? '3333'
  return `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/uploads/${filename}`
}
