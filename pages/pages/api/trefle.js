export default async function handler(req, res) {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "name query required" });
  try {
    const token = process.env.TREFLE_TOKEN;
    const s = await fetch(`https://trefle.io/api/v1/plants/search?token=${token}&q=${encodeURIComponent(name)}`);
    const search = await s.json();
    const plant = search?.data?.[0];
    if (!plant) return res.status(404).json({ error: "no plant found" });
    const d = await fetch(`https://trefle.io/api/v1/species/${plant.id}?token=${token}`);
    const details = await d.json();
    res.status(200).json({ plant, details });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
}
