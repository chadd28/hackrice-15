declare module 'pdf-extract' {
  export class PDFExtract {
    extract(filePath: string, options: any, callback: (err: any, data: any) => void): void;
  }
}

declare module 'cohere-ai' {
  // Minimal stub for cohere-ai used by the codebase. Extend if more API surface is used.
  export interface CohereEmbedResponse {
    embeddings: {
      float: number[][];
    };
  }

  export class CohereClientV2 {
    constructor(opts: { apiKey?: string; token?: string });
    embed(options: { texts?: string[]; model?: string; inputType?: string; embeddingTypes?: string[] }): Promise<CohereEmbedResponse>;
  }

  const defaultExport: { CohereClientV2: typeof CohereClientV2 };
  export default defaultExport;
}

declare module '@google/generative-ai' {
  // Very small stub for GoogleGenerativeAI usage in repo
  export class GoogleGenerativeAI {
    constructor(apiKey?: string);
    getGenerativeModel(opts: { model: string }): any;
  }
}
