import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.js';

const router = express.Router();

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
router.get('/swagger.json', (req, res) => res.json(swaggerDocument));

export default router;