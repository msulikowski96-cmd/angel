import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_USER_ID = 1;

router.get("/profile", async (_req, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID)).limit(1);
    if (users.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      sobrietyStart: user.sobrietyStart.toISOString(),
      addictionType: user.addictionType,
      dailySpend: user.dailySpend,
      checkInTime: user.checkInTime,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/profile", async (req, res) => {
  try {
    const { name, sobrietyStart, addictionType, dailySpend, checkInTime } = req.body;

    const existing = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID)).limit(1);

    let user;
    if (existing.length > 0) {
      const updated = await db
        .update(usersTable)
        .set({
          name,
          sobrietyStart: new Date(sobrietyStart),
          addictionType: addictionType ?? null,
          dailySpend: dailySpend ?? null,
          checkInTime: checkInTime ?? null,
        })
        .where(eq(usersTable.id, DEFAULT_USER_ID))
        .returning();
      user = updated[0];
    } else {
      const inserted = await db
        .insert(usersTable)
        .values({
          name,
          sobrietyStart: new Date(sobrietyStart),
          addictionType: addictionType ?? null,
          dailySpend: dailySpend ?? null,
          checkInTime: checkInTime ?? null,
        })
        .returning();
      user = inserted[0];
    }

    res.json({
      id: user.id,
      name: user.name,
      sobrietyStart: user.sobrietyStart.toISOString(),
      addictionType: user.addictionType,
      dailySpend: user.dailySpend,
      checkInTime: user.checkInTime,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
