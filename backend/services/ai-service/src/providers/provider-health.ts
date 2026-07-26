import axios from "axios";

export async function checkOllamaHealth(): Promise<boolean> {
  console.log("OLLAMA URL:", process.env.OLLAMA_BASE_URL);

  try {
    await axios.get(`${process.env.OLLAMA_BASE_URL}/api/tags`, {
      timeout: 3000,
    });

    return true;
  } catch (error) {
    console.error("Ollama Health Error:", error);
    return false;
  }
}
