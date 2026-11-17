export function isWarehouseDemoOwner(mode: 'mock' | 'http') {
  return (
    process.env.NODE_ENV === 'development' &&
    mode === 'http' &&
    process.env.NEXT_PUBLIC_WAREHOUSE_DEMO_OWNER === 'true'
  );
}
