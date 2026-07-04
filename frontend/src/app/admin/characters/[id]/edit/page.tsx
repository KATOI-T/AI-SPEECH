import { EditCharacterClient } from "./EditCharacterClient";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EditCharacterClient id={id} />;
}
