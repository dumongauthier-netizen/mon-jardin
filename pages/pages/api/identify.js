export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { image } = req.body; // base64 string (sans prefix)
    const response = await fetch("https://api.plant.id/v2/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": process.env.PLANT_ID_KEY
      },
      body: JSON.stringify({
        images: [image],
        modifiers: ["similar_images"],
        plant_details: ["common_names", "taxonomy"]
      })
    });
    const data = await response.json();
    const suggestion = data?.suggestions?.[0];
    const name = suggestion?.plant_name || suggestion?.plant_details?.common_names?.[0] || null;
    res.status(200).json({ name, raw: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
}
