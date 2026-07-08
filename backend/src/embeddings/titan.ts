import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = process.env.BEDROCK_EMBED_MODEL_ID ?? "amazon.titan-embed-text-v2:0";

// Must match VECTOR(1024) in the schema. Changing this means re-embedding everything.
export const EMBEDDING_DIMENSIONS = 1024;

export async function embedText(text: string): Promise<number[]> {
  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      body: JSON.stringify({
        inputText: text,
        dimensions: EMBEDDING_DIMENSIONS,
        normalize: true,
      }),
    }),
  );
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.embedding;
}

/** The canonical embedding input for a listing (see docs/architecture.md). */
export function listingEmbeddingText(l: {
  title: string;
  description: string;
  brand: string | null;
  category: string;
}): string {
  return [l.title, l.description, l.brand ?? "", l.category]
    .filter(Boolean)
    .join("\n");
}
