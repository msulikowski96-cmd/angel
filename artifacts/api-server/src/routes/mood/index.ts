import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { moodLogsTable } from "@workspace/db/schema";
import { eq, desc, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const userId = Number(req.query.userId) || 1;
    const days = Number(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await db
      .select()
      .from(moodLogsTable)
      .where(eq(moodLogsTable.userId, userId))
      .orderBy(desc(moodLogsTable.createdAt))
      .limit(100);

    res.json(logs.map(l => ({
      id: l.id,
      userId: l.userId,
      moodScore: l.moodScore,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, moodScore, note } = req.body;
    const inserted = await db
      .insert(moodLogsTable)
      .values({ userId, moodScore, note: note ?? null })
      .returning();
    const l = inserted[0];
    res.status(201).json({
      id: l.id,
      userId: l.userId,
      moodScore: l.moodScore,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
