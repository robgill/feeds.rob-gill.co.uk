import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <p className="feed-title">Not found</p>
      <p>
        <Link href="/">Back to feeds</Link>
      </p>
    </>
  );
}
