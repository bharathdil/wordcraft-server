import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  /*app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });*/
  app.use(
    cors({
      origin: "*",            // allow all origins (for now)
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );

  app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "wordcraft-server" });
});

  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);
  await registerRoutes(app);
  setupErrorHandler(app);

  // ✅ Create ONE HTTP server
  const httpServer = http.createServer(app);

  // ✅ Attach WebSocket to SAME server
 const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

type Client = {
  id: string;
  socket: any;
  room?: string;
  name?: string;
};

const clients = new Map<string, Client>();
//const rooms = new Map<string, Client[]>();

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/*wss.on("connection", (socket) => {
  const id = Math.random().toString(36).slice(2);
  clients.set(id, { id, socket });

  console.log("WS Connected:", id);*/
const rooms = new Map<
  string,
  { players: { id: string; name: string; ws: any }[] }
>();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on("connection", (ws) => {
  const playerId = Math.random().toString(36).slice(2);
  console.log("WS Connected: playerId", playerId);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // ✅ CREATE ROOM
    if (msg.type === "create_room") {
      const code = generateCode();
      rooms.set(code, { players: [{ id: playerId, name: msg.name, ws }] });

      ws.send(
        JSON.stringify({
          type: "room_created",
          code,
          playerId,
        })
      );
    }

    // ✅ JOIN ROOM
    if (msg.type === "join_room") {
      const room = rooms.get(msg.code);
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
        return;
      }

      room.players.push({ id: playerId, name: msg.name, ws });

      ws.send(
        JSON.stringify({
          type: "room_joined",
          code: msg.code,
          playerId,
        })
      );

      // notify other player
      room.players.forEach((p) => {
        if (p.ws !== ws) {
          p.ws.send(JSON.stringify({ type: "game_started" }));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("WebSocket disconnected");
  });
});
 /* socket.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    const client = clients.get(id)!;

    // CREATE ROOM
    if (msg.type === "create_room") {
      const code = randomCode();

      client.room = code;
      client.name = msg.name;

      rooms.set(code, [client]);

      socket.send(JSON.stringify({
        type: "room_created",
        code,
        playerId: id,
      }));
    }

    // JOIN ROOM
    if (msg.type === "join_room") {
      const room = rooms.get(msg.code);

      if (!room) {
        return socket.send(JSON.stringify({
          type: "error",
          message: "Room not found"
        }));
      }

      client.room = msg.code;
      client.name = msg.name;
      room.push(client);

      socket.send(JSON.stringify({
        type: "room_joined",
        code: msg.code,
        playerId: id,
      }));

      // notify both players
      room.forEach(c => {
        c.socket.send(JSON.stringify({ type: "game_started" }));
      });
    }
  });

  socket.on("close", () => {
    clients.delete(id);
    console.log("WS Disconnected:", id);
  });
});
*/

// ✅ Render provides PORT
  const PORT = Number(process.env.PORT || 5000);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
  });
})();
