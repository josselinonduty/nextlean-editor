import { pipeline } from "@huggingface/transformers";

type FeatureExtractionPipeline = Awaited<
  ReturnType<typeof pipeline<"feature-extraction">>
>;

class HuggingFaceLocalEmbeddings {
  private readonly model: string;
  private pipe: FeatureExtractionPipeline | null = null;

  constructor(fields: { model: string }) {
    this.model = fields.model;
  }

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    this.pipe ??= await pipeline("feature-extraction", this.model);
    return this.pipe;
  }

  async embedQuery(text: string): Promise<number[]> {
    const pipe = await this.getPipeline();
    const output = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Iterable<number>);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const pipe = await this.getPipeline();
    const output = await pipe(documents, { pooling: "mean", normalize: true });
    return (output as { tolist: () => number[][] }).tolist();
  }
}

let sharedModel: HuggingFaceLocalEmbeddings | null = null;

export const getEmbeddingModel =
  async (): Promise<HuggingFaceLocalEmbeddings> => {
    sharedModel ??= new HuggingFaceLocalEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });
    return sharedModel;
  };

export const embedText = async (text: string): Promise<number[]> => {
  const model = await getEmbeddingModel();
  return model.embedQuery(text);
};

export const embedDocuments = async (
  documents: string[],
): Promise<number[][]> => {
  const model = await getEmbeddingModel();
  return model.embedDocuments(documents);
};
