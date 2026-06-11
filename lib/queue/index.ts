import PQueue from "p-queue";

export const imageQueue = new PQueue({ concurrency: 3 });
export const videoQueue = new PQueue({ concurrency: 1 });
