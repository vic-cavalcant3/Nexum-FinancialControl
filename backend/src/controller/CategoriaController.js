class CategoriaController {
    async listar(req, res) {
      try {
        const categorias = await req.prisma.categoria.findMany({
          where: {
            OR: [
              { usuario_id: req.usuario_id },
              { usuario_id: null }
            ]
          },
          orderBy: { nome: 'asc' }
        });
        res.json(categorias);
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async criar(req, res) {
      try {
        const { nome, tipo, icone } = req.body;
        const categoria = await req.prisma.categoria.create({
          data: { usuario_id: req.usuario_id, nome, tipo, icone }
        });
        res.status(201).json(categoria);
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  
    async deletar(req, res) {
      try {
        const { id } = req.params;
        await req.prisma.categoria.delete({
          where: { id: parseInt(id), usuario_id: req.usuario_id }
        });
        res.json({ mensagem: 'Categoria removida.' });
      } catch (err) {
        res.status(400).json({ erro: err.message });
      }
    }
  }
  module.exports = new CategoriaController();