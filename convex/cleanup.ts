import { mutation } from "./_generated/server";

export const purgeEmptyDebriefs = mutation({
  args: {},
  handler: async ctx => {
    const rows = await ctx.db.query("debriefs").collect();
    let n = 0;
    for (const r of rows) {
      if (!r.body || r.body.startsWith("1. Behavior Adjustment")) {
        await ctx.db.delete(r._id);
        n++;
      }
    }
    return n;
  },
});
