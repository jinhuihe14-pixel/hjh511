const ProcessTemplate = require('../models/ProcessTemplate');
const Order = require('../models/Order');

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
    const existing = await ProcessTemplate.countDocuments();
    if (existing > 0) return;

    for (const tpl of DEFAULT_TEMPLATES) {
      const template = new ProcessTemplate(tpl);
      await template.save();
    }
    console.log('Default process templates initialized');
  } catch (error) {
    console.error('Failed to init process templates:', error.message);
  }
};

const generateProcessesForShoe = async (shoe) => {
  const serviceTypes = [...new Set(shoe.services.map(s => s.type))];
  
  const allSteps = [];
  const addedKeys = new Set();

  for (const type of serviceTypes) {
    const template = DEFAULT_TEMPLATES.find(t => t.serviceCategory === type);
    if (template) {
      for (const step of template.steps) {
        if (!addedKeys.has(step.key)) {
          addedKeys.add(step.key);
          allSteps.push({
            key: step.key,
            name: step.name,
            sortOrder: step.sortOrder,
            role: step.role,
            estimatedDuration: step.estimatedDuration,
            status: 'pending'
          });
        }
      }
    }
  }

  const uniqueSteps = [];
  const stepMap = new Map();
  
  for (const type of serviceTypes) {
    const template = DEFAULT_TEMPLATES.find(t => t.serviceCategory === type);
    if (template) {
      for (const step of template.steps) {
        if (!stepMap.has(step.key)) {
          stepMap.set(step.key, step);
        }
      }
    }
  }

  const sortedSteps = Array.from(stepMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  
  return sortedSteps.map((step, index) => ({
    key: step.key,
    name: step.name,
    sortOrder: index + 1,
    role: step.role,
    estimatedDuration: step.estimatedDuration,
    status: 'pending'
  }));
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
  initDefaultTemplates,
  generateProcessesForShoe,
  generateProcessesForShoeFromDB,
  updateOrderStatusFromProcesses,
  recalculateShoeOverallStatus,
  getCurrentProcessIndex
};
