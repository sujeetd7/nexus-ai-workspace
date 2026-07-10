// Simple test script to call the execute-published endpoint
// Usage: node tools/test-execute-published.js <promptId>

const promptId = process.argv[2] || "12e16b54-b495-4f9c-85a6-5aa84e61be2c";

async function run() {
  const body = {
    promptId,
    variables: {
      language: "TypeScript",
      code: "const x = []; x.map(a => console.log(a));",
    },
  };

  const res = await fetch(
    "http://localhost:3005/api/v1/prompts/execute-published",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));

  if (!res.ok) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(2);
});
