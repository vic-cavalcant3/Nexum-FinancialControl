class MetaController {
  async listar(req, res) {
    try {
      const metas = await req.prisma.metaFinanceira.findMany({
        where: { id_usuario: req.usuario_id },
        orderBy: { data_prazo: 'asc' }
      });
      res.json(metas);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }

  async criar(req, res) {
    try {
      const { descricao, valor_alvo, valor_atual, aporte_mensal, data_inicio, data_prazo } = req.body;
      const meta = await req.prisma.metaFinanceira.create({
        data: {
          id_usuario: req.usuario_id,
          descricao,
          valor_alvo: parseFloat(valor_alvo),
          valor_atual: parseFloat(valor_atual || 0),
          aporte_mensal: parseFloat(aporte_mensal || 0),
          data_inicio: new Date(data_inicio || new Date()),
          data_prazo: new Date(data_prazo),
          status_meta: 'em_andamento'
        }
      });
      res.status(201).json(meta);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const meta = await req.prisma.metaFinanceira.update({
        where: { id_meta: parseInt(id), id_usuario: req.usuario_id },
        data: req.body
      });
      res.json(meta);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }

  async deletar(req, res) {
    try {
      const { id } = req.params;
      await req.prisma.metaFinanceira.delete({
        where: { id_meta: parseInt(id), id_usuario: req.usuario_id }
      });
      res.json({ mensagem: 'Meta removida.' });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }
}
module.exports = new MetaController();
