const InMemoryQueue = require('./InMemoryQueue');
const BullQueue = require('./BullQueue');

const QUEUE_DRIVER = process.env.QUEUE_DRIVER || 'memory';
const QUEUE_NAME = 'file-processing';

let queueInstance;

function getQueue() {
  if (queueInstance) return queueInstance;

  if (QUEUE_DRIVER === 'bull') {
    queueInstance = new BullQueue(QUEUE_NAME, {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined
    });
  } else {
    queueInstance = new InMemoryQueue(QUEUE_NAME);
  }

  return queueInstance;
}

module.exports = {
  getQueue
};
