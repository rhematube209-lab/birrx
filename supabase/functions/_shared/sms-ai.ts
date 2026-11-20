import { z } from 'zod';
export const normalizeSender = (sender: string) => sender.replace(/^\+/, '').replace(/[\s\-_.]+/g, '').toUpperCase();
const providers: Record<string, string> = {
    CBE: 'CBE',
    COMMERCIALBANKOFETHIOPIA: 'CBE',
    CBEALERT: 'CBE',
    BOA: 'BOA',
    BANKOFABYSSINIA: 'BOA',
    ABYSSINIA: 'BOA',
    ABYSSINIABANK: 'BOA',
    AWASH: 'Awash',
    AWASHBANK: 'Awash',
    AWASH_BANK: 'Awash',
    '8980': 'Awash',
    '127': 'Telebirr',
    '994': 'Telebirr',
    '251994': 'Telebirr',
    '251127': 'Telebirr',
    '810': 'Telebirr',
    TELEBIRR: 'Telebirr',
    ETHIOTELECOM: 'Telebirr',
    DASHEN: 'Dashen Bank',
    DASHENBANK: 'Dashen Bank',
    COOP: 'Cooperative Bank of Oromia',
    COOPBANK: 'Cooperative Bank of Oromia',
    COOPERATIVEBANK: 'Cooperative Bank of Oromia',
    HIBRET: 'Hibret Bank',
    HIBRETBANK: 'Hibret Bank',
    UNITEDBANK: 'Hibret Bank',
    NIB: 'Nib International Bank',
    NIBBANK: 'Nib International Bank',
    WEGAGEN: 'Wegagen Bank',
    WEGAGENBANK: 'Wegagen Bank',
    ZEMEN: 'Zemen Bank',
    ZEMENBANK: 'Zemen Bank',
    CBEBIRR: 'CBE Birr',
    '844': 'CBE Birr',
    AMHARA: 'Amhara Bank',
    AMHARABANK: 'Amhara Bank',
    SIINQEE: 'Siinqee Bank',
    SIINQEEBANK: 'Siinqee Bank',
    SINQEE: 'Siinqee Bank',
    SINQEEBANK: 'Siinqee Bank',
    OROMIA: 'Oromia Bank',
    OROMIABANK: 'Oromia Bank',
    BERHAN: 'Berhan Bank',
    BERHANBANK: 'Berhan Bank',
    ENAT: 'Enat Bank',
    ENATBANK: 'Enat Bank',
    BUNNA: 'Bunna Bank',
    BUNNABANK: 'Bunna Bank',
    LION: 'Lion Bank',
    LIONBANK: 'Lion Bank',
    LIB: 'Lion Bank',
    ANBESSA: 'Lion Bank',
    TSEDAY: 'Tseday Bank',
    TSEDAYBANK: 'Tseday Bank',
    GLOBAL: 'Global Bank Ethiopia',
    GLOBALBANK: 'Global Bank Ethiopia',
    GADAA: 'Global Bank Ethiopia',
    HIJRA: 'Hijra Bank',
    HIJRABANK: 'Hijra Bank',
    ZAMZAM: 'ZamZam Bank',
    ZAMZAMBANK: 'ZamZam Bank',
    RAMIS: 'Ramis Bank',
    RAMISBANK: 'Ramis Bank',
    AHADU: 'Ahadu Bank',
    AHADUBANK: 'Ahadu Bank',
    SIDAMA: 'Sidama Bank',
    SIDAMABANK: 'Sidama Bank'
};
export const providerForSender = (sender: string) => providers[normalizeSender(sender)];
export const decimal = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/);
export function santim(value: string) { const [whole, part = ''] = decimal.parse(value).split('.'); return Number(whole) * 100 + Number(part.padEnd(2, '0')); }
export const requestSchema = z.object({ version: z.literal(1), messages: z.array(z.object({ id: z.string().min(1).max(160), sender: z.string().max(60), body: z.string().min(15).max(6000), receivedAt: z.string().datetime() })).min(1).max(10) });
export const extractionSchema = z.object({ id: z.string().min(1).max(160), kind: z.enum(['transaction', 'notice', 'unknown']), direction: z.enum(['in', 'out']).nullable(), amount: decimal.nullable(), serviceFee: decimal.nullable(), vat: decimal.nullable(), otherFee: decimal.nullable(), balance: decimal.nullable(), accountMask: z.string().regex(/^[0-9*]{4,30}$/).nullable(), reference: z.string().max(160).nullable(), person: z.string().max(100).nullable(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).nullable(), category: z.string().max(30).nullable(), reason: z.string().max(240) });
export const responseSchema = z.object({ results: z.array(extractionSchema).max(10) });
export type AiExtraction = z.infer<typeof extractionSchema>;
export type AiRequest = z.infer<typeof requestSchema>;
const number = '[0-9][0-9,]*(?:\\.[0-9]{1,2})?';
export function moneyEvidence(body: string): number[] {
    const values: number[] = [];
    const expression = new RegExp('(?:ETB|Birr|ብር)\\s*(' + number + ')(?![0-9,%]|\\.[0-9])|(' + number + ')\\s*(?:ETB|Birr|ብር)|(?:service fee(?: is)?|charge(?: of)?|VAT:|EDRRF|Disaster Recovery(?:\\(5%\\))? of)\\s*(?:ETB\\s*)?(' + number + ')(?![0-9,%]|\\.[0-9])', 'gi');
    for (const match of body.matchAll(expression)) { const value = (match[1] || match[2] || match[3]).replaceAll(',', ''); if (decimal.safeParse(value).success) values.push(santim(value)); }
    return values;
}
export function postedDirection(body: string): 'in' | 'out' | undefined {
    const outgoing = /debited|debit transaction|\bpaid\b|\brepaid\b|withdrawn|payment of|transferred(?:\s+ETB|\s+to)|successfully transferred|ወጪ|ተቀንሷል|ከፍለዋል|ተከፍሏል|ልከዋል|አስተላልፈዋል/i.test(body);
    const incoming = /credited|credit transaction|\breceived\b|deposited|ገቢ|ተቀብለዋል|ተላልፏል/i.test(body);
    if (outgoing && !incoming) return 'out';
    if (incoming && !outgoing) return 'in';
    if (outgoing && incoming) {
        if (/(?:debited from|transferred from your|paid from your|transferred to other bank|ወጪ ሆኗል|ወጪ ተደርጓል|ተቀንሷል|ልከዋል)/i.test(body)) return 'out';
        if (/(?:credited to your|deposited into your|received from|ገቢ ሆኗል|ገቢ ተደርጓል|ተቀብለዋል)/i.test(body)) return 'in';
    }
    return undefined;
}
export function principalEvidence(body: string) {
    const values: number[] = [];
    const expressions = [
        new RegExp('(?:debited|credited|paid|received|transferred|withdrawn|deposited|debit transaction|credit transaction)[^.]{0,100}?(?:ETB|Birr)\\s*(' + number + ')(?![0-9,]|\\.[0-9])', 'gi'),
        new RegExp('(?:ETB|Birr)\\s*(' + number + ')\\s*(?:has been|was|is)?\\s*(?:credited|debited|transferred|withdrawn|deposited|paid)', 'gi'),
        new RegExp('(?:repaid|payment of|transfer of)\\s*(' + number + ')\\s*(?:ETB|Birr)', 'gi'),
        new RegExp('(?:transferred|paid|received|withdrawn|deposited)\\s*(' + number + ')\\s*(?:ETB|Birr)', 'gi'),
        new RegExp('(' + number + ')\\s*(?:ETB|Birr)\\s*(?:has been|was|is)?\\s*(?:credited|debited|transferred|withdrawn|deposited|paid)', 'gi'),
        new RegExp('(' + number + ')\\s*ብር[^\n]{0,180}?(?:ልከዋል|አስተላልፈዋል|ተቀብለዋል|ተላልፏል|ወጪ|ገቢ|ከፍለዋል|ተከፍሏል|ተቀንሷል)', 'g'),
        new RegExp('(?:ወጪ|ገቢ|ከፍለዋል|ተከፍሏል|ተቀንሷል|የተከፈለ)[^\n]{0,80}?(' + number + ')\\s*ብር', 'g')
    ];
    for (const expression of expressions) for (const match of body.matchAll(expression)) { const value = match[1].replaceAll(',', ''); if (decimal.safeParse(value).success) values.push(santim(value)); }
    return [...new Set(values)];
}
export function balanceEvidence(body: string) {
    const expression = new RegExp('(?:(?:current(?:\\s+E-Money\\s+Account)?|available|remaining|account|new)?\\s*balance|bal)(?:\\s*(?:is(?:\\s*now)?|:))?\\s*(?:ETB|Birr|ብር)?\\s*(' + number + ')|(?:(?:current(?:\\s+E-Money\\s+Account)?|available|remaining|account|new)?\\s*balance|bal)(?:\\s*(?:is(?:\\s*now)?|:))?\\s*(' + number + ')\\s*(?:ETB|Birr|ብር)|(?:(?:አሁን\\s*)?(?:ያለዎት|ያሎት|ያለው)?\\s*ቀሪ(?:\\s*ሂሳብ(?:ዎ)?)?)\\s*(?:ነው)?(?:[:\\s])*(?:ETB|Birr)?\\s*(' + number + ')\\s*ብር', 'i');
    const match = body.match(expression);
    const raw = match ? (match[1] || match[2] || match[3]) : undefined;
    if (!raw) return undefined;
    const clean = raw.replaceAll(',', '');
    return decimal.safeParse(clean).success ? santim(clean) : undefined;
}
export function isSensitiveOrNoise(body: string) {
    const isAuthCode = /\b(?:OTP|verification code|one[- ]time password|security code|confirmation code|PIN reset|ማረጋገጫ\s*ኮድ)\b/i.test(body);
    const isSecurityWarning = /(?:do not share|never share|never (?:ask|disclose)).*(?:code|PIN|password)/i.test(body);
    const hasMoney = /(?:ETB|Birr|ብር)\s*[0-9]|[0-9][0-9,]*(?:\.[0-9]{1,2})?\s*(?:ETB|Birr|ብር)/i.test(body);
    const hasTxVerb = /debited|credited|debit transaction|credit transaction|\bpaid\b|\brepaid\b|withdrawn|deposited|transferred|ልከዋል|አስተላልፈዋል|ተቀብለዋል|ተላልፏል|ወጪ|ገቢ|ከፍለዋል|ተከፍሏል/i.test(body);
    if (isAuthCode && (!hasTxVerb || !hasMoney)) return true;
    if (isSecurityWarning && !hasMoney && !hasTxVerb) return true;
    if (!postedDirection(body) && /promotion|recharge and get|lottery|spin & win|PIN.*(?:changed|updated)|login alert|overdue|outstanding.*credit|ያለብዎት.*የብድር/i.test(body)) return true;
    return false;
}
export function eligibleFinancialMessage(body: string) {
    if (isSensitiveOrNoise(body)) return false;
    const dir = postedDirection(body);
    const princ = principalEvidence(body);
    const money = moneyEvidence(body);
    return (princ.length > 0 || (!!dir && money.length > 0)) && money.length > 0;
}
export function sanitizeForAi(body: string) {
    let text = body.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const protectedValues: string[] = []; const protect = (value: string) => { protectedValues.push(value); return '§' + (protectedValues.length - 1) + '§'; };
    text = text.replace(/https?:\/\/[^\s]+/gi, url => { const ref = url.match(/(?:\/receipt\/|\/BranchReceipt\/|\/v2-|[?&]trx=)([A-Za-z0-9-]+)/i); return ref ? ' receipt reference ' + protect(url.includes('/v2-') ? 'v2-' + ref[1] : ref[1]) : ' [link removed]'; });
    text = text.replace(/((?:transaction(?: number| id)?(?: is)?|Txn ID|reference(?: is)?|Ref|ቁጥርዎ|በግብይት ቁጥር)\s*[:#]?\s*)([A-Za-z0-9-]{6,160})/gi, (_, prefix, value) => prefix + protect(value));
    text = text.replace(new RegExp('(?:ETB|Birr|ብር)\\s*' + number + '|' + number + '\\s*(?:ETB|Birr|ብር)', 'gi'), protect);
    text = text.replace(/(?<![\d,.])\+?\d{7,16}(?![\d,]|\.\d)/g, value => value.replace('+', '').slice(0, 1) + '***' + value.slice(-4));
    return text.replace(/§(\d+)§/g, (_, index) => protectedValues[Number(index)]);
}
export const geminiJsonSchema = { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: Object.fromEntries(['id', 'kind', 'direction', 'amount', 'serviceFee', 'vat', 'otherFee', 'balance', 'accountMask', 'reference', 'person', 'date', 'time', 'category', 'reason'].map(key => [key, key === 'id' || key === 'kind' || key === 'reason' ? { type: 'string' } : { type: ['string', 'null'] }])), required: ['id', 'kind', 'direction', 'amount', 'serviceFee', 'vat', 'otherFee', 'balance', 'accountMask', 'reference', 'person', 'date', 'time', 'category', 'reason'], additionalProperties: false } } }, required: ['results'], additionalProperties: false };
