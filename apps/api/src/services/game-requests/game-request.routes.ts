import { Request, Response, Router } from "express";
import { requireAuth } from "../../gateway/middleware/auth.middleware";
import { createGameRequest } from "./game-request.service";

const router = Router();

// POST /game-requests — submit a game request (auth required)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { request_text } = req.body as { request_text?: string };
    if (!request_text?.trim()) {
      res.status(400).json({ error: "Game name, Steam URL, or App ID is required" });
      return;
    }
    if (request_text.trim().length > 512) {
      res.status(400).json({ error: "Request text must be under 512 characters" });
      return;
    }
    const customerId = Number(req.user!.sub);
    await createGameRequest(customerId, request_text);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("[game-requests] error:", err);
    res.status(500).json({ error: "Failed to save your request" });
  }
});

export default router;
