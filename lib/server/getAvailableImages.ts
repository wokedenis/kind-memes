import fs from 'fs'
import path from 'path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export async function getAvailableImages(): Promise<string> {
  try {
    const xmlPath = path.join(process.cwd(), 'components', 'ui', 'AVAILABLE_IMAGES.xml')
    const xmlContent = await fs.readFileSync(xmlPath, 'utf-8')

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" })
    const jsonObj = parser.parse(xmlContent)
    
    let images = jsonObj.image || []
    if (!Array.isArray(images)) {
      images = [images].filter(Boolean)
    }
    
    // Ensure images is always an array
    if (!Array.isArray(images)) {
      images = [images]
    }
    
    const shuffledImages = images.sort(() => Math.random() - 0.5)
    
    const builder = new XMLBuilder({ format: true })
    const result = builder.build({ images: { image: shuffledImages } })
    return result
  } catch (error) {
    console.error('Error in getAvailableImages:', error)
    // Return a default XML string with an error message
    return '<images><image>Error: Unable to load images</image></images>'
  }
}
