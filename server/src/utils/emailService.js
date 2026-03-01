const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends an email using configured SMTP transport
 * @param {Object} options Options containing to, subject, html, and text
 */
const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"PeopleDesk HR" <noreply@peopledesk.com>',
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        };

        // Only send if credentials exist to avoid crashing locally if omitted
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('Skipping Email Send: SMTP_USER or SMTP_PASS is missing in .env');
            console.log('Would have sent to:', options.to);
            console.log('Subject:', options.subject);
            return false;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

module.exports = {
    sendEmail,
};
