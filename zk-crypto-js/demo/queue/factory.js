const Queue = require('bull');
const uuid = require('uuid');

const {
    redisConfig: { redis, queuePrefix },
} = require('../config');

function QueueFactory(queueName, processor, config) {
    if (process.env.NODE_ENV && process.env.NODE_ENV.match(/test/)) {
        const fn = async (job) => {
            try {
                return await processor({ jobId: uuid.v4(), data: job });
            } catch (e) {
                return null;
            }
        };
        return fn;
    }

    const queue = new Queue(`${queuePrefix}_${queueName}`, { redis });

    queue.on('ready', () => {
        console.log('queueName ready');
    });
    queue.on('failed', async (job, e) => {
        console.error('failed:', job.id, e);
    });
    queue.process(processor);
    return {
        queue,
        [queueName]: (job) => {
            const queueConfig = { ...config, jobId: uuid.v4() };
            queue.add(job, queueConfig);
        },
    };
}

module.exports = QueueFactory;
