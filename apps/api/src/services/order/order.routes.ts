import { Router, Request, Response } from "express";
import { requireAuth } from "../../gateway/middleware/auth.middleware";
import { createOrder, getOrdersByCustomer, deleteOrder } from "./order.service";
import { CreateOrderRequest } from "shared";

const router = Router();

// POST /orders — create a new order
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateOrderRequest;

    if (!data.game_ids || data.game_ids.length === 0) {
      res.status(400).json({ error: "At least one game_id is required" });
      return;
    }

    const customerId = Number(req.user!.sub);
    const result = await createOrder(customerId, data);
    res.status(201).json(result);
  } catch (err) {
    console.error("[orders] create error:", err);
    res.status(400).json({ error: (err as Error).message });
  }
});

// GET /orders — current user's order history (paginated)
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const result = await getOrdersByCustomer(customerId, page, pageSize);
    res.json(result);
  } catch (err) {
    console.error("[orders] list error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// DELETE /orders/:id — soft-delete (customer, DONE/CANCELED only)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.user!.sub);
    const orderId = Number(req.params.id);
    const result = await deleteOrder(orderId, customerId);
    if (!result.ok) { res.status(400).json({ error: result.error }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error("[orders] delete error:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

export default router;
