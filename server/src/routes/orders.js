const express = require('express');
const moment = require('moment');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const ServiceItem = require('../models/ServiceItem');
const ProcessTemplate = require('../models/ProcessTemplate');
const { auth, requireRole } = require('../middleware/auth');
const { generateProcessesForShoe, updateOrderStatusFromProcesses, recalculateShoeOverallStatus, getCurrentProcessIndex } = require('../services/processService');
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
    const { status, startDate, endDate, keyword, technician, receptionist, repairer } = req.query;
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
    if (repairer) query.repairer = repairer;

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
    } else if (req.user.role === 'inspector') {
      query.status = { $in: ['processing', 'assigned'] };
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
      .populate('repairer', 'name')
      .populate('shoes.processes.claimedBy', 'name')
      .populate('shoes.processes.assignee', 'name');

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

    const shoesWithProcesses = [];
    for (const shoe of shoes) {
      const processes = await generateProcessesForShoe(shoe);
      shoesWithProcesses.push({
        ...shoe,
        processes,
        totalReworkCount: 0,
        currentProcessIndex: 0,
        overallStatus: 'pending'
      });
    }

    const order = new Order({
      orderNo: generateOrderNo(),
      pickupCode: generatePickupCode(),
      customer: customerDoc._id,
      shoes: shoesWithProcesses,
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
    
    if (order.status === 'pending') {
      order.status = 'assigned';
    }

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
      repairer: ['processing', 'completed'],
      inspector: ['processing', 'completed']
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

router.get('/my-tasks', auth, requireRole('technician', 'repairer', 'inspector', 'receptionist'), async (req, res) => {
  try {
    const { status, processKey } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    let matchConditions = [];

    if (userRole === 'technician') {
      matchConditions.push({ 'shoes.processes.role': 'technician' });
    } else if (userRole === 'repairer') {
      matchConditions.push({ 'shoes.processes.role': 'repairer' });
    } else if (userRole === 'inspector') {
      matchConditions.push({ 'shoes.processes.role': 'inspector' });
    } else if (userRole === 'receptionist') {
      matchConditions.push({ 'shoes.processes.role': 'receptionist' });
    }

    if (processKey) {
      matchConditions.push({ 'shoes.processes.key': processKey });
    }

    if (status) {
      matchConditions.push({ 'shoes.processes.status': status });
    }

    const orders = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'picked_up'] } } },
      { $unwind: '$shoes' },
      { $unwind: '$shoes.processes' },
      { $match: { $and: matchConditions } },
      {
        $group: {
          _id: '$_id',
          orderNo: { $first: '$orderNo' },
          pickupCode: { $first: '$pickupCode' },
          status: { $first: '$status' },
          customer: { $first: '$customer' },
          receptionist: { $first: '$receptionist' },
          createdAt: { $first: '$createdAt' },
          estimatedDelivery: { $first: '$estimatedDelivery' },
          shoes: { $push: '$shoes' }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    await Order.populate(orders, [
      { path: 'customer', select: 'name phone' },
      { path: 'receptionist', select: 'name' }
    ]);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: '获取任务失败', error: error.message });
  }
});

router.get('/my-process-tasks', auth, requireRole('technician', 'repairer', 'inspector', 'receptionist'), async (req, res) => {
  try {
    const { status } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id.toString();

    const orders = await Order.find({
      status: { $nin: ['cancelled', 'picked_up', 'completed'] }
    })
      .populate('customer', 'name phone')
      .populate('receptionist', 'name')
      .sort({ createdAt: -1 });

    const processTasks = [];

    for (const order of orders) {
      for (let shoeIndex = 0; shoeIndex < order.shoes.length; shoeIndex++) {
        const shoe = order.shoes[shoeIndex];
        const currentIdx = getCurrentProcessIndex(shoe);
        const currentProcess = shoe.processes[currentIdx];

        if (!currentProcess) continue;

        if (currentProcess.role !== userRole) continue;

        if (status && currentProcess.status !== status) continue;

        const prevProcess = currentIdx > 0 ? shoe.processes[currentIdx - 1] : null;
        const canStart = !prevProcess || prevProcess.status === 'completed';

        const isClaimedByMe = currentProcess.claimedBy?.toString() === userId;
        const isUnclaimed = !currentProcess.claimedBy;

        if (status === 'pending' && !canStart) continue;
        if (status === 'in_progress' && !isClaimedByMe) continue;

        processTasks.push({
          orderId: order._id,
          orderNo: order.orderNo,
          pickupCode: order.pickupCode,
          customer: order.customer,
          shoeIndex,
          shoeInfo: {
            shoeType: shoe.shoeType,
            shoeBrand: shoe.shoeBrand,
            shoeColor: shoe.shoeColor,
            services: shoe.services
          },
          processKey: currentProcess.key,
          processName: currentProcess.name,
          processStatus: currentProcess.status,
          processRole: currentProcess.role,
          sortOrder: currentProcess.sortOrder,
          canStart,
          isClaimedByMe,
          isUnclaimed,
          claimedBy: currentProcess.claimedBy,
          claimedAt: currentProcess.claimedAt,
          startedAt: currentProcess.startedAt,
          completedAt: currentProcess.completedAt,
          reworkCount: currentProcess.reworkCount,
          totalReworkCount: shoe.totalReworkCount,
          estimatedDelivery: order.estimatedDelivery,
          createdAt: order.createdAt,
          isOverdueWarning: isProcessOverdue(shoe, currentProcess, order.estimatedDelivery)
        });
      }
    }

    processTasks.sort((a, b) => {
      const priorityMap = { pending: 0, in_progress: 1, rework: 2, completed: 3 };
      if (priorityMap[a.processStatus] !== priorityMap[b.processStatus]) {
        return priorityMap[a.processStatus] - priorityMap[b.processStatus];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    res.json(processTasks);
  } catch (error) {
    res.status(500).json({ message: '获取工序任务失败', error: error.message });
  }
});

const isProcessOverdue = (shoe, currentProcess, estimatedDelivery) => {
  if (!estimatedDelivery) return false;
  
  const remainingProcesses = shoe.processes.filter(
    (p, i) => i >= shoe.processes.indexOf(currentProcess) && p.status !== 'completed'
  );
  
  const totalEstimatedMinutes = remainingProcesses.reduce((sum, p) => sum + (p.estimatedDuration || 0), 0);
  const estimatedFinishTime = new Date(Date.now() + totalEstimatedMinutes * 60 * 1000);
  
  return estimatedFinishTime > new Date(estimatedDelivery);
};

router.post('/:orderId/shoes/:shoeIndex/processes/:processKey/claim', auth, requireRole('technician', 'repairer', 'inspector', 'receptionist'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId, shoeIndex, processKey } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: '订单不存在' });
    }

    const shoe = order.shoes[shoeIndex];
    if (!shoe) {
      await session.abortTransaction();
      return res.status(404).json({ message: '鞋子不存在' });
    }

    const process = shoe.processes.find(p => p.key === processKey);
    if (!process) {
      await session.abortTransaction();
      return res.status(404).json({ message: '工序不存在' });
    }

    if (process.role !== userRole) {
      await session.abortTransaction();
      return res.status(403).json({ message: '无权领取该工序' });
    }

    const currentIdx = getCurrentProcessIndex(shoe);
    const currentProcess = shoe.processes[currentIdx];
    
    if (!currentProcess || currentProcess.key !== processKey) {
      await session.abortTransaction();
      return res.status(400).json({ message: '该工序不是当前待处理工序' });
    }

    if (process.status !== 'pending' && process.status !== 'rework') {
      await session.abortTransaction();
      return res.status(400).json({ message: '该工序状态不允许领取' });
    }

    if (process.claimedBy) {
      if (process.claimedBy.toString() === userId.toString()) {
        await session.abortTransaction();
        return res.status(400).json({ message: '您已领取该工序' });
      }
      await session.abortTransaction();
      return res.status(409).json({ message: '该工序已被其他人领取' });
    }

    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) {
      const prevProcess = shoe.processes[prevIdx];
      if (prevProcess.status !== 'completed') {
        await session.abortTransaction();
        return res.status(400).json({ message: '前置工序未完成，无法领取' });
      }
    }

    process.claimedBy = userId;
    process.claimedAt = new Date();
    process.status = 'pending';

    if (order.status === 'pending' || order.status === 'assigned') {
      order.status = 'processing';
    }
    shoe.overallStatus = 'processing';

    await order.save({ session });
    await session.commitTransaction();

    res.json({ message: '领取成功', process });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: '领取工序失败', error: error.message });
  } finally {
    session.endSession();
  }
});

router.post('/:orderId/shoes/:shoeIndex/processes/:processKey/start', auth, requireRole('technician', 'repairer', 'inspector', 'receptionist'), async (req, res) => {
  try {
    const { orderId, shoeIndex, processKey } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const shoe = order.shoes[shoeIndex];
    if (!shoe) {
      return res.status(404).json({ message: '鞋子不存在' });
    }

    const process = shoe.processes.find(p => p.key === processKey);
    if (!process) {
      return res.status(404).json({ message: '工序不存在' });
    }

    if (process.role !== userRole) {
      return res.status(403).json({ message: '无权操作该工序' });
    }

    if (!process.claimedBy || process.claimedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: '您未领取该工序' });
    }

    if (process.status === 'in_progress') {
      return res.status(400).json({ message: '工序已在进行中' });
    }

    if (process.status === 'completed') {
      return res.status(400).json({ message: '工序已完成' });
    }

    process.status = 'in_progress';
    process.startedAt = new Date();

    if (order.status === 'pending' || order.status === 'assigned') {
      order.status = 'processing';
    }
    shoe.overallStatus = 'processing';

    await order.save();
    res.json({ message: '开始成功', process });
  } catch (error) {
    res.status(500).json({ message: '开始工序失败', error: error.message });
  }
});

router.post('/:orderId/shoes/:shoeIndex/processes/:processKey/complete', auth, requireRole('technician', 'repairer', 'inspector', 'receptionist'), async (req, res) => {
  try {
    const { orderId, shoeIndex, processKey } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const shoe = order.shoes[shoeIndex];
    if (!shoe) {
      return res.status(404).json({ message: '鞋子不存在' });
    }

    const process = shoe.processes.find(p => p.key === processKey);
    if (!process) {
      return res.status(404).json({ message: '工序不存在' });
    }

    if (process.role !== userRole) {
      return res.status(403).json({ message: '无权操作该工序' });
    }

    if (!process.claimedBy || process.claimedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: '您未领取该工序' });
    }

    if (process.status !== 'in_progress') {
      return res.status(400).json({ message: '工序未在进行中' });
    }

    process.status = 'completed';
    process.completedAt = new Date();
    process.assignee = userId;
    
    if (process.startedAt) {
      process.duration = Math.round((process.completedAt - process.startedAt) / 60000);
    }

    const procIndex = shoe.processes.findIndex(p => p.key === processKey);
    shoe.currentProcessIndex = Math.min(procIndex + 1, shoe.processes.length - 1);
    shoe.overallStatus = recalculateShoeOverallStatus(shoe);

    const allCompleted = order.shoes.every(s => {
      const last = s.processes[s.processes.length - 1];
      return last && last.status === 'completed';
    });

    if (allCompleted) {
      order.status = 'completed';
      if (!order.actualDelivery) {
        order.actualDelivery = new Date();
      }
    } else {
      order.status = updateOrderStatusFromProcesses(order);
    }

    await order.save();
    res.json({ message: '完成成功', process, orderStatus: order.status });
  } catch (error) {
    res.status(500).json({ message: '完成工序失败', error: error.message });
  }
});

router.post('/:orderId/shoes/:shoeIndex/processes/:processKey/quality-check', auth, requireRole('inspector', 'admin'), async (req, res) => {
  try {
    const { orderId, shoeIndex, processKey } = req.params;
    const { passed, reworkToProcessKey, reworkReason, responsibleProcessKey } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const shoe = order.shoes[shoeIndex];
    if (!shoe) {
      return res.status(404).json({ message: '鞋子不存在' });
    }

    const qcProcess = shoe.processes.find(p => p.key === processKey);
    if (!qcProcess || qcProcess.key !== 'quality_check') {
      return res.status(400).json({ message: '只能在质检工序执行质检操作' });
    }

    const qcIndex = shoe.processes.findIndex(p => p.key === 'quality_check');
    if (qcIndex === -1) {
      return res.status(400).json({ message: '质检工序不存在' });
    }

    if (passed) {
      const qcProc = shoe.processes[qcIndex];
      qcProc.status = 'completed';
      qcProc.completedAt = new Date();
      qcProc.assignee = req.user._id;
      if (qcProc.startedAt) {
        qcProc.duration = Math.round((qcProc.completedAt - qcProc.startedAt) / 60000);
      }
      
      shoe.currentProcessIndex = qcIndex + 1;
    } else {
      if (!reworkToProcessKey || !reworkReason) {
        return res.status(400).json({ message: '请指定打回工序和原因' });
      }

      const reworkIndex = shoe.processes.findIndex(p => p.key === reworkToProcessKey);
      if (reworkIndex === -1 || reworkIndex >= qcIndex) {
        return res.status(400).json({ message: '无效的打回工序' });
      }

      const targetProc = shoe.processes[reworkIndex];
      const responsibleProc = responsibleProcessKey 
        ? shoe.processes.find(p => p.key === responsibleProcessKey) 
        : targetProc;

      for (let i = reworkIndex; i < shoe.processes.length; i++) {
        const proc = shoe.processes[i];
        if (proc.status === 'completed' || proc.status === 'in_progress') {
          if (i === reworkIndex) {
            proc.status = 'rework';
            proc.reworkCount = (proc.reworkCount || 0) + 1;
            proc.startedAt = null;
            proc.completedAt = null;
            proc.duration = 0;
            proc.claimedBy = null;
            proc.claimedAt = null;
          } else {
            proc.status = 'pending';
            proc.startedAt = null;
            proc.completedAt = null;
            proc.duration = 0;
            proc.claimedBy = null;
            proc.claimedAt = null;
          }
        }
      }

      shoe.totalReworkCount = (shoe.totalReworkCount || 0) + 1;
      shoe.currentProcessIndex = reworkIndex;
      shoe.overallStatus = 'rework';

      const reworkRecord = {
        reworkCount: shoe.totalReworkCount,
        reason: reworkReason,
        fromProcessKey: responsibleProc?.key || targetProc.key,
        fromProcessName: responsibleProc?.name || targetProc.name,
        responsibleUser: responsibleProc?.assignee || targetProc.assignee,
        responsibleUserName: null,
        createdBy: req.user._id
      };

      targetProc.reworkHistory = targetProc.reworkHistory || [];
      targetProc.reworkHistory.push(reworkRecord);
    }

    shoe.overallStatus = recalculateShoeOverallStatus(shoe);
    order.status = updateOrderStatusFromProcesses(order);

    await order.save();
    res.json({ message: passed ? '质检通过' : '质检不通过，已打回返工', shoe });
  } catch (error) {
    res.status(500).json({ message: '质检操作失败', error: error.message });
  }
});

router.post('/:orderId/shoes/:shoeIndex/rework', auth, requireRole('inspector', 'admin'), async (req, res) => {
  try {
    const { orderId, shoeIndex } = req.params;
    const { reworkToProcessKey, reason, responsibleProcessKey } = req.body;

    if (!reworkToProcessKey || !reason) {
      return res.status(400).json({ message: '请指定打回工序和原因' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    const shoe = order.shoes[shoeIndex];
    if (!shoe) {
      return res.status(404).json({ message: '鞋子不存在' });
    }

    const reworkIndex = shoe.processes.findIndex(p => p.key === reworkToProcessKey);
    if (reworkIndex === -1) {
      return res.status(400).json({ message: '目标工序不存在' });
    }

    const targetProc = shoe.processes[reworkIndex];
    const responsibleProc = responsibleProcessKey 
      ? shoe.processes.find(p => p.key === responsibleProcessKey) 
      : targetProc;

    for (let i = reworkIndex; i < shoe.processes.length; i++) {
      const proc = shoe.processes[i];
      if (i === reworkIndex) {
        proc.status = 'rework';
        proc.reworkCount = (proc.reworkCount || 0) + 1;
        proc.startedAt = null;
        proc.completedAt = null;
        proc.duration = 0;
        proc.claimedBy = null;
        proc.claimedAt = null;
      } else {
        proc.status = 'pending';
        proc.startedAt = null;
        proc.completedAt = null;
        proc.duration = 0;
        proc.claimedBy = null;
        proc.claimedAt = null;
      }
    }

    shoe.totalReworkCount = (shoe.totalReworkCount || 0) + 1;
    shoe.currentProcessIndex = reworkIndex;
    shoe.overallStatus = 'rework';

    const reworkRecord = {
      reworkCount: shoe.totalReworkCount,
      reason,
      fromProcessKey: responsibleProc?.key || targetProc.key,
      fromProcessName: responsibleProc?.name || targetProc.name,
      responsibleUser: responsibleProc?.assignee || targetProc.assignee,
      createdBy: req.user._id
    };

    targetProc.reworkHistory = targetProc.reworkHistory || [];
    targetProc.reworkHistory.push(reworkRecord);

    order.status = updateOrderStatusFromProcesses(order);

    await order.save();
    res.json({ message: '已打回返工', shoe });
  } catch (error) {
    res.status(500).json({ message: '返工操作失败', error: error.message });
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
