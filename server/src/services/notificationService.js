const moment = require('moment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const checkOverdueOrders = async () => {
  try {
    const thirtyDaysAgo = moment().subtract(30, 'days').toDate();

    const overdueOrders = await Order.find({
      status: 'completed',
      pickedUpAt: null,
      isOverdueNotified: false,
      updatedAt: { $lte: thirtyDaysAgo }
    }).populate('customer', 'name phone wechatId');

    for (const order of overdueOrders) {
      console.log(`订单 ${order.orderNo} 已超期30天未取，顾客: ${order.customer?.name}, 电话: ${order.customer?.phone}`);
      
      await sendWechatNotification(order);

      order.isOverdueNotified = true;
      await order.save();
    }

    console.log(`共处理 ${overdueOrders.length} 个超期订单`);
    return overdueOrders;
  } catch (error) {
    console.error('检查超期订单失败:', error);
    throw error;
  }
};

const sendWechatNotification = async (order) => {
  console.log(`[微信提醒] 尊敬的${order.customer?.name}，您的鞋子已洗护完成30天，请尽快到店取鞋。取鞋码：${order.pickupCode}`);
  return Promise.resolve();
};

const sendOrderCompleteNotification = async (order) => {
  console.log(`[微信提醒] 尊敬的顾客，您的订单 ${order.orderNo} 已洗护完成，请凭取鞋码 ${order.pickupCode} 到店取鞋。`);
  return Promise.resolve();
};

module.exports = {
  checkOverdueOrders,
  sendWechatNotification,
  sendOrderCompleteNotification
};
