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