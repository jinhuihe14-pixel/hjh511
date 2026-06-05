const express = require('express');
const moment = require('moment');
const mongoose = require('mongoose');
const SalaryConfig = require('../models/SalaryConfig');
const SalaryRecord = require('../models/SalaryRecord');
const SalaryAppeal = require('../models/SalaryAppeal');
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

const attachAppealInfoToDetails = async (record, userId) => {
  if (!record.details || record.details.length === 0) return record;

  const detailIds = record.details.map(d => d._id.toString());
  const appeals = await SalaryAppeal.find({
    salaryRecord: record._id,
    detailId: { $in: detailIds },
    user: userId
  }).sort({ createdAt: -1 });

  const detailAppealMap = {};
  for (const appeal of appeals) {
    if (!detailAppealMap[appeal.detailId]) {
      detailAppealMap[appeal.detailId] = appeal;
    }
  }

  const recordObj = record.toObject ? record.toObject() : record;
  recordObj.details = recordObj.details.map(detail => ({
    ...detail,
    _id: detail._id,
    appealStatus: detailAppealMap[detail._id.toString()]?.status || null,
    appealId: detailAppealMap[detail._id.toString()]?._id || null
  }));

  return recordObj;
};

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

    const resultRecords = [];
    for (const record of records) {
      const recordWithAppeals = await attachAppealInfoToDetails(record, record.user._id);
      resultRecords.push(recordWithAppeals);
    }

    res.json(resultRecords);
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

    const targetUserId = req.user.role === 'admin' ? record.user._id : req.user._id;
    const recordWithAppeals = await attachAppealInfoToDetails(record, targetUserId);

    const pendingAppeals = await SalaryAppeal.countDocuments({
      salaryRecord: record._id,
      status: 'pending'
    });
    recordWithAppeals.pendingAppealCount = pendingAppeals;

    res.json(recordWithAppeals);
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

      const approvedAppeals = await SalaryAppeal.find({
        salaryRecord: record._id,
        status: 'approved'
      });

      const appealAdjustmentIds = approvedAppeals.map(a => a.adjustmentId).filter(Boolean);

      const preservedAdjustments = (record.manualAdjustments || []).filter(
        adj => appealAdjustmentIds.includes(adj._id.toString())
      );

      let preservedAdjustmentTotal = 0;
      for (const adj of preservedAdjustments) {
        if (adj.type === 'bonus') {
          preservedAdjustmentTotal += adj.amount;
        } else {
          preservedAdjustmentTotal -= adj.amount;
        }
      }

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

      record.manualAdjustments = preservedAdjustments;

      record.totalSalary = 
        record.baseSalary +
        record.commission +
        record.pieceWork +
        record.repairCommission +
        record.fullAttendanceBonus -
        record.lateDeduction +
        record.otherBonuses -
        record.otherDeductions;

      record.totalSalary += preservedAdjustmentTotal;

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

    const pendingCount = await SalaryAppeal.countDocuments({
      salaryRecord: record._id,
      status: 'pending'
    });

    if (pendingCount > 0) {
      return res.status(400).json({ 
        message: '该薪资记录下存在待复核的申诉，请先处理完所有申诉后再锁定',
        pendingCount
      });
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
        details: [],
        manualAdjustments: []
      };
      return res.json(record);
    }

    const recordWithAppeals = await attachAppealInfoToDetails(record, req.user._id);
    res.json(recordWithAppeals);
  } catch (error) {
    res.status(500).json({ message: '获取薪资失败', error: error.message });
  }
});

router.post('/appeals', auth, async (req, res) => {
  try {
    const { salaryRecordId, detailId, expectedAmount, reason } = req.body;

    if (!salaryRecordId || !detailId || expectedAmount === undefined || !reason) {
      return res.status(400).json({ message: '缺少必要参数' });
    }

    const record = await SalaryRecord.findById(salaryRecordId);
    if (!record) {
      return res.status(404).json({ message: '薪资记录不存在' });
    }

    if (record.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '权限不足，只能对自己的薪资发起申诉' });
    }

    if (record.isLocked) {
      return res.status(400).json({ message: '薪资已锁定，无法发起申诉' });
    }

    const detail = record.details.id(detailId);
    if (!detail) {
      return res.status(404).json({ message: '薪资明细不存在' });
    }

    const existingPending = await SalaryAppeal.findOne({
      salaryRecord: salaryRecordId,
      detailId: detailId,
      user: req.user._id,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({ message: '该明细已有待复核的申诉，请等待处理结果' });
    }

    const appeal = new SalaryAppeal({
      salaryRecord: salaryRecordId,
      user: req.user._id,
      detailId: detailId,
      detailSnapshot: {
        orderId: detail.orderId,
        orderNo: detail.orderNo,
        originalAmount: detail.amount,
        type: detail.type,
        description: detail.description
      },
      expectedAmount,
      reason
    });

    await appeal.save();
    res.status(201).json(appeal);
  } catch (error) {
    res.status(500).json({ message: '发起申诉失败', error: error.message });
  }
});

router.get('/appeals/my', auth, async (req, res) => {
  try {
    const { status, salaryRecordId } = req.query;
    const query = { user: req.user._id };

    if (status) query.status = status;
    if (salaryRecordId) query.salaryRecord = salaryRecordId;

    const appeals = await SalaryAppeal.find(query)
      .populate('salaryRecord', 'month isLocked')
      .sort({ createdAt: -1 });

    res.json(appeals);
  } catch (error) {
    res.status(500).json({ message: '获取申诉列表失败', error: error.message });
  }
});

router.get('/appeals/:id', auth, async (req, res) => {
  try {
    const appeal = await SalaryAppeal.findById(req.params.id)
      .populate('user', 'name role')
      .populate('salaryRecord', 'month isLocked')
      .populate('reviewedBy', 'name');

    if (!appeal) {
      return res.status(404).json({ message: '申诉不存在' });
    }

    if (req.user.role !== 'admin' && appeal.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '权限不足' });
    }

    res.json(appeal);
  } catch (error) {
    res.status(500).json({ message: '获取申诉详情失败', error: error.message });
  }
});

router.get('/appeals', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status, userId, month } = req.query;
    const query = {};

    if (status) query.status = status;
    if (userId) query.user = userId;

    let appeals = await SalaryAppeal.find(query)
      .populate('user', 'name role')
      .populate('salaryRecord', 'month isLocked')
      .sort({ createdAt: -1 });

    if (month) {
      appeals = appeals.filter(a => a.salaryRecord?.month === month);
    }

    res.json(appeals);
  } catch (error) {
    res.status(500).json({ message: '获取申诉列表失败', error: error.message });
  }
});

router.post('/appeals/:id/approve', auth, requireRole('admin'), async (req, res) => {
  try {
    const appeal = await SalaryAppeal.findById(req.params.id);

    if (!appeal) {
      return res.status(404).json({ message: '申诉不存在' });
    }

    if (appeal.status !== 'pending') {
      return res.status(400).json({ message: '该申诉已处理，不能重复操作' });
    }

    const record = await SalaryRecord.findById(appeal.salaryRecord);
    if (!record) {
      return res.status(404).json({ message: '薪资记录不存在' });
    }

    if (record.isLocked) {
      return res.status(400).json({ message: '薪资已锁定，无法处理申诉' });
    }

    const diffAmount = appeal.expectedAmount - appeal.detailSnapshot.originalAmount;

    const adjustment = {
      amount: Math.abs(diffAmount),
      type: diffAmount >= 0 ? 'bonus' : 'deduction',
      reason: `申诉通过调整：${appeal.reason}（原金额：${appeal.detailSnapshot.originalAmount}，期望金额：${appeal.expectedAmount}）`,
      createdBy: req.user._id
    };

    record.manualAdjustments.push(adjustment);
    const savedAdjustment = record.manualAdjustments[record.manualAdjustments.length - 1];

    if (diffAmount >= 0) {
      record.otherBonuses += adjustment.amount;
      record.totalSalary += adjustment.amount;
    } else {
      record.otherDeductions += adjustment.amount;
      record.totalSalary -= adjustment.amount;
    }

    await record.save();

    appeal.status = 'approved';
    appeal.reviewedBy = req.user._id;
    appeal.reviewedAt = new Date();
    appeal.adjustmentId = savedAdjustment._id.toString();

    await appeal.save();

    const result = await SalaryAppeal.findById(appeal._id)
      .populate('user', 'name role')
      .populate('reviewedBy', 'name');

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '审核通过失败', error: error.message });
  }
});

router.post('/appeals/:id/reject', auth, requireRole('admin'), async (req, res) => {
  try {
    const { rejectReason } = req.body;

    if (!rejectReason) {
      return res.status(400).json({ message: '请填写驳回说明' });
    }

    const appeal = await SalaryAppeal.findById(req.params.id);

    if (!appeal) {
      return res.status(404).json({ message: '申诉不存在' });
    }

    if (appeal.status !== 'pending') {
      return res.status(400).json({ message: '该申诉已处理，不能重复操作' });
    }

    const record = await SalaryRecord.findById(appeal.salaryRecord);
    if (record && record.isLocked) {
      return res.status(400).json({ message: '薪资已锁定，无法处理申诉' });
    }

    appeal.status = 'rejected';
    appeal.reviewedBy = req.user._id;
    appeal.reviewedAt = new Date();
    appeal.rejectReason = rejectReason;

    await appeal.save();

    const result = await SalaryAppeal.findById(appeal._id)
      .populate('user', 'name role')
      .populate('reviewedBy', 'name');

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '驳回申诉失败', error: error.message });
  }
});

module.exports = router;
