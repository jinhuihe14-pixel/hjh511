const express = require('express');
const moment = require('moment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
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

    res.json({
      todayOrders,
      monthOrders,
      todayRevenue: todayRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      pendingOrders,
      totalCustomers,
      overdueOrders
    });
  } catch (error) {
    res.status(500).json({ message: '获取统计数据失败', error: error.message });
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
