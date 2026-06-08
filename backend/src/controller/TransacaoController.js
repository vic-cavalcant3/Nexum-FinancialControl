class TransacaoController {
    async criar(req, res) {
      try {
        const { tipo, descricao, valor, data, categoria_id } = req.body;
        const transacao = await req.prisma.transacao.create({
          data: {
            usuario_id: req.usuario_id,
            tipo, descricao, valor,
            data: new Date(data),
            categoria_id: categoria_id || null
          }
        });
        res.status(201).json(transacao);
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async listar(req, res) {
      try {
        const { mes, ano, tipo, categoria_id } = req.query;
        const where = { usuario_id: req.usuario_id };
        if (mes && ano) {
          const inicio = new Date(ano, mes - 1, 1);
          const fim = new Date(ano, mes, 0, 23, 59, 59);
          where.data = { gte: inicio, lte: fim };
        }
        if (tipo) where.tipo = tipo;
        if (categoria_id) where.categoria_id = parseInt(categoria_id);
        const transacoes = await req.prisma.transacao.findMany({
          where,
          include: { categoria: true },
          orderBy: { data: 'desc' }
        });
        res.json(transacoes);
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async resumoMensal(req, res) {
      try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();
        const inicio = new Date(anoAtual, mesAtual - 1, 1);
        const fim = new Date(anoAtual, mesAtual, 0, 23, 59, 59);
        const transacoes = await req.prisma.transacao.findMany({
          where: { usuario_id: req.usuario_id, data: { gte: inicio, lte: fim } }
        });
        const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
        const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);
        res.json({ receitas, despesas, saldo: receitas - despesas });
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async relatorio(req, res) {
      try {
        const transacoes = await req.prisma.transacao.findMany({
          where: { usuario_id: req.usuario_id },
          include: { categoria: true },
          orderBy: { data: 'asc' }
        });
        res.json(transacoes);
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async atualizar(req, res) {
      try {
        const { id } = req.params;
        const transacao = await req.prisma.transacao.update({
          where: { id_transacao: parseInt(id), usuario_id: req.usuario_id },
          data: req.body
        });
        res.json(transacao);
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async deletar(req, res) {
      try {
        const { id } = req.params;
        await req.prisma.transacao.delete({
          where: { id_transacao: parseInt(id), usuario_id: req.usuario_id }
        });
        res.json({ mensagem: 'Transação removida.' });
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  }
  module.exports = new TransacaoController();