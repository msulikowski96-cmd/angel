import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { guardiansTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const userId = Number(req.query.userId) || 1;
    const guardians = await db.select().from(guardiansTable).where(eq(guardiansTable.userId, userId));
    res.json(guardians.map(g => ({
      id: g.id,
      userId: g.userId,
      name: g.name,
      phone: g.phone,
      relationship: g.relationship,
      createdAt: g.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, name, phone, relationship } = req.body;
    const inserted = await db
      .insert(guardiansTable)
      .values({ userId, name, phone, relationship: relationship ?? null })
      .returning();
    const g = inserted[0];
    res.status(201).json({
      id: g.id,
      userId: g.userId,
      name: g.name,
      phone: g.phone,
      relationship: g.relationship,
      createdAt: g.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(guardiansTable).where(eq(guardiansTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
