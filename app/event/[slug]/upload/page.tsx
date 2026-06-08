import UploadForm from './UploadForm'

type UploadPageProps = {
  params: Promise<{ slug: string }>
}

export default async function UploadPage({ params }: UploadPageProps) {
  const { slug } = await params

  return <UploadForm slug={slug} />
}