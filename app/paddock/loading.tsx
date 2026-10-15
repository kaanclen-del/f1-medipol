export default function PaddockLoading() {
  return (
    <main style={{ minHeight: "100vh", background: "#060606", color: "white", padding: "34px 20px 90px" }}>
      <div style={{ maxWidth: 1450, margin: "0 auto" }}>
        <div style={{ height: 10, width: 155, borderRadius: 5, background: "#7f1b2b", marginBottom: 20 }} />
        <h1 style={{ fontSize: "clamp(36px, 5vw, 64px)", margin: "0 0 14px" }}>Paddock</h1>
        <p style={{ color: "#a6a6a6", marginBottom: 32 }}>Topluluk gönderileri yükleniyor…</p>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)", gap: 24 }}>
          <section aria-label="Gönderiler yükleniyor" style={{ padding: 22, background: "#101010", border: "1px solid #252525", borderRadius: 18 }}>
            {[0, 1, 2].map((item) => (
              <div key={item} style={{ padding: "18px 0", borderBottom: "1px solid #282828" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#303036", flexShrink: 0 }} />
                  <div style={{ width: "35%", height: 13, background: "#303036", borderRadius: 6 }} />
                </div>
                <div style={{ height: 13, width: "85%", background: "#242428", borderRadius: 6, marginBottom: 10 }} />
                <div style={{ height: 13, width: "60%", background: "#242428", borderRadius: 6 }} />
              </div>
            ))}
          </section>
          <aside style={{ minHeight: 200, background: "#101010", borderRadius: 18, border: "1px solid #252525", padding: 18 }}>
            <div style={{ height: 18, width: "50%", borderRadius: 6, background: "#292929", marginBottom: 18 }} />
            <div style={{ height: 12, width: "80%", borderRadius: 6, background: "#242424" }} />
          </aside>
        </div>
      </div>
    </main>
  );
}
