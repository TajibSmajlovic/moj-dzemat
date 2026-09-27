import type { RequestHandler } from "express";
import { IncomingMessage } from "node:http";
import type { Socket } from "node:net";

import { MAX_REQUEST_BYTES } from "../app/server/limits.server";

/** Counts bytes before Node exposes them to any middleware or form parser. */
export class LimitedIncomingMessage extends IncomingMessage {
  private bytes = 0;
  private oversized = false;

  constructor(socket: Socket) {
    super(socket);
    // Express replaces the request prototype, so the guard must belong to the instance.
    this.push = this.push.bind(this);
  }

  override push(chunk: Buffer | string | null, encoding?: BufferEncoding): boolean {
    if (this.oversized) return false;
    if (chunk !== null) {
      this.bytes += typeof chunk === "string" ? Buffer.byteLength(chunk, encoding) : chunk.length;
      if (this.bytes > MAX_REQUEST_BYTES) {
        this.oversized = true;
        this.socket.pause();
        this.emit("bodyLimitExceeded");
        return false;
      }
    }
    return super.push(chunk, encoding);
  }
}

export const enforceRequestLimit: RequestHandler = (req, res, next) => {
  const reject = () => {
    if (res.headersSent) {
      req.destroy();
      return;
    }
    // Flush the 413 before closing; an immediate destroy gives clients only a reset.
    res.setHeader("Connection", "close");
    res.once("finish", () => req.destroy());
    res.status(413).send("Payload too large");
  };

  if (Number(req.headers["content-length"] ?? 0) > MAX_REQUEST_BYTES) {
    reject();
    return;
  }
  req.once("bodyLimitExceeded", reject);
  req.once("close", () => req.removeListener("bodyLimitExceeded", reject));
  next();
};
