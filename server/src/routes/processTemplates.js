const express = require('express');
const ProcessTemplate = require('../models/ProcessTemplate');
const { auth, requireRole } = require('../middleware/auth');
const { DEFAULT_TEMPLATES } = require('../services/processService');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { serviceCategory, isActive } = req.query;
    const query = {};
    
    if (serviceCategory) query.serviceCategory = serviceCategory;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const templates = await ProcessTemplate.find(query).sort({ serviceCategory: 1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: '获取工序模板失败', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const template = await ProcessTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: '获取工序模板失败', error: error.message });
  }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { serviceCategory, name, steps } = req.body;

    if (!serviceCategory || !name || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ message: '参数不完整' });
    }

    const existing = await ProcessTemplate.findOne({ serviceCategory });
    if (existing) {
      return res.status(400).json({ message: '该服务类型的模板已存在' });
    }

    const sortedSteps = steps.sort((a, b) => a.sortOrder - b.sortOrder);

    const template = new ProcessTemplate({
      serviceCategory,
      name,
      steps: sortedSteps,
      createdBy: req.user._id
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: '创建工序模板失败', error: error.message });
  }
});

router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, steps, isActive } = req.body;
    const template = await ProcessTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }

    if (name !== undefined) template.name = name;
    if (steps !== undefined && Array.isArray(steps)) {
      template.steps = steps.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: '更新工序模板失败', error: error.message });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const template = await ProcessTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: '模板不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除工序模板失败', error: error.message });
  }
});

module.exports = router;
