import ResponderDetailClient from './ResponderDetailClient'

export default async function ResponderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ResponderDetailClient id={id} />
}
