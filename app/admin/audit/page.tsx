export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AdminAuditPage() {
  return (
    <div style={{ padding: "40px 18px", textAlign: "center", color: "#9A8B73", fontFamily: "'Quicksand', system-ui, sans-serif" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#2A2A28", marginBottom: 6 }}>Audit</div>
      <div style={{ fontSize: 13 }}>Every admin action and key event, logged — building this alongside the user control actions.</div>
    </div>
  );
}
