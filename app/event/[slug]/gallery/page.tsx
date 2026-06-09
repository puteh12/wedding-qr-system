import { supabase } from '@/lib/supabase'

type GalleryPageProps = {
  params: Promise<{ slug: string }>
}

type Photo = {
  id: number
  slug: string
  guest_name: string | null
  message: string | null
  image_url: string
  created_at: string
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { slug } = await params

  const eventName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ')

  const { data: photos, error } = await supabase
    .from('photos')
    .select('*')
    .eq('slug', slug)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <p className="text-center text-red-500">
          Failed to load gallery: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <p className="text-pink-500 font-semibold text-center">
          Wedding Gallery
        </p>

        <h1 className="text-4xl font-bold text-center mb-8">{eventName}</h1>

        {!photos || photos.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow">
            <p className="text-gray-500">No photos uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(photos as Photo[]).map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-xl shadow overflow-hidden"
              >
                <img
                  src={photo.image_url}
                  alt={photo.guest_name || 'Wedding photo'}
                  className="w-full h-56 object-cover"
                />

                <div className="p-4">
                  <h2 className="font-bold">
                    {photo.guest_name || 'Guest'}
                  </h2>

                  {photo.message && (
                    <p className="text-sm text-gray-600 mt-1">
                      {photo.message}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(photo.created_at).toLocaleString()}
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