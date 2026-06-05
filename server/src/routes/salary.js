const express = require('express');
const moment = require('moment');
const SalaryConfig = require('../models/SalaryConfig');
const SalaryRecord = require('../models/SalaryRecord');
const User = require('../models/User');
const Order = require('../models/Order');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/configs', auth, requireRole('admin'), async (req, res) => {
  try {
    const configs = await SalaryConfig.find({ isActive: true });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: '获取薪资配置失败', error: error.message });
  }
});

router.post('/configs', auth, requireRole('admin'), async (req, res) => {
  try {
    const { role, baseSalary, commissionRate, pieceRate, fullAttendanceBonus, lateDeduction, effectiveMonth } = req.body;

    await SalaryConfig.updateMany(
      { role, isActive: true },
      { isActive: false }
    );

    const config = new SalaryConfig({
      role,
      baseSalary,
      commissionRate,
      pieceRate,
      fullAttendanceBonus,
      lateDeduction,
      effectiveMonth,
      createdBy: req.user._id
    });

    await config.save();
    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ message: '保存薪资配置失败', error: error.message });
  }
});

router.get('/records', auth, async (req, res) => {
  try {
    const { month, userId } = req.query;
    const query = {};

    if (month) query.month = month;
    if (req.user.role === 'admin') {
      if (userId) query.user = userId;
    } else {
      query.user = req.user._id;
    }

    const records = await SalaryRecord.find(query)
      .populate('user', 'name role')
      .sort({ month: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: '获取薪资记录失败', error: error.message });
  }
});

router.get('/records/:id', auth, async (req, res) => {
  try {
    const record = await SalaryRecord.findById(req.params.id)
      .populate('user', 'name role phone')
      .populate('manualAdjustments.createdBy', 'name');

    if (!record) {
      return res.status(404).json({ message: '薪资记录不存在' });
    }

    if (req.user.role !== 'admin' && record.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '权限不足' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '获取薪资详情失败', error: error.message });
  }
});

router.post('/calculate', auth, requireRole('admin'), async (req, res) => {
  try {
    const { month } = req.body;
    const targetMonth = month || moment().format('YYYY-MM');
    
    const startDate = moment(targetMonth).startOf('month').toDate();
    const endDate = moment(targetMonth).endOf('month').toDate();

    const users = await User.find({ status: 'active', role: { $in: ['receptionist', 'technician', 'repairer'] } });

    for (const user of users) {
      const config = await SalaryConfig.findOne({ 
        role: user.role, 
        isActive: true,
        effectiveMonth: { $lte: targetMonth }
      }).sort({ effectiveMonth: -1 });

      if (!config) continue;

      let record = await SalaryRecord.findOne({ user: user._id, month: targetMonth });
      if (!record) {
        record = new SalaryRecord({ user: user._id, month: targetMonth });
      }

      if (record.isLocked) continue;

      record.baseSalary = config.baseSalary;
      record.fullAttendanceBonus = config.fullAttendanceBonus;
      record.details = [];
      record.orderCount = 0;
      record.pieceCount = 0;
      record.commission = 0;
      record.pieceWork = 0;
      record.repairCommission = 0;

      if (user.role === 'receptionist') {
        const orders = await Order.find({
          receptionist: user._id,
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' }
        });

        record.orderCount = orders.length;
        
        for (const order of orders) {
          const commission = order.actualAmount * (config.commissionRate / 100);
          record.commission += commission;
          record.details.push({
            orderId: order._id,
            orderNo: order.orderNo,
            amount: commission,
            type: 'commission',
            description: `订单提成 ${order.actualAmount} × ${config.commissionRate}%`
          });
        }
      }

      if (user.role === 'technician') {
        const orders = await Order.find({
          technician: user._id,
          updatedAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        });

        for (const order of orders) {
          for (const shoe of order.shoes) {
            for (const service of shoe.services) {
              if (service.type === 'cleaning') {
                const piecePay = config.pieceRate || service.pieceRate || 0;
                record.pieceWork += piecePay;
                record.pieceCount++;
                record.details.push({
                  orderId: order._id,
                  orderNo: order.orderNo,
                  amount: piecePay,
                  type: 'piece',
                  description: `${shoe.shoeBrand} ${service.name} 计件`
                });
              }
            }
          }
        }
      }

      if (user.role === 'repairer') {
        const orders = await Order.find({
          repairer: user._id,
          updatedAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        });

        for (const order of orders) {
          for (const shoe of order.shoes) {
            for (const service of shoe.services) {
              if (['repair', 'renew', 'luxury'].includes(service.type)) {
                const commission = service.price * ((config.commissionRate || service.commissionRate) / 100);
                record.repairCommission += commission;
                record.details.push({
                  orderId: order._id,
                  orderNo: order.orderNo,
                  amount: commission,
                  type: 'repair',
                  description: `${service.name} 提成 ${service.price} × ${config.commissionRate}%`
                });
              }
            }
          }
        }
      }

      record.totalSalary = 
        record.baseSalary +
        record.commission +
        record.pieceWork +
        record.repairCommission +
        record.fullAttendanceBonus -
        record.lateDeduction +
        record.otherBonuses -
        record.otherDeductions;

      for (const adj of record.manualAdjustments) {
        if (adj.type === 'bonus') {
          record.totalSalary += adj.amount;
        } else {
          record.totalSalary -= adj.amount;
        }
      }

      await record.save();
    }

    const records = await SalaryRecord.find({ month: targetMonth })
      .populate('user', 'name role');

    res.json({ message: '薪资计算完成', records });
  } catch (error) {
    res.status(500).json({ message: '计算薪资失败', error: error.message });
  }
});

router.post('/records/:id/adjustment', auth, requireRole('admin'), async (req, res) => {
  try {
    const { amount, type, reason } = req.body;
    const record = await SalaryRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: '薪资记录不存在' });
    }

    if (record.isLocked) {
      return res.status(400).json({ message: '薪资已锁定，无法调整' });
    }

    record.manualAdjustments.push({
      amount,
      type,
      reason,
      createdBy: req.user._id
    });

    if (type === 'bonus') {
      record.otherBonuses += amount;
      record.totalSalary += amount;
    } else {
      record.otherDeductions += amount;
      record.totalSalary -= amount;
    }

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '调整薪资失败', error: error.message });
  }
});

router.post('/records/:id/lock', auth, requireRole('admin'), async (req, res) => {
  try {
    const record = await SalaryRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: '薪资记录不存在' });
    }

    record.isLocked = true;
    record.lockedBy = req.user._id;
    record.lockedAt = new Date();

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '锁定薪资失败', error: error.message });
  }
});

router.get('/my-salary', auth, async (req, res) => {
  try {
    const currentMonth = moment().format('YYYY-MM');
    
    let record = await SalaryRecord.findOne({ 
      user: req.user._id, 
      month: currentMonth 
    });

    if (!record) {
      record = {
        month: currentMonth,
        baseSalary: 0,
        commission: 0,
        pieceWork: 0,
        repairCommission: 0,
        fullAttendanceBonus: 0,
        lateDeduction: 0,
        otherBonuses: 0,
        otherDeductions: 0,
        totalSalary: 0,
        orderCount: 0,
        pieceCount: 0,
        isLocked: false,
        details: []
      };
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '获取薪资失败', error: error.message });
  }
});

module.exports = router;
