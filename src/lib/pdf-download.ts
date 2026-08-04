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

  const sourceCanvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const pageHeightPx = Math.floor((pageH * sourceCanvas.width) / pageW);
  const rowBreaks = Array.from(el.querySelectorAll("tbody tr"))
    .map((row) => {
      const rowRect = row.getBoundingClientRect();
      const rootRect = el.getBoundingClientRect();
      return Math.round(((rowRect.bottom - rootRect.top) / rootRect.height) * sourceCanvas.height);
    })
    .filter((value) => value > 0 && value < sourceCanvas.height);

  let top = 0;
  let pageIndex = 0;
  while (top < sourceCanvas.height) {
    const target = Math.min(top + pageHeightPx, sourceCanvas.height);
    const safeBreak = rowBreaks.filter((value) => value > top + pageHeightPx * 0.55 && value <= target).pop();
    const bottom = target === sourceCanvas.height ? target : (safeBreak ?? target);
    const sliceHeight = Math.max(1, bottom - top);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = sourceCanvas.width;
    pageCanvas.height = sliceHeight;
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar as páginas do PDF");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      sourceCanvas,
      0,
      top,
      sourceCanvas.width,
      sliceHeight,
      0,
      0,
      sourceCanvas.width,
      sliceHeight,
    );
    if (pageIndex > 0) pdf.addPage();
    const renderedHeight = (sliceHeight * pageW) / sourceCanvas.width;
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, renderedHeight);
    top = bottom;
    pageIndex += 1;
  }

  const blob = pdf.output("blob");

  // Try File System Access API (Chrome/Edge) so the user picks where to save.
  const w = window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName: string;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
  };
  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // AbortError = user cancelled the dialog; stop silently.
      if ((err as { name?: string })?.name === "AbortError") return;
      console.warn("[pdf] showSaveFilePicker failed, falling back to download", err);
    }
  }

  // Fallback: trigger a normal browser download to the default folder.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
