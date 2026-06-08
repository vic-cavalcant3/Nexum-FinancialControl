const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Categorias padrão
  const categorias = [
    { nome: 'Salário', tipo: 'receita', icone: 'wallet' },
    { nome: 'Renda Extra', tipo: 'receita', icone: 'plus-circle' },
    { nome: 'Alimentação', tipo: 'despesa', icone: 'utensils' },
    { nome: 'Transporte', tipo: 'despesa', icone: 'car' },
    { nome: 'Moradia', tipo: 'despesa', icone: 'house' },
    { nome: 'Saúde', tipo: 'despesa', icone: 'heart-pulse' },
    { nome: 'Lazer', tipo: 'despesa', icone: 'clapperboard' },
    { nome: 'Educação', tipo: 'despesa', icone: 'book-open' },
    { nome: 'Assinaturas', tipo: 'despesa', icone: 'repeat' },
    { nome: 'Investimentos', tipo: 'receita', icone: 'trending-up' },
    { nome: 'Outros', tipo: 'despesa', icone: 'more-horizontal' },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { usuario_id_nome_tipo: { usuario_id: null, nome: cat.nome, tipo: cat.tipo } },
      update: {},
      create: { usuario_id: null, ...cat }
    });
  }

  console.log('Categorias criadas com sucesso!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());