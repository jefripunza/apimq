// server.ts
const server = Bun.serve({
  port: 4000,
  async fetch(request) {
    console.log("-------------------------------------------------------");

    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const headers = Object.fromEntries(request.headers.entries());

    let rawBody: string | null = null;
    let jsonBody: unknown = null;

    try {
      rawBody = await request.text();
      if (rawBody) {
        try {
          jsonBody = JSON.parse(rawBody);
        } catch {
          jsonBody = null;
        }
      }
    } catch {
      rawBody = null;
      jsonBody = null;
    }

    console.log("Method:", request.method);
    console.log("Path:", url.pathname);
    console.log("Query:", query);
    console.log("Headers:", headers);
    console.log("Body (raw):", rawBody);
    console.log("Body (json):", jsonBody);

    return Response.json({
      message: "OK!",
      method: request.method,
      path: url.pathname,
      query,
      headers,
      body: jsonBody ?? rawBody,
    });
  },
});

console.log(`Listening on ${server.url}`);
