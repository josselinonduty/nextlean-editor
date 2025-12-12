import { pipeline } from "@huggingface/transformers";

class HuggingFaceLocalEmbeddings {
  private readonly model: string;
  private pipe: any = null;

  constructor(fields: { model: string }) {
    this.model = fields.model;
  }

  private async getPipeline() {
    if (!this.pipe) {
      this.pipe = await pipeline("feature-extraction", this.model);
    }
    return this.pipe;
  }

  async embedQuery(text: string): Promise<number[]> {
    const pipe = await this.getPipeline();
    const output = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const pipe = await this.getPipeline();
    const output = await pipe(documents, { pooling: "mean", normalize: true });
    return output.tolist();
  }
}

let sharedModel: HuggingFaceLocalEmbeddings | null = null;

export const getEmbeddingModel = async () => {
  sharedModel ??= new HuggingFaceLocalEmbeddings({
    model: "Xenova/all-MiniLM-L6-v2",
  });
  return sharedModel;
};

export const embedText = async (text: string) => {
  const model = await getEmbeddingModel();
  return model.embedQuery(text);
};

export const embedDocuments = async (documents: string[]) => {
  const model = await getEmbeddingModel();
  return model.embedDocuments(documents);
};
