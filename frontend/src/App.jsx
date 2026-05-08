export default function App() {
  return (
    <div style={{ display: "flex", height: "100vh", flexDirection: "column", fontFamily: "sans-serif", background: "#2d3a35" }}>
      <div style={{ padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div>
          <div style={{ color: "white", fontSize: "1.2rem", fontWeight: 500 }}>Анна — виртуальный психолог</div>
          <div style={{ color: "#7a9e87", fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>Клиент-центрированная терапия</div>
        </div>
        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", textAlign: "right", lineHeight: 1.6 }}>
          Консультация носит поддерживающий характер<br/>и не заменяет медицинскую помощь
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <iframe
          src="https://studio.d-id.com/agents/share?id=v2_agt_bxMuRmCo&utm_source=copy&key=Y2tfdGpGSEZUdzh1b2Nxa0JVMVBMY0Fl"
          allow="microphone; camera"
          style={{ width: "100%", height: "calc(100% + 60px)", border: "none", marginBottom: "-60px" }}
          title="Анна — психолог"
        />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "#2d3a35", zIndex: 10 }} />
      </div>
    </div>
  );
}