import Link from 'next/link'
import QrCodeBox from './QrCodeBox'

type EventPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params

  const eventName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' & ')

  const uploadUrl = `https://wedding-qr-system.vercel.app/event/${slug}/upload`

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <p className="text-sm text-pink-500 font-semibold mb-2">
          Wedding Event
        </p>

        <h1 className="text-3xl font-bold mb-4">{eventName}</h1>

        <div className="flex justify-center bg-white p-4 rounded-lg mb-4">
          <QrCodeBox value={uploadUrl} />
        </div>

        <p className="text-gray-600 mb-4">
          Tetamu scan QR ni untuk upload gambar.
        </p>

        <div className="bg-gray-100 rounded-lg p-4 mb-6 text-sm break-all">
          {uploadUrl}
        </div>

        <Link
          href={`/event/${slug}/upload`}
          className="block w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600"
        >
          Open Upload Page
        </Link>
      </div>
    </main>
  )
}