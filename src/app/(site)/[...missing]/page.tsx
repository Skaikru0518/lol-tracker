import { notFound } from "next/navigation";

// Unmatched URLs land here so the 404 renders inside the site layout (navbar, footer)
export default function Missing() {
	notFound();
}
