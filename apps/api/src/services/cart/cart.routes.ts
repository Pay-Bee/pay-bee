import { Router, Request, Response } from "express";
import { requireAuth } from "../../gateway/middleware/auth.middleware";
import { addToCart, removeFromCart, getCart } from "./cart.service";

const router = Router();

// GET /cart — fetch current user's active cart items
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const items = await getCart(customerId);
    res.json(items);
  } catch (err) {
    console.error("[cart] get error:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// POST /cart — add item (or reactivate if previously removed)
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const { gameId } = req.body;
    if (!gameId || isNaN(Number(gameId))) {
      res.status(400).json({ error: "gameId is required" });
      return;
    }
    await addToCart(customerId, Number(gameId));
    res.json({ ok: true });
  } catch (err) {
    console.error("[cart] add error:", err);
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

// DELETE /cart/:gameId — soft-delete (set active = FALSE)
router.delete("/:gameId", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const gameId = Number(req.params.gameId);
    if (isNaN(gameId)) {
      res.status(400).json({ error: "Invalid gameId" });
      return;
    }
    await removeFromCart(customerId, gameId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[cart] remove error:", err);
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

export default router;
