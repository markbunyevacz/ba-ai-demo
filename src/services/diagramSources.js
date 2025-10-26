import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

async function createMermaidRenderer() {
  const module = await import('@mermaid-js/mermaid-cli/src/index.js')
  const renderMermaid = module.renderMermaid || module.default?.renderMermaid

  if (!renderMermaid) {
    throw new Error('Unable to resolve mermaid CLI renderer')
  }

  const defaultConfig = {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'Arial, sans-serif',
    flowchart: {
      htmlLabels: false,
      padding: 24,
      curve: 'basis'
    }
  }

  return {
    /**
     * Render a Mermaid definition to SVG string
     * @param {string} definition
     * @param {Object} options
     * @returns {Promise<string>}
     */
    async render(definition, options = {}) {
      if (!definition || typeof definition !== 'string') {
        throw new Error('Mermaid definition must be a non-empty string')
      }

      const diagramId = options.diagramId || `diagram_${randomUUID()}`
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mermaid-'))
      const outputPath = path.join(tempDir, `${diagramId}.svg`)

      try {
        const { svg, data } = await renderMermaid(undefined, definition, 'svg', {
          output: outputPath,
          svgId: diagramId,
          backgroundColor: options.backgroundColor || 'white',
          mermaidConfig: { ...defaultConfig, ...(options.mermaidConfig || {}) }
        })

        if (typeof svg === 'string') {
          return svg
        }

        if (svg instanceof Buffer) {
          return svg.toString()
        }

        if (data instanceof Buffer) {
          return data.toString()
        }

        const fileContents = await fs.readFile(outputPath)
        return fileContents.toString()
      } finally {
        await fs.rm(tempDir, { force: true, recursive: true })
      }
    }
  }
}

async function createRasterizer() {
  const module = await import('sharp')
  const sharp = module.default || module

  return {
    /**
     * Convert SVG markup to PNG data URL
     * @param {string} svgContent
     * @param {Object} options
     * @returns {Promise<string>} data URL encoded PNG
     */
    async svgToPng(svgContent, options = {}) {
      if (!svgContent) {
        throw new Error('SVG content required for PNG export')
      }

      const buffer = await sharp(Buffer.from(svgContent), { limitInputPixels: false })
        .png({
          compressionLevel: options.compressionLevel ?? 6,
          progressive: true,
          adaptiveFiltering: true,
          quality: options.quality ?? 90
        })
        .toBuffer()

      const base64 = buffer.toString('base64')
      return options.includeDataUri === false ? base64 : `data:image/png;base64,${base64}`
    }
  }
}

let mermaidRendererPromise = null
export async function getMermaidRenderer() {
  if (!mermaidRendererPromise) {
    mermaidRendererPromise = createMermaidRenderer()
  }
  return mermaidRendererPromise
}

let rasterizerPromise = null
export async function getRasterizer() {
  if (!rasterizerPromise) {
    rasterizerPromise = createRasterizer()
  }
  return rasterizerPromise
}

export const diagramSources = {
  get mermaid() {
    return getMermaidRenderer()
  },
  get rasterizer() {
    return getRasterizer()
  }
}

export default diagramSources

