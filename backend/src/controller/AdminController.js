class AdminController {
  async verificarSenha(req, res) {
    try {
      const { senha } = req.body;
      const senhaCorreta = process.env.ADMIN_PASSWORD;

      if (!senhaCorreta) {
        return res.status(500).json({ erro: 'ADMIN_PASSWORD não configurada no servidor.' });
      }
      if (senha !== senhaCorreta) {
        return res.status(401).json({ erro: 'Senha incorreta.' });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }

  async listarUsuarios(req, res) {
    try {
      const usuarios = await req.prisma.usuario.findMany({
        select: {
          id_usuario: true,
          nome: true,
          email: true,
          telefone: true,
          ativo: true,
          criado_em: true,
          _count: {
            select: { transacoes: true, metas: true }
          }
        },
        orderBy: { criado_em: 'desc' }
      });
      res.json(usuarios);
    } catch (err) {
      res.status(400).json({ erro: err.message });
    }
  }

  async deletarUsuario(req, res) {
    try {
      const { id } = req.params;
      const usuarioId = parseInt(id);

      if (usuarioId === req.usuario_id) {
        return res.status(400).json({ erro: 'Você não pode apagar sua própria conta de admin por aqui.' });
      }

      await req.prisma.usuario.delete({
        where: { id_usuario: usuarioId }
      });
      res.json({ mensagem: 'Usuário removido com sucesso.' });
    } catch (err) {
      if (err.code === 'P2025') {
        return res.status(404).json({ erro: 'Usuário não encontrado.' });
      }
      res.status(400).json({ erro: err.message });
    }
  }
}
module.exports = new AdminController();
