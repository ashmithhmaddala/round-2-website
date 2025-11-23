import EmailQueue from '../models/EmailQueue.js';
import path from 'path';

let isProcessing = false;
const BATCH_SIZE = 5; // Match maxConnections in nodemailer config

export const startEmailWorker = (transporter, logoPath) => {
  console.log('📧 Email worker started');
  
  // Check for emails every 500ms
  setInterval(async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // Find pending emails or failed ones that haven't exceeded max retries
      const jobs = await EmailQueue.find({
        $or: [
          { status: 'pending' },
          { 
            status: 'failed', 
            attempts: { $lt: 5 },
            // Retry after 1 minute (simple backoff)
            lastAttempt: { $lt: new Date(Date.now() - 60000) } 
          }
        ]
      })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE);

      if (jobs.length > 0) {
        await Promise.all(jobs.map(job => processJob(job, transporter, logoPath)));
      }
    } catch (error) {
      console.error('Email worker error:', error);
    } finally {
      isProcessing = false;
    }
  }, 500); // 0.5 second interval
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
