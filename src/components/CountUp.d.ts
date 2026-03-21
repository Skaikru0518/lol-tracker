export default function CountUp(props: {
	to: number;
	from?: number;
	direction?: string;
	delay?: number;
	duration?: number;
	className?: string;
	startWhen?: boolean;
	separator?: string;
	onStart?: () => void;
	onEnd?: () => void;
}): React.JSX.Element;
