import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

function getWateringStatus(plant) {
  if (!plant.watering_interval || !plant.last_watered) return { status: "⚠️ Info manquante", urgent: false };
  const last = new Date(plant.last_watered);
  const next = new Date(last);
  next.setDate(last.getDate() + plant.watering_interval);
  if (new Date() >= next) return { status: "💧 À arroser aujourd'hui !", urgent: true };
  return { status: `✅ Prochain arrosage : ${next.toLocaleDateString()}`, urgent: false };
}

export default function Home() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from("plants").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        setPlants([]);
      } else {
        setPlants(data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>🌱 Bienvenue dans mon jardin</h1>
          <p>Liste de vos plantes et actions recommandées.</p>
        </div>
        <div>
          <button onClick={() => router.push("/add-plant")}>+ Ajouter une plante</button>
        </div>
      </header>

      {loading ? <p>Chargement...</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16, marginTop: 16 }}>
        {plants.map((p) => {
          const { status, urgent } = getWateringStatus(p);
          return (
            <div key={p.id} onClick={() => router.push(`/plant/${p.id}`)} style={{
              border: urgent ? "2px solid #f87171" : "1px solid #ddd",
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              background: "#fff"
            }}>
              <img src={p.image || "https://via.placeholder.com/400"} alt={p.name} style={{ width: "100%", height: 160, objectFit: "cover" }} />
              <div style={{ padding: 12 }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <p style={{ margin: "6px 0", color: "#666" }}>{p.scientific_name}</p>
                <p style={{ margin: 0, color: urgent ? "#b91c1c" : "#16a34a" }}>{status}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
