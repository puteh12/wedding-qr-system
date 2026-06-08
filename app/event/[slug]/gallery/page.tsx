'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Photo = {
  id: number
  guestName: string
  message: string
  imageUrl: string
  createdAt: string
}

export default function GalleryPage() {
  const params = useParams()
  const slug = params.slug as string

  const [photos, setPhotos] = useState<Photo[]>([])

  const eventName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ')

  useEffect(() => {
    const savedPhotos = JSON.parse(
      localStorage.getItem(`photos-${slug}`) || '[]'
    )

    setPhotos(savedPhotos)
  }, [slug])

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <p className="text-pink-500 font-semibold text-center">
          Wedding Gallery
        </p>

        <h1 className="text-4xl font-bold text-center mb-8">
          {eventName}
        </h1>

        {photos.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow">
            <p className="text-gray-500">
              No photos uploaded yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-xl shadow overflow-hidden"
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.guestName}
                  className="w-full h-56 object-cover"
                />

                <div className="p-4">
                  <h2 className="font-bold">{photo.guestName}</h2>

                  {photo.message && (
                    <p className="text-sm text-gray-600 mt-1">
                      {photo.message}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(photo.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}