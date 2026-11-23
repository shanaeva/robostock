-- CreateEnum
CREATE TYPE "StationDirection" AS ENUM ('north', 'south', 'east', 'west');

-- CreateTable
CREATE TABLE "obstacles" (
    "id" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "obstacles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "direction" "StationDirection" NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "robots" (
    "id" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "robots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "obstacles_warehouseId_x_y_key" ON "obstacles"("warehouseId", "x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "stations_warehouseId_x_y_key" ON "stations"("warehouseId", "x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "robots_warehouseId_x_y_key" ON "robots"("warehouseId", "x", "y");

-- AddForeignKey
ALTER TABLE "obstacles" ADD CONSTRAINT "obstacles_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stations" ADD CONSTRAINT "stations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "robots" ADD CONSTRAINT "robots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Prisma cannot express CHECK constraints. Upper bounds depend on the
-- warehouse size and are validated by the service.
ALTER TABLE "obstacles" ADD CONSTRAINT "obstacles_coordinates_check" CHECK ("x" >= 0 AND "y" >= 0);
ALTER TABLE "stations" ADD CONSTRAINT "stations_coordinates_check" CHECK ("x" >= 0 AND "y" >= 0);
ALTER TABLE "robots" ADD CONSTRAINT "robots_coordinates_check" CHECK ("x" >= 0 AND "y" >= 0);
