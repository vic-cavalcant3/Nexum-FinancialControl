const router = require('express').Router();
const MetaController = require('../controller/MetaController');
const autenticar = require('../middleware/autenticar');

router.use(autenticar);
router.get('/', MetaController.listar.bind(MetaController));
router.post('/', MetaController.criar.bind(MetaController));
router.put('/:id', MetaController.atualizar.bind(MetaController));
router.delete('/:id', MetaController.deletar.bind(MetaController));

module.exports = router;
