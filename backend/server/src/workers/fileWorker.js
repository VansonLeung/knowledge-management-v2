const { getQueue } = require('../services/queue');
const fileService = require('../services/file');

function registerFileWorker() {
  const queue = getQueue();
  queue.process(async job => {
    if (job.name !== 'process-file') return;
    await fileService.processFile(job.data.fileId);
  });
}

module.exports = {
  registerFileWorker
};
