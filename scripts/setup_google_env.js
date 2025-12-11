
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const key = `-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC8+v4gT1UXZF5c\\nihqnEtFnv+3XLndlG56qA5icjQiJAvwcoRI3vjmOdqfzwGF/ADSypR1lU6kfc8QQ\\n1MboioLRgySQJ7qmhEs+3nRwQmI2PP1z9hoYAIvPL2GSSjDiIf1tuvsUuT43Va33\\nUWaGQ+xtpu66ceSApxfoaIh3HtHnUJ9hJQ2/HPCvGWzHdm+b57A22kVpr56nCbkn\\ny8u989rFw//8bl5Oc/9L80lqUM4PJscsDdVVjwbk6vmxyYNtBf1C3rDc3Hs8jm80\\nf/v2UeyoGCU1Tlj47APyeFZ0JVqioYromnjWIbk1jA0+vCO94AMlsu2x88DfZF41\\nVUn/CoJXAgMBAAECggEAAYDpGPY4+nhERcvEj9oLoeUE2YyiEkjX7VjCJ9v/OGjp\\nlK3jCSy5YyyEMb9NYkzvt/+zr4ynHiDxwLbt04q/d4alisI1GF0AHa6xA83yVuRP\\npOauDLC0bA9DM7z76FwPATFiOna8tPZ87XJ0ndVjn+cX1vjj2WoDdLoA5efFfbeB\\nZUvJJBYbPjXZiUT6RPQ8xnFw5mI3dFygIR/IDdx/H7fJVfa739GjcRsZJEEE/dc1\\nGn1FkTNhOrDPP4qOyyCUMXVUq2Qr2etgtdbAP0jkzuIQ7q/j0Oc8H/I/0Pemc5qp\\ncdojjq84jOYKzf9wjDjWkaKZ1/3Z02JBed5kurqGgQKBgQDcVYjgvLmsbkR3fo4+\\nowad+5Fs13jgvQGtuFYMvR6pFbYgoRL3hlAcQ3dSNu3I4TPCqUwLpfLMpaYVm1Zp\\nylehyB5AZChpeP0r+6bsLXXoqmN87jeBVAsXx4aDv4T+UWtUwlErYEl2kAlI6lbl\\n4mGtjFa4D5co2xBUOl3mV/NbGQKBgQDbki/tWxZZyZdJVYHRJcb/XykiwpwA8mo2\\n9ag6WzSXIsE+o64dprXLKreyvXRNOT3xyOaX5jh+DZB8ZfNDW8Q/8gRkPx7WvPad\\nqRiVPnreOE0kuNnpfyiOkP2isSKcGBsedjk0h5h7tt9upGERYOETy6vvq4Byk9MX\\n1z6aFwDm7wKBgASD4DUyyN9GtzJ3rnSMJLOSFy3S0JBSbzlfIKxMJ9exMTVD976I\\nyxV5MHXH2GGYc9YWYA+RDAOzlU62CzRJyDfxgOUy6D0ZFJ8VHhuS5uqoqzdBLnQB\\nA+Ut2ozSnOgVRQzMmps38ulyFC6hVryJQhUrXg+Rijh1HMWNGKWCweLpAoGAB2rq\\n35PiL2pWCA4xcoVaMapfU2NLreSCnhSyeDY4kpqD+L/C1BGbtp9c0VcBJNK4OwDU\\neXE3m1qN9QXkr/Pbr2VXrKNNQWfk1PKvd+tCb1trj8AG7JJ1JkvTpbliN+/Aisjn\\nqdSi3BsTdUNsXA/vyqFoz5H1pulDilylKsN4LlUCgYEAgDPZwg42Dw7FJ2AWNuyo\\nI1+WcfFjRJWF0CdBQ0EK5t2ILZLPcEiL3SeRHublH5qGLR33JYvOXKD6aSxVfqMr\\nOJe5mjQGqPgSEfwgQp/GSEBJdUkWZB2li1L8qKWvTGh/ds96LhnDpJW++CzY0vXe\\nd6x4FqZtPE4G3hPAdiH6Nh8=\\n-----END PRIVATE KEY-----\\n`;

const email = 'waiver-uploader@songbirdliabilityrelease.iam.gserviceaccount.com';

let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

// Remove existing keys if present
content = content.replace(/^GOOGLE_CLIENT_EMAIL=.*$/gm, '');
content = content.replace(/^GOOGLE_PRIVATE_KEY=.*$/gm, '');

content += `\nGOOGLE_CLIENT_EMAIL="${email}"\n`;
content += `GOOGLE_PRIVATE_KEY="${key}"\n`;

fs.writeFileSync(envPath, content);
console.log('Updated .env with Google Credentials');
