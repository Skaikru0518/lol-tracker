import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#0d1117",
					borderRadius: "40px",
				}}
			>
				<span
					style={{
						fontSize: "120px",
						fontWeight: 900,
						background: "linear-gradient(135deg, #0ab1c7, #e100ff)",
						backgroundClip: "text",
						color: "transparent",
					}}
				>
					S
				</span>
			</div>
		),
		{ ...size },
	);
}
