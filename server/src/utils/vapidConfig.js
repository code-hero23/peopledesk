const webpush = require('web-push');

const PLACEHOLDER_VALUES = new Set([
    'your-vapid-public-key',
    'your-vapid-private-key',
    'replace-with-vapid-public-key',
    'replace-with-vapid-private-key',
]);

const getTrimmedEnv = (name) => {
    const value = process.env[name];
    return typeof value === 'string' ? value.trim() : '';
};

const configureWebPush = () => {
    const subject = getTrimmedEnv('VAPID_SUBJECT');
    const publicKey = getTrimmedEnv('VAPID_PUBLIC_KEY');
    const privateKey = getTrimmedEnv('VAPID_PRIVATE_KEY');

    if (!subject || !publicKey || !privateKey) {
        return { ok: false, error: 'Missing VAPID_SUBJECT, VAPID_PUBLIC_KEY, or VAPID_PRIVATE_KEY.' };
    }

    if (PLACEHOLDER_VALUES.has(publicKey) || PLACEHOLDER_VALUES.has(privateKey)) {
        return { ok: false, error: 'VAPID keys are still set to placeholder values.' };
    }

    try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: `Invalid VAPID configuration: ${error.message}` };
    }
};

const getVapidConfigError = () => {
    const result = configureWebPush();
    return result.ok ? null : result.error;
};

module.exports = {
    configureWebPush,
    getVapidConfigError,
};
