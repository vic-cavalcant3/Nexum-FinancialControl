const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.categoria.deleteMany({ where: { usuario_id: null } })
  .then(r => {
    console.log('Removidas:', r.count);
    return p.$disconnect();
  });