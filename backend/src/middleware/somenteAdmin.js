// Restringe o acesso às rotas de administração.
// Autoriza somente e-mails listados na variável de ambiente ADMIN_EMAILS
// (separados por vírgula), ex: ADMIN_EMAILS=victorrocha0223@gmail.com
async function somenteAdmin(req, res, next) {
  try {
    if (!req.usuario_id) {
      return res.status(401).json({ erro: 'usuario_id não fornecido no header "x-user-id".' });
    }

    const usuario = await req.prisma.usuario.findUnique({
      where: { id_usuario: req.usuario_id }
    });

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não encontrado.' });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    if (!adminEmails.includes(usuario.email.toLowerCase())) {
      return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
    }

    req.admin = usuario;
    next();
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao validar permissão de administrador.' });
  }
}

module.exports = somenteAdmin;
