import NotFoundClient from "./not-found-client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return <NotFoundClient />;
}
