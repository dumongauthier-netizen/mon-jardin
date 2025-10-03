import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../lib/supabase";

function getWateringStatus(plant) {
  if (!plant?.watering_interval || !plant?.last_watered) return { status: "⚠️ Info manquante", urgent: false };
  const last = new Date(plant.last_watered);
  const next = new Date(last);
  next.setDate(last.getDate() + plant.watering_interval);
  if (new Date() >= next) return { status: "💧 À arroser aujourd'hui !", urgent: true };
  return { status: `✅ Prochain arrosage : ${next.toLocaleDateString()}`, urgent: false };
}

export default function PlantPage() {
  const router = useRouter();
  const { id } = router.query;
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from("plants").select("*").eq("id", id).single();
      if (error) {
        console.error(error);
        setPlant(null);
      } else {
        setPlant(data || null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function markAsWatered() {
    if (!plant) return;
    const { error } = await supabase.from("plants").update({ last_watered: new Date().toISOString() }).eq("id", plant.id);
    if (error) console.error(error);
    else {
      alert("💧 Marquée comme arrosée !");
      // reload
      const { data } = await supabase.from("plants").select("*").eq("id", plant.id).single();
      setPlant(data);
    }
  }

  if (loading) return <p>Chargement...</p>;
  if (!plant) return <p>Plante introuvable.</p>;

  const { status, urgent } = getWateringStatus(plant);

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => router.back()}>⬅ Retour</button>
      <div style={{ marginTop: 12, border: "1px solid #ddd", padding: 16, borderRadius: 12, background: "#fff" }}>
        <img src={plant.image || "https://via.placeholder.com/600"} alt={plant.name} style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 8 }} />
        <h1>{plant.name}</h1>
        <p style={{ color: "#666", fontStyle: "italic" }}>{plant.scientific_name}</p>
        <p>Famille: {plant.family}</p>

        <div style={{ padding: 10, borderRadius: 8, background: urgent ? "#fee2e2" : "#ecfccb", color: urgent ? "#991b1b" : "#365314", marginTop: 8 }}>
          {status}
        </div>

        <button onClick={markAsWatered} style={{ marginTop: 12 }}>💧 Marquer comme arrosée</button>

        <div style={{ marginTop: 16 }}>
          <h3>Conseils</h3>
          <ul>
            {plant.sunlight && <li>☀️ Soleil : {plant.sunlight}</li>}
            {plant.soil && <li>🌍 Sol : {plant.soil}</li>}
            {plant.harvest && <li>🌾 Récolte : {plant.harvest}</li>}
            {plant.notes && <li>ℹ️ {plant.notes}</li>}
            {!plant.sunlight && !plant.soil && !plant.harvest && !plant.notes && <li>Pas d'informations supplémentaires.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
