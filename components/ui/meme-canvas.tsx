'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Button } from './button'
import { Settings, RefreshCw, Copy, Save } from 'lucide-react'

interface MemeCanvasProps {
  topText: string
  bottomText: string
  imageUrl: string
  onRetry?: () => void
  onTopTextChange?: (text: string) => void
  onBottomTextChange?: (text: string) => void
}

export function MemeCanvas({ 
  topText, 
  bottomText, 
  imageUrl, 
  onRetry = () => {}, 
  onTopTextChange = (text: string) => {}, 
  onBottomTextChange = (text: string) => {} 
}: MemeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [memeImage, setMemeImage] = useState<HTMLImageElement | null>(null)
  const [topTextSize, setTopTextSize] = useState<number>(1)
  const [bottomTextSize, setBottomTextSize] = useState<number>(1)
  const [textStretch, setTextStretch] = useState<number>(1)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setMemeImage(img)
    img.onerror = (e) => {
      console.error('Error loading image:', e)
      alert('Failed to load the image. Please try a different URL.')
    }
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    if (canvasRef.current && memeImage) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = memeImage.width
        canvas.height = memeImage.height
        redrawMeme(ctx)
      }
    }
  }, [topText, bottomText, memeImage, topTextSize, bottomTextSize, textStretch])

  const redrawMeme = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.drawImage(memeImage!, 0, 0, ctx.canvas.width, ctx.canvas.height)

    const baseFontSize = Math.min(ctx.canvas.width / 10, 60)
    drawMemeText(ctx, topText, ctx.canvas.height * 0.15, baseFontSize * topTextSize, textStretch)
    drawMemeText(ctx, bottomText, ctx.canvas.height * 0.975, baseFontSize * bottomTextSize, textStretch)
  }

  const drawMemeText = (ctx: CanvasRenderingContext2D, text: string, y: number, fontSize: number, stretch: number) => {
    ctx.font = `700 ${fontSize}px 'Oswald', sans-serif`
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = fontSize / 15
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const lines = text.split('\n')
    const lineHeight = fontSize * 1.2
    const totalHeight = lineHeight * lines.length
    let startY = y - (totalHeight / 2)

    ctx.save()
    ctx.scale(1, stretch)

    lines.forEach((line, index) => {
      let scaleFactor = 1
      let textWidth = ctx.measureText(line).width

      while (textWidth > ctx.canvas.width * 0.9 && fontSize * scaleFactor > 10) {
        scaleFactor -= 0.05
        ctx.font = `700 ${fontSize * scaleFactor}px 'Oswald', sans-serif`
        textWidth = ctx.measureText(line).width
      }

      const lineY = (startY + (index * lineHeight)) / stretch
      ctx.strokeText(line, ctx.canvas.width / 2, lineY)
      ctx.fillText(line, ctx.canvas.width / 2, lineY)
    })

    ctx.restore()
  }

  const handleCopyMeme = () => {
    if (canvasRef.current) {
      try {
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
              alert('Meme copied to clipboard!')
            }).catch((error) => {
              console.error('Error copying meme:', error)
              fallbackCopyMeme()
            })
          }
        })
      } catch (error) {
        console.error('Error creating blob:', error)
        fallbackCopyMeme()
      }
    }
  }

  const fallbackCopyMeme = () => {
    if (canvasRef.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        navigator.clipboard.writeText(dataUrl).then(() => {
          alert('Meme copied as data URL. You can paste it in an image editor.')
        }).catch((error) => {
          console.error('Error copying data URL:', error)
          alert('Failed to copy meme. Please try saving it instead.')
        })
      } catch (error) {
        console.error('Error creating data URL:', error)
        alert('Failed to copy meme. Please try saving it instead.')
      }
    }
  }

  const handleSaveMeme = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = 'meme.png'
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  return (
    <div className="flex flex-col items-center bg-white rounded-lg shadow-md p-6 max-w-2xl w-full mx-auto">
      <canvas ref={canvasRef} className="max-w-full h-auto mb-4 rounded" />
      <div className="flex space-x-2 w-full mb-4">
        <Button onClick={handleCopyMeme} className="flex-1 bg-green-500 hover:bg-green-600">
          <span className="hidden sm:inline">Copy Meme</span>
          <Copy className="inline sm:hidden" size={24} />
        </Button>
        <Button onClick={handleSaveMeme} className="flex-1 bg-green-500 hover:bg-green-600">
          <span className="hidden sm:inline">Save Meme</span>
          <Save className="inline sm:hidden" size={24} />
        </Button>
        <Button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-gray-400 hover:bg-gray-500">
          <Settings size={24} />
        </Button>
        <Button onClick={onRetry} className="p-2 bg-gray-400 hover:bg-gray-500">
          <RefreshCw size={24} />
        </Button>
      </div>
      {showSettings && (
        <div className="w-full p-4 bg-gray-100 rounded-lg">
          <div className="mb-4">
            <label htmlFor="top-text-edit" className="block text-sm font-medium text-gray-700 mb-1">
              Top text
            </label>
            <textarea
              id="top-text-edit"
              value={topText}
              onChange={(e) => onTopTextChange(e.target.value)}
              className="w-full p-2 border rounded"
              rows={2}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="top-text-size" className="block text-sm font-medium text-gray-700 mb-1">
              Top text size: {topTextSize.toFixed(1)}
            </label>
            <input
              type="range"
              id="top-text-size"
              min="0.5"
              max="5"
              step="0.1"
              value={topTextSize}
              onChange={(e) => setTopTextSize(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="bottom-text-edit" className="block text-sm font-medium text-gray-700 mb-1">
              Bottom text
            </label>
            <textarea
              id="bottom-text-edit"
              value={bottomText}
              onChange={(e) => onBottomTextChange(e.target.value)}
              className="w-full p-2 border rounded"
              rows={2}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="bottom-text-size" className="block text-sm font-medium text-gray-700 mb-1">
              Bottom text size: {bottomTextSize.toFixed(1)}
            </label>
            <input
              type="range"
              id="bottom-text-size"
              min="0.5"
              max="5"
              step="0.1"
              value={bottomTextSize}
              onChange={(e) => setBottomTextSize(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="text-stretch" className="block text-sm font-medium text-gray-700 mb-1">
              Text stretch: {textStretch.toFixed(1)}
            </label>
            <input
              type="range"
              id="text-stretch"
              min="1"
              max="3"
              step="0.1"
              value={textStretch}
              onChange={(e) => setTextStretch(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
