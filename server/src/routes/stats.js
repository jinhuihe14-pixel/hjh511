const express = require('express');
const moment = require('moment');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { getCurrentProcessIndex } = require('../services/processService');
const router = express.Router();

router.get('/dashboard', auth, requireRole('admin'), async (req, res) => {
  try {
    const today = moment().startOf('day');
    const thisMonth = moment().startOf('month');

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today.toDate() }
    });

    const monthOrders = await Order.countDocuments({
      createdAt: { $gte: thisMonth.toDate() }
    });

    const todayRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: today.toDate() }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$actualAmount' } } }
    ]);

    const monthRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: thisMonth.toDate() }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$actualAmount' } } }
    ]);

    const pendingOrders = await Order.countDocuments({
      status: { $in: ['pending', 'assigned', 'processing'] }
    });

    const totalCustomers = await Customer.countDocuments();

    const overdueOrders = await Order.countDocuments({
      status: 'completed',
      pickedUpAt: null,
      updatedAt: { $lte: moment().subtract(30, 'days').toDate() }
    });

    const inProgressCount = await Order.countDocuments({
      status: 'processing'
    });

    const activeOrders = await Order.find({
      status: { $nin: ['cancelled', 'picked_up', 'completed'] }
    });

    let inProgressShoes = 0;
    let reworkCount = 0;
    let highReworkShoes = 0;

    for (const order of activeOrders) {
      for (const shoe of order.shoes) {
        const currentIdx = getCurrentProcessIndex(shoe);
        if (currentIdx >= 0 && currentIdx < shoe.processes.length - 1) {
          inProgressShoes++;
        }
        
        if (shoe.totalReworkCount > 0) {
          reworkCount += shoe.totalReworkCount;
        }
        if (shoe.totalReworkCount >= 3) {
          highReworkShoes++;
        }
      }
    }

    const warnDate = moment().add(1, 'days').toDate();
    const overdueWarningCount = await Order.countDocuments({
      status: { $nin: ['cancelled', 'picked_up', 'completed'] },
      estimatedDelivery: { $lte: warnDate }
    });

    const highReworkOrders = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled', 'picked_up'] } } },
      { $unwind: '$shoes' },
      { $match: { 'shoes.totalReworkCount': { $gte: 3 } } },
      { $group: { _id: '$_id', orderNo: { $first: '$orderNo' }, totalReworkCount: { $sum: '$shoes.totalReworkCount' } } },
      { $sort: { totalReworkCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      todayOrders,
      monthOrders,
      todayRevenue: todayRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      pendingOrders,
      totalCustomers,
      overdueOrders,
      inProgressCount,
      inProgressShoes,
      reworkCount,
      highReworkShoes,
      highReworkCount: highReworkOrders.length,
      highReworkOrders,
      overdueWarningCount
    });
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
  }
});

router.get('/production-board', auth, requireRole('admin', 'inspector'), async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $nin: ['cancelled', 'picked_up', 'completed'] }
    })
      .populate('customer', 'name phone')
      .populate('technician', 'name')
      .populate('repairer', 'name')
      .sort({ createdAt: 1 });

    const processColumns = {};
    const allProcessKeys = new Set();

    for (const order of orders) {
      for (let shoeIndex = 0; shoeIndex < order.shoes.length; shoeIndex++) {
        const shoe = order.shoes[shoeIndex];
        const currentIdx = getCurrentProcessIndex(shoe);
        const currentProcess = shoe.processes[currentIdx];
        
        if (!currentProcess) continue;

        const processKey = currentProcess.key;
        const processName = currentProcess.name;
        allProcessKeys.add(processKey);

        if (!processColumns[processKey]) {
          processColumns[processKey] = {
            key: processKey,
            name: processName,
            sortOrder: currentProcess.sortOrder,
            count: 0,
            items: []
          };
        }

        const startedAt = currentProcess.startedAt || currentProcess.claimedAt;
        const stayDuration = startedAt 
          ? Math.round((Date.now() - new Date(startedAt)) / 60000)
          : 0;

        processColumns[processKey].count++;
        processColumns[processKey].items.push({
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
          claimedBy: currentProcess.claimedBy,
          startedAt: currentProcess.startedAt || currentProcess.claimedAt,
          stayDuration,
          totalReworkCount: shoe.totalReworkCount,
          isRework: currentProcess.status === 'rework',
          estimatedDelivery: order.estimatedDelivery,
          isOverdue: isOrderOverdue(shoe, currentProcess, order.estimatedDelivery)
        });
      }
    }

    const columns = Object.values(processColumns).sort((a, b) => a.sortOrder - b.sortOrder);
    
    columns.forEach(col => {
      col.items.sort((a, b) => {
        if (a.isRework && !b.isRework) return -1;
        if (!a.isRework && b.isRework) return 1;
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return (b.startedAt ? new Date(b.startedAt) : new Date(0)) - 
               (a.startedAt ? new Date(a.startedAt) : new Date(0));
      });
    });

    res.json({ columns });
  } catch (error) {
    res.status(500).json({ message: '获取生产看板失败', error: error.message });
  }
});

const isOrderOverdue = (shoe, currentProcess, estimatedDelivery) => {
  if (!estimatedDelivery) return false;
  
  const remainingProcesses = shoe.processes.filter(
    (p, i) => i >= shoe.processes.findIndex(sp => sp.key === currentProcess.key) && p.status !== 'completed'
  );
  
  const totalEstimatedMinutes = remainingProcesses.reduce((sum, p) => sum + (p.estimatedDuration || 0), 0);
  const estimatedFinishTime = new Date(Date.now() + totalEstimatedMinutes * 60 * 1000);
  
  return estimatedFinishTime > new Date(estimatedDelivery);
};

router.get('/overdue-warnings', auth, requireRole('admin', 'inspector'), async (req, res) => {
  try {
    const { days = 1 } = req.query;
    const warnDate = moment().add(days, 'days').toDate();

    const orders = await Order.find({
      status: { $nin: ['cancelled', 'picked_up', 'completed'] },
      estimatedDelivery: { $lte: warnDate }
    })
      .populate('customer', 'name phone')
      .populate('technician', 'name')
      .populate('repairer', 'name')
      .sort({ estimatedDelivery: 1 });

    const result = [];
    for (const order of orders) {
      const shoesInfo = [];
      for (const shoe of order.shoes) {
        const currentIdx = getCurrentProcessIndex(shoe);
        const currentProcess = shoe.processes[currentIdx];
        const totalProcesses = shoe.processes.length;
        const completedCount = shoe.processes.filter(p => p.status === 'completed').length;

        shoesInfo.push({
          currentProcess: currentProcess?.name || '-',
          currentProcessKey: currentProcess?.key,
          progress: totalProcesses > 0 ? Math.round((completedCount / totalProcesses) * 100) : 0,
          totalReworkCount: shoe.totalReworkCount
        });
      }

      result.push({
        orderId: order._id,
        orderNo: order.orderNo,
        customer: order.customer,
        estimatedDelivery: order.estimatedDelivery,
        daysRemaining: Math.ceil((new Date(order.estimatedDelivery) - Date.now()) / (1000 * 60 * 60 * 24)),
        isOverdue: new Date(order.estimatedDelivery) < new Date(),
        shoes: shoesInfo
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '获取超时预警失败', error: error.message });
  }
});

router.get('/employee-process-stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, role } = req.query;
    const targetStart = startDate ? new Date(startDate) : moment().startOf('month').toDate();
    const targetEnd = endDate ? new Date(endDate) : moment().endOf('month').toDate();

    const matchRole = role || { $in: ['technician', 'repairer', 'inspector', 'receptionist'] };

    const users = await User.find({ 
      role: matchRole,
      status: 'active' 
    });

    const userStats = [];

    for (const user of users) {
      let completedCount = 0;
      let totalDuration = 0;
      let reworkCount = 0;
      let inProgressCount = 0;
      const processBreakdown = {};

      const orders = await Order.find({
        status: { $ne: 'cancelled' },
        createdAt: { $gte: targetStart, $lte: targetEnd }
      });

      for (const order of orders) {
        for (const shoe of order.shoes) {
          for (const proc of shoe.processes) {
            if (proc.assignee?.toString() === user._id.toString()) {
              if (proc.status === 'completed') {
                completedCount++;
                totalDuration += proc.duration || 0;
                
                if (!processBreakdown[proc.key]) {
                  processBreakdown[proc.key] = { name: proc.name, count: 0, duration: 0 };
                }
                processBreakdown[proc.key].count++;
                processBreakdown[proc.key].duration += proc.duration || 0;
              }
              
              reworkCount += proc.reworkCount || 0;
            }
            
            if (proc.claimedBy?.toString() === user._id.toString() && proc.status === 'in_progress') {
              inProgressCount++;
            }
          }
        }
      }

      userStats.push({
        userId: user._id,
        name: user.name,
        role: user.role,
        completedCount,
        inProgressCount,
        totalDuration,
        avgDuration: completedCount > 0 ? Math.round(totalDuration / completedCount) : 0,
        reworkCount,
        reworkRate: completedCount > 0 ? Math.round((reworkCount / completedCount) * 100) / 100 : 0,
        processBreakdown: Object.values(processBreakdown)
      });
    }

    userStats.sort((a, b) => b.completedCount - a.completedCount);

    res.json(userStats);
  } catch (error) {
    res.status(500).json({ message: '获取员工工序统计失败', error: error.message });
  }
});

router.get('/revenue-trend', auth, requireRole('admin'), async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const trends = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = moment().subtract(i, 'months').startOf('month');
      const monthEnd = moment().subtract(i, 'months').endOf('month');

      const result = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$actualAmount' },
            orderCount: { $sum: 1 }
          }
        }
      ]);

      trends.push({
        month: monthStart.format('YYYY-MM'),
        revenue: result[0]?.revenue || 0,
        orderCount: result[0]?.orderCount || 0
      });
    }

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: '获取营收趋势失败', error: error.message });
  }
});

router.get('/service-stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: { $ne: 'cancelled' } };

    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const result = await Order.aggregate([
      { $match: match },
      { $unwind: '$shoes' },
      { $unwind: '$shoes.services' },
      {
        $group: {
          _id: {
            type: '$shoes.services.type',
            name: '$shoes.services.name'
          },
          count: { $sum: 1 },
          revenue: { $sum: '$shoes.services.price' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const serviceStats = result.map(item => ({
      type: item._id.type,
      name: item._id.name,
      count: item.count,
      revenue: item.revenue
    }));

    res.json(serviceStats);
  } catch (error) {
    res.status(500).json({ message: '获取服务统计失败', error: error.message });
  }
});

router.get('/employee-performance', auth, requireRole('admin'), async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || moment().format('YYYY-MM');
    const startDate = moment(targetMonth).startOf('month').toDate();
    const endDate = moment(targetMonth).endOf('month').toDate();

    const receptionists = await User.aggregate([
      { $match: { role: 'receptionist', status: 'active' } },
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$receptionist', '$$userId'] },
                createdAt: { $gte: startDate, $lte: endDate },
                status: { $ne: 'cancelled' }
              }
            }
          ],
          as: 'orders'
        }
      },
      {
        $project: {
          name: 1,
          orderCount: { $size: '$orders' },
          revenue: { $sum: '$orders.actualAmount' }
        }
      },
      { $sort: { orderCount: -1 } }
    ]);

    const technicians = await User.aggregate([
      { $match: { role: 'technician', status: 'active' } },
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$technician', '$$userId'] },
                updatedAt: { $gte: startDate, $lte: endDate },
                status: 'completed'
              }
            }
          ],
          as: 'orders'
        }
      },
      {
        $project: {
          name: 1,
          orderCount: { $size: '$orders' },
          pieceCount: {
            $sum: {
              $map: {
                input: '$orders',
                as: 'order',
                in: { $size: '$$order.shoes' }
              }
            }
          }
        }
      },
      { $sort: { pieceCount: -1 } }
    ]);

    res.json({ receptionists, technicians });
  } catch (error) {
    res.status(500).json({ message: '获取员工业绩失败', error: error.message });
  }
});

module.exports = router;
