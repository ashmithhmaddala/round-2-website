import EmailQueue from '../models/EmailQueue.js';
import path from 'path';

let isProcessing = false;

export const startEmailWorker = (transporter, logoPath) => {
  console.log('📧 Email worker started');
  
  // Check for emails every 2 seconds
  setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // Find one pending email or a failed one that hasn't exceeded max retries
      // We prioritize pending, then failed ones that are due for retry
      const job = await EmailQueue.findOne({
        $or: [
          { status: 'pending' },
          { 
            status: 'failed', 
            attempts: { $lt: 5 },
            // Retry after 1 minute (simple backoff)
            lastAttempt: { $lt: new Date(Date.now() - 60000) } 
          }
        ]
      }).sort({ createdAt: 1 });

      if (job) {
        await processJob(job, transporter, logoPath);
      }
    } catch (error) {
      console.error('Email worker error:', error);
    } finally {
      isProcessing = false;
    }
  }, 2000); // 2 second interval (throttling for Gmail)
};

const processJob = async (job, transporter, logoPath) => {
  try {
    job.status = 'processing';
    job.attempts += 1;
    job.lastAttempt = new Date();
    await job.save();

    await transporter.sendMail({
      from: `"NHCE CTF Team" <${process.env.EMAIL_USER}>`,
      to: job.to,
      subject: job.subject,
      html: job.html,
      attachments: [{
        filename: 'cseh_final_logo.png',
        path: logoPath,
        cid: 'logo'
      }]
    });

    job.status = 'completed';
    job.error = undefined;
    await job.save();
    console.log(`✅ Email sent to ${job.to} (Job ID: ${job._id})`);

  } catch (error) {
    console.error(`❌ Failed to send email to ${job.to}:`, error.message);
    job.status = 'failed';
    job.error = error.message;
    await job.save();
  }
};
