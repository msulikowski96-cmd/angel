import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { buddyConnectionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/connection", async (req, res) => {
  try {
    const userId = Number(req.query.userId) || 1;
    const connections = await db
      .select()
      .from(buddyConnectionsTable)
      .where(eq(buddyConnectionsTable.userId, userId))
      .limit(1);
    if (connections.length === 0) {
      res.status(404).json({ error: "No buddy connection found" });
      return;
    }
    const c = connections[0];
    res.json({
      id: c.id,
      userId: c.userId,
      sponsorId: c.sponsorId,
      code: c.code,
      createdAt: c.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/connection", async (req, res) => {
  try {
    const { userId, code } = req.body;
    const existing = await db
      .select()
      .from(buddyConnectionsTable)
      .where(eq(buddyConnectionsTable.userId, userId))
      .limit(1);

    let connection;
    if (existing.length > 0) {
      const updated = await db
        .update(buddyConnectionsTable)
        .set({ code })
        .where(eq(buddyConnectionsTable.userId, userId))
        .returning();
      connection = updated[0];
    } else {
      const inserted = await db
        .insert(buddyConnectionsTable)
        .values({ userId, code, sponsorId: null })
        .returning();
      connection = inserted[0];
    }

    res.json({
      id: connection.id,
      userId: connection.userId,
      sponsorId: connection.sponsorId,
      code: connection.code,
      createdAt: connection.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
