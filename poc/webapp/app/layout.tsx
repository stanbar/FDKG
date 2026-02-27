import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "V2V · Voter-to-Voter Internet Voting",
  description: "Threshold-encrypted, blockchain-anchored elections — no trusted authority.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 900 }}>
        <nav style={{ marginBottom: "2rem", borderBottom: "1px solid #ccc", paddingBottom: "1rem" }}>
          <strong>V2V</strong>
          {" · "}
          <a href="/">Home</a>
          {" · "}
          <a href="/organiser">Organiser</a>
          {" · "}
          <a href="/tallier">Tallier</a>
          {" · "}
          <a href="/voter">Voter</a>
          {" · "}
          <a href="/results">Results</a>
          {" · "}
          <a href="/sim">Simulator</a>
        </nav>
        {children}
        <footer style={{ marginTop: "3rem", borderTop: "1px solid #ccc", paddingTop: "1rem", fontSize: "0.8rem", color: "#888" }}>
          <a href="/sim">FDKG Network Simulator</a>
          {" · "}
          V2V · Voter-to-Voter Internet Voting
        </footer>
      </body>
    </html>
  );
}
