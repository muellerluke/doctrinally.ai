declare module "youtube-transcript/dist/youtube-transcript.esm.js" {
  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      config?: { lang?: string }
    ): Promise<{ text: string; duration: number; offset: number }[]>;
  }
}
