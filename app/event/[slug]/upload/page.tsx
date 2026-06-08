'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function UploadPage() {
  const params = useParams()
  const slug = params.slug as string

  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const eventName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onloadend = () => {
      setPreview(reader.result as string)
    }

    reader.readAsDataURL(file)
  }

  const handleUpload = () => {
    if (!guestName || !preview) {
      alert('Please enter your name and choose a photo')
      return
    }

    const newPhoto = {
      id: Date.now(),
      guestName,
      message,
      imageUrl: preview,
      createdAt: new Date().toISOString(),
    }

    const existingPhotos = JSON.parse(
      localStorage.getItem(`photos-${slug}`) || '[]'
    )

    localStorage.setItem(
      `photos-${slug}`,
      JSON.stringify([newPhoto, ...existingPhotos])
    )

    alert('Photo uploaded successfully!')

    setGuestName('')
    setMessage('')
    setPreview(null)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <p className="text-sm text-pink-500 font-semibold mb-2 text-center">
          Upload Memories
        </p>

        <h1 className="text-3xl font-bold mb-6 text-center">
          {eventName}
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full border rounded-lg px-4 py-3"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full border rounded-lg px-4 py-3"
          />

          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-52 object-cover rounded-lg border"
            />
          )}

          <textarea
            placeholder="Message for the couple"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 min-h-24"
          />

          <button
            onClick={handleUpload}
            className="w-full bg-pink-500 text-white py-3 rounded-lg"
          >
            Upload Photo
          </button>
        </div>
      </div>
    </main>
  )
}