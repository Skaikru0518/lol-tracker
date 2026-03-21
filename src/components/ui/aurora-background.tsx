"use client";

import SoftAurora from "@/components/SoftAurora";

export default function AuroraBackground() {
	return (
		<div className="fixed inset-0 -z-10 overflow-hidden">
			<SoftAurora
				speed={0.3}
				scale={1}
				brightness={0.5}
				color1="#0ab1c7"
				color2="#e100ff"
				noiseFrequency={2}
				noiseAmplitude={1}
				bandHeight={0.5}
				bandSpread={1}
				octaveDecay={0.1}
				layerOffset={0}
				colorSpeed={2}
				enableMouseInteraction={false}
				mouseInfluence={0.25}
			/>
		</div>
	);
}
