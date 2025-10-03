import { useState } from "react";
import supabase from "../lib/supabase";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AddPlant() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("Aucune action.");
  const [loading, setLoading] = useState(false);

  async function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus("Analyse en cours...");
    setLoading(true);

    try {
      // 1) convertir en base64 (sans préfixe)
      const b64 = await fileToBase64(f);

      // 2) demander au serveur d'identifier (server: /api/identify)
      setStatus("Identification via Plant.id...");
      const idResp = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 })
      });
      const idJson = await idResp.json();
      const name = idJson?.name;
      if (!name) {
        setStatus("Plante non identifiée automatiquement — tu peux ajouter manuellement ci-dessous.");
        setLoading(false);
        return;
      }
      setStatus(`Plante détectée : ${name}. Récupération des infos...`);

      // 3) demander la fiche Trefle (server: /api/trefle?name=...)
      const trefleResp = await fetch(`/api/trefle?name=${encodeURIComponent(name)}`);
      const trefleJson = await trefleResp.json();
      const plant = trefleJson?.plant;
      const details = trefleJson?.details;

      // 4) estimer watering_interval côté client selon details (simple)
      let watering_interval = 7;
      try {
        const growth = details?.data?.main_species?.growth;
        const tol = growth?.shade_tolerance;
        if (tol === "intolerant") watering_interval = 2;
        else if (tol === "intermediate") watering_interval = 5;
        else if (tol === "tolerant") watering_interval = 10;
      } catch (e) { watering_interval = 7; }

      setStatus("Téléversement de la photo sur Supabase...");
      const path = `test-user/${Date.now()}_${f.name}`;
      const { error: upErr } = await supabase.storage.from("plant-photos").upload(path, f, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("plant-photos").getPublicUrl(path);

      setStatus("Sauvegarde en base de données...");
      const { error: insertErr } = await supabase.from("plants").insert([{
        user_id: "test-user",
        name: plant?.common_name || name,
        scientific_name: details?.data?.scientific_name || "",
        family: plant?.family || "",
        image: urlData?.publicUrl || null,
        watering_interval,
        last_watered: new Date().toISOString(),
        sunlight: details?.data?.main_species?.growth?.light || null,
        soil: details?.data?.main_species?.growth?.soil_texture || null,
        harvest: details?.data?.main_species?.growth?.harvest_time || null,
        notes: details?.data?.main_species?.growth?.description || null
      }]);
      if (insertErr) throw insertErr;

      setStatus(`✅ Plante ajoutée : ${plant?.common_name || name}`);
    } catch (err) {
      console.error(err);
      setStatus("Erreur: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // ajout manuel par nom
  async function addByName(name) {
    if (!name) return alert("Entre un nom");
    setLoading(true);
    setStatus("Recherche Trefle puis sauvegarde...");
    try {
      const trefleResp = await fetch(`/api/trefle?name=${encodeURIComponent(name)}`);
      const trefleJson = await trefleResp.json();
      const plant = trefleJson?.plant;
      const details = trefleJson?.details;
      if (!plant) {
        setStatus("Plante non trouvée sur Trefle.");
        setLoading(false);
        return;
      }
      let watering_interval = 7;
      try {
        const growth = details?.data?.main_species?.growth;
        const tol = growth?.shade_tolerance;
        if (tol === "intolerant") watering_interval = 2;
        else if (tol === "intermediate") watering_interval = 5;
        else if (tol === "tolerant") watering_interval = 10;
      } catch (e) {}
      const { error } = await supabase.from("plants").insert([{
        user_id: "test-user",
        name: plant?.common_name || name,
        scientific_name: details?.data?.scientific_name || "",
        family: plant?.family || "",
        image: plant?.image_url || null,
        watering_interval,
        last_watered: new Date().toISOString(),
        sunlight: details?.data?.main_species?.growth?.light || null,
        soil: details?.data?.main_species?.growth?.soil_texture || null,
        harvest: details?.data?.main_species?.growth?.harvest_time || null,
        notes: details?.data?.main_species?.growth?.description || null
      }]);
      if (error) throw error;
      setStatus(`✅ Plante ajoutée : ${plant?.common_name || name}`);
    } catch (err) {
      console.error(err);
      setStatus("Erreur: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Ajouter une plante (photo)</h2>

      <input type="file" accept="image/*" onChange={onFileChange} disabled={loading} />
      {preview ? <div style={{ marginTop: 12 }}><img src={preview} alt="preview" style={{ width: 240, borderRadius: 8 }} /></div> : null}

      <div style={{ marginTop: 12 }}>
        <p>Status: {status}</p>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <h3>Ou : ajouter manuellement par nom</h3>
      <ManualAdd onAdd={addByName} disabled={loading} />
    </div>
  );
}

function ManualAdd({ onAdd, disabled }) {
  const [name, setName] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: basilic" />
      <button onClick={() => onAdd(name)} disabled={disabled}>Ajouter</button>
    </div>
  );
}
