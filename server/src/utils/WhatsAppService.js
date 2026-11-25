const axios = require('axios');
const prisma = require('../config/prisma');

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
     * @param {string} to - Recipient phone number.
     * @param {string} templateName - Name of the pre-approved template.
     * @param {Array} bodyParams - Array of body parameter strings.
     * @param {Array} headerParams - Array of header parameter objects (e.g. image link).
     * @param {string} languageCode - Language code.
     */
    async sendTemplateMessage(to, templateName, bodyParams = [], headerParams = [], languageCode = 'en') {
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
                    },
                    components: []
                }
            };

            // 1. Add Header Components (Media, etc.)
            if (headerParams && headerParams.length > 0) {
                data.template.components.push({
                    type: 'header',
                    parameters: headerParams.map(p => {
                        if (typeof p === 'string' && (p.startsWith('http') || p.includes('.jpg') || p.includes('.png'))) {
                            return { type: 'image', image: { link: p } };
                        }
                        return { type: 'text', text: String(p) };
                    })
                });
            }

            // 2. Add Body Components
            if (bodyParams && bodyParams.length > 0) {
                data.template.components.push({
                    type: 'body',
                    parameters: bodyParams.map(p => ({
                        type: 'text',
                        text: String(p)
                    }))
                });
            }

            // Cleanup components if empty
            if (data.template.components.length === 0) {
                delete data.template.components;
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
        return this.sendTemplateMessage(to, 'missed_logout_alert', [userName], [], 'en');
    }

    /**
     * Send Missed Worklog Notification
     */
    async sendMissedWorklogNotification(to, userName) {
        // Template: missed_worklog_alert
        // Params: {{1}} = Name
        return this.sendTemplateMessage(to, 'missed_worklog_alert', [userName], [], 'en');
    }

    /**
     * Send Late Login Alert
     */
    async sendLateLoginAlert(to, userName, consecutiveDays) {
        // Check if late enforcement is globally enabled
        try {
            const setting = await prisma.globalSetting.findUnique({
                where: { key: 'isLateCheckInEnforced' }
            });
            if (setting && setting.value === 'false') {
                console.log(`WhatsApp - Skipping late_login_alert for ${userName} (Disabled in settings)`);
                return { success: true, message: 'Alerts disabled in settings' };
            }
        } catch (err) {
            console.error('Error checking Late Login setting in WhatsAppService:', err.message);
        }

        // Template: late_login_alert
        // Params: {{1}} = Name, {{2}} = Days
        return this.sendTemplateMessage(to, 'late_login_alert', [userName, consecutiveDays], [], 'en');
    }

    /**
     * Send Break Exceedance Alert with auto fallback to text message
     */
    async sendBreakExceedanceAlert(to, userName, breakType, limitMinutes, details = {}) {
        // 1. Try template first
        const templateResult = await this.sendTemplateMessage(to, 'break_exceed_alert', [userName, breakType, String(limitMinutes)], [], 'en');
        if (templateResult && templateResult.success) {
            return templateResult;
        }

        // 2. Fallback to freeform text
        const startTime = details.startTimeFormatted || 'N/A';
        const duration = details.durationMinutes ? `${details.durationMinutes} mins` : `${limitMinutes} mins`;
        const textContent = `⚠️ *BREAK EXCEEDANCE ALERT*
----------------------------------
👤 *Employee:* ${userName}
☕ *Break Type:* ${breakType}
🕒 *Start Time:* ${startTime}
⏳ *Duration:* ${duration} (Limit: ${limitMinutes} mins)
🚨 *Status:* Exceeded allowed time
----------------------------------
*PeopleDesk Attendance Monitoring*`;

        return this.sendTextMessage(to, textContent);
    }

    /**
     * Send Break Exceedance Summary List to Admin / Manager
     */
    async sendBreakExceedanceSummaryList(to, list) {
        if (!list || list.length === 0) return { success: false };

        const itemsText = list.map((emp, idx) => {
            return `${idx + 1}. *${emp.name}* (${emp.designation || 'Employee'})
   • *Break:* ${emp.breakName}
   • *Start Time:* ${emp.startTimeFormatted}
   • *Duration:* ${emp.durationMinutes} mins (Limit: ${emp.allowedLimit}m + 2m grace = ${emp.threshold}m)
   • *Exceeded by:* ${emp.exceededBy} mins`;
        }).join('\n\n');

        const nowFormatted = new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        const message = `🚨 *PEOPLEDESK: BREAK EXCEEDANCE ALERT*
----------------------------------
The following employee(s) have exceeded their break time (including 2 mins grace):

${itemsText}

📅 *Reported At:* ${nowFormatted}
----------------------------------
*PeopleDesk Automated Monitor*`;

        return this.sendTextMessage(to, message);
    }

    /**
     * Send Exceeded Leave Alert to BH and HR
     */
    async sendExceededLeaveAlert(to, userName, userRole, reason, daysExceeded) {
        // Template: leave_request_template
        // Params: {{1}} = Name, {{2}} = Role, {{3}} = Reason, {{4}} = Days Exceeded
        return this.sendTemplateMessage(
            to, 
            'leave_request_template', 
            [userName, userRole, reason, String(daysExceeded)], 
            [], 
            'en'
        );
    }

    /**
     * Send Exceeded Permission Alert to BH and HR
     */
    async sendExceededPermissionAlert(to, userName, userRole, reason, startTime, endTime, permissionsExceeded) {
        // Template: permission_reuqest_template
        // Params: {{1}} = Name, {{2}} = Role, {{3}} = Reason, {{4}} = Start Time, {{5}} = End Time, {{6}} = Count Exceeded
        return this.sendTemplateMessage(
            to, 
            'permission_reuqest_template', 
            [userName, userRole, reason, startTime, endTime, String(permissionsExceeded)], 
            [], 
            'en'
        );
    }

    /**
     * Send freeform Text Message (works for active conversation session / 24h window)
     */
    async sendTextMessage(to, textContent) {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsApp API credentials missing. Skipping text notification.');
            return { success: false, error: 'WhatsApp API credentials missing' };
        }

        const sanitizedTo = this.sanitizePhoneNumber(to);
        if (!sanitizedTo) {
            console.warn(`Invalid phone number for text message: ${to}`);
            return { success: false, error: 'Invalid phone number' };
        }

        try {
            const data = {
                messaging_product: 'whatsapp',
                to: sanitizedTo,
                type: 'text',
                text: {
                    body: textContent
                }
            };

            const response = await axios.post(this.baseUrl, data, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`WhatsApp: Text message enqueued for ${sanitizedTo}. Message ID: ${response.data.messages?.[0]?.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`Error sending WhatsApp text message to ${to}:`, errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Send Visitor Record Notification to Stakeholder (CRE, FA, LA, BH)
     */
    async sendVisitorRecordNotification(to, details) {
        const {
            clientName,
            phoneNumber,
            reasonOfVisit,
            showroom,
            dateOfVisit,
            timeOfEntry,
            creName,
            faName,
            laName,
            bhName
        } = details;

        const formattedDate = new Date(dateOfVisit).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const bodyParams = [
            clientName || 'N/A',
            phoneNumber || 'N/A',
            showroom || 'N/A',
            reasonOfVisit || 'N/A',
            `${formattedDate} ${timeOfEntry || ''}`,
            creName || 'N/A',
            faName || 'N/A',
            laName || 'N/A',
            bhName || 'N/A'
        ];

        // 1. Try sending via pre-approved template first
        const templateResult = await this.sendTemplateMessage(
            to,
            'visitor_record_alert',
            bodyParams,
            [],
            'en'
        );

        if (templateResult.success) {
            return templateResult;
        }

        // 2. Fallback to freeform text message format if template is not yet active or fails
        const textSummary = `🏢 *CLIENT VISIT RECORDED*
--------------------------
👤 *Client Name:* ${clientName}
📞 *Phone:* ${phoneNumber}
📍 *Showroom:* ${showroom}
📌 *Reason:* ${reasonOfVisit}
📅 *Date & Time:* ${formattedDate} at ${timeOfEntry}

👥 *Assigned Team:*
• *CRE:* ${creName || 'N/A'}
• *FA (Feasibility Architect):* ${faName || 'N/A'}
• *LA (Loading Architect):* ${laName || 'N/A'}
• *BH (Business Head):* ${bhName || 'N/A'}`;

        return this.sendTextMessage(to, textSummary);
    }
}

module.exports = new WhatsAppService();

