// PDF generation via html2canvas-pro (parses oklch/lab/lch) + jsPDF.
// Snapshots the live element in place, so Tailwind v4 CSS variables work.

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
  } catch (err) {
    console.warn("[pdf] failed to inline image", url, err);
    return null;
  }
}

async function inlineImages(root: ParentNode) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      const data = await urlToDataUrl(src);
      if (data) img.setAttribute("src", data);
      else img.remove();
      img.removeAttribute("crossorigin");
    }),
  );
}

async function waitForImages(root: ParentNode) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
    ),
  );
}

export async function downloadPdfFromElement(el: HTMLElement, filename: string) {
  if (!el) throw new Error("Elemento do orçamento não encontrado");

  await inlineImages(el);
  await waitForImages(el);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;

  if (imgH <= pageH) {
    pdf.addImage(imgData, "JPEG", 0, 0, pageW, imgH);
  } else {
    // Multi-page: slice the tall image across A4 pages.
    let remaining = imgH;
    let position = 0;
    while (remaining > 0) {
      pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
      remaining -= pageH;
      position -= pageH;
      if (remaining > 0) pdf.addPage();
    }
  }

  pdf.save(filename);
}
