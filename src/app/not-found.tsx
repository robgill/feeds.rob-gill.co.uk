import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p className="lede">
        <Link href="/">Back to feeds</Link>
      </p>
    </>
  );
}
