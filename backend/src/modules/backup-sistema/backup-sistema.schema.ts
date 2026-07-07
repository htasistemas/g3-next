import { z } from "zod";

export const backupSistemaRestaurarSchema = z.object({
  backupId: z.string().trim().min(1, "Backup não informado.")
});
