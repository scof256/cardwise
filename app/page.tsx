import type { Metadata } from "next";
import { CardwiseApp } from "./cardwise-app";

export const metadata: Metadata = {
  title: "Cardwise — Business intelligence, from every card",
  description: "An AI-powered business card wallet, contact manager, and company directory.",
};

export default function Home() {
  return <CardwiseApp />;
}
