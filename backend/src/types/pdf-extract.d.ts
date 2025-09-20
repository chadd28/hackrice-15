declare module 'pdf-extract' {
  export class PDFExtract {
    extract(
      filePath: string,
      options: any,
      callback: (err: any, data: any) => void
    ): void;
  }
}