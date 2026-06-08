const router = require('express').Router();
const TransacaoController = require('../controller/TransacaoController');
const autenticar = require('../middleware/autenticar');

router.use(autenticar);
router.post('/', TransacaoController.criar.bind(TransacaoController));
router.get('/', TransacaoController.listar.bind(TransacaoController));
router.get('/resumo', TransacaoController.resumoMensal.bind(TransacaoController));
router.get('/relatorio', TransacaoController.relatorio.bind(TransacaoController));
router.put('/:id', TransacaoController.atualizar.bind(TransacaoController));
router.delete('/:id', TransacaoController.deletar.bind(TransacaoController));

module.exports = router;