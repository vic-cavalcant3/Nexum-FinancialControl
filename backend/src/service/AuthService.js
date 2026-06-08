const bcrypt = require('bcryptjs');

class AuthService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async registrar({ nome, email, senha }) {
    const existe = await this.prisma.usuario.findUnique({ where: { email } });
    if (existe) throw new Error('E-mail já cadastrado.');
    const senha_hash = await bcrypt.hash(senha, 10);
    const usuario = await this.prisma.usuario.create({
      data: { nome, email, senha_hash }
    });
    return { usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email } };
  }

  async login({ email, senha }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario) throw new Error('Credenciais inválidas.');
    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) throw new Error('Credenciais inválidas.');
    return { usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email } };
  }

  async atualizarPerfil(id, { nome, email }) {
    const usuario = await this.prisma.usuario.update({
      where: { id_usuario: id },
      data: { nome, email }
    });
    return { id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email };
  }

  async trocarSenha(id, { senha_atual, nova_senha }) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!usuario) throw new Error('Usuário não encontrado.');
    const ok = await bcrypt.compare(senha_atual, usuario.senha_hash);
    if (!ok) throw new Error('Senha atual incorreta.');
    const senha_hash = await bcrypt.hash(nova_senha, 10);
    await this.prisma.usuario.update({ where: { id_usuario: id }, data: { senha_hash } });
  }
}
module.exports = AuthService;