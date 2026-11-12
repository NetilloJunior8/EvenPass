import { Injectable } from '@angular/core';

export interface RenderedBlueprintResult {
  dataUrl: string;
  fileName: string;
  isPdf: boolean;
  pageCount: number;
  currentPage: number;
  naturalWidth: number;
  naturalHeight: number;
  suggestedTableSpots: Array<{ posX: number; posY: number; shape: 'ROUND' | 'RECTANGULAR'; capacity: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class PdfCroquisService {
  private pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null;

  private getPdfJs(): Promise<typeof import('pdfjs-dist')> {
    if (!this.pdfjsLibPromise) {
      this.pdfjsLibPromise = import('pdfjs-dist').then(lib => {
        lib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';
        return lib;
      });
    }
    return this.pdfjsLibPromise;
  }

  /**
   * Processes an uploaded PDF or image architectural plan and converts it into
   * a lightweight blueprint DataURL plus suggested CAD table positions in the 600x750 SVG space.
   */
  async processBlueprintFile(
    file: File,
    pageNumber: number = 1,
    desiredTableCount: number = 10
  ): Promise<RenderedBlueprintResult> {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return this.renderPdfPage(file, pageNumber, desiredTableCount);
    }
    return this.renderImageFile(file, desiredTableCount);
  }

  private async renderPdfPage(
    file: File,
    pageNumber: number,
    desiredTableCount: number
  ): Promise<RenderedBlueprintResult> {
    const pdfjsLib = await this.getPdfJs();
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages || 1;
    const safePage = Math.min(Math.max(1, pageNumber), totalPages);
    const page = await pdf.getPage(safePage);

    const baseViewport = page.getViewport({ scale: 1 });
    const maxDim = Math.max(baseViewport.width, baseViewport.height, 1);
    const targetScale = Math.min(2.2, Math.max(1.0, 1100 / maxDim));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo inicializar el lienzo 2D para el plano PDF.');
    }

    // White architectural background so transparent PDFs render crisply
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas
    }).promise;

    const dataUrl = this.compressCanvasToDataUrl(canvas, 960, 0.84);
    const suggestedTableSpots = this.detectOpenTableZones(canvas, desiredTableCount);

    return {
      dataUrl,
      fileName: file.name,
      isPdf: true,
      pageCount: totalPages,
      currentPage: safePage,
      naturalWidth: canvas.width,
      naturalHeight: canvas.height,
      suggestedTableSpots
    };
  }

  private renderImageFile(file: File, desiredTableCount: number): Promise<RenderedBlueprintResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen del croquis.'));
      reader.onload = () => {
        const rawUrl = String(reader.result || '');
        const img = new Image();
        img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
        img.onload = () => {
          const maxOut = 960;
          const scale = Math.min(1, maxOut / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((img.naturalWidth || 600) * scale));
          canvas.height = Math.max(1, Math.round((img.naturalHeight || 750) * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({
              dataUrl: rawUrl,
              fileName: file.name,
              isPdf: false,
              pageCount: 1,
              currentPage: 1,
              naturalWidth: img.naturalWidth || 600,
              naturalHeight: img.naturalHeight || 750,
              suggestedTableSpots: this.fallbackGridSpots(desiredTableCount)
            });
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const dataUrl = this.compressCanvasToDataUrl(canvas, 960, 0.84);
          const suggestedTableSpots = this.detectOpenTableZones(canvas, desiredTableCount);

          resolve({
            dataUrl,
            fileName: file.name,
            isPdf: false,
            pageCount: 1,
            currentPage: 1,
            naturalWidth: canvas.width,
            naturalHeight: canvas.height,
            suggestedTableSpots
          });
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  private compressCanvasToDataUrl(source: HTMLCanvasElement, maxDim: number, quality: number): string {
    const scale = Math.min(1, maxDim / Math.max(source.width, source.height, 1));
    if (scale >= 0.99) {
      return source.toDataURL('image/jpeg', quality);
    }
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(source.width * scale));
    out.height = Math.max(1, Math.round(source.height * scale));
    const octx = out.getContext('2d');
    if (!octx) return source.toDataURL('image/jpeg', quality);
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(source, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', quality);
  }

  /**
   * Samples brightness density over the uploaded floorplan to place tables inside open
   * floor regions within the 600x750 SVG viewBox while avoiding heavy walls/title blocks.
   */
  private detectOpenTableZones(
    canvas: HTMLCanvasElement,
    desiredCount: number
  ): Array<{ posX: number; posY: number; shape: 'ROUND' | 'RECTANGULAR'; capacity: number }> {
    const count = Math.max(1, Math.min(desiredCount, 60));
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return this.fallbackGridSpots(count);

      const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(count * 1.2))));
      const rows = Math.max(3, Math.ceil(count / cols) + 1);

      const w = canvas.width;
      const h = canvas.height;
      const imgData = ctx.getImageData(0, 0, w, h).data;

      const candidates: Array<{ xRatio: number; yRatio: number; openness: number }> = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = Math.floor(((c + 0.5) / cols) * w);
          const cy = Math.floor(((r + 0.5) / rows) * h);
          // Skip extreme edge margins (title blocks, frame borders)
          if (cx < w * 0.1 || cx > w * 0.9 || cy < h * 0.14 || cy > h * 0.88) continue;

          let lightPixels = 0;
          let samples = 0;
          const step = Math.max(4, Math.floor(Math.min(w / cols, h / rows) / 6));
          const rad = Math.floor(Math.min(w / cols, h / rows) * 0.3);

          for (let dy = -rad; dy <= rad; dy += step) {
            for (let dx = -rad; dx <= rad; dx += step) {
              const px = Math.min(w - 1, Math.max(0, cx + dx));
              const py = Math.min(h - 1, Math.max(0, cy + dy));
              const idx = (py * w + px) * 4;
              const lum = (imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114);
              if (lum > 195) lightPixels++;
              samples++;
            }
          }

          candidates.push({
            xRatio: cx / w,
            yRatio: cy / h,
            openness: samples > 0 ? lightPixels / samples : 0.5
          });
        }
      }

      if (candidates.length === 0) return this.fallbackGridSpots(count);

      // Prefer high openness (inside room floor rather than solid border/header), then sort reading-order
      const sortedByOpenness = [...candidates]
        .sort((a, b) => b.openness - a.openness)
        .slice(0, count)
        .sort((a, b) => (Math.abs(a.yRatio - b.yRatio) < 0.08 ? a.xRatio - b.xRatio : a.yRatio - b.yRatio));

      if (sortedByOpenness.length < count) {
        return this.fallbackGridSpots(count);
      }

      return sortedByOpenness.map((pt, i) => ({
        posX: Math.round(70 + pt.xRatio * 460),
        posY: Math.round(90 + pt.yRatio * 560),
        shape: (i % 3 === 1 ? 'RECTANGULAR' : 'ROUND') as 'ROUND' | 'RECTANGULAR',
        capacity: i % 3 === 1 ? 8 : 10
      }));
    } catch {
      return this.fallbackGridSpots(count);
    }
  }

  private fallbackGridSpots(
    count: number
  ): Array<{ posX: number; posY: number; shape: 'ROUND' | 'RECTANGULAR'; capacity: number }> {
    const spots: Array<{ posX: number; posY: number; shape: 'ROUND' | 'RECTANGULAR'; capacity: number }> = [];
    const cols = count <= 6 ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const isRect = (i + 1) % 4 === 0;
      spots.push({
        posX: Math.round(105 + col * (400 / Math.max(cols - 1, 1))),
        posY: Math.round(150 + row * 105),
        shape: isRect ? 'RECTANGULAR' : 'ROUND',
        capacity: isRect ? 8 : 10
      });
    }
    return spots;
  }
}
