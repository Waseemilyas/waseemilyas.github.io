const dsn = process.env.SENTRY_DSN || "";

let sentryLoaderUrl = "";
let sentryDsnJson = "";
if (dsn) {
  try {
    const dsnUrl = new URL(dsn);
    const publicKey = dsnUrl.username;
    const hostnameParts = dsnUrl.hostname.split(".");
    const ingestIndex = hostnameParts.indexOf("ingest");
    const region = hostnameParts[ingestIndex + 1];
    const sentryIngestHost =
      ingestIndex > 0 &&
      ["sentry", "io"].every((part, index) =>
        hostnameParts[hostnameParts.length - 2 + index] === part,
      );
    const cdnHost = region && region !== "sentry"
      ? `js-${region}.sentry-cdn.com`
      : "js.sentry-cdn.com";

    sentryLoaderUrl = publicKey && sentryIngestHost
      ? `https://${cdnHost}/${publicKey}.min.js`
      : "";
    sentryDsnJson = sentryLoaderUrl ? JSON.stringify(dsnUrl.href) : "";
  } catch {
    // An unset or malformed build secret must never stop a static-site deploy.
  }
}

export default { sentryLoaderUrl, sentryDsnJson };
