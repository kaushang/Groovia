import GlassPanel from "./glass-panel";
export default function FeatureCard({
    Icon,
    title,
    description,
    color,
    index
}: {
    Icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    color: string;
    index: number;
}) {
    return (
        <GlassPanel
            className="p-6 text-center group transition-transform duration-100"
            data-testid={`feature-card-${index}`}
        >
            <div className={`text-4xl mb-4 ${color}`}>
                <Icon className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-300">{description}</p>
        </GlassPanel>
    )
}