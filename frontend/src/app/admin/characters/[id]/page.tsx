import { CharacterDetailClient } from "./CharacterDetailClient";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CharacterDetailClient id={id} />;
}
