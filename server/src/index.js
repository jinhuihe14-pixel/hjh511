require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const salaryRoutes = require('./routes/salary');
const customerRoutes = require('./routes/customers');
const statsRoutes = require('./routes/stats');
const processTemplateRoutes = require('./routes/processTemplates');
const { checkOverdueOrders } = require('./services/notificationService');
const { initDefaultTemplates } = require('./services/processService');

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  await initDefaultTemplates();
})
.catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/process-templates', processTemplateRoutes);

cron.schedule('0 9 * * *', () => {
  console.log('Checking for overdue orders...');
  checkOverdueOrders();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
