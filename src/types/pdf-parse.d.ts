declare module 'pdf-parse' {
  interface PDFParseOptions {}
  function pdfParse(data: Buffer | Uint8Array | ArrayBuffer, options?: PDFParseOptions): Promise<{ text: string }>; 
  export default pdfParse;
}
