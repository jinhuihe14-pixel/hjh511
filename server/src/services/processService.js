const ProcessTemplate = require('../models/ProcessTemplate');
const ServiceItem = require('../models/ServiceItem');
const Order = require('../models/Order');

const DEFAULT_SERVICE_ITEMS = [
  { name: '运动鞋洗护', category: 'cleaning', price: 35, commissionRate: 10, pieceRate: 5, sortOrder: 1 },
  { name: '皮鞋翻新', category: 'renew', price: 80, commissionRate: 15, pieceRate: 0, sortOrder: 2 },
  { name: '奢侈品护理', category: 'luxury', price: 200, commissionRate: 20, pieceRate: 0, sortOrder: 3 },
  { name: '换底修补', category: 'repair', price: 120, commissionRate: 15, pieceRate: 0, sortOrder: 4 }
];

const DEFAULT_TEMPLATES = [
  {
    serviceCategory: 'cleaning',
    name: '清洗类标准工序',
    steps: [
      { key: 'receive', name: '收件', sortOrder: 1, role: 'receptionist', estimatedDuration: 5, description: '接收顾客鞋子，检查并登记' },
      { key: 'pretreatment', name: '预处理', sortOrder: 2, role: 'technician', estimatedDuration: 15, description: '去渍、喷涂清洁剂等预处理' },
      { key: 'cleaning', name: '清洗', sortOrder: 3, role: 'technician', estimatedDuration: 30, description: '深度清洗' },
      { key: 'drying', name: '烘干', sortOrder: 4, role: 'technician', estimatedDuration: 60, description: '自然风干/烘干' },
      { key: 'quality_check', name: '质检', sortOrder: 5, role: 'inspector', estimatedDuration: 10, description: '质量检查' },
      { key: 'finish', name: '完成', sortOrder: 6, role: 'receptionist', estimatedDuration: 5, description: '整理上架待取' }
    ]
  },
  {
    serviceCategory: 'repair',
    name: '维修类标准工序',
    steps: [
      { key: 'receive', name: '收件', sortOrder: 1, role: 'receptionist', estimatedDuration: 5, description: '接收顾客鞋子，检查并登记' },
      { key: 'disassemble', name: '拆解', sortOrder: 2, role: 'repairer', estimatedDuration: 20, description: '拆解需要维修部位' },
      { key: 'repair', name: '修补', sortOrder: 3, role: 'repairer', estimatedDuration: 60, description: '修复破损部位' },
      { key: 'quality_check', name: '质检', sortOrder: 4, role: 'inspector', estimatedDuration: 10, description: '质量检查' },
      { key: 'finish', name: '完成', sortOrder: 5, role: 'receptionist', estimatedDuration: 5, description: '整理上架待取' }
    ]
  },
  {
    serviceCategory: 'renew',
    name: '翻新类标准工序',
    steps: [
      { key: 'receive', name: '收件', sortOrder: 1, role: 'receptionist', estimatedDuration: 5, description: '接收顾客鞋子，检查并登记' },
      { key: 'disassemble', name: '拆解', sortOrder: 2, role: 'repairer', estimatedDuration: 20, description: '拆解需要翻新的部位' },
      { key: 'repair', name: '修补', sortOrder: 3, role: 'repairer', estimatedDuration: 40, description: '修复基础问题' },
      { key: 'coloring', name: '上色', sortOrder: 4, role: 'repairer', estimatedDuration: 60, description: '翻新上色' },
      { key: 'quality_check', name: '质检', sortOrder: 5, role: 'inspector', estimatedDuration: 10, description: '质量检查' },
      { key: 'finish', name: '完成', sortOrder: 6, role: 'receptionist', estimatedDuration: 5, description: '整理上架待取' }
    ]
  },
  {
    serviceCategory: 'luxury',
    name: '奢护类标准工序',
    steps: [
      { key: 'receive', name: '收件', sortOrder: 1, role: 'receptionist', estimatedDuration: 10, description: '接收奢侈品鞋，详细检查登记' },
      { key: 'pretreatment', name: '预处理', sortOrder: 2, role: 'repairer', estimatedDuration: 30, description: '专业去渍处理' },
      { key: 'deep_clean', name: '深度清洁', sortOrder: 3, role: 'repairer', estimatedDuration: 60, description: '奢侈品专用清洁' },
      { key: 'nursing', name: '护理', sortOrder: 4, role: 'repairer', estimatedDuration: 40, description: '专业护理保养' },
      { key: 'quality_check', name: '质检', sortOrder: 5, role: 'inspector', estimatedDuration: 15, description: '严格质量检查' },
      { key: 'finish', name: '完成', sortOrder: 6, role: 'receptionist', estimatedDuration: 10, description: '精美包装待取' }
    ]
  }
];

const initDefaultTemplates = async () => {
  try {
    const collection = ProcessTemplate.collection;
    try {
      await collection.dropIndex('serviceType_1');
      console.log('Dropped legacy index: serviceType_1');
    } catch (e) {
      // index may not exist, ignore
    }

    const existingTemplates = await ProcessTemplate.find({});
    const existingCategories = new Set(existingTemplates.map(t => t.serviceCategory));
    let added = 0;

    for (const tpl of DEFAULT_TEMPLATES) {
      if (!existingCategories.has(tpl.serviceCategory)) {
        const template = new ProcessTemplate(tpl);
        await template.save();
        added++;
      }
    }

    if (added > 0) {
      console.log(`Initialized ${added} default process templates`);
    }
  } catch (error) {
    console.error('Failed to init process templates:', error.message);
  }
};

const initDefaultServiceItems = async () => {
  try {
    const existing = await ServiceItem.countDocuments();
    if (existing > 0) return;

    for (const item of DEFAULT_SERVICE_ITEMS) {
      const serviceItem = new ServiceItem(item);
      await serviceItem.save();
    }
    console.log('Default service items initialized');
  } catch (error) {
    console.error('Failed to init service items:', error.message);
  }
};

const getActiveTemplates = async () => {
  const dbTemplates = await ProcessTemplate.find({ isActive: true });
  const result = [];
  
  for (const dbTpl of dbTemplates) {
    const tplObj = dbTpl.toObject ? dbTpl.toObject() : dbTpl;
    result.push(tplObj);
  }
  
  return result;
};

const validateServiceCategoriesHaveTemplates = async (serviceCategories) => {
  const templates = await getActiveTemplates();
  const activeCategories = new Set(templates.map(t => t.serviceCategory));
  const missing = [];

  for (const category of serviceCategories) {
    if (!activeCategories.has(category)) {
      missing.push(category);
    }
  }

  if (missing.length > 0) {
    const categoryNames = {
      cleaning: '清洗',
      repair: '维修',
      renew: '翻新',
      luxury: '奢护'
    };
    const missingNames = missing.map(c => categoryNames[c] || c).join('、');
    throw new Error(`以下分类缺少启用中的工序模板：${missingNames}，请先在工序模板管理中配置`);
  }

  return true;
};

const mergeSteps = (serviceTypes, templates) => {
  const stepMap = new Map();
  const typeOrder = ['cleaning', 'repair', 'renew', 'luxury'];
  const sortedTypes = [...serviceTypes].sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  for (const type of sortedTypes) {
    const template = templates.find(t => t.serviceCategory === type);
    if (template && Array.isArray(template.steps)) {
      for (const step of template.steps) {
        const stepObj = step.toObject ? step.toObject() : { ...step };
        if (stepObj.key && !stepMap.has(stepObj.key)) {
          stepMap.set(stepObj.key, stepObj);
        }
      }
    }
  }

  const allSteps = Array.from(stepMap.values());
  const firstStep = allSteps.find(s => s.key === 'receive');
  const qcStep = allSteps.find(s => s.key === 'quality_check');
  const finishStep = allSteps.find(s => s.key === 'finish');

  const middleSteps = allSteps.filter(s => 
    s.key !== 'receive' && s.key !== 'quality_check' && s.key !== 'finish'
  );

  middleSteps.sort((a, b) => {
    const orderA = a.sortOrder ?? 999;
    const orderB = b.sortOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.key || '').localeCompare(b.key || '');
  });

  const result = [];
  if (firstStep) result.push(firstStep);
  result.push(...middleSteps);
  if (qcStep) result.push(qcStep);
  if (finishStep) result.push(finishStep);

  return result.map((step, index) => ({
    key: step.key,
    name: step.name,
    sortOrder: index + 1,
    role: step.role,
    estimatedDuration: step.estimatedDuration || 0,
    status: 'pending'
  }));
};

const generateProcessesForShoe = async (shoe) => {
  const serviceTypes = [...new Set(shoe.services.map(s => s.type))];
  
  const templates = await getActiveTemplates();
  
  return mergeSteps(serviceTypes, templates);
};

const generateProcessesForShoeFromDB = async (shoe) => {
  return generateProcessesForShoe(shoe);
};

const updateOrderStatusFromProcesses = (order) => {
  if (!order.shoes || order.shoes.length === 0) {
    return order.status;
  }

  let allCompleted = true;
  let hasProcessing = false;
  let hasRework = false;

  for (const shoe of order.shoes) {
    if (!shoe.processes || shoe.processes.length === 0) {
      allCompleted = false;
      continue;
    }

    const lastProcess = shoe.processes[shoe.processes.length - 1];
    if (lastProcess.status !== 'completed') {
      allCompleted = false;
    }

    for (const proc of shoe.processes) {
      if (proc.status === 'in_progress') {
        hasProcessing = true;
      }
      if (proc.status === 'rework') {
        hasRework = true;
      }
    }
  }

  if (allCompleted) {
    return 'completed';
  }
  if (hasRework) {
    return 'processing';
  }
  if (hasProcessing) {
    return 'processing';
  }

  const anyAssigned = order.status === 'assigned' || order.technician || order.repairer;
  if (anyAssigned && !allCompleted) {
    return 'assigned';
  }

  return order.status;
};

const recalculateShoeOverallStatus = (shoe) => {
  if (!shoe.processes || shoe.processes.length === 0) {
    return 'pending';
  }

  const allCompleted = shoe.processes.every(p => p.status === 'completed');
  if (allCompleted) return 'completed';

  const hasRework = shoe.processes.some(p => p.status === 'rework');
  if (hasRework) return 'rework';

  const hasInProgress = shoe.processes.some(p => p.status === 'in_progress');
  if (hasInProgress) return 'processing';

  return 'pending';
};

const getCurrentProcessIndex = (shoe) => {
  if (!shoe.processes || shoe.processes.length === 0) return 0;
  
  for (let i = 0; i < shoe.processes.length; i++) {
    if (shoe.processes[i].status !== 'completed') {
      return i;
    }
  }
  return shoe.processes.length - 1;
};

module.exports = {
  DEFAULT_TEMPLATES,
  DEFAULT_SERVICE_ITEMS,
  initDefaultTemplates,
  initDefaultServiceItems,
  getActiveTemplates,
  validateServiceCategoriesHaveTemplates,
  generateProcessesForShoe,
  generateProcessesForShoeFromDB,
  updateOrderStatusFromProcesses,
  recalculateShoeOverallStatus,
  getCurrentProcessIndex
};
