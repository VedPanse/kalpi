import React, { useState } from "react";
// Paste new code from the Label to Shelf plugin into LabelToShelf3D.jsx to update the product.
import LabelToShelf3D from "./LabelToShelf3D.jsx";
import StoreRooms3D from "./StoreRooms3D.jsx";

export default function App() {
  const [view, setView] = useState("store");
  const tab = (id, label) => (
    <button onClick={() => setView(id)}
      style={{ font: "inherit", fontSize: 13, padding: "7px 13px", borderRadius: 8, cursor: "pointer", border: "1px solid #ddd",
        background: view === id ? "#b4aaff" : "#fff", color: "#0b0b10" }}>{label}</button>
  );
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 6, padding: 10 }}>{tab("shelf", "Product")}{tab("store", "Store")}</div>
      <div style={{ flex: 1, position: "relative" }}>
        {view === "shelf" ? <LabelToShelf3D /> : <StoreRooms3D />}
      </div>
    </div>
  );
}
