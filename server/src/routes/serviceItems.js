const express = require('express');
const ServiceItem = require('../models/ServiceItem');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { isActive, category } = req.query;
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }
    if (category) {
      query.category = category;
    }

    const items = await ServiceItem.find(query).sort({ sortOrder: 1, createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: '获取服务项目失败', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await ServiceItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: '服务项目不存在' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: '获取服务项目失败', error: error.message });
  }
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, category, price, commissionRate, pieceRate, description, sortOrder } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ message: '名称、分类、单价为必填项' });
    }

    const validCategories = ['cleaning', 'repair', 'renew', 'luxury'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: '无效的服务分类' });
    }

    const item = new ServiceItem({
      name,
      category,
      price,
      commissionRate: commissionRate ?? 0,
      pieceRate: pieceRate ?? 0,
      description,
      sortOrder: sortOrder ?? 0,
      isActive: true
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: '创建服务项目失败', error: error.message });
  }
});

router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const { name, category, price, commissionRate, pieceRate, description, sortOrder } = req.body;

    const item = await ServiceItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: '服务项目不存在' });
    }

    if (category) {
      const validCategories = ['cleaning', 'repair', 'renew', 'luxury'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: '无效的服务分类' });
      }
    }

    if (name !== undefined) item.name = name;
    if (category !== undefined) item.category = category;
    if (price !== undefined) item.price = price;
    if (commissionRate !== undefined) item.commissionRate = commissionRate;
    if (pieceRate !== undefined) item.pieceRate = pieceRate;
    if (description !== undefined) item.description = description;
    if (sortOrder !== undefined) item.sortOrder = sortOrder;

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: '更新服务项目失败', error: error.message });
  }
});

router.patch('/:id/toggle', auth, requireRole('admin'), async (req, res) => {
  try {
    const item = await ServiceItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: '服务项目不存在' });
    }

    item.isActive = !item.isActive;
    await item.save();

    res.json({ message: item.isActive ? '已启用' : '已停用', item });
  } catch (error) {
    res.status(500).json({ message: '操作失败', error: error.message });
  }
});

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const item = await ServiceItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: '服务项目不存在' });
    }

    await ServiceItem.findByIdAndDelete(req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除失败', error: error.message });
  }
});

module.exports = router;
