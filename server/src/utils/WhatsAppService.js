const axios = require('axios');

/**
 * Service to handle WhatsApp Business API notifications via Meta Cloud API.
 */
class WhatsAppService {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.version = process.env.WHATSAPP_VERSION || 'v18.0';
        this.baseUrl = `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`;
    }

    /**
     * Sanitize phone number to meet Meta's requirements:
     * - Only digits
     * - Include country code
     * - No leading +
     */
    sanitizePhoneNumber(phone) {
        if (!phone) return '';
        
        // Remove all non-digit characters
        let sanitized = String(phone).replace(/\D/g, '');
        
        // Strip leading zeros if present
        sanitized = sanitized.replace(/^0+/, '');
        
        // If it's a 10-digit number, assume India (91) - common for this application
        if (sanitized.length === 10) {
            sanitized = '91' + sanitized;
            console.log(`WhatsApp: Prefixed 10-digit number with 91: ${sanitized}`);
        }
        
        // Meta API must NOT have the '+' prefix, which we've already stripped with \D
        return sanitized;
    }

    /**
     * Send a template message to a recipient.
     * @param {string} to - Recipient phone number (with country code, no + sign).
     * @param {string} templateName - Name of the pre-approved template.
     * @param {Array} parameters - Array of parameter objects for the template.
     * @param {string} languageCode - Language code for the template (default 'en').
     */
    async sendTemplateMessage(to, templateName, parameters = [], languageCode = 'en') {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsApp API credentials missing. Skipping notification.');
            return { success: false, error: 'WhatsApp API credentials missing' };
        }

        const sanitizedTo = this.sanitizePhoneNumber(to);
        if (!sanitizedTo) {
            console.warn(`Invalid phone number for ${templateName}: ${to}`);
            return { success: false, error: 'Invalid phone number' };
        }

        try {
            const data = {
                messaging_product: 'whatsapp',
                to: sanitizedTo,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    }
                }
            };

            // Only add components if we have parameters
            if (parameters && parameters.length > 0) {
                data.template.components = [
                    {
                        type: 'body',
                        parameters: parameters.map(p => ({
                            type: 'text',
                            text: String(p)
                        }))
                    }
                ];
            }

            const response = await axios.post(this.baseUrl, data, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`WhatsApp: Template "${templateName}" enqueued for ${sanitizedTo}. Message ID: ${response.data.messages?.[0]?.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`Error sending WhatsApp notification to ${to}:`, errorMsg);
            // We return detailed error info for internal debugging/logging
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Send Missed Logout Notification
     */
    async sendMissedLogoutNotification(to, userName) {
        // Template: missed_logout_alert
        // Params: {{1}} = Name
        return this.sendTemplateMessage(to, 'missed_logout_alert', [userName], 'en');
    }

    /**
     * Send Missed Worklog Notification
     */
    async sendMissedWorklogNotification(to, userName) {
        // Template: missed_worklog_alert
        // Params: {{1}} = Name
        return this.sendTemplateMessage(to, 'missed_worklog_alert', [userName], 'en');
    }

    /**
     * Send Late Login Alert
     */
    async sendLateLoginAlert(to, userName, consecutiveDays) {
        // Template: late_login_alert
        // Params: {{1}} = Name, {{2}} = Days
        return this.sendTemplateMessage(to, 'late_login_alert', [userName, consecutiveDays], 'en');
    }

    /**
     * Send Break Exceedance Alert
     */
    async sendBreakExceedanceAlert(to, userName, breakType, limitMinutes) {
        // Template: break_exceed_alert
        // Params: {{1}} = Name, {{2}} = Break Type (Tea/Lunch), {{3}} = Limit Minutes
        return this.sendTemplateMessage(to, 'break_exceed_alert', [userName, breakType, limitMinutes], 'en');
    }
}

module.exports = new WhatsAppService();
