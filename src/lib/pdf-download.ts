// PDF generation isolated in an iframe to avoid Tailwind v4 oklch() colors,
// which html2canvas (bundled in html2pdf.js 0.14) cannot parse.

type Html2PdfChain = {
  set: (opts: Record<string, unknown>) => Html2PdfChain;
  from: (el: HTMLElement) => Html2PdfChain;
  save: () => Promise<void>;
};

const IFRAME_STYLE =
  "position:fixed;left:-99999px;top:0;width:800px;height:1200px;border:0;visibility:hidden;";

const BASE_CSS = `
  html,body{margin:0;padding:0;background:#ffffff;color:#0f172a;
    font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
  *,*::before,*::after{box-sizing:border-box;border:0 solid transparent;}
  table{border-collapse:collapse;}
  img{max-width:100%;}
`;

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
      if (data) {
        img.setAttribute("src", data);
      } else {
        img.remove();
      }
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

function createSandboxIframe(): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = IFRAME_STYLE;
  document.body.appendChild(iframe);
  return iframe;
}

export async function downloadPdfFromElement(el: HTMLElement, filename: string) {
  if (!el) throw new Error("Elemento do orçamento não encontrado");

  const iframe = createSandboxIframe();
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Não foi possível preparar o documento para PDF");

    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body><div id="pdf-root"></div></body></html>`,
    );
    doc.close();

    const root = doc.getElementById("pdf-root");
    if (!root) throw new Error("Falha ao montar o container do PDF");

    // Adopt the rendered markup into the isolated document. Using outerHTML
    // copies the inline-styled tree without pulling any of the app's global
    // stylesheets (which use oklch() and break html2canvas 1.4.1).
    root.innerHTML = el.outerHTML;

    await inlineImages(root);
    await waitForImages(root);

    const target = root.firstElementChild as HTMLElement | null;
    if (!target) throw new Error("Conteúdo do PDF vazio");

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
          windowWidth: 800,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(target)
      .save();
  } catch (err) {
    console.error("[pdf] geração falhou", err);
    throw err instanceof Error
      ? err
      : new Error("Erro desconhecido ao gerar PDF");
  } finally {
    iframe.remove();
  }
}
