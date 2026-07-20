// html2pdf.js has minimal TS types; use loose typing.
type Html2PdfChain = {
  set: (opts: Record<string, unknown>) => Html2PdfChain;
  from: (el: HTMLElement) => Html2PdfChain;
  save: () => Promise<void>;
};

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      const data = await urlToDataUrl(src);
      if (data) {
        img.setAttribute("src", data);
      } else {
        // Prevent html2canvas from failing on a tainted/broken image.
        img.remove();
      }
      img.removeAttribute("crossorigin");
    }),
  );
}

export async function downloadPdfFromElement(el: HTMLElement, filename: string) {
  // Clone offscreen so we don't mutate the visible DOM.
  const clone = el.cloneNode(true) as HTMLElement;
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;left:-99999px;top:0;width:800px;background:#ffffff;";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await inlineImages(clone);

    const mod = await import("html2pdf.js");
    const html2pdf = mod.default as unknown as () => Html2PdfChain;
    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(clone)
      .save();
  } finally {
    wrapper.remove();
  }
}
