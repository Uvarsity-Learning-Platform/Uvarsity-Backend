const crypto = require('crypto');

console.log('# JWT Configuration');
console.log(`JWT_SECRET="${crypto.randomBytes(64).toString('hex')}"`);
console.log('JWT_EXPIRES_IN="7d"');
console.log(`JWT_REFRESH_SECRET="${crypto.randomBytes(64).toString('hex')}"`);
console.log('JWT_REFRESH_EXPIRES_IN="30d"');
console.log('JWT_ACCESS_EXPIRES_IN="15m"');