import { serve } from "bun";
import getChannels from "./api/getChannels";
import getMatches from "./api/getMatches";
import getEvents from "./api/getEvents";

const server = serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url);

    // Mock res object compatible with Vercel serverless functions
    let responseData: any = null;
    const mockRes = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      setHeader(key: string, value: string) {
        this.headers[key] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
      end() {
        responseData = null;
        return this;
      },
    };

    // Mock req object
    const mockReq = {
      method: req.method,
      headers: {
        origin: req.headers.get("origin"),
      },
    };

    // Route handlers
    if (url.pathname === "/api/getChannels") {
      getChannels(mockReq, mockRes);
    } else if (url.pathname === "/api/getMatches") {
      getMatches(mockReq, mockRes);
    } else if (url.pathname === "/api/getEvents") {
      getEvents(mockReq, mockRes);
    } else {
      return new Response("Not Found", { status: 404 });
    }

    // Return the response
    if (responseData === null) {
      return new Response(null, {
        status: mockRes.statusCode,
        headers: mockRes.headers,
      });
    }

    return new Response(JSON.stringify(responseData), {
      status: mockRes.statusCode,
      headers: {
        "Content-Type": "application/json",
        ...mockRes.headers,
      },
    });
  },
});

console.log(`\n🚀 Test server running at http://localhost:${server.port}\n`);
console.log("Available endpoints:");
console.log(`  - http://localhost:${server.port}/api/getChannels`);
console.log(`  - http://localhost:${server.port}/api/getMatches`);
console.log(`  - http://localhost:${server.port}/api/getEvents\n`);
