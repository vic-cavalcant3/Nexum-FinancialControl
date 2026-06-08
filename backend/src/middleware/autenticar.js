function autenticar(req, res, next) {
    const usuarioId = req.headers['x-user-id'];
    if (!usuarioId) {
      return res.status(401).json({ erro: 'usuario_id não fornecido no header "x-user-id".' });
    }
    req.usuario_id = parseInt(usuarioId);
    next();
  }
  module.exports = autenticar;