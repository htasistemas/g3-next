import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { ResponsiveChart } from "@/components/charts/responsive-chart";

type BeneficiariosStatusChartProps = {
  dados: Array<{
    status: string;
    total: number;
  }>;
};

export function BeneficiariosStatusChart({ dados }: BeneficiariosStatusChartProps) {
  return (
    <ResponsiveChart minWidth={0} minHeight={180}>
      <BarChart data={dados}>
        <XAxis dataKey="status" hide />
        <YAxis allowDecimals={false} width={24} />
        <Tooltip />
        <Bar dataKey="total" fill="var(--g3-primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveChart>
  );
}
