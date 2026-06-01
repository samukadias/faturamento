const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@prodesp.sp.gov.br' }
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: 'admin@prodesp.sp.gov.br',
        password: adminPassword,
        nome: 'Administrador',
        perfil: 'ADMIN',
        ativo: true
      }
    });
    console.log('Usuário admin criado com sucesso.');
  } else {
    console.log('Usuário admin já existe.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
