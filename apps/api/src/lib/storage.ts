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

/** Base pública para servir uploads locais (quando R2 não está configurado). */
function publicUploadsBase(): string {
  const base = process.env.UPLOADS_PUBLIC_URL || `http://localhost:${process.env.PORT ?? '3333'}`
  return base.replace(/\/$/, '')
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

  // GIF é mantido como está; o resto é convertido para WebP.
  const isGif = file.mimetype === 'image/gif'
  const ext = isGif ? 'gif' : 'webp'

  const chunks: Buffer[] = []
  for await (const chunk of file.file) {
    chunks.push(chunk)
    const total = chunks.reduce((s, c) => s + c.length, 0)
    if (total > MAX_SIZE) throw new Error('Arquivo muito grande. Máximo 5MB.')
  }
  const rawBuffer = Buffer.concat(chunks)

  // Comprime e redimensiona com Sharp (exceto GIFs)
  let buffer = rawBuffer
  if (!isGif) {
    buffer = await sharp(rawBuffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  }
  const contentType = isGif ? 'image/gif' : 'image/webp'
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  if (isR2Configured()) {
    const client = getR2Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    }))
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
  }

  // Fallback: armazenamento local (servido por @fastify/static em /uploads/)
  mkdirSync(join(process.cwd(), 'uploads', folder), { recursive: true })
  writeFileSync(join(process.cwd(), 'uploads', key), buffer)
  return `${publicUploadsBase()}/uploads/${key}`
}

/** Faz upload de um buffer já pronto (ex.: imagem gerada pelo cardapio-service). */
export async function uploadBuffer(buffer: Buffer, folder: string, ext = 'png', mimeType = 'image/png'): Promise<string> {
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  if (isR2Configured()) {
    const client = getR2Client()
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000',
    }))
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
  }

  mkdirSync(join(process.cwd(), 'uploads', folder), { recursive: true })
  writeFileSync(join(process.cwd(), 'uploads', key), buffer)
  return `${publicUploadsBase()}/uploads/${key}`
}
