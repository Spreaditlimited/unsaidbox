export function validateDatabaseUrl(value) {
  if (!value) throw new Error('Set UNSAIDBOX_DATABASE_URL using dedicated database credentials.');
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid database URL. Run npm run db:configure.'); }
  if (url.protocol !== 'mysql:' || decodeURIComponent(url.pathname) !== '/unsaidbox') {
    throw new Error('Refusing connection: only the dedicated unsaidbox MySQL database is allowed.');
  }
  if (!url.username || !url.password) throw new Error('Dedicated database credentials are required.');
  if (decodeURIComponent(url.username) !== 'unsaidbox_app') throw new Error('Use only the restricted unsaidbox_app account.');
  if (url.searchParams.getAll('sslaccept').length !== 1 || url.searchParams.get('sslaccept') !== 'strict') {
    throw new Error('Certificate validation must remain enabled (sslaccept=strict).');
  }
  return value;
}

export function buildDatabaseUrl({ host, password, certificate = '' }) {
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) throw new Error('Enter only the database hostname or IPv4 address.');
  if (!password || /[\r\n\0]/.test(password)) throw new Error('Enter a password without line breaks.');
  const url = new URL(`mysql://unsaidbox_app@${host}:3306/unsaidbox`);
  url.password = encodeURIComponent(password);
  url.searchParams.set('sslaccept', 'strict');
  url.searchParams.set('connection_limit', '3');
  url.searchParams.set('connect_timeout', '10');
  url.searchParams.set('pool_timeout', '10');
  if (certificate) url.searchParams.set('sslcert', certificate);
  return validateDatabaseUrl(url.toString());
}
