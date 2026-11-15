// Conteúdo da página Dicas (curadoria fixa, sem API).
// tipo: livro | video | podcast | curso | ferramenta
// fonte: autor, canal ou instituição. gratis: mostra o selo "Grátis".
// Links verificados com curl -sIL (nov/2026). Exceção: a Amazon responde 503/405 a robôs,
// então as buscas de livros não passam no curl, mas foram mantidas de propósito.
window.NEXUM_DICAS_ATUALIZADO = 'novembro de 2026';

window.NEXUM_DICAS = [
  // ---------- Livros (busca na Amazon) ----------
  { tipo: 'livro', titulo: 'A Psicologia Financeira', fonte: 'Morgan Housel',
    descricao: 'Mostra como o comportamento pesa mais que a técnica nas decisões com dinheiro.',
    link: 'https://www.amazon.com.br/s?k=A+Psicologia+Financeira+Morgan+Housel' },
  { tipo: 'livro', titulo: 'O Homem Mais Rico da Babilônia', fonte: 'George S. Clason',
    descricao: 'Parábolas clássicas sobre guardar parte do que se ganha e fazer o dinheiro trabalhar por você.',
    link: 'https://www.amazon.com.br/s?k=O+Homem+Mais+Rico+da+Babil%C3%B4nia+George+S.+Clason' },
  { tipo: 'livro', titulo: 'Casais Inteligentes Enriquecem Juntos', fonte: 'Gustavo Cerbasi',
    descricao: 'Ensina a organizar as finanças a dois, alinhar objetivos e evitar brigas por dinheiro.',
    link: 'https://www.amazon.com.br/s?k=Casais+Inteligentes+Enriquecem+Juntos+Gustavo+Cerbasi' },
  { tipo: 'livro', titulo: 'Me Poupe!', fonte: 'Nathalia Arcuri',
    descricao: 'Um guia direto para sair das dívidas, poupar e começar a investir sem complicação.',
    link: 'https://www.amazon.com.br/s?k=Me+Poupe%21+Nathalia+Arcuri' },
  { tipo: 'livro', titulo: 'Pai Rico, Pai Pobre', fonte: 'Robert Kiyosaki',
    descricao: 'Compara duas visões sobre dinheiro e explica a diferença entre ativos e passivos.',
    link: 'https://www.amazon.com.br/s?k=Pai+Rico%2C+Pai+Pobre+Robert+Kiyosaki' },
  { tipo: 'livro', titulo: 'O Investidor Inteligente', fonte: 'Benjamin Graham',
    descricao: 'O clássico do investimento em valor, com foco em margem de segurança e disciplina.',
    link: 'https://www.amazon.com.br/s?k=O+Investidor+Inteligente+Benjamin+Graham' },

  // ---------- Vídeos (canais no YouTube) ----------
  { tipo: 'video', titulo: 'Me Poupe!', fonte: 'YouTube · Nathalia Arcuri', gratis: true,
    descricao: 'Dicas práticas e bem-humoradas para economizar, sair das dívidas e investir melhor.',
    link: 'https://www.youtube.com/@MePoupe' },
  { tipo: 'video', titulo: 'Nath Finanças', fonte: 'YouTube · Nathália Rodrigues', gratis: true,
    descricao: 'Educação financeira acessível, pensada para quem ganha pouco e quer se organizar.',
    link: 'https://www.youtube.com/@NathFinancas' },
  { tipo: 'video', titulo: 'Gustavo Cerbasi', fonte: 'YouTube', gratis: true,
    descricao: 'Vídeos sobre planejamento financeiro pessoal, vida em família e independência financeira.',
    link: 'https://www.youtube.com/@GustavocerbasiBr' },
  { tipo: 'video', titulo: 'Economista Sincero', fonte: 'YouTube', gratis: true,
    descricao: 'Explica economia e investimentos de forma clara e sem enrolação.',
    link: 'https://www.youtube.com/@economistasincero' },
  { tipo: 'video', titulo: 'Investidor Sardinha', fonte: 'YouTube · Raul Sena', gratis: true,
    descricao: 'Análises de investimentos feitas para o pequeno investidor.',
    link: 'https://www.youtube.com/@InvestidorSardinha' },
  { tipo: 'video', titulo: 'Eitonilda', fonte: 'YouTube', gratis: true,
    descricao: 'Dicas de finanças pessoais para organizar o dinheiro no dia a dia.',
    link: 'https://www.youtube.com/@Eitonilda' },

  // ---------- Podcasts (busca no Spotify) ----------
  { tipo: 'podcast', titulo: 'PoupeCast', fonte: 'Me Poupe!', gratis: true,
    descricao: 'O podcast do Me Poupe! com conversas sobre dinheiro, consumo e investimentos.',
    link: 'https://open.spotify.com/search/PoupeCast' },
  { tipo: 'podcast', titulo: 'Os Sócios', fonte: 'Spotify', gratis: true,
    descricao: 'Conversas com empresários e especialistas sobre negócios, carreira e investimentos.',
    link: 'https://open.spotify.com/search/Os%20S%C3%B3cios' },
  { tipo: 'podcast', titulo: 'G1 Educação Financeira', fonte: 'g1', gratis: true,
    descricao: 'Episódios com orientações práticas para lidar melhor com o dinheiro.',
    link: 'https://open.spotify.com/search/G1%20Educa%C3%A7%C3%A3o%20Financeira' },
  { tipo: 'podcast', titulo: 'Pod isso, meninas?', fonte: 'CBN', gratis: true,
    descricao: 'Bate-papo sobre finanças pessoais e as dúvidas de dinheiro do dia a dia.',
    link: 'https://open.spotify.com/search/Pod%20isso%2C%20meninas' },

  // ---------- Cursos grátis ----------
  { tipo: 'curso', titulo: 'Cursos da B3', fonte: 'B3 Educação', gratis: true,
    descricao: 'Cursos online de finanças pessoais e investimentos, do básico ao avançado.',
    link: 'https://edu.b3.com.br' },
  { tipo: 'curso', titulo: 'Cidadania Financeira', fonte: 'Banco Central', gratis: true,
    descricao: 'Conteúdos do Banco Central para planejar o orçamento, usar o crédito com consciência e poupar.',
    link: 'https://www.bcb.gov.br/cidadaniafinanceira' },
  { tipo: 'curso', titulo: 'Educação Financeira Pessoal', fonte: 'Escola Virtual de Governo · 40h, com certificado', gratis: true,
    descricao: 'Curso completo sobre orçamento, crédito, consumo e investimentos, com certificado ao final.',
    link: 'https://www.escolavirtual.gov.br' },
  { tipo: 'curso', titulo: 'Portal do Investidor', fonte: 'CVM', gratis: true,
    descricao: 'Materiais da CVM para entender o mercado de capitais e se proteger de fraudes.',
    link: 'https://www.gov.br/investidor' },

  // ---------- Ferramentas oficiais ----------
  { tipo: 'ferramenta', titulo: 'Valores a Receber', fonte: 'Banco Central', gratis: true,
    descricao: 'Consulte se você tem dinheiro esquecido em bancos e outras instituições.',
    link: 'https://valoresareceber.bcb.gov.br' },
  { tipo: 'ferramenta', titulo: 'Registrato', fonte: 'Banco Central', gratis: true,
    descricao: 'Mostra os empréstimos, contas e chaves Pix registrados no seu CPF.',
    link: 'https://www.bcb.gov.br/cidadaniafinanceira/registrato' },
  { tipo: 'ferramenta', titulo: 'Tesouro Direto', fonte: 'Tesouro Nacional', gratis: true,
    descricao: 'Simule e invista em títulos públicos a partir de pequenos valores.',
    link: 'https://www.tesourodireto.com.br' },
  { tipo: 'ferramenta', titulo: 'Meu Bolso em Dia', fonte: 'Febraban', gratis: true,
    descricao: 'Avalia sua saúde financeira e sugere conteúdos para melhorar a relação com o dinheiro.',
    link: 'https://www.meubolsoemdia.com.br' }
];
