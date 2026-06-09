const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categorias = [
    { nome: 'Alimentação', tipo: 'despesa', icone: 'utensils' },
    { nome: 'Transporte',  tipo: 'despesa', icone: 'car' },
    { nome: 'Salário',     tipo: 'receita', icone: 'wallet' },
  ];

  for (const cat of categorias) {
    const existe = await prisma.categoria.findFirst({
      where: { usuario_id: null, nome: cat.nome, tipo: cat.tipo }
    });
    if (!existe) {
      await prisma.categoria.create({
        data: { usuario_id: null, ...cat }
      });
    }
  }

  console.log('Categorias criadas com sucesso!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());