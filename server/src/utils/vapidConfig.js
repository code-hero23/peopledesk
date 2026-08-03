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

const getVapidConfigError = () => {
    const subject = getTrimmedEnv('VAPID_SUBJECT');
    const publicKey = getTrimmedEnv('VAPID_PUBLIC_KEY');
    const privateKey = getTrimmedEnv('VAPID_PRIVATE_KEY');

    if (!subject || !publicKey || !privateKey) {
        return 'Missing VAPID_SUBJECT, VAPID_PUBLIC_KEY, or VAPID_PRIVATE_KEY.';
    }

    if (PLACEHOLDER_VALUES.has(publicKey) || PLACEHOLDER_VALUES.has(privateKey)) {
        return 'VAPID keys are still set to placeholder values.';
    }

    try {
        webpush.validatePublicKey(publicKey);
    } catch (error) {
        return `Invalid VAPID public key: ${error.message}`;
    }

    try {
        webpush.validatePrivateKey(privateKey);
    } catch (error) {
        return `Invalid VAPID private key: ${error.message}`;
    }

    return null;
};

const configureWebPush = () => {
    const error = getVapidConfigError();

    if (error) {
        return { ok: false, error };
    }

    webpush.setVapidDetails(
        getTrimmedEnv('VAPID_SUBJECT'),
        getTrimmedEnv('VAPID_PUBLIC_KEY'),
        getTrimmedEnv('VAPID_PRIVATE_KEY')
    );

    return { ok: true };
};

module.exports = {
    configureWebPush,
    getVapidConfigError,
};
