'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Button } from './button'

interface MemeCanvasProps {
  topText: string
  bottomText: string
  imageUrl: string
}

export function MemeCanvas({ topText, bottomText, imageUrl }: MemeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [memeImage, setMemeImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setMemeImage(img)
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    if (canvasRef.current && memeImage) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = memeImage.width
        canvas.height = memeImage.height
        ctx.drawImage(memeImage, 0, 0)
        
        ctx.font = 'bold 36px Arial'
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.textAlign = 'center'

        ctx.fillText(topText, canvas.width / 2, 50)
        ctx.strokeText(topText, canvas.width / 2, 50)

        ctx.fillText(bottomText, canvas.width / 2, canvas.height - 20)
        ctx.strokeText(bottomText, canvas.width / 2, canvas.height - 20)
      }
    }
  }, [topText, bottomText, memeImage])

  const handleCopyMeme = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            alert('Meme copied to clipboard!')
          }).catch((error) => {
            console.error('Error copying meme:', error)
          })
        }
      })
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
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="max-w-full h-auto mb-4" />
      <div className="flex space-x-2">
        <Button onClick={handleCopyMeme}>Copy Meme</Button>
        <Button onClick={handleSaveMeme}>Save Meme</Button>
      </div>
    </div>
  )
}
