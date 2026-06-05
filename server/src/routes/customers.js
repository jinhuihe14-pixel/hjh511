const express = require('express');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { keyword, memberLevel } = req.query;
    const query = {};

    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword } }
      ];
    }
    if (memberLevel) query.memberLevel = memberLevel;

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: '获取顾客列表失败', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: '顾客不存在' });
    }

    const orders = await Order.find({ customer: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ customer, orders });
  } catch (error) {
    res.status(500).json({ message: '获取顾客详情失败', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, phone, wechatId, address, memberLevel } = req.body;

    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(400).json({ message: '该手机号已注册' });
    }

    const customer = new Customer({
      name,
      phone,
      wechatId,
      address,
      memberLevel: memberLevel || 'normal'
    });

    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: '创建顾客失败', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: '顾客不存在' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: '更新顾客失败', error: error.message });
  }
});

router.get('/phone/:phone', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone });
    res.json(customer || null);
  } catch (error) {
    res.status(500).json({ message: '查询顾客失败', error: error.message });
  }
});

router.get('/phone/:phone/public', async (req, res) => {
  try {
    const customer = await Customer.findOne({ phone: req.params.phone });
    if (!customer) {
      return res.status(404).json({ message: '未找到用户信息' });
    }
    res.json({
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      memberLevel: customer.memberLevel
    });
  } catch (error) {
    res.status(500).json({ message: '查询顾客失败', error: error.message });
  }
});

module.exports = router;
