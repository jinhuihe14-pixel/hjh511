const express = require('express');
const moment = require('moment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const ServiceItem = require('../models/ServiceItem');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

const generateOrderNo = () => {
  const date = moment().format('YYYYMMDD');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SC${date}${random}`;
};

const generatePickupCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.get('/', auth, async (req, res) => {
  try {
    const { status, startDate, endDate, keyword, technician, receptionist } = req.query;
    const query = {};

    if (status) query.status = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (technician) query.technician = technician;
    if (receptionist) query.receptionist = receptionist;

    let customerIds = [];
    if (keyword) {
      const customers = await Customer.find({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { phone: { $regex: keyword } }
        ]
      });
      customerIds = customers.map(c => c._id);
    }

    if (keyword) {
      query.$or = [
        { orderNo: { $regex: keyword, $options: 'i' } },
        { pickupCode: keyword },
        ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : [])
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('receptionist', 'name')
      .populate('technician', 'name')
      .populate('repairer', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: '获取订单列表失败', error: error.message });
  }
});

router.get('/my-orders', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (req.user.role === 'receptionist') {
      query.receptionist = req.user._id;
    } else if (req.user.role === 'technician') {
      query.technician = req.user._id;
    } else if (req.user.role === 'repairer') {
      query.repairer = req.user._id;
    }

    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('receptionist', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: '获取订单失败', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone wechatId')
      .populate('receptionist', 'name')
      .populate('technician', 'name')
      .populate('repairer', 'name');

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '获取订单详情失败', error: error.message });
  }
});

router.post('/', auth, requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    const { customer, shoes, totalAmount, actualAmount, deposit, notes, estimatedDelivery } = req.body;

    let customerDoc = await Customer.findOne({ phone: customer.phone });
    if (!customerDoc) {
      customerDoc = new Customer({
        name: customer.name,
        phone: customer.phone,
        wechatId: customer.wechatId,
        address: customer.address
      });
      await customerDoc.save();
    }

    const order = new Order({
      orderNo: generateOrderNo(),
      pickupCode: generatePickupCode(),
      customer: customerDoc._id,
      shoes,
      totalAmount,
      actualAmount,
      deposit: deposit || 0,
      receptionist: req.user._id,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
      notes
    });

    await order.save();
    await order.populate('customer', 'name phone');

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: '创建订单失败', error: error.message });
  }
});

router.put('/:id/assign', auth, requireRole('admin'), async (req, res) => {
  try {
    const { technician, repairer } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    order.technician = technician || order.technician;
    order.repairer = repairer || order.repairer;
    order.status = 'assigned';

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '分派订单失败', error: error.message });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const allowedStatuses = {
      admin: ['pending', 'assigned', 'processing', 'completed', 'picked_up', 'cancelled'],
      receptionist: ['picked_up'],
      technician: ['processing', 'completed'],
      repairer: ['processing', 'completed']
    };

    if (!allowedStatuses[req.user.role]?.includes(status)) {
      return res.status(403).json({ message: '无权修改为此状态' });
    }

    if (status === 'picked_up') {
      order.pickedUpAt = new Date();
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '更新订单状态失败', error: error.message });
  }
});

router.get('/pickup/:code', async (req, res) => {
  try {
    const order = await Order.findOne({ pickupCode: req.params.code })
      .populate('customer', 'name phone');

    if (!order) {
      return res.status(404).json({ message: '取鞋码无效' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: '查询订单失败', error: error.message });
  }
});

router.get('/my-tasks', auth, requireRole('technician', 'repairer'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (req.user.role === 'technician') {
      query.technician = req.user._id;
    } else if (req.user.role === 'repairer') {
      query.repairer = req.user._id;
    }

    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('receptionist', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: '获取任务失败', error: error.message });
  }
});

router.get('/customer/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    const { status } = req.query;

    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.json([]);
    }

    const query = { customer: customer._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: '获取顾客订单失败', error: error.message });
  }
});

module.exports = router;
