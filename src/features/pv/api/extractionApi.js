export async function extractPvsyst(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    "http://localhost:8000/extract/pvsyst",
    {
      method: "POST",
      body: formData,
    }
  );

  return response.json();
}
// Helper for the ashare 
export async function generateAshrae(latitude, longitude) {
  const response = await fetch(
    "http://localhost:8000/ashrae",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    }
  );

  return response.json();
}