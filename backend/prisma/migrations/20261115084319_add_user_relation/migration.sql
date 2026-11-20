-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
