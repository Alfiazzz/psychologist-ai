export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1a2420", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ background: "#2d3a35", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(122,158,135,0.2)", border: "1.5px solid #7a9e87", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🌿</div>
          <div>
            <div style={{ color: "white", fontSize: "18px", fontWeight: 500 }}>Анна</div>
            <div style={{ color: "#7a9e87", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>Психолог-консультант</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "6px 14px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#7a9e87" }} />
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Онлайн</div>
        </div>
      </div>

      {/* Увеличена до 90px чтобы закрыть кнопки D-ID */}
      <div style={{ background: "#2d3a35", height: 90, flexShrink: 0, zIndex: 10 }} />

      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <iframe
          src="https://studio.d-id.com/agents/share?id=v2_agt_bxMuRmCo&utm_source=copy&key=Y2tfdGpGSEZUdzh1b2Nxa0JVMVBMY0Fl"
          allow="microphone; camera"
          style={{ width: "100%", height: "calc(100% + 150px)", border: "none", marginTop: "-90px", marginBottom: "-60px" }}
          title="Анна — психолог"
        />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "#1a2420", zIndex: 10 }} />
      </div>

      <div style={{ background: "#1a2420", height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 10 }}>
        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", textAlign: "center" }}>
          Консультация носит поддерживающий характер и не заменяет медицинскую помощь
        </div>
      </div>

    </div>
  );
}
