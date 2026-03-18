import { Router, Request, Response } from "express";
import { updateOrderStatus } from "./order.service";

const router = Router();

const frontendUrl = () =>
  process.env.NEXT_PUBLIC_API_URL?.replace(":3001", ":3000") ?? "http://localhost:3000";

// ── Koko webhooks (stubs — payment gateway integration pending) ──
router.post("/koko/response", async (_req: Request, res: Response) => {
  // TODO: verify Koko signature and call updateOrderStatus()
  res.status(200).send("OK");
});

router.get("/koko/return", (req: Request, res: Response) => {
  res.redirect(`${frontendUrl()}/orders?orderId=${req.query.orderId}&status=returned`);
});

router.get("/koko/cancel", (req: Request, res: Response) => {
  res.redirect(`${frontendUrl()}/orders?orderId=${req.query.orderId}&status=cancelled`);
});

// ── Mintpay webhook (stub) ────────────────────────────────────
router.post("/mintpay/response", async (_req: Request, res: Response) => {
  // TODO: verify Mintpay signature and call updateOrderStatus()
  res.status(200).send("OK");
});

export default router;
