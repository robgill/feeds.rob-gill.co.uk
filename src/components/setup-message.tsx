export function SetupMessage() {
  return (
    <>
      <h1>Feeds</h1>
      <p className="lede">
        The database is not set up yet. From this directory, run <code>npm run db:setup</code>, then{" "}
        <code>npm run fetch</code>.
      </p>
    </>
  );
}
