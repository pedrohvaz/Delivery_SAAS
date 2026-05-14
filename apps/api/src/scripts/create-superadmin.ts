import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const name = process.env.ADMIN_NAME ?? 'Pedro Vaz'
  const email = process.env.ADMIN_EMAIL ?? 'pedrohvaz85@gmail.com'
  const password = process.env.ADMIN_PASSWORD ?? 'Padrao01'

  const existing = await prisma.superAdmin.findUnique({ where: { email } })
  if (existing) {
    console.log(`✅ Superadmin já existe: ${email}`)
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const admin = await prisma.superAdmin.create({
    data: { name, email, password: hashed, isActive: true },
  })

  console.log(`✅ Superadmin criado com sucesso!`)
  console.log(`   ID: ${admin.id}`)
  console.log(`   Email: ${admin.email}`)
}

main()
  .catch((e) => { console.error('❌ Erro:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
