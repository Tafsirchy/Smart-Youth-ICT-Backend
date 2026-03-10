const express = require('express');

// Shared stub factory — generates a minimal CRUD router
function makeStubRouter(modelName) {
  const router = express.Router();
  const { protect }   = require('../middleware/auth.middleware');
  const { authorize } = require('../middleware/role.middleware');

  router.get('/',     protect, (_, res) => res.json({ success: true, data: [], message: `${modelName} list — implement me` }));
  router.post('/',    protect, authorize('admin', 'instructor'), (_, res) => res.status(201).json({ success: true, message: `${modelName} created — implement me` }));
  router.get('/:id',  protect, (req, res) => res.json({ success: true, data: { id: req.params.id }, message: `${modelName} detail — implement me` }));
  router.put('/:id',  protect, authorize('admin', 'instructor'), (_, res) => res.json({ success: true, message: `${modelName} updated — implement me` }));
  router.delete('/:id', protect, authorize('admin'), (_, res) => res.json({ success: true, message: `${modelName} deleted — implement me` }));

  return router;
}

module.exports = { makeStubRouter };
