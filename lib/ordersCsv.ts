export interface OrderCsvRow {
  id: string;
  created_at: string;
  status: string;
  source: string;
  total_quantity: number;
  itemCount: number;
  email: string;
  company: string;
  country: string;
}

const esc = (s: string | number) => `"${String(s ?? "").replace(/"/g, '""')}"`;

export function ordersToCsv(rows: OrderCsvRow[]): string {
  const header = ["Order ID", "Created", "Customer", "Company", "Country", "Status", "Source", "Total units", "Items"];
  const body = rows.map((r) =>
    [r.id, r.created_at, r.email, r.company, r.country, r.status, r.source, r.total_quantity, r.itemCount]
      .map(esc)
      .join(","),
  );
  return [header.map(esc).join(","), ...body].join("\n");
}
