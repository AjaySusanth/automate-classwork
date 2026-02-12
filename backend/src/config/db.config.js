import { PrismaClient } from "../generated/index.js";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

// Prisma client points to the custom generated output configured in prisma/schema.prisma
// Use Prisma driver adapter for direct Postgres connections (no Accelerate)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;