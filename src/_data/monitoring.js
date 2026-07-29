const dsn = process.env.SENTRY_DSN || "";

let sentryLoaderUrl = "";
if (dsn) {
  try {
    const publicKey = new URL(dsn).username;
    sentryLoaderUrl = publicKey ? `https://js.sentry-cdn.com/${publicKey}.min.js` : "";
  } catch {
    // An unset or malformed build secret must never stop a static-site deploy.
  }
}

export default { sentryLoaderUrl };
