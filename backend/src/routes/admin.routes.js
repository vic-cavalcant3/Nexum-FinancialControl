const router = require('express').Router();
const AdminController = require('../controller/AdminController');
const autenticar = require('../middleware/autenticar');
const somenteAdmin = require('../middleware/somenteAdmin');

router.post('/verificar-senha', autenticar, somenteAdmin, AdminController.verificarSenha.bind(AdminController));
router.get('/usuarios', autenticar, somenteAdmin, AdminController.listarUsuarios.bind(AdminController));
router.delete('/usuarios/:id', autenticar, somenteAdmin, AdminController.deletarUsuario.bind(AdminController));

module.exports = router;
