// html2pdf.js has minimal TS types; use loose typing.
type Html2PdfChain = {
  set: (opts: Record<string, unknown>) => Html2PdfChain;
  from: (el: HTMLElement) => Html2PdfChain;
  save: () => Promise<void>;
};

export async function downloadPdfFromElement(el: HTMLElement, filename: string) {
  const mod = await import("html2pdf.js");
  const html2pdf = mod.default as unknown as () => Html2PdfChain;
  await html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(el)
    .save();
}
